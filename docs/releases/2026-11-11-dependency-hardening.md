# OpsFlow staging dependency hardening

Candidate based on existing staging QA commit fb3e097ce0968b8312a41c2a246400a999d70733. Production remains on its previous deployment; no production configuration or database was changed.

Changes:
- Upgrade SheetJS from registry 0.18.5 to the official vendor's pinned 0.20.3 tarball, with integrity recorded in both lockfiles. Vendor instructions: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/ .
- Apply compatible transitive dependency fixes, PostCSS 8.5.23 and Metro 0.83.8. Keep Expo SDK 54 and React Native 0.81.5.
- Use query-string 9.5.1 and its patched decoder. A narrow Metro resolver adapter preserves the CommonJS named-export interface expected by Expo Router 6, while the adapter itself imports the actual upstream package.
- Add regression coverage for multilingual Excel workbook round trips, Metro PNG buffer/file-path loading, and Unicode/malformed query parsing.
- Add bounded CI browser checks of the exported SPA on desktop, Pixel 5, iPhone 12 WebKit and tablet emulation. These test signed-out navigation with a stub central destination and missing-ticket denial; they do not authenticate or contact production MYOPS.

Executed locally:
- Dependency installation: PASS.
- Node tests: 32 PASS, zero skipped.
- TypeScript: PASS.
- Lint: PASS.
- Expo production web export: PASS.
- Database migration/gateway, atomic quota and onboarding isolation regressions: PASS.
- npm audit: improved from 42 findings (17 high, zero critical) to 24 findings (21 moderate, three low, zero high/critical). Audit results are dependency inventory findings, not proof of absence of application vulnerabilities.

CI on commit 5c8416611d2d5e53020a733ae530b235a03db786 PASS: web/SSO contract checks run 43064210638, staging QA run 43064210732 and public browser run 43064210745. Browser logs confirm eight tests passed across all four emulated viewports. New schema-grant migration verification is local/live-staging PASS; CI will rerun on that follow-up commit. At this checkpoint, authenticated OpsFlow launch, POS transaction/receipt/inventory workflows, MYOPS entitlement enforcement, live staging database policy verification and production release/backup checks remain open. Subscription checkout and payment lifecycle UAT belong exclusively to MYOPS; OpsFlow verifies the resulting entitlement. Do not promote on build success alone.

Rollback: restore the parent commit's package files, lockfiles and Metro configuration, and redeploy the previous immutable deployment if this candidate is ever promoted. No database migration belongs to this change.


## Staging database privilege repair

Direct inspection of existing OpsFlow staging ojamkplflqafedmxbdxb found six historical grants: anon and authenticated each held TRUNCATE, REFERENCES and TRIGGER on public.business_payment_profiles. All public tables already had RLS, which does not protect these table-level operations.

Captured the exact old grants in 2026-11-11-staging-schema-grants-rollback.sql before applying opsflow_remove_browser_schema_privileges to staging only. The migration revokes these schema operations across existing public tables while preserving data privileges, service-role access and row policies. Verification: excess browser schema grants zero; public tables without RLS zero; service-role SELECT on business_payment_profiles true. An isolated PGlite regression confirmed direct anonymous TRUNCATE is denied and service-role data access remains. No production database or data rows were modified.

Supabase health advisors returned no findings. Security/performance advisors still include policy/RPC/password-protection and indexing findings in the shared staging database; these have not all been resolved or declared PASS. Do not treat dependency audit results as a complete security release approval.
