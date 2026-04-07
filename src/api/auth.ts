const BASE = 'http://192.168.0.10:8080';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  userId: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface MeResponse {
  userId: string;
  role: string;
}

// ── Token storage ──────────────────────────────────────────────────────────────

const ACCESS_KEY  = 'namu_access_token';
const REFRESH_KEY = 'namu_refresh_token';

export function getAccessToken(): string | null  { return localStorage.getItem(ACCESS_KEY); }
export function getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

export function saveTokens(res: AuthResponse) {
  localStorage.setItem(ACCESS_KEY,  res.accessToken);
  localStorage.setItem(REFRESH_KEY, res.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function signup(req: LoginRequest): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Signup failed (${res.status})`);
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const token = getAccessToken();
  if (!token) return;
  await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});
  clearTokens();
}

export async function refreshTokens(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
  return res.json();
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${BASE}/api/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Unauthorized (${res.status})`);
  return res.json();
}
