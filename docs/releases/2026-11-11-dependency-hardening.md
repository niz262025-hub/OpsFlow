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

New browser CI is pending execution. Authenticated OpsFlow launch, POS transaction/receipt/inventory workflows, subscription lifecycle, live staging database policy verification and production release/backup checks remain open. Do not promote on build success alone.

Rollback: restore the parent commit's package files, lockfiles and Metro configuration, and redeploy the previous immutable deployment if this candidate is ever promoted. No database migration belongs to this change.
