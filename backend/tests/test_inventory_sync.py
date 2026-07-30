"""
Tests for atomic inventory synchronization fix in BizFlow Lite.

Covers:
1. Atomic sale creation & validations
2. Sale record fields (Sales History)
3. Inventory Movement recording
4. Low Stock endpoint
5. Dashboard integration (low_stock_products)
6. Concurrency / stock race safety
"""

import os
import pytest
import requests
import threading
import time
import uuid

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "https://sales-dashboard-685.preview.emergentagent.com"
).rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@bizflow.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------

@pytest.fixture(scope="session")
def token():
    # Login (create if needed)
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        # try register
        rr = requests.post(f"{API}/auth/register", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "company_name": "BizFlow Admin"
        })
        assert rr.status_code in (200, 201), f"Register failed: {rr.status_code} {rr.text}"
        return rr.json()["access_token"]
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def category_id(headers):
    # Reuse first existing category or create TEST_
    r = requests.get(f"{API}/categories", headers=headers)
    assert r.status_code == 200
    cats = r.json()
    if cats:
        return cats[0]["id"]
    r = requests.post(f"{API}/categories", headers=headers, json={"name": "TEST_Cat"})
    assert r.status_code == 200
    return r.json()["id"]


def _create_product(headers, category_id, stock=50, price=10.0, low_alert=5):
    sku = f"TEST_SKU_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API}/products", headers=headers, json={
        "name": f"TEST_Prod_{sku}",
        "sku": sku,
        "category_id": category_id,
        "selling_price": price,
        "cost_price": 5.0,
        "stock_quantity": stock,
        "low_stock_alert": low_alert,
    })
    assert r.status_code == 200, r.text
    return r.json()


def _delete_product(headers, product_id):
    requests.delete(f"{API}/products/{product_id}", headers=headers)


# ---------- 1. Atomic sale creation ----------

class TestSaleCreation:
    def test_valid_sale_decreases_stock(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=20, price=15.0)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 3, "payment_method": "Cash"
            })
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["stock_after"] == 17
            assert data["quantity"] == 3
            assert data["unit_price"] == 15.0
            assert data["total_price"] == 45.0
            assert data["total_amount"] == 45.0
            assert data["selling_price"] == 15.0
            assert data["payment_method"] == "Cash"
            assert "created_at" in data
            # Verify stock persisted
            pr = requests.get(f"{API}/products", headers=headers).json()
            found = [p for p in pr if p["id"] == prod["id"]][0]
            assert found["stock_quantity"] == 17
        finally:
            _delete_product(headers, prod["id"])

    def test_insufficient_stock(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=5)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 99999, "payment_method": "Cash"
            })
            assert r.status_code == 400
            detail = r.json()["detail"]
            assert "Insufficient stock" in detail
            assert "Available:" in detail
            assert "Requested:" in detail
            assert "5" in detail
            assert "99999" in detail
        finally:
            _delete_product(headers, prod["id"])

    def test_nonexistent_product(self, headers):
        fake_id = "507f1f77bcf86cd799439011"  # valid ObjectId but doesn't exist
        r = requests.post(f"{API}/sales", headers=headers, json={
            "product_id": fake_id, "quantity": 1, "payment_method": "Cash"
        })
        assert r.status_code == 404
        assert r.json()["detail"] == "Product not found"

    def test_zero_quantity(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=10)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 0, "payment_method": "Cash"
            })
            assert r.status_code == 400
            assert "greater than zero" in r.json()["detail"].lower()
        finally:
            _delete_product(headers, prod["id"])

    def test_negative_quantity(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=10)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": -3, "payment_method": "Cash"
            })
            assert r.status_code == 400
            assert "greater than zero" in r.json()["detail"].lower()
        finally:
            _delete_product(headers, prod["id"])

    def test_invalid_payment_method(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=10)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 1, "payment_method": "Card"
            })
            assert r.status_code == 400
            assert "Invalid payment method" in r.json()["detail"]
        finally:
            _delete_product(headers, prod["id"])

    def test_malformed_product_id(self, headers):
        r = requests.post(f"{API}/sales", headers=headers, json={
            "product_id": "abc", "quantity": 1, "payment_method": "Cash"
        })
        assert r.status_code == 400
        assert "Invalid product ID" in r.json()["detail"]


# ---------- 2. Sale record fields (Sales History) ----------

class TestSalesHistory:
    def test_sales_history_includes_all_fields(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=20, price=12.5)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 2, "payment_method": "QR"
            })
            assert r.status_code == 200
            sale_id = r.json()["id"]

            sales = requests.get(f"{API}/sales", headers=headers).json()
            match = [s for s in sales if s["id"] == sale_id]
            assert len(match) == 1
            s = match[0]
            required = ["product_id", "product_name", "quantity", "unit_price",
                        "selling_price", "total_price", "total_amount",
                        "payment_method", "created_at"]
            for f in required:
                assert f in s, f"Missing field {f} in sales response"
            assert s["total_amount"] == s["total_price"]
            assert s["selling_price"] == s["unit_price"]
            assert s["total_price"] == 25.0
            assert s["payment_method"] == "QR"
            assert s["product_id"] == prod["id"]
        finally:
            _delete_product(headers, prod["id"])


# ---------- 3. Inventory Movement recording ----------

class TestInventoryMovements:
    def test_movement_recorded_on_sale(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=20)
        try:
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 4, "payment_method": "Cash"
            })
            assert r.status_code == 200
            sale_id = r.json()["id"]

            mv = requests.get(f"{API}/inventory-movements", headers=headers,
                              params={"product_id": prod["id"]})
            assert mv.status_code == 200
            movements = mv.json()
            assert len(movements) >= 1
            m = movements[0]  # sorted desc
            assert m["type"] == "SALE"
            assert m["product_id"] == prod["id"]
            assert m["quantity"] == 4
            assert m["reference_id"] == sale_id
            assert m["stock_after"] == 16
        finally:
            _delete_product(headers, prod["id"])

    def test_movements_filter_and_sort(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=30)
        other = _create_product(headers, category_id, stock=30)
        try:
            for q in (1, 2, 3):
                r = requests.post(f"{API}/sales", headers=headers, json={
                    "product_id": prod["id"], "quantity": q, "payment_method": "Cash"
                })
                assert r.status_code == 200
                time.sleep(0.05)
            # noise sale on other product
            requests.post(f"{API}/sales", headers=headers, json={
                "product_id": other["id"], "quantity": 1, "payment_method": "Cash"
            })

            mv = requests.get(f"{API}/inventory-movements", headers=headers,
                              params={"product_id": prod["id"]}).json()
            # Should only have this product's movements
            assert all(m["product_id"] == prod["id"] for m in mv)
            # Recent first: most-recent should be qty=3
            qtys = [m["quantity"] for m in mv[:3]]
            assert qtys == [3, 2, 1], f"Expected [3,2,1], got {qtys}"
        finally:
            _delete_product(headers, prod["id"])
            _delete_product(headers, other["id"])


# ---------- 4. Low Stock endpoint ----------

class TestLowStockEndpoint:
    def test_low_stock_endpoint(self, headers, category_id):
        # stock 3, alert 5 -> low
        p1 = _create_product(headers, category_id, stock=3, low_alert=5)
        # stock 100, alert 5 -> not low
        p2 = _create_product(headers, category_id, stock=100, low_alert=5)
        # stock 1, alert 5 -> low (lowest)
        p3 = _create_product(headers, category_id, stock=1, low_alert=5)
        try:
            r = requests.get(f"{API}/products/low-stock", headers=headers)
            assert r.status_code == 200, r.text
            data = r.json()
            ids = [p["id"] for p in data]
            assert p1["id"] in ids
            assert p3["id"] in ids
            assert p2["id"] not in ids

            # Sort ascending
            stocks = [p["stock_quantity"] for p in data]
            assert stocks == sorted(stocks), f"Not sorted asc: {stocks}"

            # Fields check
            for p in data:
                for f in ["id", "name", "sku", "category_name", "stock_quantity",
                          "low_stock_alert", "selling_price"]:
                    assert f in p, f"Missing field {f}"
        finally:
            for p in (p1, p2, p3):
                _delete_product(headers, p["id"])


# ---------- 5. Dashboard integration ----------

class TestDashboardIntegration:
    def test_dashboard_low_stock_products(self, headers, category_id):
        p_low = _create_product(headers, category_id, stock=2, low_alert=5, price=10.0)
        p_ok = _create_product(headers, category_id, stock=50, low_alert=5, price=10.0)
        try:
            r = requests.get(f"{API}/dashboard", headers=headers)
            assert r.status_code == 200
            d = r.json()
            assert "low_stock_products" in d
            assert "low_stock" in d
            assert d["low_stock"] == len(d["low_stock_products"])
            ids = [p["id"] for p in d["low_stock_products"]]
            assert p_low["id"] in ids
            assert p_ok["id"] not in ids

            # Now record a sale, and re-check totals decrease
            before_stock = d["total_stock"]
            before_value = d["stock_value"]
            before_today = d["today_sales"]

            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": p_ok["id"], "quantity": 5, "payment_method": "Cash"
            })
            assert r.status_code == 200
            paid = r.json()["total_price"]

            d2 = requests.get(f"{API}/dashboard", headers=headers).json()
            assert d2["total_stock"] == before_stock - 5
            assert abs(d2["stock_value"] - (before_value - 5 * 10.0)) < 1e-6
            assert abs(d2["today_sales"] - (before_today + paid)) < 1e-6
        finally:
            _delete_product(headers, p_low["id"])
            _delete_product(headers, p_ok["id"])

    def test_sale_drops_product_to_low_stock(self, headers, category_id):
        # Start with plenty of stock, low_alert=5
        prod = _create_product(headers, category_id, stock=6, low_alert=5, price=10.0)
        try:
            # Not low yet
            d = requests.get(f"{API}/dashboard", headers=headers).json()
            ids_before = [p["id"] for p in d["low_stock_products"]]
            assert prod["id"] not in ids_before

            # Sell 2 -> stock = 4 <= 5 -> low
            r = requests.post(f"{API}/sales", headers=headers, json={
                "product_id": prod["id"], "quantity": 2, "payment_method": "Cash"
            })
            assert r.status_code == 200

            d2 = requests.get(f"{API}/dashboard", headers=headers).json()
            ids_after = [p["id"] for p in d2["low_stock_products"]]
            assert prod["id"] in ids_after
        finally:
            _delete_product(headers, prod["id"])


# ---------- 6. Concurrency / stock race safety ----------

class TestConcurrency:
    def test_no_oversell_under_concurrent_sales(self, headers, category_id):
        prod = _create_product(headers, category_id, stock=5, low_alert=1)
        results = []

        def do_sale():
            try:
                r = requests.post(f"{API}/sales", headers=headers, json={
                    "product_id": prod["id"], "quantity": 3, "payment_method": "Cash"
                }, timeout=30)
                results.append((r.status_code, r.json() if r.headers.get("content-type","").startswith("application/json") else r.text))
            except Exception as e:
                results.append(("EXC", str(e)))

        try:
            threads = [threading.Thread(target=do_sale) for _ in range(3)]
            for t in threads: t.start()
            for t in threads: t.join()

            successes = [r for r in results if r[0] == 200]
            failures = [r for r in results if r[0] == 400]
            assert len(successes) == 1, f"Expected exactly 1 success, got: {results}"
            assert len(failures) == 2, f"Expected exactly 2 failures, got: {results}"

            # Final stock: exactly 5 - (1*3) = 2, never negative
            pr = requests.get(f"{API}/products", headers=headers).json()
            found = [p for p in pr if p["id"] == prod["id"]][0]
            assert found["stock_quantity"] == 2
            assert found["stock_quantity"] >= 0
        finally:
            _delete_product(headers, prod["id"])
