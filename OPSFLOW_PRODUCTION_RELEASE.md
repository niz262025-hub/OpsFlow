# OpsFlow Production release — 30 October 2026

Owner approved Production deployment and the new OpsFlow Production database inside the existing MYOPS organization.

## Installed and verified

- Supabase OpsFlow Production: sdrcndkdvvveisgtrlvp, MYOPS organization pjstjwarfjbxjjspvluq, Singapore ap-southeast-1, ACTIVE_HEALTHY.
- All three repository migrations are now installed. The owner manually installed the gateway after connector requestState failures.
- SQL rollback test PASS: onboarding, idempotent retry, product write/read and session revocation. All fixtures rolled back; profiles/companies/documents remain 0/0/0.
- Six tables have RLS enabled. anon/authenticated cannot SELECT tables or execute the document gateway.
- Production-only Vercel configuration is stored on existing project opsflow-staging (prj_Efwfs2nZzYeI7KQyV0FGExWi0cBQ), separate from Preview. A distinct sensitive Ed25519 private key is configured; its public key is registered in central MYOPS Production with opsflow enabled=false until verification succeeds.
- Domain opsflow.myops.com.my is verified and assigned to the OpsFlow project. No other DNS records changed.
- First OpsFlow Production build f61772bdf2f4f4cc9be4fef4d3b9179807f3bb35 is READY: dpl_AJSD5GFRY42mxnGYS7eosnRVzEsD. This was promoted to the new domain for readiness checks.
- Diagnostic candidate 231c91c433ac488c54c55a116a746ac244950c32 is READY: dpl_QzgWA7xUnTneJcGbTVa2JWJaawad. It logs only the upstream HTTP status, never bodies or credentials. Both CI jobs PASS; 29 backend tests PASS.
- Staging branch alias was restored to dpl_4To5R97zBGynwrUK1sucvVruQLnA after Vercel assigned it during the first Production build. Deploy subsequent Production candidates from an immutable SHA to avoid moving that alias.

## Confirmed blocker — database credential rejected

The owner saved OPSFLOW_SUPABASE_SECRET_KEY as Sensitive / Production. However, HTTPS GET https://opsflow.myops.com.my/api/ready returns 503. Supabase edge logs for /rest/v1/opsflow_profiles confirm HTTP 401 and UNAUTHORIZED_INVALID_API_KEY. This is an observed credential rejection, not an inference from hidden values. Do not retrieve, print or copy the secret into chat.

The owner must replace this environment value with a valid Secret key (sb_secret_...) from Supabase project sdrcndkdvvveisgtrlvp itself. Do not use central MYOPS or staging project keys. After Save, rebuild the reviewed code for Production so the new environment value is loaded. Do not rerun database migrations.

## MYOPS live status and next action

Production MYOPS_APP_URL_OPSFLOW=https://opsflow.myops.com.my is configured. The existing live source commit 6b94b84420fece804c12934301dc593b2749ab8b was rebuilt without merging staging: candidate dpl_5LyCwPoWcmx5C48pqFZnXL45yUza is READY. It has NOT been promoted; www.myops.com.my remains on dpl_J4xs36QDX49qGcHdqFKZKRoaQGdP. OpsFinance is unchanged.

After OpsFlow database readiness returns 200: enable only the matching production opsflow client, promote the prepared MYOPS candidate, verify MYOPS login -> entitlement -> company onboarding -> OpsFlow dashboard -> logout directly to MYOPS. Authenticated Production UAT remains pending. Never claim OpsFlow live/PASS until this succeeds. Keep RLS, central entitlement, 15-minute idle and 12-hour absolute limits. Payments remain deferred.
