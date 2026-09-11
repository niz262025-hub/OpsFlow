import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def test_environment():
    os.environ.setdefault("SUPER_ADMIN_EMAIL", "superadmin@opsflow.dev")
    os.environ.setdefault("SUPER_ADMIN_PASSWORD", "StrongPass!123")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
    yield
