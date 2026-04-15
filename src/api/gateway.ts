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
 * GET /api/management/role/profile response (v2)
 *
 * Role Server returns the user's assigned roles, computed permission tags,
 * enabled feature keys, and allowed API list.
 */
export interface RolePermissionsResponse {
  userId: string;
  /** Assigned role IDs (e.g. "ORIGIN", "TEAM_ALPHA_LEAD") */
  roleIds: string[];
  /** Union of all permission tags from assigned roles */
  permissionTags: string[];
  /** Feature keys enabled for this user (frontend UI control) */
  enabledFeatures: string[];
  /** Allowed API details */
  allowedApis: AllowedApi[];
}

export interface RoleGetResponse {
  userId: string;
  permissionTags: string[];
}

// ── Permission Tag types ──────────────────────────────────────────────────

export interface PermissionTagDto {
  tagId: string;
  displayName: string;
  category: string;
  description?: string;
  scope: 'GLOBAL' | 'TEAM_SCOPED';
  system: boolean;
}

// ── Role Definition types ─────────────────────────────────────────────────────

export interface RoleDefinitionDto {
  roleId: string;
  displayName: string;
  loreDescription?: string;
  type: 'PERMISSION' | 'TEAM' | 'TAG';
  teamId?: string;
  parentRoleId?: string;
  adminAccountRequired: boolean;
  system: boolean;
  createdBy?: string;
  createdAt?: string;
  permissionTagIds?: string[];
  manageableByRoleIds?: string[];
}

// ── API ────────────────────────────────────────────────────────────────────────

export async function fetchRolePermissions(): Promise<RolePermissionsResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/profile`);
  if (!res.ok) throw new Error(`권한 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * GET /api/management/role/get?userId=
 * Returns the user's permission tags. Requires ROLE_VIEW_ANY tag for other users.
 */
export async function fetchUserPermissionTags(userId: string): Promise<RoleGetResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/get?userId=${encodeURIComponent(userId)}`);
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError(`${userId} 의 역할 정보가 없습니다.`);
  if (!res.ok) throw new Error(`권한 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * POST /api/management/role/assign
 * Assigns a role to a user. Requires ROLE_ASSIGN_ANY + ADMIN + manageableBy.
 */
export async function assignRole(userId: string, roleId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, roleId }),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (!res.ok) throw new Error(`역할 배정 실패 (${res.status})`);
}

/**
 * DELETE /api/management/role/revoke
 * Revokes a role from a user. Requires ROLE_REVOKE_ANY + ADMIN + manageableBy.
 */
export async function revokeRole(userId: string, roleId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/revoke`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, roleId }),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError('배정되지 않은 역할입니다.');
  if (!res.ok) throw new Error(`역할 제거 실패 (${res.status})`);
}

/**
 * GET /api/management/role/define
 * Lists all role definitions.
 */
export async function fetchRoleDefinitions(): Promise<RoleDefinitionDto[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/define`);
  if (!res.ok) throw new Error(`역할 정의 목록 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * POST /api/management/role/reload
 */
export async function reloadUserPermissionCache(userId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/reload?userId=${encodeURIComponent(userId)}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`캐시 새로고침 실패 (${res.status})`);
}

/**
 * POST /api/management/role/reload/all
 */
export async function reloadAllPermissionCache(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/reload/all`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`전체 캐시 새로고침 실패 (${res.status})`);
}

// ── Permission Tags ──────────────────────────────────────────────────────

/**
 * GET /api/management/role/tags
 * Returns all permission tag definitions for role editing UI.
 */
export async function fetchPermissionTags(): Promise<PermissionTagDto[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/tags`);
  if (!res.ok) throw new Error(`권한 태그 목록 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * GET /api/management/role/define/{roleId}
 * Returns a single role definition with full details (permissionTagIds, manageableByRoleIds).
 */
export async function fetchRoleDefinition(roleId: string): Promise<RoleDefinitionDto> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/define/${encodeURIComponent(roleId)}`);
  if (res.status === 404) throw new NotFoundError(`역할 정의 없음: ${roleId}`);
  if (!res.ok) throw new Error(`역할 정의 조회 실패 (${res.status})`);
  return res.json();
}

// ── Role Definition management ────────────────────────────────────────────────

export interface RoleDefinitionRequest {
  roleId?: string;
  displayName?: string;
  loreDescription?: string;
  type?: 'PERMISSION' | 'TEAM' | 'TAG';
  teamId?: string;
  parentRoleId?: string;
  adminAccountRequired?: boolean;
  permissionTagIds?: string[];
  manageableByRoleIds?: string[];
}

export async function createRoleDefinition(req: RoleDefinitionRequest): Promise<RoleDefinitionDto> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/define`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 409) throw new Error(`이미 존재하는 역할 ID: ${req.roleId}`);
  if (!res.ok) throw new Error(`역할 정의 생성 실패 (${res.status})`);
  return res.json();
}

export async function updateRoleDefinition(roleId: string, req: RoleDefinitionRequest): Promise<RoleDefinitionDto> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/define/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError(`역할 정의 없음: ${roleId}`);
  if (!res.ok) throw new Error(`역할 정의 수정 실패 (${res.status})`);
  return res.json();
}

export async function deleteRoleDefinition(roleId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/role/define/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError(`역할 정의 없음: ${roleId}`);
  if (!res.ok) throw new Error(`역할 정의 삭제 실패 (${res.status})`);
}

// ── Team management ───────────────────────────────────────────────────────────

export interface TeamDto {
  teamId: string;
  displayName: string;
  color?: string;
  parentTeamId?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface TeamRequest {
  teamId?: string;
  displayName?: string;
  color?: string;
  parentTeamId?: string;
}

export async function fetchTeams(): Promise<TeamDto[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/team`);
  if (!res.ok) throw new Error(`팀 목록 조회 실패 (${res.status})`);
  return res.json();
}

export async function createTeam(req: TeamRequest): Promise<TeamDto> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 409) throw new Error(`이미 존재하는 팀 ID: ${req.teamId}`);
  if (!res.ok) throw new Error(`팀 생성 실패 (${res.status})`);
  return res.json();
}

export async function updateTeam(teamId: string, req: TeamRequest): Promise<TeamDto> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/team/${encodeURIComponent(teamId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError(`팀 없음: ${teamId}`);
  if (!res.ok) throw new Error(`팀 수정 실패 (${res.status})`);
  return res.json();
}

export async function deleteTeam(teamId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/team/${encodeURIComponent(teamId)}`, {
    method: 'DELETE',
  });
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError(`팀 없음: ${teamId}`);
  if (!res.ok) throw new Error(`팀 삭제 실패 (${res.status})`);
}

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

export async function fetchManagementRequests(): Promise<ManagementRequestResponse[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/request/list`);
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (!res.ok) throw new Error(`문의 목록 조회 실패 (${res.status})`);
  return res.json();
}

export async function fetchManagementRequest(requestId: string): Promise<ManagementRequestResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/management/request/${encodeURIComponent(requestId)}`);
  if (res.status === 403) throw new Error('접근 권한이 없습니다.');
  if (res.status === 404) throw new NotFoundError('문의사항을 찾을 수 없습니다.');
  if (!res.ok) throw new Error(`문의사항 조회 실패 (${res.status})`);
  return res.json();
}
