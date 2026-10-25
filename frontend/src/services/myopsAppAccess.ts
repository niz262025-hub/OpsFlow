import { storage } from '@/src/utils/storage';

export const OPSFLOW_API_TOKEN_KEY = 'auth:opsflow-api-token';
const LAUNCH_TICKET = /^[A-Za-z0-9_-]{43}$/;

export type MyopsRedeemResult = {
  firebaseCustomToken: string;
  accessToken: string;
};

export function extractMyopsLaunchTicket(url: string): string | null {
  try {
    const parsed = new URL(url);
    const queryTicket = new URLSearchParams(parsed.search).get('t');
    const hash = parsed.hash.replace(/^#/, '').replace(/^\//, '');
    const separator = hash.indexOf('?');
    const hashParams = new URLSearchParams(separator >= 0 ? hash.slice(separator + 1) : hash);
    const fragmentTicket = hashParams.get('t');
    const ticket = queryTicket ?? fragmentTicket;
    return ticket && LAUNCH_TICKET.test(ticket) ? ticket : null;
  } catch {
    return null;
  }
}

function apiUrl(path: string): string {
  const origin = process.env.EXPO_PUBLIC_OPSFLOW_API_URL?.trim();
  if (!origin) throw new Error('OpsFlow access service is not configured.');
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('OpsFlow access service must use HTTPS.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('OpsFlow access service URL is invalid.');
  }
  return new URL(path, parsed).toString();
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('OpsFlow access service returned an invalid response.');
  }
  return payload as Record<string, unknown>;
}

export async function redeemMyopsLaunchTicket(ticket: string): Promise<MyopsRedeemResult> {
  if (!LAUNCH_TICKET.test(ticket)) throw new Error('Invalid MYOPS launch ticket.');
  const response = await fetch(apiUrl('/api/app-access/redeem'), {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
  });
  const payload = await readJson(response);
  if (!response.ok || typeof payload.firebase_custom_token !== 'string' || typeof payload.access_token !== 'string') {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'MYOPS could not open OpsFlow.');
  }
  return { firebaseCustomToken: payload.firebase_custom_token, accessToken: payload.access_token };
}

export async function refreshMyopsSession(accessToken: string, activity: boolean): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/api/app-access/refresh'), {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activity }),
    });
    const payload = await readJson(response);
    return response.ok && payload.entitled === true;
  } catch {
    return false;
  }
}

export async function endMyopsSession(accessToken: string): Promise<void> {
  await fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  }).catch(() => undefined);
}

export async function clearMyopsLaunchTicketFromUrl(): Promise<void> {
  if (typeof window === 'undefined' || !window.location.hash.includes('t=')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

export async function clearStoredMyopsAccessToken(): Promise<void> {
  await storage.secureRemove(OPSFLOW_API_TOKEN_KEY);
}
