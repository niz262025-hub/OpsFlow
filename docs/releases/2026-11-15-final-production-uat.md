# OpsFlow final production UAT decision — 15 November 2026 MYT

## Decision
**NO-GO for full paying-customer launch.** Production POS and admin operation pass. Ordinary-customer trial and paid entitlement end-to-end acceptance remain unproven; MYOPS production checkout/trial availability remains the central release prerequisite. FAIL below can mean an incomplete acceptance gate, not a reproduced application defect.

## Release under test
- Code: d4ed5b51677e31c26d8d7b80139891ba044ca150
- Production: https://opsflow.myops.com.my
- Deployment: dpl_bxd65x94di6gf3fXAHig14BxdxRP (READY)
- Production Supabase: sdrcndkdvvveisgtrlvp
- Preview: dpl_FKQM61M9X3b5mjgbwkTELk7wFpmV; Supabase ojamkplflqafedmxbdxb
- Rollback: dpl_Ha2fMnuiwD24wDCHM7RFHHRm6Yq6 / 245e221
- Current MYOPS Master production alias still resolves to dpl_6ZFHgET5G2uQAYigngcPrkDp8iZp. New staging monthly sandbox code has not been treated as production functionality.

## Acceptance matrix
Previously completed exact-release production evidence is retained rather than generating more synthetic sales unnecessarily.

| Test | Result | Evidence / scope |
|---|---|---|
| Central MYOPS login | PASS | Verified signed-in production page |
| Launch OpsFlow without second login | PASS | Production admin dashboard; repeated staging launch |
| Admin bypass without subscription purchase | PASS | Verified central admin and OpsFlow access |
| Session refresh | PASS | Production reports/dashboard refreshed |
| Natural idle expiry | PASS (staging) | Existing staging UAT session last activity 14 Nov 15:48:59 UTC; expired/revoked by 16:04:02 UTC. Direct /app returned to central MYOPS. No timestamps or sessions modified for this test |
| Expired/revoked session cannot revive | PASS (automated) | Backend and gateway replay suites |
| Production natural idle expiry | PASS | Existing production session last activity 14 Nov 15:53:36 UTC; revoked 16:08:25 UTC and idle_expired=true. Browser automatically returned from OpsFlow Reports to signed-out central MYOPS. No session timestamps were changed |
| Global logout | PASS | Central global logout followed by protected app reload returned to MYOPS |
| Signed-out protected page | PASS | Direct /app returned to MYOPS |
| Signed-out API | PASS | /api/auth/me returned 403 |
| Create isolated product | PASS | UAT-20261114-FINAL01, opening stock 10 |
| Edit catalog details | PASS | Staging name/price update; production name updated to UAT 20261114 Final POS Verified |
| Edit leaves stock/history unchanged | PASS | Production stock 10, price RM10; historical receipts retained |
| Add product to cart | PASS | One synthetic item, subtotal RM10 |
| Simulated cash sale | PASS | S71538725; no money transmitted |
| Receipt | PASS | RM10 subtotal + RM0.60 tax = RM10.60 |
| Inventory deduction | PASS | Stock 10 to 9 |
| Full refund | PASS | RF-S71538725, retained receipt marked Refunded |
| Inventory restoration | PASS | Stock 9 to 10 |
| Ledger reversal | PASS | Six cash entries, net RM0 verified in browser and SQL |
| Daily/report totals | PASS | Net sales RM0; three synthetic receipts retained as Refunded |
| MYOPS-only pricing/checkout | PASS | OpsFlow subscription page routes to MYOPS; legacy auth/subscription endpoint 410 |
| Central entitlement and trial enforcement | PASS (automated) | Sensitive writes revalidate authority; invalid/expired/unknown access fails closed; atomic quotas/idempotency suites pass |
| Hosted ordinary-customer active trial access | FAIL — incomplete | Supplied staging sign-in again showed Admin and existing paid/administrator access, so trial was not exercised |
| Hosted customer trial quota exhaustion | FAIL — incomplete | Requires an eligible non-admin UAT identity; no fabricated paid grant or role change |
| Hosted expired customer entitlement denial | FAIL — incomplete | Automated coverage passes; fresh customer lifecycle not executed |
| Production customer purchase-to-access | FAIL — blocked | Central production checkout remains closed; no real payment attempted |
| HTTPS/domain | PASS | Production custom-domain smoke |
| Correct production data source | PASS | New product update read back from sdrcndkdvvveisgtrlvp |
| Runtime error scan | PASS for inspected window | No error/fatal groups for deployed release in latest 15-minute scan |

## Bugs and fixes
1. Missing merchant product edit action: root cause was an existing updateProduct service not wired into Inventory. Fixed in d4ed5b5. Edit form changes catalog fields; stock continues through stock operations. Validated in staging and released to production.
2. Earlier missing refund/stock-ledger reversal and cash/report accounting corrections were already deployed before d4ed5b5 (245e221 tree). Post-release sale/refund smoke passes.

No new product defect was confirmed in this continuation. No production schema, secret, customer financial record, subscription grant or admin role was modified. No additional deployment was necessary.

## Validation
- Lint, TypeScript and web export: PASS.
- 43 frontend tests and 51 selected backend tests: PASS.
- Local PostgreSQL-compatible gateway suites: tenant isolation, reassignment denial, optimistic conflicts, atomic rollback, server timestamps, expired/revoked no-revival, browser table/RPC denial: PASS.
- Atomic trial quota/data rollback and idempotent retry/changed-payload rejection: PASS.
These are automated/local results, not substitutes for missing hosted customer UAT.

## Remaining blockers and continuation
1. Sign into staging using an existing eligible ordinary-customer UAT account, not the platform admin; validate no-entitlement, trial activation, launch, quota exhaustion and expiry.
2. Finish the MYOPS Master approved monthly billing/bundle gate and production customer entitlement smoke. Preserve RM9.90/RM19.90/RM29.90/RM39.90 and existing audit history; do not invent Starter limits or silently enable incomplete billing.
3. Issue GO only after all critical customer gates pass. OpsFinance, OpsPS Web and MYOPS Master final UAT remain queued after OpsFlow passes, as instructed. OpsHub excluded.

Read-only follow-up identified an existing dummy UAT profile with no trial record and a separate existing expired-trial fixture in the central staging database. The second connected account can read that project; the first account's permission denial is not a project-wide access failure. No account, grant, trial, session timestamp or credential was changed.

## Continuation — 15 November 2026, 01:05 MYT

User directs functional UAT first and central customer billing/entitlement validation LAST. Carry the missing non-admin customer lifecycle into the final shared gate; it does not block functional admin UAT of other applications.

Confirmed missing merchant catalog deletion on production Inventory. Added reversible Delete/Archived/Restore controls using existing catalog status. Archival uses an optimistic transaction and rejects nonzero stock/reservations; historical receipts and movements are retained. Checkout now checks the fresh product company/status before writing, rejecting archived products from stale carts.

- Fix commit: 6d6a3c742259eccd52a84573439c93fd9cc0ecbc.
- 50 frontend tests PASS (7 new lifecycle regressions); TypeScript, lint, web export PASS.
- Local gateway replay and atomic quota/idempotency suites PASS.
- Configured preview: dpl_7eGGRDrU4ryRoCwYsJSVrVKuR4mj READY; readiness HTTP 200.
- Production: dpl_C8p2KKsATYvhW5RiK2gwbuRpoGFY READY; production-built readiness HTTP 200 before promotion, custom production domain verified after promotion.
- Browser production SSO/admin and refresh PASS. Created only UAT-20261115-ARCHIVE at zero stock, archived and restored through merchant UI. Independent production SQL confirms same product, active, stock 0, version 3. Existing receipt fixtures retained.
- Browser production rejected archival of UAT-20261114-FINAL01 with stock 10; rendered stock/reservation error. No stock or sales were changed by this negative test.
- Signed-out /api/auth/me HTTP 403; zero public tables without RLS. Project runtime error scan returned no errors in the inspected 15-minute window.

OpsFlow functional/admin gate DONE using this new evidence plus the retained exact-source POS/refund and natural-expiry evidence above. Hosted non-admin lifecycle and final full-customer GO remain pending; no paid gate is claimed passed. Next: OpsFinance functional UAT. No real payment, customer-data deletion, schema change, auth role change or security reduction.
