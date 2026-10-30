import sys
from pathlib import Path
import unittest
from unittest.mock import patch, MagicMock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import app as api

class VercelApiTests(unittest.TestCase):
 def setUp(self): self.client=TestClient(api.app)
 def test_readiness_checks_database_without_returning_profiles(self):
  with patch.object(api,'database',return_value=[]) as db:
   self.assertEqual(self.client.get('/api/ready').json(),{'ready':True,'database':'reachable'})
   db.assert_called_once_with('opsflow_profiles?select=id&limit=0')
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
  with patch.object(api,'access_context',return_value={'session_id':'session'}),patch.object(api,'call_myops',return_value={'entitled':False,'session_active':False}),patch.object(api,'database') as db:
   result=self.client.post('/api/app-access/refresh',headers={'Authorization':'Bearer '+'A'*64},json={'activity':False})
   self.assertEqual(result.status_code,403);self.assertEqual(db.call_args.args[0],'rpc/opsflow_onboarding')
 def test_passive_refresh_does_not_claim_activity(self):
  with patch.object(api,'access_context',return_value={'session_id':'session'}),patch.object(api,'call_myops',return_value={'entitled':True,'session_active':True}) as central,patch.object(api,'database',return_value=True):
   self.assertEqual(self.client.post('/api/app-access/refresh',headers={'Authorization':'Bearer '+'A'*64},json={}).status_code,200)
   self.assertFalse(central.call_args.args[1]['activity'])
 def test_verified_unprovisioned_launch_enters_onboarding_without_profile(self):
  reply={'product':'opsflow','user_ref':'U'*43,'session_id':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}
  with patch.object(api,'call_myops',return_value=reply),patch.object(api,'database',side_effect=[None,{'onboarding_required':True}]):
   response=self.client.post('/api/app-access/redeem',json={'ticket':'T'*43})
   self.assertEqual(response.status_code,200)
   self.assertTrue(response.json()['onboarding_required']);self.assertIsNone(response.json()['profile'])
 def test_onboarding_revalidates_central_before_database_write(self):
  with patch.object(api,'access_context',return_value={'session_id':'session','onboarding_required':True}),patch.object(api,'call_myops',return_value={'entitled':False,'session_active':False}),patch.object(api,'database') as db:
   response=self.client.post('/api/onboarding/company',headers={'Authorization':'Bearer '+'A'*64},json={'company_name':'Test','display_name':'Owner'})
   self.assertEqual(response.status_code,403)
   self.assertFalse(any(c.args[0]=='rpc/opsflow_onboarding' and c.args[1].get('p_action')=='complete' for c in db.call_args_list))
 def test_onboarding_transport_failure_does_not_create_company(self):
  with patch.object(api,'access_context',return_value={'session_id':'session'}),patch.object(api,'call_myops',side_effect=api.MyopsAccessError('unavailable')),patch.object(api,'database') as db:
   response=self.client.post('/api/onboarding/company',headers={'Authorization':'Bearer '+'A'*64},json={'company_name':'Test','display_name':'Owner'})
   self.assertEqual(response.status_code,503);db.assert_not_called()
 def test_onboarding_uses_only_server_bound_identity(self):
  with patch.object(api,'access_context',return_value={'session_id':'session'}),patch.object(api,'call_myops',return_value={'entitled':True,'session_active':True}) as central,patch.object(api,'database',return_value={'uid':'owner','companyId':'new','role':'admin'}) as db:
   response=self.client.post('/api/onboarding/company',headers={'Authorization':'Bearer '+'A'*64},json={'company_name':'Test','display_name':'Owner','user_ref':'attacker','company_id':'other','role':'cashier'})
   self.assertEqual(response.status_code,200)
   self.assertEqual(set(db.call_args.args[1]),{'p_action','p_token_hash','p_company_name','p_display_name'})
   self.assertTrue(central.call_args.args[1]['sensitive']);self.assertTrue(central.call_args.args[1]['activity'])
 def test_pending_passive_refresh_is_not_activity(self):
  with patch.object(api,'access_context',return_value={'session_id':'session','onboarding_required':True}),patch.object(api,'call_myops',return_value={'entitled':True,'session_active':True}),patch.object(api,'database',return_value={'onboarding_required':True}) as db:
   self.assertEqual(self.client.post('/api/app-access/refresh',headers={'Authorization':'Bearer '+'A'*64},json={}).status_code,200)
   self.assertFalse(db.call_args.args[1]['p_activity'])
 def test_production_requires_its_own_database_reference(self):
  base={'VERCEL_ENV':'production','OPSFLOW_SUPABASE_URL':'https://ojamkplflqafedmxbdxb.supabase.co','OPSFLOW_SUPABASE_SERVICE_ROLE_KEY':'dummy'}
  for ref in ['',api.STAGING_PROJECT_REF]:
   with patch.dict(api.os.environ,{**base,'OPSFLOW_SUPABASE_PROJECT_REF':ref},clear=True):
    with self.assertRaises(api.HTTPException): api.database_config()
 def test_production_database_host_must_match_explicit_reference(self):
  ref='p'*20
  base={'VERCEL_ENV':'production','OPSFLOW_SUPABASE_PROJECT_REF':ref,'OPSFLOW_SUPABASE_SERVICE_ROLE_KEY':'dummy'}
  for origin in ['https://'+ref+'.supabase.co.evil.test','https://'+ref+'.supabase.co?bad=1','https://user:secret@'+ref+'.supabase.co','https://'+ref+'.supabase.co:443','https://ojamkplflqafedmxbdxb.supabase.co']:
   with patch.dict(api.os.environ,{**base,'OPSFLOW_SUPABASE_URL':origin},clear=True):
    with self.assertRaises(api.HTTPException): api.database_config()
  with patch.dict(api.os.environ,{**base,'OPSFLOW_SUPABASE_URL':'https://'+ref+'.supabase.co'},clear=True):
   self.assertEqual(api.database_config(),('https://'+ref+'.supabase.co','dummy'))
 def test_preview_cannot_use_the_production_database(self):
  with patch.dict(api.os.environ,{'VERCEL_ENV':'preview','OPSFLOW_SUPABASE_PROJECT_REF':'p'*20,'OPSFLOW_SUPABASE_URL':'https://'+('p'*20)+'.supabase.co','OPSFLOW_SUPABASE_SERVICE_ROLE_KEY':'dummy'},clear=True):
   with self.assertRaises(api.HTTPException): api.database_config()
 def test_existing_staging_configuration_remains_valid(self):
  with patch.dict(api.os.environ,{'VERCEL_ENV':'preview','OPSFLOW_SUPABASE_URL':'https://'+api.STAGING_PROJECT_REF+'.supabase.co','OPSFLOW_SUPABASE_SERVICE_ROLE_KEY':'dummy'},clear=True):
   self.assertEqual(api.database_config()[1],'dummy')
 def test_secret_api_key_uses_apikey_header_without_bearer(self):
  for key in ['sb_secret_dummy','legacy-test-key']:
   response=MagicMock();response.__enter__.return_value.read.return_value=b'[]'
   with patch.object(api,'database_config',return_value=('https://'+api.STAGING_PROJECT_REF+'.supabase.co',key)),patch.object(api,'urlopen',return_value=response) as transport:
    self.assertEqual(api.database('opsflow_profiles?limit=0'),[])
    request=transport.call_args.args[0]
    self.assertEqual(request.get_header('Apikey'),key)
    if key.startswith('sb_secret_'): self.assertIsNone(request.get_header('Authorization'))
    else: self.assertEqual(request.get_header('Authorization'),'Bearer '+key)
if __name__=='__main__':unittest.main()
