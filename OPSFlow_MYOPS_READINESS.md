# OpsFlow MYOPS access readiness

**Status checked: 2026-10-25**

OpsFlow now contains a source-level MYOPS SSO integration foundation. It is **not production-ready yet**: staging secrets, identity links, deployed API configuration, Firestore rule validation, and end-to-end tests are still required.

## Implemented in this branch

- Web login, registration, and password recovery direct users to MYOPS. OpsFlow no longer creates a second email/password session or grants its own trial/subscription access.
- A one-time MYOPS launch ticket is redeemed by FastAPI using an Ed25519 request signature. Redemption requires a manually provisioned identity link to an existing Firebase UID and Mongo user; unknown links fail closed.
- FastAPI creates an OpsFlow session, returns a Firebase custom token, and writes a short-lived Firestore access record. The Firebase custom token and backend JWT carry the product/session identifiers.
- FastAPI protected routes require a non-revoked, unexpired OpsFlow session. Entitlement refresh checks MYOPS; denied access revokes the session. Logout revokes the backend and Firestore sessions.
- Firestore business-data access requires the matching MYOPS product, session ID, active server-written access record, and unexpired validity.
- User profile rules prevent clients from creating or deleting identities or changing their own company/role. Company setup and invite joining use atomic writes checked with `getAfter`; company admins can manage member roles only within their company.
- Legacy backend register/login and payment-success routes return `410 Gone` while `MYOPS_REQUIRED=true`.
- CORS is limited to explicit configured frontend origins. Integration tests no longer silently target a shared preview backend.

## Required before staging UAT

Configure the deployed FastAPI service with:

- `MYOPS_REQUIRED=true`
- `MYOPS_APP_API_ORIGIN`, `MYOPS_APP_ID=opsflow`, `MYOPS_KEY_VERSION`, and `MYOPS_APP_PRIVATE_KEY_CURRENT`
- `OPSFLOW_FIREBASE_SERVICE_ACCOUNT_JSON` and `OPSFLOW_FIREBASE_PROJECT_ID`
- `JWT_SECRET_KEY`, `MONGO_URL`, and exact `OPSFLOW_ALLOWED_ORIGINS`
- OpsFlow web build variable `EXPO_PUBLIC_OPSFLOW_API_URL` pointing to the HTTPS API origin

Register the OpsFlow public Ed25519 key in MYOPS. Provision one `myops_identity_links` record per test user with `myops_user_ref`, existing `firebase_uid`, existing `mongo_user_id`, and `enabled: true`. Never put the private signing key or Firebase service-account JSON in frontend variables or source control.

Deploy and validate `frontend/firestore.rules` in the Firebase staging project. Then run staging UAT for first launch, expired/replayed ticket, missing package, entitlement revocation, idle timeout, logout, direct Firestore and Mongo API access, company setup, invite/team workflows, and cross-company denial.

## Remaining release gates

- Confirm the MYOPS API contract and key registration against the deployed MYOPS staging service.
- Apply backend dependency/configuration and the Firestore rules to staging; validate the rule expressions with Firebase tooling or the emulator.
- Run the full frontend typecheck, lint, web export, backend tests, and browser-level SSO UAT against isolated staging services.
- Confirm user identity links and verify no legacy login, trial, or payment route grants access when MYOPS is required.
- Review staging logs and security behavior before moving this draft PR toward merge or production.

Do not use a production backend or deploy the production Firestore rules during this validation. Keep this pull request in draft until these gates pass.
