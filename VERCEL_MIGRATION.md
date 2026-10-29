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
