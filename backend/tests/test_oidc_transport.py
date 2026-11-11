"""Preview OIDC is origin scoped and never replaces app signatures."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import app as api
import myops_app_access as access



import unittest

class OidcTransportTests(unittest.TestCase):
    def test_platform_token_is_request_scoped_and_not_returned(self):
        seen = []
        def central(*args):
            seen.append(access.vercel_request_oidc.get())
            return {'entitled': False, 'session_active': False}
        with patch.dict('os.environ', {'VERCEL_ENV': 'preview'}), patch.object(api, 'call_myops', side_effect=central):
            client = TestClient(api.app)
            response = client.get('/api/sso-ready', headers={'x-vercel-oidc-token': 'dummy-oidc'})
            assert response.status_code == 200
            assert response.headers['cache-control'] == 'private, no-store'
            assert 'dummy-oidc' not in response.text + str(response.headers)
            assert client.get('/api/sso-ready').status_code == 200
        assert seen == ['dummy-oidc', '']
        assert access.vercel_request_oidc.get() == ''


    def test_oidc_transport_keeps_signature_and_rejects_redirects(self):
        client = MagicMock()
        client.open.return_value.__enter__.return_value.read.return_value = json.dumps({'entitled': False}).encode()
        marker = access.vercel_request_oidc.set('dummy-oidc')
        try:
            with patch.dict('os.environ', {'VERCEL_ENV': 'preview'}), \
                 patch.object(access, '_load_signing_config', return_value=('https://portal.vercel.app', 'opsflow', 'current', None)), \
                 patch.object(access, 'signed_headers', return_value={'X-Myops-Signature': 'dummy-signature'}), \
                 patch.object(access, 'build_opener', return_value=client), \
                 patch.object(access, 'preview_opener') as bootstrap:
                assert access.call_myops('/api/app/entitlement', {}) == {'entitled': False}
                request = client.open.call_args.args[0]
                assert request.full_url == 'https://portal.vercel.app/api/app/entitlement'
                assert request.get_header('X-vercel-trusted-oidc-idp-token') == 'dummy-oidc'
                assert request.get_header('X-myops-signature') == 'dummy-signature'
                bootstrap.assert_not_called()
        finally:
            access.vercel_request_oidc.reset(marker)


    def test_oidc_never_forwarded_to_production_or_other_hosts(self):
        marker = access.vercel_request_oidc.set('dummy-oidc')
        try:
            for environment, origin in [('production', 'https://portal.vercel.app'), ('preview', 'https://other.example')]:
                with patch.dict('os.environ', {'VERCEL_ENV': environment}), \
                     patch.object(access, '_load_signing_config', return_value=(origin, 'opsflow', 'current', None)), \
                     patch.object(access, 'signed_headers', return_value={}):
                    try:
                        access.call_myops('/api/app/entitlement', {})
                    except access.MyopsAccessError:
                        pass
                    else:
                        raise AssertionError('OIDC escaped Preview origin restriction')
        finally:
            access.vercel_request_oidc.reset(marker)
