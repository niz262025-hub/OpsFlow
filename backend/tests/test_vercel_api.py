import sys
from pathlib import Path
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import app as api

class VercelApiTests(unittest.TestCase):
 def setUp(self): self.client=TestClient(api.app)
 def test_health_identifies_central_auth(self):
  self.assertEqual(self.client.get('/api/health').json()['authentication'],'MYOPS')
 def test_legacy_login_registration_and_payment_cannot_grant_access(self):
  for route in ['/api/auth/login','/api/auth/register','/api/payments/success']:
   self.assertEqual(self.client.post(route,json={}).status_code,410)
 def test_data_requires_token_and_rejects_unknown_actions(self):
  self.assertEqual(self.client.post('/api/data',json={'action':'list'}).status_code,403)
  self.assertEqual(self.client.post('/api/data',headers={'Authorization':'Bearer short'},json={'action':'list'}).status_code,401)
  self.assertEqual(self.client.post('/api/data',headers={'Authorization':'Bearer '+'A'*64},json={'action':'raw_sql'}).status_code,400)
 def test_redeem_requires_verified_opsflow_ticket_and_mapping(self):
  self.assertEqual(self.client.post('/api/app-access/redeem',json={'ticket':'short'}).status_code,400)
  reply={'product':'opsflow','user_ref':'U'*43,'session_id':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}
  with patch.object(api,'call_myops',return_value=reply),patch.object(api,'database',return_value=None):
   self.assertEqual(self.client.post('/api/app-access/redeem',json={'ticket':'T'*43}).status_code,403)
  with patch.object(api,'call_myops',return_value={**reply,'product':'opsfinance'}):
   self.assertEqual(self.client.post('/api/app-access/redeem',json={'ticket':'T'*43}).status_code,403)
 def test_expired_local_session_not_forwarded_or_revived(self):
  with patch.object(api,'database',return_value=None),patch.object(api,'call_myops') as central:
   result=self.client.post('/api/app-access/refresh',headers={'Authorization':'Bearer '+'A'*64},json={'activity':True})
   self.assertEqual(result.status_code,401);central.assert_not_called()
 def test_central_revocation_closes_local_session(self):
  with patch.object(api,'session_context',return_value={'session_id':'session'}),patch.object(api,'call_myops',return_value={'entitled':False,'session_active':False}),patch.object(api,'database') as db:
   result=self.client.post('/api/app-access/refresh',headers={'Authorization':'Bearer '+'A'*64},json={'activity':False})
   self.assertEqual(result.status_code,403);self.assertEqual(db.call_args.args[0],'rpc/opsflow_close_session')
 def test_passive_refresh_does_not_claim_activity(self):
  with patch.object(api,'session_context',return_value={'session_id':'session'}),patch.object(api,'call_myops',return_value={'entitled':True,'session_active':True}) as central,patch.object(api,'database',return_value=True):
   self.assertEqual(self.client.post('/api/app-access/refresh',headers={'Authorization':'Bearer '+'A'*64},json={}).status_code,200)
   self.assertFalse(central.call_args.args[1]['activity'])
if __name__=='__main__':unittest.main()
