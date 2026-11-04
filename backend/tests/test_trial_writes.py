import unittest
from unittest.mock import Mock
from backend.trial_writes import enforce_trial_writes
from backend.trial_writes import MyopsAccessError
class TrialWriteTests(unittest.TestCase):
 def test_retry_duplicate_and_company_scope(self):
  consume=Mock();context={'companyId':'company-a','session_id':'verified'}
  op={'kind':'set','collection':'sales','id':'sale-1'}
  enforce_trial_writes(context,{'operations':[op,op]},consume)
  self.assertEqual(consume.call_count,1);first=consume.call_args.args[2]
  consume.reset_mock();enforce_trial_writes({**context,'session_id':'new-login'},{'operations':[op]},consume)
  self.assertEqual(consume.call_args.args[2],first)
  consume.reset_mock();enforce_trial_writes({**context,'companyId':'company-b'},{'operations':[op]},consume)
  self.assertNotEqual(consume.call_args.args[2],first)
 def test_denial_stops_before_writer_and_invalid_input_never_consumes(self):
  consume=Mock(side_effect=MyopsAccessError('denied'))
  with self.assertRaises(MyopsAccessError):enforce_trial_writes({'companyId':'c','session_id':'s'},{'operations':[{'kind':'set','collection':'sales','id':'x'}]},consume)
  for payload in [{'operations':'bad'},{'operations':[{'kind':'set','collection':'users','id':'x'}]}]:
   consume.reset_mock()
   with self.assertRaises(MyopsAccessError):enforce_trial_writes({'companyId':'c','session_id':'s'},payload,consume)
   consume.assert_not_called()
