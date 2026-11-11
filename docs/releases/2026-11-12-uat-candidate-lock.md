# OpsFlow staging candidate record

User authorized deployment once critical release gates pass. Tested code candidate: c250db5380509825d9a02fae17b32e38dbf2dd28. Staging deployment dpl_4oeTEKZBh3y8PFXF37sz1oYyfoeT READY. Production not deployed.

## Verified staging browser workflows
- Central MYOPS login launches OpsFlow without a second login.
- Cash sale S35949144: subtotal RM20, tax RM1.20, total RM21.20; stock 12 to 11. Completed receipt remains after cart clears.
- Reports: three sales total RM84.80; finance three cash entries/net RM84.80.
- Empty cart denied. Zero-stock UAT Receipt Nov12 sale rejected with insufficient stock; quantity unchanged.
- Product UAT-NOV12-RECEIPT created at zero stock. Restock 0 to 1, ADJUSTMENT 1; inventory cost RM110 to RM115.
- Purchase PO36505655 two units at RM5, RM10 total. Goods receipt GR36527785 saved, Fully Received; stock 1 to 3; PURCHASE 2; inventory cost RM125.

## Automated evidence
GitHub Actions on candidate: 43110859826 web/SSO contracts SUCCESS; 43110859838 staging QA SUCCESS; 43110859824 public browser checks SUCCESS. Earlier runs 43110421063/43110421093/43110421081 also SUCCESS.
Local PGlite gateway, atomic quota, onboarding and browser schema privilege checks PASS. These are isolated database tests, not a new live production isolation test.
Local shared Python runtime ran 50 tests with one 401/403 expectation mismatch. Isolated dependency reinstall was blocked by network policy to pypi.org; do not claim that local rerun passed. Pinned-dependency GitHub CI above succeeded.

## Remaining release gates
Full real payment sandbox/subscription lifecycle, production backup/recovery evidence, targeted production migration review/rollback, production entitlement/configuration verification and production smoke tests remain open. No live charges, production migration or production promotion performed. This record locks tested scope, not full production approval.
