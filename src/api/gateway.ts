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
 * GET /api/management/role/profile 응답 모델
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

// ── Permission Role management types ──────────────────────────────────────────

export type PermissionRole = 'WANDERER' | 'KEEPER' | 'HERALD' | 'SOVEREIGN';

export interface RoleGetResponse {
  userId: string;
  permissionRoles: PermissionRole[];
}

// ── API ────────────────────────────────────────────────────────────────────────

export async function fetchRolePermissions(): Promise<RolePermissionsResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/profile`);
  if (!res.ok) {
    throw new Error(`권한 조회 실패 (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/management/role/get?userId=
 * 대상 사용자의 권한 역할(Permission Role) 목록을 조회합니다. SOVEREIGN 이상 필요.
 * 404 = 해당 사용자의 역할 레코드가 없음 (신규 등록 대상).
 */
export async function fetchUserPermissionRoles(userId: string): Promise<RoleGetResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/get?userId=${encodeURIComponent(userId)}`);
  if (res.status === 403) throw new Error('접근 권한이 없습니다 (SOVEREIGN 이상 필요).');
  if (res.status === 404) throw new NotFoundError(`${userId} 의 역할 레코드가 없습니다.`);
  if (!res.ok) throw new Error(`권한 역할 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * POST /api/management/role/new
 * 사용자의 권한 역할을 신규 등록합니다 (레코드가 없어야 함). SOVEREIGN 이상 필요.
 */
export async function createUserPermissionRoles(userId: string, permissionRoles: PermissionRole[]): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, permissionRoles }),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다 (SOVEREIGN 이상 필요).');
  if (res.status === 409) throw new Error('이미 역할 레코드가 존재합니다. 수정을 사용하세요.');
  if (!res.ok) throw new Error(`역할 등록 실패 (${res.status})`);
}

/**
 * PATCH /api/management/role/update
 * 사용자의 권한 역할을 전량 교체합니다. SOVEREIGN 이상 필요.
 */
export async function updateUserPermissionRoles(userId: string, permissionRoles: PermissionRole[]): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/update`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, permissionRoles }),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다 (SOVEREIGN 이상 필요).');
  if (res.status === 404) throw new NotFoundError('사용자를 찾을 수 없습니다. 먼저 등록하세요.');
  if (!res.ok) throw new Error(`역할 수정 실패 (${res.status})`);
}

/**
 * POST /api/management/role/reload
 * 특정 사용자의 권한 캐시를 새로고침합니다.
 */
export async function reloadUserPermissionCache(userId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/reload?userId=${encodeURIComponent(userId)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`캐시 새로고침 실패 (${res.status})`);
}

/**
 * POST /api/management/role/reload/all
 * 모든 사용자의 권한 캐시를 새로고침합니다.
 */
export async function reloadAllPermissionCache(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/reload/all`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`전체 캐시 새로고침 실패 (${res.status})`);
}

/** 역할 레코드 없음(404)을 구분하기 위한 에러 타입 */
export class NotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'NotFoundError'; }
}

// ── Management Request API ─────────────────────────────────────────────────────

export interface ManagementRequestPayload {
  source: string;
  type: string;
  title?: string;
  message: string;
  metadata?: string;
}

export interface ManagementRequestResponse {
  id: string;
  source: string;
  type: string;
  title?: string;
  message: string;
  metadata?: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
}

/**
 * POST /api/management/request/post
 * 관리자에게 요청/알림을 전송합니다. 인증 없이 호출 가능합니다.
 */
export async function postManagementRequest(
  payload: ManagementRequestPayload
): Promise<ManagementRequestResponse> {
  const res = await fetch(`${API_BASE}/api/management/request/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`요청 전송 실패 (${res.status})`);
  return res.json();
}

/**
 * GET /api/management/request/list
 * 전체 문의사항 목록을 조회합니다. SOVEREIGN 이상 필요.
 */
export async function fetchManagementRequests(): Promise<ManagementRequestResponse[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/request/list`);
  if (res.status === 403) throw new Error('접근 권한이 없습니다 (SOVEREIGN 이상 필요).');
  if (!res.ok) throw new Error(`문의 목록 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * GET /api/management/request/<request-ID>
 * 특정 문의사항을 조회합니다. SOVEREIGN 이상 필요.
 */
export async function fetchManagementRequest(requestId: string): Promise<ManagementRequestResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/request/${encodeURIComponent(requestId)}`);
  if (res.status === 403) throw new Error('접근 권한이 없습니다 (SOVEREIGN 이상 필요).');
  if (res.status === 404) throw new NotFoundError('문의사항을 찾을 수 없습니다.');
  if (!res.ok) throw new Error(`문의사항 조회 실패 (${res.status})`);
  return res.json();
}
