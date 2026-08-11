export const WORKFLOW_BASE_URL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:8084';
export const WORKFLOW_EMAIL = process.env.E2E_AUTH_EMAIL || '';
export const WORKFLOW_PASSWORD = process.env.E2E_AUTH_PASSWORD || '';

export function hasWorkflowCredentials() {
  return Boolean(WORKFLOW_EMAIL && WORKFLOW_PASSWORD);
}
