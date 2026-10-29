import sys
from pathlib import Path
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import app as api
class SsoReadinessTests(unittest.TestCase):
 def test_only_expected_unknown_session_denial_proves_transport(self):
  with patch.dict('os.environ',{'VERCEL_ENV':'preview'}),patch.object(api,'call_myops',return_value={'entitled':False,'session_active':False}):
   self.assertEqual(TestClient(api.app).get('/api/sso-ready').status_code,200)
  with patch.dict('os.environ',{'VERCEL_ENV':'preview'}),patch.object(api,'call_myops',return_value={'error':'Application request is not authorized.'}):
   self.assertEqual(TestClient(api.app).get('/api/sso-ready').status_code,503)
 def test_check_unavailable_in_production(self):
  with patch.dict('os.environ',{'VERCEL_ENV':'production'}):
   self.assertEqual(TestClient(api.app).get('/api/sso-ready').status_code,404)
if __name__=='__main__':unittest.main()
