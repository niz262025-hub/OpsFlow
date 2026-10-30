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

## Authenticated Production UAT — latest observation

MYOPS login is now visibly confirmed: My Account, Admin and Logout appeared on https://www.myops.com.my/. Clicking OpsFlow Open App reached https://opsflow.myops.com.my/onboarding without a second login. PASS for central-login launch through verified onboarding access. Production pending onboarding session 93acb784-4e1d-4910-9606-235ce816b4bf was created at 2026-10-30T08:22:48.280318Z.

The form is prepared with display name Mohd Syaiful Nizam and company Southern Dotcom Enterprise, inferred from the existing MYOPS owner/business identity. The create-company click was rejected by automatic approval review because the owner has not explicitly confirmed creation of real Production data and those exact values. No alternative execution was attempted. Request owner confirmation before submitting that button.

Read-only verification after the rejection: profiles=0, companies=0, business documents=0, business sessions=0 and completed onboardings=0. No company has been created. Dashboard access after onboarding and browser logout remain untested in Production. Confirm the prepared company details, then complete onboarding -> empty dashboard -> logout directly to MYOPS. If the pending session expires, relaunch from MYOPS normally; do not extend or bypass expiry.

Staff invitations and full role/cashier regression remain tracked separately. Deployment availability does not imply every module passed UAT. Payments remain deferred.
