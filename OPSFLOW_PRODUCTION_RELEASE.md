# OpsFlow Production release — preparation status

Owner approved the live release and creation of OpsFlow Production inside the existing MYOPS organization.

- Supabase: OpsFlow Production, sdrcndkdvvveisgtrlvp, MYOPS organization pjstjwarfjbxjjspvluq, Singapore ap-southeast-1, ACTIVE_HEALTHY.
- API origin: https://sdrcndkdvvveisgtrlvp.supabase.co
- Foundation and company onboarding migrations installed. Six empty tables have RLS enabled and no anon/authenticated SELECT privileges. Profiles, companies and business documents: zero. No UAT data copied.
- Gateway migration NOT installed: apply_migration returned Invalid or expired requestState twice. Read-only introspection confirmed opsflow_document_gateway is absent.
- Production-only Vercel variables configured on existing project opsflow-staging (prj_Efwfs2nZzYeI7KQyV0FGExWi0cBQ): OPSFLOW_SUPABASE_URL, OPSFLOW_SUPABASE_PROJECT_REF, MYOPS_APP_API_ORIGIN, MYOPS_APP_ID, MYOPS_KEY_VERSION, MYOPS_APP_PRIVATE_KEY_CURRENT, EXPO_PUBLIC_MYOPS_PORTAL_ORIGIN. Preview remains isolated.
- A distinct production Ed25519 key was generated and saved as a sensitive Vercel value. Only its public key was registered in MYOPS Production; opsflow client remains disabled until release verification.
- Missing server credential: OPSFLOW_SUPABASE_SECRET_KEY. User must enter the project's sb_secret_ key directly into Vercel Production. Do not paste secrets into chat or commit them. Legacy OPSFLOW_SUPABASE_SERVICE_ROLE_KEY remains supported for existing staging.
- Production deployment and MYOPS live launch remain pending. No release success claimed.

## Required manual completion

1. Open Supabase project sdrcndkdvvveisgtrlvp SQL Editor and run the existing repository file supabase/migrations/20261029183829_opsflow_document_gateway.sql exactly once. The tables are already installed; do not rerun foundation or onboarding. This installs the session, entitlement-gated gateway and related functions; it also extends the document collection constraint for payments.
2. In this project's Settings > API Keys, obtain a Secret key privately. In Vercel project opsflow-staging > Settings > Environment Variables, add OPSFLOW_SUPABASE_SECRET_KEY as Sensitive, environment Production only. The Vercel project is reused; no duplicate project is needed. Do not use the staging database key.

After these steps, verify table/RPC grants, empty data and a rolled-back SQL test; deploy the reviewed commit to Production, test database connectivity, register the public launch domain and enable only the matching production client. Update MYOPS's production OpsFlow URL on its exact live release branch without merging staging history. Verify MYOPS login -> entitlement -> new-company onboarding -> OpsFlow dashboard -> logout to MYOPS. Keep the reviewed rollback deployment IDs. ToyyibPay/payment rollout is outside this release.

## Code validation

29 backend tests PASS, including new secret-key HTTP headers and legacy compatibility. Frontend portal navigation tests PASS, including the production portal override on Vercel hosts and rejection of arbitrary redirect origins. CI must also pass on the resulting commit before a production deploy.
