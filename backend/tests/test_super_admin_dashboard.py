import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class FakeCollection:
    def __init__(self, items):
        self.items = items

    async def count_documents(self, query=None):
        return len(self.items)

    def find(self, query=None):
        class Cursor:
            def __init__(self, items):
                self.items = items

            def sort(self, *args, **kwargs):
                return self

            async def to_list(self, limit=1000):
                return list(self.items)

        return Cursor(self.items)

    async def find_one(self, query=None):
        for item in self.items:
            if query is None:
                return item
            for key, value in query.items():
                item_value = item.get(key)
                if key == "_id" and (item_value == value or str(item_value) == str(value)):
                    return item
                if item_value == value:
                    return item
        return None

    async def insert_one(self, document):
        self.items.append(document)
        return type("Result", (), {"inserted_id": f"fake-id-{len(self.items)}"})()

    async def insert_many(self, documents):
        self.items.extend(documents)
        return type("Result", (), {"inserted_ids": [f"fake-id-{i}" for i in range(len(self.items), len(self.items) + len(documents))]})()

    async def update_one(self, query, update):
        for item in self.items:
            if all(item.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    item.update(update["$set"])
                if "$push" in update:
                    for key, value in update["$push"].items():
                        item.setdefault(key, []).append(value)
                return type("Result", (), {"matched_count": 1, "modified_count": 1})()
        return type("Result", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, query):
        return type("Result", (), {"deleted_count": 1})()


class FakeDB:
    def __init__(self):
        self.companies = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439011"), "companyName": "Acme", "email": "acme@example.com", "plan": "Pro", "status": "Active", "trialEnd": "2026-01-01T00:00:00", "subscriptionEnd": "2026-02-01T00:00:00", "createdAt": "2026-01-01T00:00:00"},
            {"_id": ObjectId("507f1f77bcf86cd799439012"), "companyName": "Beta", "email": "beta@example.com", "plan": "Basic", "status": "Trial", "trialEnd": "2026-02-01T00:00:00", "subscriptionEnd": None, "createdAt": "2026-01-02T00:00:00"},
        ])
        self.users = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439013"), "email": "company@example.com", "password": "hash", "company_name": "Acme"},
        ])


@pytest.fixture
def server_module(monkeypatch):
    monkeypatch.setenv("MONGO_URL", "mongodb://localhost:27017")
    monkeypatch.setenv("DB_NAME", "bizflow_test")
    import importlib
    import server

    importlib.reload(server)
    server.db = FakeDB()
    return server


def test_admin_login_and_dashboard_summary(server_module):
    client = TestClient(server_module.app)

    login_resp = client.post(
        "/api/admin/login",
        json={"email": "superadmin@bizflow.my", "password": "BizFlow2026!"},
    )

    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]
    assert token

    summary_resp = client.get(
        "/api/admin/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert summary_resp.status_code == 200, summary_resp.text
    data = summary_resp.json()
    assert data["totalCompanies"] == 2
    assert data["trialCompanies"] == 1
    assert data["activeSubscriptions"] == 1


def test_reset_password_and_impersonation(server_module):
    client = TestClient(server_module.app)

    admin_login = client.post(
        "/api/admin/login",
        json={"email": "superadmin@bizflow.my", "password": "BizFlow2026!"},
    )
    token = admin_login.json()["access_token"]

    company_id = "507f1f77bcf86cd799439011"
    reset_resp = client.post(
        f"/api/admin/companies/{company_id}/reset-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": "NewPass123!"},
    )
    assert reset_resp.status_code == 200, reset_resp.text

    impersonate_resp = client.post(
        f"/api/admin/companies/{company_id}/impersonate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert impersonate_resp.status_code == 200, impersonate_resp.text
    assert impersonate_resp.json()["access_token"]


def test_payment_success_updates_company_subscription(server_module):
    client = TestClient(server_module.app)

    resp = client.post(
        "/api/subscriptions/payment-success",
        json={
            "companyId": "507f1f77bcf86cd799439011",
            "amount": 99.0,
            "method": "Bank Transfer",
            "reference": "REF-001",
        },
    )

    assert resp.status_code == 200, resp.text
    company = server_module.db.companies.items[0]
    assert company["status"] == "Active"
    assert company["paymentStatus"] == "Paid"
    assert company["paymentHistory"][0]["referenceNumber"] == "REF-001"
