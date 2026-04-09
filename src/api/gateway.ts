import { API_BASE } from '../config/apiBase';
import { fetchWithAuth } from './auth';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AllowedApi {
  method: string;
  path: string;
  featureKey?: string;
  description?: string;
}

export interface GatewayPermissionsLoading {
  status: 'LOADING';
  code: string;
  message: string;
  retryAfterMs: number;
}

export interface GatewayPermissionsLoaded {
  status: 'LOADED';
  userId: string;
  permissionRoles: string[];
  allowedApis: AllowedApi[];
  cacheInfo?: { note: string };
}

export type GatewayPermissionsResponse =
  | GatewayPermissionsLoading
  | GatewayPermissionsLoaded;

// ── API ────────────────────────────────────────────────────────────────────────

export async function fetchGatewayPermissions(): Promise<{
  httpStatus: number;
  data: GatewayPermissionsResponse;
}> {
  const res = await fetchWithAuth(`${API_BASE}/api/gateway/permissions`);
  const data: GatewayPermissionsResponse = await res.json();
  return { httpStatus: res.status, data };
}
