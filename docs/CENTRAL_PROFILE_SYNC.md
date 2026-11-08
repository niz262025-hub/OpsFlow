# Central MYOPS descriptive profile for OpsFlow (staging)

Confirmed problem: OpsFlow asked for name and company again after the user had registered at MYOPS. The authenticated MYOPS profile contains a name, but the inspected current account has no company_name. No production profile/data has been modified by this change.

MYOPS now stores optional company name alongside its existing descriptive account metadata. Customers can update name/company on the central account page, including after initial registration. Roles, memberships, payment eligibility and entitlement are not derived from this editable metadata.

Only an authenticated, signed OpsFlow ticket redemption receives the two bounded descriptive labels. Passive entitlement checks do not return labels; explicit onboarding retries receive them after fresh entitlement/session validation. No raw user id, email, company id, roles or private keys are copied.

OpsFlow uses these labels server-side for a new empty tenant. Missing labels return the customer to the central MYOPS profile completion UI. Existing app membership remains authoritative and is reused without overwriting company data or linking tenants by matching names. The existing user-ref binding, atomic SQL provisioning, 15-minute idle and 12-hour absolute expiry remain unchanged.

Validation: MYOPS 149 passed / 36 skipped (local PostgreSQL binaries absent), including signed label delivery, no label disclosure before verification, passive polling privacy, upstream identity mismatch/failure, company profile form and metadata-only persistence. Existing PGlite SQL tests passed. Lint and web build passed. OpsFlow 33 backend and 28 frontend tests passed; TypeScript, lint and web export passed. New backend tests cover automatic provisioning, central-only labels, forged browser fields rejection, missing company denial and preservation of existing membership. Hosted staging browser UAT remains to be verified after deployment.

Deployment scope: staging only. No SQL migration, timer change, new infrastructure or production deployment is required for this preparation. The central registration/account data is descriptive; it does not create organization memberships or grant subscription/admin rights. Shared organization membership across staff is outside this name/company-copy fix.
