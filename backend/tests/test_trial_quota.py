import unittest
from unittest.mock import patch, Mock
from backend.myops_app_access import consume_trial_quota, MyopsAccessError, canonical_request
SID='10000000-0000-4000-8000-000000000001'
OP='20000000-0000-4000-8000-000000000001'
class TrialQuotaTests(unittest.TestCase):
 def test_staging_request_uses_bound_session_and_stable_operation(self):
  send=Mock(return_value={'allowed':True,'used':1,'limit':2,'replayed':False,'secret':'not exposed'})
  with patch.dict('os.environ',{'VERCEL_ENV':'preview'}):
   self.assertEqual(consume_trial_quota(SID,'workflows',OP,send=send),{'allowed':True,'used':1,'limit':2,'replayed':False})
  send.assert_called_once_with('/api/app/trial-quota',{'session_id':SID,'product':'opsflow','feature':'workflows','operation_id':OP})
  self.assertIn('/api/app/trial-quota',canonical_request('/api/app/trial-quota','opsflow','current','123','nonce',{}))
 def test_production_invalid_input_and_denial_fail_closed(self):
  send=Mock()
  with patch.dict('os.environ',{'VERCEL_ENV':'production'}):
   with self.assertRaises(MyopsAccessError):consume_trial_quota(SID,'workflows',OP,send=send)
  send.assert_not_called()
  with patch.dict('os.environ',{'VERCEL_ENV':'preview'}):
   for feature in ['automation','advanced_approval','unknown']:
    with self.assertRaises(MyopsAccessError):consume_trial_quota(SID,feature,OP,send=send)
   for response in [{'allowed':False},{'allowed':True,'used':3,'limit':2,'replayed':False},{'allowed':True,'used':True,'limit':2,'replayed':False},None]:
    with self.assertRaises(MyopsAccessError):consume_trial_quota(SID,'workflows',OP,send=lambda *a:response)
