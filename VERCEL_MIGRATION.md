# OpsFlow Vercel + Supabase staging migration

Status: implementation in progress; NOT approved for Production release.

## Active runtime
- Root Vercel Services selects `backend/app.py` (FastAPI) and the Expo static web export.
- Web AuthContext now uses MYOPS launch, opaque local session tokens and server-validated profile; no Firebase login/import.
- DataContext now uses the API-backed documentStore adapter. Reads are company-scoped; write batches and optimistic transaction reads go through one database RPC.
- Firebase removed from active frontend dependencies and its initialization module deleted. Historical `backend/server.py` is not the deployment entrypoint; its dependency list is retained separately as requirements.legacy.txt for reference.
- Application auth and subscription decisions remain central MYOPS. Legacy local login/register/payment-grant endpoints return410.
- Server database URL is pinned to OpsFlow Staging projectojamkplflqafedmxbdxb; no other project accepted by this branch.

## Database state
- OpsFlow Staging projectojamkplflqafedmxbdxb, organizationpjstjwarfjbxjjspvluq, regioneu-west-1. Five foundation tables installed with RLS, no browser table privileges.
- `20261029183829_opsflow_document_gateway.sql` tested locally, NOT installed remotely. First apply attempt returned conflicting MCP request metadata; second call was interrupted without success. Read-only verification afterward returned zero opsflow functions. Do not declare the gateway installed or bypass the migration transport via untracked DDL.
- Gateway SQL is service-role-only, validates mapped identity, active company membership,15-minute idle/12-hour absolute expiry and short-lived central verification. Expired or revoked sessions cannot be revived by activity.
- Atomic batches serialize company writes, compare transaction read versions and roll back on error. Server timestamps resolve in Postgres. Cross-company reassignment, negative product stock and direct browser RPC access are denied.

## Validation
- Frontend10tests PASS; TypeScriptPASS; lint exit0; Expo web exportPASS. Bundle2.68MB versus prior Firebase build3.75MB (build outputs, not network benchmarks).
- Python API7tests + signed MYOPS contract3tests PASS.
- Local PGlite: both migration files replayPASS, mapping/replay denials, tenant isolation, optimistic conflict, atomic rollback, timestamp resolution, expired/revoked no-revival and browser table/RPC denialPASS.
- React review: effect listeners/timers cleaned up, interval overlap guarded, only trusted visible user events count as activity; polling does not itself touch activity.
- No authenticated hosted UAT or broad business-workflow PASS claimed.

## Known remaining gates
- Retry gateway migration only after transport issue resolved and fresh drift check.
- Secure Preview configuration: OPSFLOW_SUPABASE_URL, OPSFLOW_SUPABASE_SERVICE_ROLE_KEY, MYOPS_APP_API_ORIGIN (staging), MYOPS_APP_ID=opsflow, MYOPS_KEY_VERSION=current, MYOPS_APP_PRIVATE_KEY_CURRENT. Never place private values in EXPO_PUBLIC variables, source, screenshots or chat.
- Register matching public key in central MYOPS staging, configure preview launch URL, provision explicit MYOPS user-ref/profile/company/member mapping; no email matching or entitlement bypass.
- Hosted launch, profile, dummy stock/sale/purchase/payment/report flows,15-minute idle, replay/revocation, direct API and tenant-denial UAT.
- Team invite/join/role-change and company provisioning are blocked pending dedicated scoped endpoints; generic user/invite mutation is denied. Cashier writes currently require domain-specific server operations; generic commits require manager/admin. Do not claim these features complete.
- Generic document batch validation is not full server-side financial business validation. Validate price/payment/stock invariants and backup/restore workflows before release.
- DataContext collection polling is temporary15-second polling, not realtime. There is no recovered historical Firebase export.

## Hosting
- One new project `opsflow-staging`, IDprj_Efwfs2nZzYeI7KQyV0FGExWi0cBQ, connected to existing OpsFlow repository. Vercel Authentication retained. No production/custom domains assigned.
- Main automatic deployment remains disabled; only reviewed staging branch may be preview deployed.
- No MYOPS or Finance Production change.


## Hosted staging build verified
- Runtime commitd500de1e7eff5126f725d1820ca413716a4c5c7d; Vercel configuration fixa036ecfdadcb2dfd12549f861d6294e1007adafd. Service framework:null was rejected, removed it; automatic deployment disabled for bothmain and migration branch.
- Staging deploymentdpl_5g7WXp1q393ZQYnSWK2XtDNW4MAk READY, targetstaging, unique hostopsflow-staging-2jl71q61n-mohd-syaiful-nizam1.vercel.app. No custom/live application domain assigned.
- Authenticated Vercel transport GET /api/health200 with {service:opsflow,authentication:MYOPS,store:Supabase}; GET /api/auth/me without application session403 Not authenticated. This proves Python routing and denial, not a database connection or successful SSO.
- Nonsecret branch Preview variables configured after this build: OPSFLOW_SUPABASE_URL points to new staging project, MYOPS_APP_ID=opsflow, MYOPS_KEY_VERSION=current. They apply to a future build; no extra redeploy until secrets and database gates are ready.
- Local verification environment disconnected after code tests; reran10 Python tests in isolated venv before disconnect, PASS. Continue using GitHub/Vercel connectors; do not claim new local tests after environment loss.
- Remaining gateway migration still uninstalled (fresh remote function listingempty). Need operator to run the reviewed gateway SQL in the named OpsFlow Staging SQL Editor if migration transport remains unavailable; no Production SQL.


## Owner-installed gateway verified — 30 October 2026
- Owner reports manual SQL execution. Fresh remote inspection confirms all6 gateway/session/timestamp functions installed. anon/authenticated EXECUTE=false and service_role EXECUTE=true for each.
- Hosted PostgreSQL rollback-only UATPASS: explicit mapped identity/session, dummy productstock10, cross-company read denial, atomic sale+negative-stock rejection leaves no partial sale, revoked-session touch cannot revive. Entire fixture transaction rolled back. Post-test counts profiles0/companies0/sessions0/documents0.
- Previous gateway-not-installed statements above are superseded; no repeat migration required. Runtime/identity/SSO acceptance still not claimed.
- Vercel branch Preview env metadata currently contains only OPSFLOW_SUPABASE_URL, MYOPS_APP_ID, MYOPS_KEY_VERSION. OPSFLOW_SUPABASE_SERVICE_ROLE_KEY and MYOPS_APP_PRIVATE_KEY_CURRENT are absent, not hidden-value failures. Never decrypt or print keys.
- Current Supabase connection lists OpsFlow Staging only; explicit read of central staging projectwengxxiqwtosirealghx denied permission. Need organization/project access restored for central staging registration and identity lookup. Do not substitute Production origins or keys.
- Required operator step: securely set OPSFLOW_SUPABASE_SERVICE_ROLE_KEY in opsflow-staging Vercel project, Preview target for migration branch, using existing valid server secret ofojamkplflqafedmxbdxb. No key in chat. Then restore connection scope for MYOPS staging before registering OpsFlow signing public key and explicit test-user mapping. Do not copy Finance or central service key.


## Saved server key verification
- Owner saved OPSFLOW_SUPABASE_SERVICE_ROLE_KEY as Sensitive, initially targetProduction only in the new opsflow-staging project. Added Preview target without reading/decrypting or replacing value; retained existing target. No MYOPS/Finance Production settings changed.
- Added zero-row /api/ready probe, runtimecommitd8bb48b, testcommit97f865b59828ca038b16f56a90281bdb5f4e8617. Python API8+contract3=11PASS in isolatedvenv.
- Explicit staging deploymentdpl_AxN2fALDpuogrHHDo63vo7K7VMcJ READY. GET /api/ready returns503 OpsFlow data service is unavailable.
- Scoped Supabase edge logs directly confirm readiness request /rest/v1/opsflow_profiles returned401 UNAUTHORIZED_INVALID_API_KEY. Read-only database grant check shows service_role SELECT and public USAGE true; no missing grant evidenced. Credential presence does not establish validity; value never exposed or inspected.
- Need owner to securely replace existing Sensitive variable with complete valid OpsFlow Staging server secret (sb_secret_... or valid service_role JWT forojamkplflqafedmxbdxb), Preview target. Do not use publishable/anon/central/Finance keys, labels or assignment text. Rebuild affected staging commit after owner correction; no code/auth/RLS bypass.
- Central staging projectwengxxiqwtosirealghx access remains denied to current connector; signing registration and explicit identity mapping still pending restoration of scope.


## Credential retry after owner replacement
- Preview Sensitive metadata updated1793307854915, no value read. Target nowPreview only as requested by owner.
- Rebuilt same runtime97f865b59828ca038b16f56a90281bdb5f4e8617 as explicit stagingdpl_4V5MHJ9ytTeUqb9sptrmr9nPtbNB, READY.
- Fresh /api/ready still503. New scoped Supabase edge log probe confirms401 UNAUTHORIZED_INVALID_API_KEY for the one readiness request; this is not a failed table grant or a hidden-value visibility issue.
- Current connector organization scope lists MYOPS new organization only, not organization containing central staging. SSO key registration/mapping remains blocked separately.
- Do not blindly rebuild or weaken guards. Next credential action requires correct existing server secret for OpsFlow Stagingojamkplflqafedmxbdxb, verified from its API Keys page; alternatively inspect only a masked project/key-type screenshot to guide owner. Never request secret value in chat.


## Branch-scoped credential accepted
- Owner updated Sensitive key toPreview, gitBranchfeat/opsflow-vercel-migration, updatedAt1793308172682. No secret value retrieved.
- Exact staging runtime97f865b59828ca038b16f56a90281bdb5f4e8617 rebuilt asdpl_5ZKvrEoJEXGLCU2QSMp1p8GGY36v READY/targetstaging.
- Authenticated Vercel transport GET /api/ready200 returns {ready:true,database:reachable}. Correct server access to OpsFlow database nowPASS; earlier401 failures are superseded by this new evidence. No new codefix, privilege change or bypass needed for corrected key.
- No full SSO PASS: private Ed25519 app key, public registration in MYOPS staging and explicit test-user/company membership remain pending. Connector organization scope is newMYOPS only; central staging access was denied and has not been restored. OpsFlow remains in its separate new database. No Production change.


## MYOPS staging access and SSO enrollment restored
- Supabase now exposes two explicit account links: Opshub for central staging, Primary for isolated OpsFlow. Initial calls without required link_id failed before access; corrected to the named account, not repeated user reconnection.
- get_project on development ref returnsNotFound, but parent branch listing verifieswengxxiqwtosirealghx is non-default myops-sso-validation underuhuukcztdifvpjuopdea, ACTIVE_HEALTHY; scoped SQL access works. Production parent read for branch discovery only; no Production database mutation.
- Generated a fresh Ed25519 OpsFlow application key and stored private component as Sensitive in OpsFlow Preview migration branch only; private value not emitted to chat/repo. Public DER SHA256 1bd195cc6cc144f3fc4e4d8e1cd5de470ba59fb93b1960955fd921f21e128443. Inserted previously absent opsflow client in central staging, productopsflow, enabledtrue. No existing key rotated.
- Set MYOPS_APP_API_ORIGIN on OpsFlow Preview to verified central staging alias. Set MYOPS_APP_URL_OPSFLOW on central Preview branchfeat/myops-isolated-staging to protected OpsFlow branch alias /launch. These environment changes require staged rebuilds; no new deployment made until access/testing gates ready.
- Test user715a1e06-d83d-4514-b9e2-f8fd5148f37a exists in central staging; opsflow cataloglive. Full central entitlement-source check lifetime/personal/company allfalse. No subscription/grant/membership/payment modified; app enrollment does not grant user entitlement.
- Automatic approval review rejected get_access_to_vercel_url because it may create a public-by-link URL for protected deployment; scope of SSO work was not considered explicit permission for that exposure. Did not substitute web_fetch or another token-creation API. Existing Finance Preview share token isSensitive and was inspected only as metadata, not decrypted/copied.
- Need explicit owner approval for temporary23-hour share links for MYOPS staging and OpsFlow staging (Vercel layer only; application login/entitlement retained), plus a24-hour OpsFlow-only personal test entitlement for existing staging UAT user. Then complete transport/configuration, explicit profile/company mapping, fresh staged builds and authenticated UAT. No Production release.


## Explicit UAT authorization executed; signed transport PASS
- Owner explicitly approved temporary23-hour Vercel links for both staging sites and24-hour OpsFlow-only personal entitlement for existing test user. Temporary links created/reused through native Vercel tools; no protection setting disabled and no credential URL printed in chat or committed.
- Central staging subscription386f73c3-b854-4db1-bca0-5a1f89dc26c3, OpsFlow only, manual renewal, expires2026-10-30T22:40:43.012699Z (31October06:40Malaysia). No payment record or recurring billing; Production untouched.
- Derived opaque OpsFlow reference for explicitly approved test user using existing central staging server HMAC secret during a single staging build; secret not printed or copied. Provisioned one OpsFlow UAT profile/company/admin membership in Primary staging only; idempotent check prevented duplicate company creation.
- Protected preview bootstrap added using temporary token only on HTTPS Vercel Preview origins; cross-origin redirects rejected; signed app request/nonce/timestamp/entitlement gates retained. Native secret env set only on OpsFlow Preview branch.
- Found and fixed configuration mistakes: central requires its branch hostname, not unique deployment hostname, and issueTicket appends/launch itself, so configured app launch URL must be the base origin. Host check not weakened.
- Final central staging deploymentdpl_4GwdR8C4sJ3gLWwX8jPG8ZvkmaBh, unchanged sourcec05fd4c72cbe5f7537d988df209b7722dca2af2f, READY. OpsFlow deploymentdpl_24kkK2XPeCcRewdvuusdovG1YnVQ, source32cb7f5d5479cae930054403c9f58ba3c6d0cdcf.
- Local exact API/contract/preview transport/SSO readiness suite17PASS. Hosted /api/sso-ready200 {ready:true,signed_transport:verified,unknown_session:denied}. This validates signature and protection transport, not real user login.
- Browser auth request returnedsubmitted but fresh MYOPS staging page remains/login, no signed-in signal and blank status. No password read/re-entered by agent; no login PASS. Manual secure login completion needed for browser acceptance. No timers changed or fabricated sessions issued.
- Latest owner order: OpsFlow full WebPASS→OpsPS full WebPASS→central Subscription plus7-day limited Free Trial staging UAT. OpsWMS/OpsHR/Android/iOS deferred toPhase2. ToyyibPay last only after approval. No Production changes authorized by this order.
