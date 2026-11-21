# Step 5 — OpsFlow release candidate, 8 November 2026

Status: code and local verification complete. Not merged or deployed. Integrated authenticated browser UAT is pending; this document is not a production UAT approval.

## Reconcile live and main

Main was `25f1c3363be99082bf52cdf9d2b30a524499d332`; the observed production build was `99cf601aa6d7f639561059ca92f90031128fe538`. Main and production had diverged. This candidate incorporates the migration branch `c6bee041210aca9cfbb69ced0a97c3ba1fc3b1ea`, the production return-navigation/zero-stock fixes, responsive web PR #7, inventory PR #14 and localization PR #13. Conflicts retain the real sales/cash calculations and the shared central-login entry instead of resurrecting the obsolete marketing page, standalone pricing, fake chart values or duplicate credential screens.

The displayed app name is OpsFlow. Existing internal BizFlow component identifiers are retained. Existing PRs remain open for review; this consolidated candidate does not authorize separately merging all overlapping PRs.

## Changes

- All data commits verify active central entitlement and an explicit paid/trial access mode. A disabled trial flag cannot silently grant the ordinary unlimited write path. Trial writes require the preview gate, verified unexpired policy version 1, server-bound trial/session identifiers and a stable operation UUID. Atomic SQL handles quota and document changes together. Production trial writes remain blocked pending integrated UAT/release approval.
- The signing adapter accepts only canonical `opsflow`. Bundle eligibility belongs in central MYOPS; do not merge the fuzzy/nested product-name matching in PR #15 or the cross-app signing identity expansion in PR #12. This preserves per-app authority and does not remove legitimate centrally resolved bundle grants.
- Zero minimum stock is retained by setup, inventory and dashboard; the warning boundary remains inclusive.
- Repeated Checkout clicks share an in-flight lock. Cart and payment controls are disabled while saving; a failed save releases the lock for retry.
- Existing MYOPS central login and return navigation are retained. A four-language selector is available in the app shell and legacy header. Fixed labels, headings, controls and messages in the eight customer screens use English, Malay, Simplified Chinese and Tamil dictionaries. User-entered names/data and payment API enums retain their original values. Unknown copy falls back to its source text; this is not a claim that every legacy screen or backend validation message is translated.
- Web navigation collapses below 900px, wide tables can scroll horizontally, and customer cards no longer force a 320px minimum inside a padded small-screen shell. Preserve the approved palette and dashboard structure.

## Verification on the candidate

- Backend: 46 unittest tests pass, including default-off/production trial denial, explicit paid access, revoked/missing access, expired/malformed trial metadata and cross-app signing identity rejection.
- Frontend: 36 Node tests pass, including real utility execution at zero stock, four-language dictionary coverage, unchanged user data, double-submit suppression, failure retry, document transaction behavior and central-entry routing.
- PGlite: all three gateway, atomic-trial and onboarding scripts pass. These replay repository migrations in isolated local databases and verify tenant isolation, rollback, optimistic conflicts, replay/idempotency, quota rollback and session no-revival.
- TypeScript, Expo lint and web export pass. No Android/iOS build is part of this release.

## Release gates still pending

1. Central MYOPS PRs #52 and #53 must provide the approved trial/package policy and explicit entitlement modes before this app is released with them.
2. Review GitHub CI on the published candidate; inspect the preview runtime and confirm required migration/configuration on the intended database. No hosted migration, environment change or production deployment was performed in step 5.
3. Authenticated integrated browser UAT: MYOPS launch, actual company/role permissions, sale + stock + ledger, purchase/partial receipt, report totals, 30/31 trial boundary, expiry, upgrade/revocation, mobile layouts, language persistence and 15-minute inactivity behavior. Local suites do not substitute for these checks.
4. Finish OpsPS (step 6) and OpsHR (step 7), then integrated UAT and the final release decision. OpsHR remains in scope. OpsWMS stays Coming Soon; OpsHub is separate.

Rollback reference: keep the observed production deployment and SHA above until a release passes its gates. No existing production record was created or modified in this work.
