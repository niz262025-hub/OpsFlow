# OpsFlow Production release — 30 October 2026

## Live deployment

Owner approved Production deployment and an isolated OpsFlow Production database in the existing MYOPS organization.

- App URL: https://opsflow.myops.com.my
- OpsFlow code: 231c91c433ac488c54c55a116a746ac244950c32, branch feat/opsflow-vercel-migration, PR #3.
- Active OpsFlow Production deployment: dpl_C5PTH8w9J6FuEpKbDXjTUaypuAkH, READY. Rebuilt after the owner replaced the rejected secret key. Custom domain alias verified against this deployment.
- MYOPS URL: https://www.myops.com.my
- MYOPS code is unchanged from its previous live release: 6b94b84420fece804c12934301dc593b2749ab8b, release/platform-admin-live, PR #28. Production environment adds only the OpsFlow launch URL.
- Active MYOPS Production deployment: dpl_5LyCwPoWcmx5C48pqFZnXL45yUza, READY; www.myops.com.my alias verified. Prior rollback: dpl_J4xs36QDX49qGcHdqFKZKRoaQGdP.
- Existing OpsFinance deployment/database were not changed.

## Database and security verification

Supabase OpsFlow Production: sdrcndkdvvveisgtrlvp, MYOPS organization pjstjwarfjbxjjspvluq, Singapore ap-southeast-1, ACTIVE_HEALTHY. All three repository migrations installed. The owner manually completed the gateway after connector requestState failures.

SQL rollback test PASS: pending onboarding isolation, company creation, idempotency, product write/read and session revocation. Fixtures rolled back. Before authenticated UAT, profiles/companies/documents remain 0/0/0. Six tables have RLS enabled and no anon/authenticated SELECT privileges. The document RPC is not executable by browser roles.

A separate Production Ed25519 private key is stored as a sensitive Vercel value. The matching public key is registered in central MYOPS Production, with opsflow client enabled=true after database connectivity passed. Central entitlement checks remain active; no paid subscription record was fabricated. Staging and Production credentials/database references are separate.

The first Production readiness check correctly failed closed with HTTP 503; Supabase logs proved 401 UNAUTHORIZED_INVALID_API_KEY. The owner replaced OPSFLOW_SUPABASE_SECRET_KEY privately. After rebuilding, GET https://opsflow.myops.com.my/api/ready returns HTTP 200 with database=reachable.

HTTP checks: MYOPS homepage 200; OpsFlow database readiness 200; anonymous /api/auth/me 403; Preview-only /api/sso-ready 404 in Production. 29 backend tests and both GitHub CI jobs PASS on code 231c91c433ac488c54c55a116a746ac244950c32.

Staging fix candidate: dpl_8JXvXw2wncnRLdoxbbKSoYsK8Bud (READY), code 788edc84cefe08c7030f1c41a991dba0d243975a. Deploy Production candidates from an immutable SHA to avoid moving the staging branch alias.

## Authenticated Production UAT — latest observation

MYOPS login is now visibly confirmed: My Account, Admin and Logout appeared on https://www.myops.com.my/. Clicking OpsFlow Open App reached https://opsflow.myops.com.my/onboarding without a second login. PASS for central-login launch through verified onboarding access. Production pending onboarding session 93acb784-4e1d-4910-9606-235ce816b4bf was created at 2026-10-30T08:22:48.280318Z.

The owner replied “ok teruskan” after the exact Production company/name confirmation request. The UI create action was allowed, but failed with “MYOPS access could not be verified”. Logging out returned directly to https://www.myops.com.my/ (PASS for redirect). Relaunching OpsFlow through MYOPS again required no second login, created pending session 4bcf1e4d-7427-4d59-8966-9843a2e58902 at 2026-10-30T08:37:23.137439Z, and submitting the same form failed again. This is not evidence of an inactivity timeout: the fresh-session failure revealed a request-contract defect.

Confirmed source-level cause: OpsFlow complete_onboarding sends sensitive=true, activity=false; live MYOPS server/app-access.js rejects sensitive requests unless activity=true with HTTP 400, which the adapter maps to the displayed generic verification error. Fix efbc9dfadc9a33d0c42bde67aee5ff7bb80f7104 marks only explicit company submission as activity. Test update 788edc84cefe08c7030f1c41a991dba0d243975a asserts this contract. Passive refresh remains activity=false. No central authorization, timer, entitlement, credentials, schema or Production deployment changed.

Validation: the updated regression test fails against the old request (1/18 failures), then all 18 API tests pass with the fix; 5 exact-current signing adapter tests pass; 15 existing local MYOPS app-access tests pass. Local pytest unavailable, so suites executed with unittest. Staging Vercel build READY, deployment dpl_8JXvXw2wncnRLdoxbbKSoYsK8Bud. No authenticated staging end-to-end PASS claimed.

Automatic review rejected the native protected URL fetch because it creates/reuses a share link allowing deployment access for up to 23 hours. No alternative access path was attempted. Owner subsequently approved temporary staging access (“boleh”). Native protected fetch on 30 October 2026 at 08:49Z returned HTTP 200 from /api/ready (ready=true,database=reachable) and HTTP 200 from /api/sso-ready (signed_transport=verified,unknown_session=denied). Runtime readiness and signed transport PASS. The existing MYOPS staging portal opened in the browser but shows Login/Register: no authenticated staging login is currently present. Browser onboarding end-to-end remains pending user login; no second app login, fabricated session, entitlement override or Production change was attempted. Production remains on 231c91c433ac488c54c55a116a746ac244950c32. Read-only Production snapshot after both attempts: profiles=0, companies=0, documents=0. Dashboard after onboarding remains blocked by the live defect; do not mark complete.

Staff invitations and full role/cashier regression remain tracked separately. Deployment availability does not imply every module passed UAT. Payments remain deferred.

## Single-login entry cleanup — 30 October 2026

Owner requested removal of extra OpsFlow login screens. Code f8eccc2fd06f6fae1d3cd1c1a4ec88a6e104bc6b removes legacy OpsFlow marketing/login/register interstitials and demo-admin credential entry. Shared MyopsEntry waits for existing session hydration, sends an authenticated mapped user directly to /app, pending verified user to /onboarding, and unauthenticated user directly to the environment's MYOPS portal. AdminGuard no longer trusts a local demo admin token and delegates platform administration to central MYOPS /admin/audit; MYOPS retains its own server authorization. Central MYOPS login remains available as the only credential form. No session, RLS, entitlement or timeout bypass was added.

Deployment dpl_7KuanDtYS3DC6JQvQMt8HHGhB6d3, target staging, READY, URL https://opsflow-staging-oppucmacr-mohd-syaiful-nizam1.vercel.app. Browser guest tests PASS: /login and /register immediately end on MYOPS staging homepage without an OpsFlow prompt; /admin ends on central MYOPS /admin/audit and shows administrator sign-in requirement; /app with no session returns to MYOPS homepage. Authenticated dashboard routing is covered by component-effect tests, not a fresh authenticated browser test.

Local validation PASS: 16 frontend tests including six session-state/navigation tests, TypeScript, Expo lint, 29 backend tests, PGlite onboarding replay/isolation/no-revival tests and gateway tenant/version/atomicity tests. Native protected runtime checks at 08:59Z: /api/ready 200 database=reachable, /api/sso-ready 200 signed_transport=verified and unknown_session=denied. Production has not been redeployed with these changes.

User reported browser connection unavailable. Fresh inventory then showed no open tabs; a new tab was opened on the same existing MYOPS staging portal. Request user-requested browser handoff to reconnect, without inventing authentication state. Authenticated onboarding UAT remains pending a real MYOPS staging session.
