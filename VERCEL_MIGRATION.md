# OpsFlow: Vercel and Supabase migration

Owner decision, 30 October 2026: stop using inaccessible Firebase. Host OpsFlow
on Vercel and replace its application data store with Supabase. MYOPS remains
the only login and subscription authority. This branch is staging work only.

## Implemented and verified locally

- Root Vercel Services configuration builds the existing Expo web frontend and
  routes `/api/*` to the existing FastAPI service without stripping `/api`.
  Services is a Vercel beta; hosted configuration acceptance is still untested.
- SPA deep links resolve to `index.html` within the web service.
- Web MYOPS access calls use the current deployment origin when no explicit API
  origin is configured. Existing HTTPS and credential-in-URL checks remain.
- Six frontend tests, TypeScript and Expo web export pass.
- Main automatic deployment remains disabled. No production deployment changed.

## Not complete: do not release this branch yet

AuthContext, DataContext and FastAPI still use Firebase. Changing the Vercel
hosting configuration does not remove those runtime dependencies. The old
Firebase configuration remains for reference until its consumers are replaced;
it must not be used as the migration release destination.

The Supabase connector currently lists central MYOPS, Finance, OpsPS Production
and OpsHub staging only. Do not reuse those application databases or silently
create a billed database. Confirm the organization and any nonzero project cost
before provisioning an isolated OpsFlow staging database.

## Required implementation and acceptance

1. Provision/identify OpsFlow staging Supabase in the owner-selected organization.
2. Replace Firebase custom-token/profile authentication with a server-controlled
   MYOPS app session. Bind identity to immutable MYOPS user references; never
   match users by email or add a second password/subscription authority.
3. Replace all Firestore reads, listeners, batches and transactions with scoped
   Supabase operations. Preserve atomic sale/stock, receiving, supplier-payment,
   expense and ledger writes. Browser-supplied company IDs are not authorization.
4. Keep existing membership and role checks; test cross-company read/write denial,
   missing/replayed ticket, revoked package and 15-minute inactivity logout.
5. Remove Firebase imports/dependencies/configuration only after replacement code
   and tenant/transaction tests pass. Preserve a reviewed rollback history.
6. Deploy to one OpsFlow staging Vercel project, verify actual MYOPS launch and
   dummy workflows. Production release requires separate explicit approval under
   the owner's latest staging-only execution instruction.

## Existing data boundary

No Firebase export is available. No old data has been copied or recovered.
An empty replacement database is not a successful migration of historical data.
Retain references to the inaccessible project for a later authorized export.

## Validation limits

Local export verifies bundling only. No new Supabase database, schema, credential,
identity mapping, paid infrastructure, Vercel project or deployment was created
by this preparation change. Hosted SSO and migration acceptance remain pending.
