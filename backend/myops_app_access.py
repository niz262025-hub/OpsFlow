"""Signed server-to-server adapter for MYOPS app access."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import time
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

APP_ID_RE = re.compile(r"^[a-z][a-z0-9_-]{1,31}$")
TICKET_RE = re.compile(r"^[A-Za-z0-9_-]{43}$")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
USER_REF_RE = re.compile(r"^[A-Za-z0-9_-]{43}$")
MYOPS_PATHS = {"/api/app/redeem", "/api/app/entitlement"}


class MyopsAccessError(Exception):
    """An invalid, unavailable, or denied MYOPS access operation."""


def canonical_json(value: Any) -> str:
    """Match MYOPS's recursively sorted JSON serialization for signed bodies."""
    try:
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as error:
        raise ValueError("Value cannot be signed") from error


def canonical_request(path: str, app_id: str, key_version: str, timestamp: str, nonce: str, body: dict[str, Any]) -> str:
    if path not in MYOPS_PATHS:
        raise ValueError("Unsupported MYOPS path")
    body_hash = hashlib.sha256(canonical_json(body).encode("utf-8")).hexdigest()
    return "\n".join(("POST", path, app_id, key_version, timestamp, nonce, body_hash))


def is_launch_ticket(value: Any) -> bool:
    return isinstance(value, str) and TICKET_RE.fullmatch(value) is not None


def _load_signing_config() -> tuple[str, str, str, Ed25519PrivateKey]:
    origin = os.getenv("MYOPS_APP_API_ORIGIN", "").strip()
    app_id = os.getenv("MYOPS_APP_ID", "opsflow").strip()
    key_version = os.getenv("MYOPS_KEY_VERSION", "current").strip()
    private_pem = os.getenv(f"MYOPS_APP_PRIVATE_KEY_{key_version.upper()}") or os.getenv("MYOPS_APP_PRIVATE_KEY", "")
    parsed = urlsplit(origin)
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
        or not APP_ID_RE.fullmatch(app_id)
        or key_version not in {"current", "next"}
        or not private_pem
    ):
        raise MyopsAccessError("MYOPS app access is not configured")
    try:
        private_key = serialization.load_pem_private_key(private_pem.replace("\\n", "\n").encode(), password=None)
    except (TypeError, ValueError) as error:
        raise MyopsAccessError("MYOPS signing key is invalid") from error
    if not isinstance(private_key, Ed25519PrivateKey):
        raise MyopsAccessError("MYOPS signing key must be Ed25519")
    return f"{parsed.scheme}://{parsed.netloc}", app_id, key_version, private_key


def signed_headers(path: str, body: dict[str, Any], *, now_ms: int | None = None) -> dict[str, str]:
    _, app_id, key_version, private_key = _load_signing_config()
    timestamp = str(now_ms if now_ms is not None else int(time.time() * 1000))
    nonce = base64.urlsafe_b64encode(secrets.token_bytes(24)).decode().rstrip("=")
    message = canonical_request(path, app_id, key_version, timestamp, nonce, body).encode("utf-8")
    signature = base64.urlsafe_b64encode(private_key.sign(message)).decode().rstrip("=")
    return {
        "Content-Type": "application/json",
        "X-Myops-App-Id": app_id,
        "X-Myops-Key-Version": key_version,
        "X-Myops-Timestamp": timestamp,
        "X-Myops-Nonce": nonce,
        "X-Myops-Signature": signature,
    }


def call_myops(path: str, body: dict[str, Any], *, opener: Callable[..., Any] = urlopen) -> dict[str, Any]:
    origin, _, _, _ = _load_signing_config()
    request = Request(
        f"{origin}{path}",
        data=json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8"),
        headers=signed_headers(path, body),
        method="POST",
    )
    try:
        with opener(request, timeout=8) as response:
            payload = json.loads(response.read())
            if not isinstance(payload, dict):
                raise MyopsAccessError("MYOPS returned an invalid response")
            return payload
    except HTTPError as error:
        try:
            payload = json.loads(error.read())
        except (ValueError, OSError):
            payload = {}
        if error.code in (401, 403):
            return payload if isinstance(payload, dict) else {"entitled": False, "session_active": False}
        raise MyopsAccessError("MYOPS access could not be verified") from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        raise MyopsAccessError("MYOPS access could not be verified") from error


def validate_redeem_response(payload: Any) -> dict[str, str]:
    if not isinstance(payload, dict):
        raise MyopsAccessError("MYOPS returned an invalid launch response")
    session_id = payload.get("session_id")
    user_ref = payload.get("user_ref")
    if (
        payload.get("product") != "opsflow"
        or not isinstance(session_id, str)
        or not UUID_RE.fullmatch(session_id)
        or not isinstance(user_ref, str)
        or not USER_REF_RE.fullmatch(user_ref)
    ):
        raise MyopsAccessError("MYOPS launch is not authorized for OpsFlow")
    return {"session_id": session_id, "user_ref": user_ref, "product": "opsflow"}
