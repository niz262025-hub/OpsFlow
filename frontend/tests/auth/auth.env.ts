export const AUTH_E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8084';
export const AUTH_E2E_EMAIL = process.env.E2E_AUTH_EMAIL || '';
export const AUTH_E2E_PASSWORD = process.env.E2E_AUTH_PASSWORD || '';

export function hasValidAuthCredentials() {
  return Boolean(AUTH_E2E_EMAIL && AUTH_E2E_PASSWORD);
}
