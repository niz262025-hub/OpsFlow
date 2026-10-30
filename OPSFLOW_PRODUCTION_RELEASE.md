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

The staging branch alias remains on dpl_4To5R97zBGynwrUK1sucvVruQLnA. Deploy Production candidates from an immutable SHA to avoid moving that staging alias.

## Remaining verification

Authenticated Production UAT is PENDING, not PASS. The browser secure login returned submitted but subsequently showed the recovery page; a fresh MYOPS tab showed Register/Login, so authenticated success was not assumed. No password reset was requested by the agent. Continue with normal MYOPS login, then Open OpsFlow -> first-company onboarding -> dashboard -> logout directly to MYOPS. Preserve central login, subscription/feature checks, RLS and the existing 15-minute idle / 12-hour absolute limits.

Fresh-account onboarding browser UAT, staff invitations and full role/cashier regression remain tracked separately. Deployment/live availability does not imply every OpsFlow module has passed UAT. Payments remain deferred.
