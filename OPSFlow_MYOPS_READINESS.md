# OpsFlow MYOPS access readiness

**Status checked: 2026-10-25**

OpsFlow is **not ready for MYOPS single sign-on or production launch**. The Web client signs in with Firebase Auth and reads/writes business data directly through Firestore. The FastAPI backend separately accepts email/password credentials and issues Mongo-backed JWTs. Linking only one of these paths would leave the other outside MYOPS package enforcement.

## Required implementation before staging

1. Register OpsFlow as `opsflow` in MYOPS and use the existing signed app-access contract: redeem a one-time launch ticket, then check entitlement with `session_id`, `product`, `activity`, and `sensitive`.
2. Add a server-side exchange to the deployed FastAPI service. It must redeem the ticket with an Ed25519 key held only in server secrets, resolve a trusted `user_ref` mapping to both an existing Firebase UID and Mongo user, issue a Firebase custom token and an OpsFlow API session, and reject missing or unprovisioned links.
3. Require an active, short-lived MYOPS session in Firestore rules for every private collection. Only the trusted server may create, refresh, or revoke the session record. A Firebase sign-in by itself must not authorize app data.
4. Require the same active MYOPS session on every FastAPI route protected by `get_current_user`; disable the old `/auth/register` and `/auth/login` flow in production mode.
5. Remove OpsFlow-owned trial and subscription decisions from user access. MYOPS package entitlement is the source of access; existing sales and stock records remain under each company's current tenant scope.
6. Run staging UAT for first launch, expired/replayed ticket, no package, package revocation, MYOPS idle timeout, logout, direct Firestore reads/writes, Mongo API access, invite/team workflows, and cross-company denial.

## Staging inputs

- OpsFlow staging Web origin and deployed FastAPI base URL.
- Firebase staging project plus a Firebase Admin service account configured only on the backend.
- MYOPS OpsFlow app ID, registered public key, and a server-side Ed25519 private key.
- A trusted identity mapping for each test user to the existing Firebase UID and Mongo user ID.
- MYOPS and Firebase staging access so migrations/rules and browser UAT can be verified.

Do not point tests at a shared or production backend. The integration tests now require an explicit `EXPO_PUBLIC_BACKEND_URL` or `EXPO_BACKEND_URL` rather than silently using a hard-coded preview deployment.
