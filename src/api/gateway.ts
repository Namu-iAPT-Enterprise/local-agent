import { API_BASE } from '../config/apiBase';
import { fetchWithAuth } from './auth';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AllowedApi {
  method: string;
  path: string;
  featureKey?: string;
  description?: string;
}

/**
 * GET /api/role/get 응답 모델
 *
 * 정보 및 역할 제어 시스템(Data Gateway)이 반환하는 권한 정보.
 * 게이트웨이는 JWT 인증만 처리하고 Data Gateway로 프록시합니다.
 */
export interface RolePermissionsResponse {
  userId: string;
  permissionRoles: string[];
  /** UI 기능 활성화 키 목록 (featureKey 기반) */
  enabledFeatures?: string[];
  /** 접근 가능한 API 상세 목록 */
  allowedApis: AllowedApi[];
}

// ── API ────────────────────────────────────────────────────────────────────────

export async function fetchRolePermissions(): Promise<RolePermissionsResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/role/get`);
  if (!res.ok) {
    throw new Error(`권한 조회 실패 (${res.status})`);
  }
  return res.json();
}
