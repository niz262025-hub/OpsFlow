# OpsFlow production UAT and release handover — 14 November 2026

Decision: **NO-GO for full customer launch**. OpsFlow technical POS smoke passes; MYOPS Master production customer subscription/trial gate remains open.

## Release
- Repository: niz262025-hub/OpsFlow
- Branch: feat/opsflow-vercel-migration
- Deployed code: d4ed5b51677e31c26d8d7b80139891ba044ca150
- Production deployment: dpl_bxd65x94di6gf3fXAHig14BxdxRP, READY
- Production URL: https://opsflow.myops.com.my
- Production database: sdrcndkdvvveisgtrlvp
- Validated preview: dpl_FKQM61M9X3b5mjgbwkTELk7wFpmV
- Staging database: ojamkplflqafedmxbdxb
- Staging integration alias retained on the preview.
- Rollback: dpl_Ha2fMnuiwD24wDCHM7RFHHRm6Yq6 / 245e221ce0f1d2545cf31edae806a13c5c73ceb1

## Step 1 — SSO and admin
PASS: production central login, launch without second login, admin without subscription purchase, refresh, global logout, and signed-out protected-page denial. Global logout followed by OpsFlow reload returned to central MYOPS; direct signed-out /app access did not expose the workspace. Released /api/auth/me returned 403 without authentication.
Expired/revoked session behavior passed automated backend and local PostgreSQL-compatible gateway tests. Natural idle expiry was not independently waited out in this run.

## Step 2 — POS and inventory
Confirmed defect: the merchant Inventory screen offered creation/restock but no edit action despite an existing updateProduct service.
Fix: connected edit controls for catalog name, SKU, cost/selling prices, minimum stock and unit. Editing does not write stock or rewrite historical sale items. Save/edit actions are disabled during submission; Cancel edit returns to creation.

Staging: edited existing synthetic UAT-NOV12-RECEIPT to UAT Receipt Nov12 Edited and price RM12. Database and POS matched; stock stayed 3.
Production: created UAT-20261114-FINAL01 with stock 10, cost RM5, price RM10. Synthetic cash sale S70433437 for one unit totaled RM10.60 (RM10 + RM0.60 tax), reduced stock to 9 and produced a receipt. Full refund RF-S70433437 restored stock 10; net cash and sales returned to zero.
Post-release: renamed only that synthetic product to UAT 20261114 Final POS Verified. Correct production database reflected the change with stock 10 and price RM10. New synthetic cash sale S71538725 totaled RM10.60 and stock 9. Refund RF-S71538725 restored stock 10. Reports retained all three synthetic historical receipts as Refunded; net sales RM0. Finance showed six cash entries and net movement RM0; independent production SQL confirmed six entries/net 0.
No real money was charged or transmitted. No real customer transaction was altered. Synthetic evidence is retained.

## Step 3 — subscription integration
OpsFlow subscription UI directs users to MYOPS and offers no independent pricing/checkout. Legacy backend auth/subscription endpoint returns 410. Admin access is verified. Automated tests verify central entitlement revalidation, revoked/unknown access denial, trial policy/expiry validation and trial enforcement in preview/production.
Approved website prices remain RM9.90 / RM19.90 / RM29.90 / RM39.90; this release changes no plans, bundles, billing configuration or secrets.
BLOCKER: current production MYOPS homepage still displays disabled Checkout opening soon, payments unavailable, and OpsFlow trial not yet available. Staging shows trial eligibility and sandbox checkout, but a full non-admin customer entitlement lifecycle was not completed in this run. Do not claim paid/trial production customer UAT passed.

## Step 4 — validation and deployment
PASS: Expo lint, TypeScript noEmit, 43 frontend tests, 51 selected backend tests with repository-pinned FastAPI 0.110.1/httpx 0.27.2, web export and whitespace checks.
PASS: local gateway replay suite covering tenant boundaries, company reassignment denial, optimistic conflicts, atomic rollback, server timestamps, expired/revoked no-revival and browser table/RPC denial. Atomic trial suite passed quota/data rollback, idempotent retry and changed payload rejection.
Preview signed transport returned ready=true, signed_transport=verified, unknown_session=denied. Production-built readiness passed before promotion.
Production deployment was promoted and custom domain mapping verified. No schema change or production secret change was required.

## Step 5 — production smoke
PASS: custom HTTPS domain, database readiness 200, signed-out API 403, admin SSO/refresh, product editing, sale receipt, refund/inventory restoration, cash totals and reports.
Error/fatal runtime query for this release returned no groups in the 15-minute inspection window following smoke.
Overall customer GO remains withheld for Step 3 and the unperformed fresh customer-role lifecycle.

## Handover to next MYOPS release phase
1. MYOPS Master: finish and validate central approved monthly billing/bundles, sandbox settlement/callback idempotency, non-admin entitled/expired/denied access, and intentional trial availability before opening production checkout. Preserve audit history and existing prices; no independent app checkout.
2. OpsFinance: use current deployed source/checkpoint, finish remaining customer-role/tenant boundary UAT and central entitlement regression. Prior accounting checks are historical evidence, not a new PASS in this OpsFlow run.
3. OpsPS Web: finish functional UAT and customer trial/entitlement gates, then validate the intended production release. No OpsPS release was performed here.
4. Return to OpsFlow for central customer entitlement smoke after the Master gate is completed. Do not repeat successful POS fixtures unnecessarily.
OpsHub remains excluded.
