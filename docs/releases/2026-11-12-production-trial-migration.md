# Production trial gateway migration

Project sdrcndkdvvveisgtrlvp (OpsFlow Production). Explicitly authorized by owner. Applied opsflow_atomic_trial_gateway, recorded database version 20261111225337, from source 20261101184145_opsflow_atomic_trial_gateway.sql.

Pre-migration manual OpsFlow public-schema snapshot persisted privately and restored in isolated PGlite: six tables, exact row contents, constraints, indexes and seven function definitions. This is not a full Supabase Auth/Storage backup.

Verified after migration: opsflow_trial_usage and opsflow_trial_receipts exist with RLS enabled. Gateway execution denied to anon/authenticated and granted to service_role. Existing profiles=1, companies=1, documents=8, unchanged. No production app deployment or real charges performed.

Rollback strategy: leave additive empty trial tables/function in place if application deployment is rolled back; no existing schema or data replaced. Do not drop quota/audit records once trial writes exist. Any destructive rollback requires owner confirmation. Production entitlement/environment and smoke verification remain open.
