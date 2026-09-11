import importlib
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from bson import ObjectId

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class FakeCollection:
    def __init__(self, items=None):
        self.items = list(items or [])

    async def count_documents(self, query=None):
        return len(self._filter_items(query))

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
                if key == "_id":
                    item_value = item.get("_id")
                    if isinstance(expected, str):
                        if str(item_value) != expected:
                            match = False
                    elif item_value != expected:
                        match = False
                    continue
                if item.get(key) != expected:
                    match = False
                    break
            if match:
                filtered.append(item)
        return filtered

    def _matches_subset(self, item, clause):
        for key, expected in clause.items():
            if item.get(key) != expected:
                return False
        return True

    def find(self, query=None):
        class Cursor:
            def __init__(self, items):
                self.items = items

            def sort(self, *args, **kwargs):
                return self

            async def to_list(self, limit=1000):
                return list(self.items)

        return Cursor(self._filter_items(query))

    async def find_one(self, query=None):
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
                    sub_match = any(self._matches_subset(item, clause) for clause in value)
                    if not sub_match:
                        match = False
                        break
                else:
                    if item.get(key) != value:
                        match = False
                        break
            if match:
                return item
        return None

    async def insert_one(self, document):
        document.setdefault("_id", ObjectId())
        self.items.append(document)
        return type("Result", (), {"inserted_id": document["_id"]})()

    async def insert_many(self, documents):
        for document in documents:
            document.setdefault("_id", ObjectId())
        self.items.extend(documents)
        return type("Result", (), {"inserted_ids": [document["_id"] for document in documents]})()

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
        for idx, item in enumerate(self.items):
            if all(item.get(k) == v for k, v in query.items()):
                del self.items[idx]
                return type("Result", (), {"deleted_count": 1})()
        return type("Result", (), {"deleted_count": 0})()


class FakeDB:
    def __init__(self):
        self.users = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439013"), "email": "owner@example.com", "password": "$2b$12$Q4x8ivBf3l9qPmWxNI5cluRTg4I9LNlH2v7bIYbHEp4x5v2GY7oK6", "company_name": "Alpha", "name": "Owner"},
            {"_id": ObjectId("507f1f77bcf86cd799439014"), "email": "member@example.com", "password": "$2b$12$Q4x8ivBf3l9qPmWxNI5cluRTg4I9LNlH2v7bIYbHEp4x5v2GY7oK6", "company_name": "Beta", "name": "Member"},
        ])
        self.companies = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439011"), "companyName": "Alpha", "email": "owner@example.com", "plan": "Pro", "status": "Active", "trialEnd": "2026-01-01T00:00:00", "subscriptionEnd": "2026-02-01T00:00:00", "createdAt": "2026-01-01T00:00:00"},
            {"_id": ObjectId("507f1f77bcf86cd799439012"), "companyName": "Beta", "email": "member@example.com", "plan": "Basic", "status": "Trial", "trialEnd": "2026-02-01T00:00:00", "subscriptionEnd": None, "createdAt": "2026-01-02T00:00:00"},
        ])
        self.business_members = FakeCollection([
            {"_id": ObjectId("507f1f77bcf86cd799439021"), "user_id": "507f1f77bcf86cd799439013", "business_id": "507f1f77bcf86cd799439011", "role": "owner", "status": "active"},
            {"_id": ObjectId("507f1f77bcf86cd799439022"), "user_id": "507f1f77bcf86cd799439014", "business_id": "507f1f77bcf86cd799439012", "role": "member", "status": "active"},
        ])
        self.categories = FakeCollection([])
        self.products = FakeCollection([])


@pytest.fixture
def server_module(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-key-1")
    monkeypatch.setenv("SUPER_ADMIN_EMAIL", "superadmin@opsflow.dev")
    monkeypatch.setenv("SUPER_ADMIN_PASSWORD", "StrongPass!123")
    monkeypatch.setenv("MONGO_URL", "mongodb://localhost:27017")
    monkeypatch.setenv("DB_NAME", "opsflow_test")

    import server
    importlib.reload(server)
    server.db = FakeDB()
    return server


def test_register_login_and_me_with_jwt(server_module):
    client = TestClient(server_module.app)

    register_resp = client.post(
        "/api/auth/register",
        json={"email": "newtenant@example.com", "password": "Passw0rd!123", "company_name": "New Tenant"},
    )
    assert register_resp.status_code == 200, register_resp.text

    token = register_resp.json()["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["email"] == "newtenant@example.com"

    invalid = client.get("/api/auth/me", headers={"Authorization": "Bearer bad-token"})
    assert invalid.status_code == 401

    expired = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {server_module.create_access_token({'user_id': '507f1f77bcf86cd799439013', 'exp': -1})}"},
    )
    assert expired.status_code == 401


def test_business_membership_validation_rejects_cross_business_access(server_module):
    client = TestClient(server_module.app)

    member_user = server_module.db.users.items[1]
    token = server_module.create_access_token({"user_id": str(member_user["_id"]), "email": member_user["email"], "role": "member"})

    allowed = client.get(
        "/api/businesses/507f1f77bcf86cd799439012/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert allowed.status_code == 200, allowed.text

    denied = client.get(
        "/api/businesses/507f1f77bcf86cd799439011/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert denied.status_code == 403, denied.text


def test_basic_role_permission_guard(server_module):
    client = TestClient(server_module.app)

    member_user = server_module.db.users.items[1]
    token = server_module.create_access_token({"user_id": str(member_user["_id"]), "email": member_user["email"], "role": "member"})

    response = client.get(
        "/api/businesses/507f1f77bcf86cd799439012/owner-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403, response.text
