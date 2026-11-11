"""Every sensitive write must revalidate MYOPS, even without the trial flag."""
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import app as api


def write_with(access=None, error=None, env=None):
    with patch.dict(api.os.environ, env or {}, clear=True), \
         patch.object(api, 'session_context', return_value={'session_id': 'bound'}), \
         patch.object(api, 'call_myops', return_value=access, side_effect=error) as central, \
         patch.object(api, 'database', return_value={'committed': True}) as db:
        response = TestClient(api.app).post('/api/data',
            headers={'Authorization': 'Bearer ' + 'A' * 64},
            json={'action': 'commit', 'payload': {'operations': []}})
        return response, central.call_args, db.call_args_list


def test_revoked_access_without_trial_flag_never_writes():
    response, _, writes = write_with({'entitled': False, 'session_active': False})
    assert response.status_code == 403
    assert not writes


def test_trial_without_enforcement_never_falls_through_to_paid_gateway():
    for env in ({'VERCEL_ENV': 'preview'}, {'VERCEL_ENV': 'production', 'OPSFLOW_TRIAL_ENFORCEMENT': 'true'}):
        response, _, writes = write_with({'entitled': True, 'session_active': True, 'access_mode': 'trial'}, env=env)
        assert response.status_code == 403
        assert not writes


def test_transport_failure_without_trial_flag_never_writes():
    response, _, writes = write_with(error=api.MyopsAccessError('unavailable'))
    assert response.status_code == 503
    assert not writes


def test_verified_paid_write_is_sensitive_and_works_without_trial_flag():
    response, request, writes = write_with({'entitled': True, 'session_active': True, 'access_mode': 'paid'})
    assert response.status_code == 200
    assert request.args[1] == {'session_id': 'bound', 'product': 'opsflow', 'activity': True, 'sensitive': True}
    assert writes[0].args[0] == 'rpc/opsflow_document_gateway'


def test_unknown_access_mode_never_writes():
    response, _, writes = write_with({'entitled': True, 'session_active': True})
    assert response.status_code == 503
    assert not writes
