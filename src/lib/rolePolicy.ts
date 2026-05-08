/**
 * Role Policy — OPA Rego(`role.rego`) 의사결정 로직을 TypeScript로 그대로 포팅.
 *
 * 프론트엔드의 버튼 enable/disable 판단을 OPA와 동일한 의미론으로 수행하기 위한
 * 헬퍼 모음입니다. 서버 측 인가는 여전히 OPA가 최종 결정자이며, 이 모듈은
 * UI를 일관되게 표시하기 위한 클라이언트 측 미러링입니다.
 *
 * 매핑 (rego → ts):
 *   user_roles                    → userRoles()
 *   user_tags                     → userTags()
 *   effective_priority            → effectivePriority()
 *   best_priority_in_team         → bestPriorityInTeam()
 *   has_global_tag                → hasGlobalTag()
 *   is_self_destruct              → isSelfDestruct()
 *   is_own_top_role               → isOwnTopRole()
 *   define_modify_allow           → canModifyRole()
 *   define_delete_allow           → canDeleteRole()
 *   assign_allow                  → canAssignRole()
 *   revoke_allow                  → canRevokeRole()
 *
 * 우선순위 규약: 숫자가 낮을수록 권한이 강함 (priority 1 = 최고).
 *
 * [v2 통합] 통합 후 사용 태그:
 *   - GLOBAL_ROLE_MANAGE  : CRUD + ASSIGN/REVOKE 통합 (글로벌)
 *   - ROLE_MANAGE_OWN     : CRUD + ASSIGN/REVOKE 통합 (자기 팀)
 *   - GLOBAL_TEAM_MANAGE  : 팀 CRUD 통합 (글로벌)
 *   - TEAM_MANAGE_OWN     : 팀 수정+삭제 통합 (자기 팀)
 */

import type { RoleDefinitionDto } from '../api/gateway';

const GLOBAL_TEAM_ID = 'GLOBAL';

/** 인가 컨텍스트 — 한 번 만들어두고 재사용 */
export interface PolicyContext {
  /** 요청자가 보유한 역할 ID 목록 */
  myRoleIds: string[];
  /** 시스템에 존재하는 모든 역할 정의 (roleId → 정의) */
  rolesById: Map<string, RoleDefinitionDto>;
  /** 요청자가 보유한 권한 태그 합산 (캐싱용) */
  myTags: Set<string>;
}

/** allRoles 배열과 myRoleIds 로부터 PolicyContext 를 생성 */
export function buildPolicyContext(
  allRoles: RoleDefinitionDto[],
  myRoleIds: string[],
): PolicyContext {
  const rolesById = new Map<string, RoleDefinitionDto>();
  for (const r of allRoles) rolesById.set(r.roleId, r);

  const myTags = new Set<string>();
  for (const rid of myRoleIds) {
    const role = rolesById.get(rid);
    if (!role?.permissionTagIds) continue;
    for (const t of role.permissionTagIds) myTags.add(t);
  }

  return { myRoleIds, rolesById, myTags };
}

// ──────────────────────────────────────────────────────────────
// 헬퍼: 사용자 역할/태그 (rego: user_roles, user_tags)
// ──────────────────────────────────────────────────────────────

/** 요청자가 보유한 역할 객체 목록 */
function userRoles(ctx: PolicyContext): RoleDefinitionDto[] {
  const out: RoleDefinitionDto[] = [];
  for (const rid of ctx.myRoleIds) {
    const r = ctx.rolesById.get(rid);
    if (r) out.push(r);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────
// 헬퍼: priority 계산 (rego: effective_priority, best_priority_in_team)
// ──────────────────────────────────────────────────────────────

/**
 * 특정 태그를 부여하는 요청자의 역할들 중, 해당 팀에서의 최소(=최강) priority.
 * 해당 태그를 가진 역할이 없으면 `null`.
 *
 * rego: effective_priority(userId, teamId, tag) := min(priorities)
 */
export function effectivePriority(
  ctx: PolicyContext,
  teamId: string,
  tag: string,
): number | null {
  let best = Infinity;
  for (const r of userRoles(ctx)) {
    if (r.teamId !== teamId) continue;
    if (!r.permissionTagIds?.includes(tag)) continue;
    if (r.priority < best) best = r.priority;
  }
  return best === Infinity ? null : best;
}

/**
 * 요청자의 해당 팀 내 최고(최소) priority.
 * 해당 팀에 역할이 없으면 `null`.
 *
 * rego: best_priority_in_team(userId, teamId) := min(priorities)
 */
export function bestPriorityInTeam(ctx: PolicyContext, teamId: string): number | null {
  let best = Infinity;
  for (const r of userRoles(ctx)) {
    if (r.teamId !== teamId) continue;
    if (r.priority < best) best = r.priority;
  }
  return best === Infinity ? null : best;
}

// ──────────────────────────────────────────────────────────────
// 헬퍼: GLOBAL 판단 (rego: is_global_team, has_global_tag)
// ──────────────────────────────────────────────────────────────

export function isGlobalTeam(teamId: string | undefined): boolean {
  return teamId === GLOBAL_TEAM_ID;
}

/**
 * 요청자가 GLOBAL 팀 역할 중 하나를 통해 해당 태그를 보유하는지.
 *
 * rego: has_global_tag(userId, tag)
 */
export function hasGlobalTag(ctx: PolicyContext, tag: string): boolean {
  for (const r of userRoles(ctx)) {
    if (!isGlobalTeam(r.teamId)) continue;
    if (r.permissionTagIds?.includes(tag)) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────
// 헬퍼: 자기파괴/시스템 역할 (rego: is_self_destruct, is_own_top_role, is_system_role)
// ──────────────────────────────────────────────────────────────

/**
 * 자기파괴 위반: 자기 자신의 팀 내 최고 우선순위 역할을 제거하려는 시도.
 *
 * rego: is_self_destruct(requesterId, targetRoleId, targetUserId)
 */
export function isSelfDestruct(
  ctx: PolicyContext,
  targetRoleId: string,
  targetUserId: string,
  requesterId: string,
): boolean {
  if (targetUserId !== requesterId) return false;
  const target = ctx.rolesById.get(targetRoleId);
  if (!target?.teamId) return false;
  const myBest = bestPriorityInTeam(ctx, target.teamId);
  return myBest !== null && target.priority === myBest;
}

/**
 * 자기 팀 내 최고 역할은 수정 불가 (원칙 10).
 *
 * rego: is_own_top_role(requesterId, targetRoleId)
 */
export function isOwnTopRole(ctx: PolicyContext, targetRoleId: string): boolean {
  if (!ctx.myRoleIds.includes(targetRoleId)) return false;
  const target = ctx.rolesById.get(targetRoleId);
  if (!target?.teamId) return false;
  const myBest = bestPriorityInTeam(ctx, target.teamId);
  return myBest !== null && target.priority === myBest;
}

// ──────────────────────────────────────────────────────────────
// 정책 결정 (rego: define_modify_allow, define_delete_allow,
//                  assign_allow, revoke_allow)
//
// [v2 통합] 통합된 ROLE_MANAGE_OWN / GLOBAL_ROLE_MANAGE 단일 태그 사용.
// ──────────────────────────────────────────────────────────────

/**
 * 역할 정의 수정 허용 여부.
 *
 * rego: define_modify_allow
 *   케이스 1: GLOBAL_ROLE_MANAGE 보유 → is_own_top_role 만 차단
 *   케이스 2: 팀 스코프 ROLE_MANAGE_OWN → effective_priority < target.priority
 */
export function canModifyRole(ctx: PolicyContext, target: RoleDefinitionDto): boolean {
  // 케이스 1: GLOBAL
  if (hasGlobalTag(ctx, 'GLOBAL_ROLE_MANAGE')) {
    return !isOwnTopRole(ctx, target.roleId);
  }
  // 케이스 2: 팀 스코프
  if (!target.teamId || isGlobalTeam(target.teamId)) return false;
  const ep = effectivePriority(ctx, target.teamId, 'ROLE_MANAGE_OWN');
  return ep !== null && ep < target.priority;
}

/**
 * 역할 정의 삭제 허용 여부.
 *
 * rego: define_delete_allow
 *   - 시스템 역할은 어떤 경우에도 삭제 불가
 *   - GLOBAL_ROLE_MANAGE 보유 + is_own_top_role 차단
 *   - 또는 팀 스코프 ROLE_MANAGE_OWN + priority 비교
 */
export function canDeleteRole(ctx: PolicyContext, target: RoleDefinitionDto): boolean {
  if (target.system) return false;
  // 케이스 1: GLOBAL
  if (hasGlobalTag(ctx, 'GLOBAL_ROLE_MANAGE')) {
    return !isOwnTopRole(ctx, target.roleId);
  }
  // 케이스 2: 팀 스코프
  if (!target.teamId || isGlobalTeam(target.teamId)) return false;
  const ep = effectivePriority(ctx, target.teamId, 'ROLE_MANAGE_OWN');
  return ep !== null && ep < target.priority;
}

/**
 * 역할 배정 허용 여부.
 *
 * rego: assign_allow
 *   케이스 1: GLOBAL_ROLE_MANAGE → 무조건 허용 (자기파괴 없음)
 *   케이스 2: 팀 스코프 ROLE_MANAGE_OWN + priority 비교
 *
 * (케이스 3: selfAssignable=true 자기 배정은 본 모듈 외부에서 별도 판단)
 */
export function canAssignRole(ctx: PolicyContext, target: RoleDefinitionDto): boolean {
  if (hasGlobalTag(ctx, 'GLOBAL_ROLE_MANAGE')) return true;
  if (!target.teamId || isGlobalTeam(target.teamId)) return false;
  const ep = effectivePriority(ctx, target.teamId, 'ROLE_MANAGE_OWN');
  return ep !== null && ep < target.priority;
}

/**
 * 역할 회수 허용 여부.
 *
 * rego: revoke_allow
 *   - GLOBAL_ROLE_MANAGE 보유 + 자기파괴 금지
 *   - 또는 팀 스코프 ROLE_MANAGE_OWN + priority 비교 + 자기파괴 금지
 */
export function canRevokeRole(
  ctx: PolicyContext,
  target: RoleDefinitionDto,
  targetUserId: string,
  requesterId: string,
): boolean {
  if (isSelfDestruct(ctx, target.roleId, targetUserId, requesterId)) return false;
  if (hasGlobalTag(ctx, 'GLOBAL_ROLE_MANAGE')) return true;
  if (!target.teamId || isGlobalTeam(target.teamId)) return false;
  const ep = effectivePriority(ctx, target.teamId, 'ROLE_MANAGE_OWN');
  return ep !== null && ep < target.priority;
}
