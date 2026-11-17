import importlib
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class FakeCollection:
    def __init__(self, items=None):
        self.items = list(items or [])

    def _filter_items(self, query=None):
        if not query:
            return list(self.items)
        filtered = []
        for item in self.items:
            match = True
            for key, expected in query.items():
                if key == "$or":
                    if not any(self._matches_subset(item, clause) for clause in expected):
                        match = False
                        break
                    continue
                if key == "$and":
                    if not all(self._matches_subset(item, clause) for clause in expected):
                        match = False
                        break
                    continue
                if key == "$gte":
                    continue
                if key == "_id":
                    if isinstance(expected, str):
                        if str(item.get("_id")) != expected:
                            match = False
                    elif item.get("_id") != expected:
                        match = False
                    continue
                if key == "user_id":
                    if item.get("user_id") != expected:
                        match = False
                    continue
                if isinstance(expected, dict):
                    if not self._matches_dict(item.get(key), expected):
                        match = False
                        break
                    continue
                if item.get(key) != expected:
                    match = False
                    break
            if match:
                filtered.append(item)
        return filtered

    def _matches_subset(self, item, clause):
        for key, expected in clause.items():
            if isinstance(expected, dict):
                if not self._matches_dict(item.get(key), expected):
                    return False
            elif item.get(key) != expected:
                return False
        return True

    @staticmethod
    def _normalize_datetime(value):
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)
        return value

    def _matches_dict(self, value, expected):
        for op, target in expected.items():
            target = self._normalize_datetime(target)
            value = self._normalize_datetime(value)
            if op == "$gte":
                if value is None or value < target:
                    return False
            elif op == "$gt":
                if value is None or value <= target:
                    return False
            elif op == "$lt":
                if value is None or value >= target:
                    return False
            elif op == "$lte":
                if value is None or value > target:
                    return False
            elif op == "$ne":
                if value == target:
                    return False
            else:
                return False
        return True

    def find(self, query=None):
        class Cursor:
            def __init__(self, items):
                self.items = list(items)

            def sort(self, *args, **kwargs):
                key = args[0] if args else kwargs.get("key")
                reverse = kwargs.get("reverse", False)
                if key is not None:
                    self.items = sorted(self.items, key=lambda item: item.get(key) or datetime.min.replace(tzinfo=timezone.utc), reverse=reverse)
                return self

            def limit(self, n):
                self.items = self.items[:n]
                return self

            async def to_list(self, limit=1000):
                return list(self.items[:limit])

        return Cursor(self._filter_items(query))

    async def find_one(self, query=None, projection=None):
        for item in self.items:
            if query is None:
                return item
            match = True
            for key, value in query.items():
                if key == "_id":
                    if str(item.get("_id")) != str(value):
                        match = False
                        break
                elif key == "$or":
                    if not any(self._matches_subset(item, clause) for clause in value):
                        match = False
                        break
                elif key == "$and":
                    if not all(self._matches_subset(item, clause) for clause in value):
                        match = False
                        break
                elif isinstance(value, dict):
                    if not self._matches_dict(item.get(key), value):
                        match = False
                        break
                elif item.get(key) != value:
                    match = False
                    break
            if match:
                return item
        return None

    def _matches_subset(self, item, clause):
        for key, expected in clause.items():
            if isinstance(expected, dict):
                if not self._matches_dict(item.get(key), expected):
                    return False
            elif item.get(key) != expected:
                return False
        return True

    async def find_one_and_update(self, query, update, return_document=False):
        for item in self.items:
            match = True
            for key, value in query.items():
                if key == "_id":
                    if str(item.get("_id")) != str(value):
                        match = False
                        break
                elif key == "user_id":
                    if item.get("user_id") != value:
                        match = False
                        break
                elif key == "stock_quantity":
                    if not isinstance(value, dict):
                        match = False
                        break
                    if not self._matches_dict(item.get("stock_quantity"), value):
                        match = False
                        break
                else:
                    if item.get(key) != value:
                        match = False
                        break
            if match:
                if "$inc" in update:
                    for field, delta in update["$inc"].items():
                        item[field] = item.get(field, 0) + delta
                if return_document:
                    return item
                return item
        return None

    async def insert_one(self, document):
        document.setdefault("_id", ObjectId())
        self.items.append(document)
        return type("Result", (), {"inserted_id": document["_id"]})()

    async def insert_many(self, documents):
        added = []
        for doc in documents:
            doc.setdefault("_id", ObjectId())
            self.items.append(doc)
            added.append(doc["_id"])
        return type("Result", (), {"inserted_ids": added})()

    async def update_one(self, query, update):
        for item in self.items:
            if all(item.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    item.update(update["$set"])
                if "$inc" in update:
                    for field, delta in update["$inc"].items():
                        item[field] = item.get(field, 0) + delta
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, query):
        for idx, item in enumerate(self.items):
            if all(item.get(k) == v for k, v in query.items()):
                del self.items[idx]
                return type("Result", (), {"deleted_count": 1})()
        return type("Result", (), {"deleted_count": 0})()

    async def count_documents(self, query=None):
        return len(self._filter_items(query))


class FakeDB:
    def __init__(self):
        now = datetime.now(timezone.utc)
        manager_a_id = ObjectId("507f1f77bcf86cd799439013")
        manager_b_id = ObjectId("507f1f77bcf86cd799439014")
        business_a_id = ObjectId("507f1f77bcf86cd799439011")
        business_b_id = ObjectId("507f1f77bcf86cd799439012")
        self.users = FakeCollection([
            {
                "_id": manager_a_id,
                "email": "manager-a@example.com",
                "password": "$2b$12$Q4x8ivBf3l9qPmWxNI5cluRTg4I9LNlH2v7bIYbHEp4x5v2GY7oK6",
                "company_name": "Manager A Business",
                "name": "Manager A",
            },
            {
                "_id": manager_b_id,
                "email": "manager-b@example.com",
                "password": "$2b$12$Q4x8ivBf3l9qPmWxNI5cluRTg4I9LNlH2v7bIYbHEp4x5v2GY7oK6",
                "company_name": "Manager B Business",
                "name": "Manager B",
            },
        ])
        self.companies = FakeCollection([
            {"_id": business_a_id, "companyName": "Manager A Business", "email": "manager-a@example.com", "plan": "Pro", "status": "Active", "trialEnd": "2026-01-01T00:00:00", "subscriptionEnd": "2026-02-01T00:00:00", "createdAt": "2026-01-01T00:00:00"},
            {"_id": business_b_id, "companyName": "Manager B Business", "email": "manager-b@example.com", "plan": "Basic", "status": "Trial", "trialEnd": "2026-02-01T00:00:00", "subscriptionEnd": None, "createdAt": "2026-01-02T00:00:00"},
        ])
        self.business_members = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439021"), "user_id": str(manager_a_id), "business_id": str(business_a_id), "role": "manager", "status": "active"},
            {"_id": ObjectId("507f1f77bcf86cd799439022"), "user_id": str(manager_b_id), "business_id": str(business_b_id), "role": "manager", "status": "active"},
        ])
        self.categories = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439031"), "user_id": str(manager_a_id), "name": "Stationery"},
            {"_id": ObjectId("507f1f77bcf86cd799439032"), "user_id": str(manager_b_id), "name": "Office"},
        ])
        self.products = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439041"), "user_id": str(manager_a_id), "name": "A4 Copy Paper", "sku": "A4-001", "barcode": "A4P-001", "category_id": "507f1f77bcf86cd799439031", "selling_price": 18.0, "cost_price": 10.0, "stock_quantity": 50, "low_stock_alert": 10, "created_at": now},
            {"_id": ObjectId("507f1f77bcf86cd799439042"), "user_id": str(manager_b_id), "name": "Notebook", "sku": "NB-001", "barcode": "NB-001", "category_id": "507f1f77bcf86cd799439032", "selling_price": 12.0, "cost_price": 6.0, "stock_quantity": 20, "low_stock_alert": 5, "created_at": now},
        ])
        self.myops_app_sessions = FakeCollection([
            {"myops_session_id": "manager-a-session", "firebase_uid": "manager-a-firebase", "mongo_user_id": str(manager_a_id), "revoked_at": None, "valid_until": now + timedelta(hours=2)},
            {"myops_session_id": "manager-b-session", "firebase_uid": "manager-b-firebase", "mongo_user_id": str(manager_b_id), "revoked_at": None, "valid_until": now + timedelta(hours=2)},
        ])
        self.sales = FakeCollection([])
        self.inventory_movements = FakeCollection([])


@pytest.fixture
def server_module(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-key-tenant")
    monkeypatch.setenv("SUPER_ADMIN_EMAIL", "superadmin@opsflow.dev")
    monkeypatch.setenv("SUPER_ADMIN_PASSWORD", "StrongPass!123")
    monkeypatch.setenv("MONGO_URL", "mongodb://localhost:27017")
    monkeypatch.setenv("DB_NAME", "opsflow_tenant_test")
    monkeypatch.setenv("MYOPS_REQUIRED", "true")
    import server

    importlib.reload(server)
    server.db = FakeDB()
    return server


def _token(server_module, user_id, email, *, role="manager", session_id, firebase_uid):
    return server_module.create_access_token({
        "user_id": str(user_id),
        "email": email,
        "role": role,
        "myops_session_id": session_id,
        "firebase_uid": firebase_uid,
    })


def test_manager_a_and_manager_b_tenant_isolation(server_module):
    client = TestClient(server_module.app)
    manager_a = server_module.db.users.items[0]
    manager_b = server_module.db.users.items[1]
    token_a = _token(server_module, manager_a["_id"], manager_a["email"], session_id="manager-a-session", firebase_uid="manager-a-firebase")
    token_b = _token(server_module, manager_b["_id"], manager_b["email"], session_id="manager-b-session", firebase_uid="manager-b-firebase")

    a_products = client.get("/api/products", headers={"Authorization": f"Bearer {token_a}"})
    assert a_products.status_code == 200, a_products.text
    assert len(a_products.json()) == 1
    assert a_products.json()[0]["name"] == "A4 Copy Paper"

    b_products = client.get("/api/products", headers={"Authorization": f"Bearer {token_b}"})
    assert b_products.status_code == 200, b_products.text
    assert len(b_products.json()) == 1
    assert b_products.json()[0]["name"] == "Notebook"

    a_cross = client.post(
        "/api/sales",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"product_id": str(server_module.db.products.items[1]["_id"]), "quantity": 2, "payment_method": "Cash"},
    )
    assert a_cross.status_code == 404, a_cross.text

    b_cross = client.post(
        "/api/sales",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"product_id": str(server_module.db.products.items[0]["_id"]), "quantity": 2, "payment_method": "Cash"},
    )
    assert b_cross.status_code == 404, b_cross.text


def test_myops_session_is_required_for_every_route(server_module):
    client = TestClient(server_module.app)
    manager_a = server_module.db.users.items[0]
    token_without_session = server_module.create_access_token({
        "user_id": str(manager_a["_id"]),
        "email": manager_a["email"],
        "role": "manager",
    })

    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_without_session}"})
    assert resp.status_code == 401, resp.text
    assert "MYOPS session required" in resp.json()["detail"]


def test_inventory_and_reports_are_scoped_to_the_current_tenant(server_module):
    client = TestClient(server_module.app)
    manager_a = server_module.db.users.items[0]
    manager_b = server_module.db.users.items[1]
    token_a = _token(server_module, manager_a["_id"], manager_a["email"], session_id="manager-a-session", firebase_uid="manager-a-firebase")
    token_b = _token(server_module, manager_b["_id"], manager_b["email"], session_id="manager-b-session", firebase_uid="manager-b-firebase")

    sale_by_a = client.post(
        "/api/sales",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"product_id": str(server_module.db.products.items[0]["_id"]), "quantity": 3, "payment_method": "QR"},
    )
    assert sale_by_a.status_code == 200, sale_by_a.text

    sale_by_b = client.post(
        "/api/sales",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"product_id": str(server_module.db.products.items[1]["_id"]), "quantity": 2, "payment_method": "Cash"},
    )
    assert sale_by_b.status_code == 200, sale_by_b.text

    inventory_a = client.get("/api/inventory-movements", headers={"Authorization": f"Bearer {token_a}"})
    assert inventory_a.status_code == 200, inventory_a.text
    assert all(item["product_id"] != str(server_module.db.products.items[1]["_id"]) for item in inventory_a.json())

    inventory_b = client.get("/api/inventory-movements", headers={"Authorization": f"Bearer {token_b}"})
    assert inventory_b.status_code == 200, inventory_b.text
    assert all(item["product_id"] != str(server_module.db.products.items[0]["_id"]) for item in inventory_b.json())

    top_a = client.get("/api/reports/top-products", headers={"Authorization": f"Bearer {token_a}"})
    assert top_a.status_code == 200, top_a.text
    assert sum(item["quantity"] for item in top_a.json()) == 3

    top_b = client.get("/api/reports/top-products", headers={"Authorization": f"Bearer {token_b}"})
    assert top_b.status_code == 200, top_b.text
    assert sum(item["quantity"] for item in top_b.json()) == 2
