import unittest
from unittest.mock import patch, MagicMock
from urllib.request import Request
from backend.myops_app_access import preview_opener, SameOriginRedirect, MyopsAccessError

class PreviewTransportTests(unittest.TestCase):
 def test_no_token_uses_standard_transport(self):
  with patch.dict('os.environ',{'MYOPS_STAGING_SHARE_TOKEN':''}):
   self.assertTrue(callable(preview_opener('https://www.myops.com.my')))
 def test_share_token_rejected_outside_preview_and_for_other_hosts(self):
  for env,origin in [('production','https://app.vercel.app'),('preview','https://example.com'),('preview','http://app.vercel.app')]:
   with patch.dict('os.environ',{'VERCEL_ENV':env,'MYOPS_STAGING_SHARE_TOKEN':'dummy-share'}):
    with self.assertRaises(MyopsAccessError):preview_opener(origin)
 def test_cookie_bootstrap_has_no_application_signature(self):
  client=MagicMock();client.open.return_value.__enter__.return_value=MagicMock()
  with patch.dict('os.environ',{'VERCEL_ENV':'preview','MYOPS_STAGING_SHARE_TOKEN':'dummy-share'}),patch('backend.myops_app_access.build_opener',return_value=client):
   preview_opener('https://portal.vercel.app')
  request=client.open.call_args.args[0]
  self.assertEqual(request.full_url,'https://portal.vercel.app/?_vercel_share=dummy-share')
  self.assertFalse(any(k.lower().startswith('x-myops') for k in request.headers))
 def test_cross_origin_redirect_is_rejected(self):
  handler=SameOriginRedirect('https://portal.vercel.app')
  with self.assertRaises(MyopsAccessError):handler.redirect_request(Request('https://portal.vercel.app'),None,302,'Found',{},'https://other.vercel.app/')
if __name__=='__main__':unittest.main()
