import base64
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from backend.myops_app_access import (
    MyopsAccessError,
    canonical_json,
    canonical_request,
    signed_headers,
    validate_redeem_response,
)


class MyopsAppAccessContractTests(unittest.TestCase):
    def test_canonical_json_sorts_nested_keys(self):
        self.assertEqual(canonical_json({"z": 1, "a": {"y": True, "b": None}}), '{"a":{"b":null,"y":true},"z":1}')

    def test_signature_binds_endpoint_and_body(self):
        private_key = Ed25519PrivateKey.generate()
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()
        config = {
            "MYOPS_APP_API_ORIGIN": "https://www.myops.com.my",
            "MYOPS_APP_ID": "opsflow",
            "MYOPS_KEY_VERSION": "current",
            "MYOPS_APP_PRIVATE_KEY_CURRENT": private_pem,
        }
        body = {"ticket": "A" * 43}
        with patch.dict("os.environ", config, clear=False):
            headers = signed_headers("/api/app/redeem", body, now_ms=1234)
        message = canonical_request(
            "/api/app/redeem", "opsflow", "current", "1234",
            headers["X-Myops-Nonce"], body,
        ).encode()
        signature = base64.urlsafe_b64decode(headers["X-Myops-Signature"] + "==")
        private_key.public_key().verify(signature, message)
        with self.assertRaises(Exception):
            private_key.public_key().verify(signature, message + b"changed")

    def test_redeem_response_requires_opsflow_product_and_valid_ids(self):
        self.assertEqual(
            validate_redeem_response({
                "product": "opsflow",
                "session_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                "user_ref": "U" * 43,
            })["product"],
            "opsflow",
        )
        with self.assertRaises(MyopsAccessError):
            validate_redeem_response({"product": "opsfinance", "session_id": "bad", "user_ref": "bad"})


if __name__ == "__main__":
    unittest.main()
