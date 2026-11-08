"""A disabled preview feature must never turn trial commits into paid writes."""
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app as api

class WriteGateTests(unittest.TestCase):
    def commit(self, access, env):
        with patch.dict('os.environ', env, clear=True), patch.object(api, 'session_context', return_value={'session_id':'bound'}), patch.object(api, 'call_myops', return_value=access), patch.object(api, 'database', return_value={'committed':True}) as db:
            response = TestClient(api.app).post('/api/data', headers={'Authorization':'Bearer '+'A'*64}, json={'action':'commit','payload':{'request_id':'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','operations':[]}})
            return response, db.call_args_list

    def test_trial_never_bypasses_quota_when_gate_is_off_or_environment_is_production(self):
        access={'entitled':True,'session_active':True,'access_mode':'trial','trial':{'policy_version':1,'id':'dddddddd-dddd-4ddd-8ddd-dddddddddddd','expires_at':'2099-01-01T00:00:00Z'}}
        for env in [{},{'VERCEL_ENV':'preview','OPSFLOW_TRIAL_ENFORCEMENT':'false'},{'VERCEL_ENV':'production','OPSFLOW_TRIAL_ENFORCEMENT':'true'}]:
            with self.subTest(env=env):
                response,calls=self.commit(access,env)
                self.assertEqual(response.status_code,503)
                self.assertEqual(calls,[])

    def test_paid_commit_requires_active_explicit_central_mode_with_gate_off(self):
        for access in [{},{'entitled':True,'session_active':False,'access_mode':'paid'},{'entitled':True,'session_active':True,'access_mode':'unexpected'}]:
            response,calls=self.commit(access,{})
            self.assertIn(response.status_code,[403,503]);self.assertEqual(calls,[])
        response,calls=self.commit({'entitled':True,'session_active':True,'access_mode':'paid'},{'VERCEL_ENV':'production'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(calls[0].args[0],'rpc/opsflow_document_gateway')

    def test_expired_or_malformed_trial_does_not_write(self):
        for trial in [{'id':'bad','policy_version':1,'expires_at':'2099-01-01T00:00:00Z'},{'id':'dddddddd-dddd-4ddd-8ddd-dddddddddddd','policy_version':1,'expires_at':'2000-01-01T00:00:00Z'}]:
            response,calls=self.commit({'entitled':True,'session_active':True,'access_mode':'trial','trial':trial},{'VERCEL_ENV':'preview','OPSFLOW_TRIAL_ENFORCEMENT':'true'})
            self.assertEqual(response.status_code,403);self.assertEqual(calls,[])
