"""
BizFlow Lite - Enhanced Products Module Test Suite
Tests new fields: barcode, cost_price, low_stock_alert
Plus regression checks for auth, categories, sales, reports.
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://sales-dashboard-685.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = f"admin+{os.environ.get('PYTEST_XDIST_WORKER', 'gw0')}@bizflow.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def token():
    # Try login; if fails, register
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 200:
        return r.json()["access_token"]
    # Register fallback
    r = requests.post(f"{API}/auth/register", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "company_name": "BizFlow Admin"
    })
    assert r.status_code == 200, f"Login/Register failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def default_category_id(headers):
    # Seed data if empty (creates categories + sample products)
    requests.post(f"{API}/seed-data", headers=headers)
    r = requests.get(f"{API}/categories", headers=headers)
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) > 0, "No categories available"
    return cats[0]["id"]


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL


# ---------- Categories ----------
class TestCategories:
    def test_get_categories(self, headers):
        r = requests.get(f"{API}/categories", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Products with new fields ----------
class TestProductsEnhanced:
    def test_get_products_new_fields(self, headers, default_category_id):
        r = requests.get(f"{API}/products", headers=headers)
        assert r.status_code == 200, r.text
        products = r.json()
        assert isinstance(products, list)
        if products:
            for p in products:
                assert "barcode" in p, f"Missing barcode field in {p}"
                assert "cost_price" in p, f"Missing cost_price field in {p}"
                assert "low_stock_alert" in p, f"Missing low_stock_alert field in {p}"

    def test_create_product_with_new_fields(self, headers, default_category_id):
        sku = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": "TEST_Product_Full",
            "sku": sku,
            "barcode": "9999888877771",
            "category_id": default_category_id,
            "selling_price": 100.0,
            "cost_price": 55.5,
            "stock_quantity": 20,
            "low_stock_alert": 7,
        }
        r = requests.post(f"{API}/products", headers=headers, json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod["barcode"] == "9999888877771"
        assert prod["cost_price"] == 55.5
        assert prod["low_stock_alert"] == 7
        pid = prod["id"]

        # Verify persistence
        r2 = requests.get(f"{API}/products", headers=headers)
        found = next((p for p in r2.json() if p["id"] == pid), None)
        assert found is not None
        assert found["barcode"] == "9999888877771"
        assert found["cost_price"] == 55.5
        assert found["low_stock_alert"] == 7

        # cleanup
        requests.delete(f"{API}/products/{pid}", headers=headers)

    def test_create_product_without_optional_fields(self, headers, default_category_id):
        sku = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": "TEST_Product_Min",
            "sku": sku,
            "category_id": default_category_id,
            "selling_price": 50.0,
            "stock_quantity": 15,
        }
        r = requests.post(f"{API}/products", headers=headers, json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod["barcode"] == ""
        assert prod["cost_price"] == 0.0
        # low_stock_alert should fall back to user's global threshold
        assert prod["low_stock_alert"] is not None
        assert isinstance(prod["low_stock_alert"], int)
        pid = prod["id"]

        # Verify via GET
        r2 = requests.get(f"{API}/products", headers=headers)
        found = next((p for p in r2.json() if p["id"] == pid), None)
        assert found is not None
        assert found["barcode"] == ""
        assert found["cost_price"] == 0.0
        assert found["low_stock_alert"] is not None

        requests.delete(f"{API}/products/{pid}", headers=headers)

    def test_update_product_new_fields(self, headers, default_category_id):
        sku = f"TEST_{uuid.uuid4().hex[:8]}"
        create = requests.post(f"{API}/products", headers=headers, json={
            "name": "TEST_ToUpdate", "sku": sku, "category_id": default_category_id,
            "selling_price": 20.0, "stock_quantity": 10,
        })
        assert create.status_code == 200
        pid = create.json()["id"]

        update = requests.put(f"{API}/products/{pid}", headers=headers, json={
            "barcode": "1234567890123", "cost_price": 12.5, "low_stock_alert": 3
        })
        assert update.status_code == 200, update.text
        d = update.json()
        assert d["barcode"] == "1234567890123"
        assert d["cost_price"] == 12.5
        assert d["low_stock_alert"] == 3

        # Confirm persistence
        r = requests.get(f"{API}/products", headers=headers)
        found = next((p for p in r.json() if p["id"] == pid), None)
        assert found["barcode"] == "1234567890123"
        assert found["cost_price"] == 12.5
        assert found["low_stock_alert"] == 3

        requests.delete(f"{API}/products/{pid}", headers=headers)

    def test_delete_product(self, headers, default_category_id):
        sku = f"TEST_{uuid.uuid4().hex[:8]}"
        create = requests.post(f"{API}/products", headers=headers, json={
            "name": "TEST_ToDelete", "sku": sku, "category_id": default_category_id,
            "selling_price": 10.0, "stock_quantity": 5,
        })
        pid = create.json()["id"]
        r = requests.delete(f"{API}/products/{pid}", headers=headers)
        assert r.status_code == 200

        # Verify gone
        r2 = requests.get(f"{API}/products", headers=headers)
        assert not any(p["id"] == pid for p in r2.json())

    def test_search_by_barcode(self, headers, default_category_id):
        # Ensure a product with known barcode exists (from seed or new)
        target_barcode = "8801234567001"
        r = requests.get(f"{API}/products", headers=headers, params={"search": target_barcode})
        assert r.status_code == 200
        results = r.json()
        # If seeded, should find one; if not, create it
        if not results:
            sku = f"TEST_{uuid.uuid4().hex[:8]}"
            requests.post(f"{API}/products", headers=headers, json={
                "name": "TEST_BarcodeSearch", "sku": sku, "barcode": target_barcode,
                "category_id": default_category_id, "selling_price": 10.0, "stock_quantity": 5,
            })
            r = requests.get(f"{API}/products", headers=headers, params={"search": target_barcode})
            results = r.json()
        assert len(results) >= 1, "Should find product by barcode search"
        assert any(p["barcode"] == target_barcode for p in results)


# ---------- Dashboard low_stock integration ----------
class TestDashboardLowStock:
    def test_low_stock_respects_per_product_threshold(self, headers, default_category_id):
        # baseline
        r0 = requests.get(f"{API}/dashboard", headers=headers)
        assert r0.status_code == 200
        baseline_low = r0.json()["low_stock"]

        # Create product stock=3, low_stock_alert=5 -> should be counted
        sku = f"TEST_{uuid.uuid4().hex[:8]}"
        create = requests.post(f"{API}/products", headers=headers, json={
            "name": "TEST_LowStock", "sku": sku, "category_id": default_category_id,
            "selling_price": 30.0, "stock_quantity": 3, "low_stock_alert": 5,
        })
        assert create.status_code == 200, create.text
        pid = create.json()["id"]

        r1 = requests.get(f"{API}/dashboard", headers=headers)
        assert r1.status_code == 200
        assert r1.json()["low_stock"] == baseline_low + 1, \
            f"Expected {baseline_low + 1}, got {r1.json()['low_stock']}"

        # Update stock to 10 -> should no longer count
        upd = requests.put(f"{API}/products/{pid}", headers=headers, json={"stock_quantity": 10})
        assert upd.status_code == 200

        r2 = requests.get(f"{API}/dashboard", headers=headers)
        assert r2.status_code == 200
        assert r2.json()["low_stock"] == baseline_low, \
            f"Expected {baseline_low}, got {r2.json()['low_stock']}"

        requests.delete(f"{API}/products/{pid}", headers=headers)


# ---------- Sales & Reports regression ----------
class TestSalesAndReports:
    def test_create_sale(self, headers, default_category_id):
        # Create product with plenty of stock
        sku = f"TEST_{uuid.uuid4().hex[:8]}"
        create = requests.post(f"{API}/products", headers=headers, json={
            "name": "TEST_SaleProd", "sku": sku, "category_id": default_category_id,
            "selling_price": 25.0, "stock_quantity": 100,
        })
        pid = create.json()["id"]

        r = requests.post(f"{API}/sales", headers=headers, json={
            "product_id": pid, "quantity": 2, "payment_method": "Cash"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["quantity"] == 2
        assert data["total_price"] == 50.0
        assert data["payment_method"] == "Cash"

        requests.delete(f"{API}/products/{pid}", headers=headers)

    def test_daily_sales_report(self, headers):
        r = requests.get(f"{API}/reports/daily-sales", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_monthly_sales_report(self, headers):
        r = requests.get(f"{API}/reports/monthly-sales", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_top_products_report(self, headers):
        r = requests.get(f"{API}/reports/top-products", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
