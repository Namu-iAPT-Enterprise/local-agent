import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, CheckCircle, AlertCircle, Plus, Minus,
  Lock, Shield, Users, Building2, Server,
  Pencil, Trash2, X, Save, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Globe, Tag,
  HardDrive, ScrollText, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  fetchUserPermissionTags,
  fetchRoleDefinitions,
  fetchRoleDefinition,
  fetchPermissionTags,
  assignRole, revokeRole,
  createRoleDefinition, updateRoleDefinition, deleteRoleDefinition,
  reorderRoles,
  fetchTeams, createTeam, updateTeam, deleteTeam,
  fetchTeamMembers,
  reloadUserPermissionCache, reloadAllPermissionCache,
  NotFoundError,
  type RoleDefinitionDto, type TeamDto, type PermissionTagDto, type TeamMemberInfo,
} from '../../api/gateway';

// ── Permission helper ──────────────────────────────────────────────────────────

function can(tags: string[], ...required: string[]): boolean {
  return required.some(t => tags.includes(t));
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────

function PermissionBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
      <Lock size={8} />{tag}
    </span>
  );
}

interface ActionBtnProps {
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost' | 'assign' | 'revoke';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white',
  danger:  'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
  ghost:   'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
  assign:  'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
  revoke:  'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
};

function ActionBtn({ onClick, disabled, disabledReason, loading, variant = 'primary', icon, children, className = '' }: ActionBtnProps) {
  const isDisabled = disabled || loading;
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors';
  const style = isDisabled
    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50'
    : VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={`${base} ${style} ${className}`}
    >
      {loading ? <RefreshCw size={12} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

function SectionLocked({ tag }: { tag: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-600">
      <Lock size={24} />
      <p className="text-sm font-medium">이 기능에 대한 권한이 없습니다</p>
      <PermissionBadge tag={tag} />
    </div>
  );
}

function Feedback({ status, msg }: { status: string; msg: string }) {
  if (status === 'success') return (
    <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
      <CheckCircle size={14} />{msg}
    </p>
  );
  if (status === 'error') return (
    <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <AlertCircle size={14} />{msg}
    </p>
  );
  return null;
}

function RoleTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    PERMISSION: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    TEAM:       'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    TAG:        'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${styles[type] ?? 'bg-gray-100 text-gray-500'}`}>
      {type}
    </span>
  );
}

function TeamChip({ team }: { team?: TeamDto }) {
  if (!team) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border" style={{
      borderColor: team.color ? team.color + '40' : '#e5e7eb',
      backgroundColor: team.color ? team.color + '10' : '#f9fafb',
      color: team.color ?? '#6b7280',
    }}>
      {team.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />}
      {team.displayName}
    </span>
  );
}

/** Collapsible panel wrapper for multi-panel layout */
function Panel({ title, icon: Icon, children, defaultOpen = true, badge }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <Icon size={15} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-800 dark:text-white flex-1">{title}</span>
        {badge}
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && <div className="p-5 border-t border-gray-100 dark:border-gray-700/50">{children}</div>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

// ── Permission Tag Editor ──────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  SYSTEM: '시스템', CHAT: '채팅', FILE: '파일', KNOWLEDGE: '지식',
  NOTICE: '공지', TEAM: '팀', ROLE: '역할', REQUEST: '문의',
};

/**
 * PermissionTagEditor
 * 
 * Problem 3 fix: `editingTeamId` prop controls which tags are visible.
 * - If editingTeamId is 'GLOBAL', all tags are shown.
 * - If editingTeamId is a regular team (non-GLOBAL), GLOBAL scope tags are hidden entirely.
 * - This enforces: GLOBAL permissions → GLOBAL team roles only.
 */
function PermissionTagEditor({
  allTags, selectedTagIds, onChange, disabled = false, canAssignAdmin = false, editingTeamId,
}: {
  allTags: PermissionTagDto[];
  selectedTagIds: Set<string>;
  onChange: (newSet: Set<string>) => void;
  disabled?: boolean;
  canAssignAdmin?: boolean;
  /** The teamId of the role being edited. GLOBAL scope tags are hidden for non-GLOBAL teams. */
  editingTeamId?: string;
}) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const searchQuery = search.trim().toLowerCase();
  const isGlobalTeam = !editingTeamId || editingTeamId === 'GLOBAL';

  // Filter tags: for non-GLOBAL teams, completely hide GLOBAL scope tags
  const visibleTags = useMemo(() => {
    if (isGlobalTeam) return allTags;
    return allTags.filter(tag => tag.scope !== 'GLOBAL');
  }, [allTags, isGlobalTeam]);

  // Group by category with search filter
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionTagDto[]>();
    for (const tag of visibleTags) {
      if (searchQuery && !(
        tag.tagId.toLowerCase().includes(searchQuery) ||
        tag.displayName.toLowerCase().includes(searchQuery) ||
        (tag.description?.toLowerCase().includes(searchQuery))
      )) continue;

      const cat = tag.category || 'OTHER';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(tag);
    }
    return map;
  }, [visibleTags, searchQuery]);

  const toggle = (tagId: string) => {
    if (disabled) return;
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    onChange(next);
  };

  const toggleCategory = (category: string, enable: boolean) => {
    if (disabled) return;
    const catTags = grouped.get(category) ?? [];
    const next = new Set(selectedTagIds);
    for (const t of catTags) {
      if (t.scope === 'GLOBAL' && !canAssignAdmin) continue;
      if (enable) next.add(t.tagId);
      else next.delete(t.tagId);
    }
    onChange(next);
  };

  const renderTag = (tag: PermissionTagDto) => {
    const isOn = selectedTagIds.has(tag.tagId);
    const isGlobal = tag.scope === 'GLOBAL';
    const isLocked = isGlobal && !canAssignAdmin;

    return (
      <div
        key={tag.tagId}
        onClick={() => !isLocked && toggle(tag.tagId)}
        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
          isLocked ? 'opacity-40 cursor-not-allowed' :
          isOn ? 'bg-blue-50/80 dark:bg-blue-900/20' :
          'hover:bg-gray-50 dark:hover:bg-gray-800'
        } ${disabled ? 'pointer-events-none' : ''}`}
      >
        <div className="flex-shrink-0">
          {isOn
            ? <ToggleRight size={20} className="text-blue-500" />
            : <ToggleLeft size={20} className="text-gray-300 dark:text-gray-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 truncate">{tag.displayName || tag.tagId}</span>
            {isGlobal && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center gap-0.5 flex-shrink-0">
                <Globe size={7} />GLOBAL
              </span>
            )}
            {isLocked && (
              <span className="text-[8px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                <Lock size={7} />관리 권한 필요
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate font-mono">
            {tag.tagId}{tag.description ? ` | ${tag.description}` : ''}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Info banner for non-GLOBAL teams */}
      {!isGlobalTeam && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <Globe size={12} className="flex-shrink-0" />
          <span>일반 팀 소속 역할에는 팀 범위(TEAM_SCOPED) 권한만 부여할 수 있습니다. 글로벌 권한은 GLOBAL 팀 역할에서만 설정 가능합니다.</span>
        </div>
      )}

      {/* Search + counter */}
      <div className="flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="필터..." className={`${inputCls} flex-1`} />
        <span className="text-xs text-gray-400 whitespace-nowrap">{selectedTagIds.size} / {visibleTags.length}</span>
      </div>

      {/* Category toggle list */}
      <div className="max-h-[400px] overflow-y-auto space-y-1.5">
        {grouped.size === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">해당하는 권한 태그가 없습니다.</p>
        )}
        {[...grouped.entries()].map(([category, catTags]) => {
          const isCollapsed = collapsed[category] && !searchQuery;
          const selectedCount = catTags.filter(t => selectedTagIds.has(t.tagId)).length;

          return (
            <div key={category} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none"
                onClick={() => !searchQuery && setCollapsed(c => ({ ...c, [category]: !c[category] }))}
              >
                {!searchQuery && (isCollapsed
                  ? <ChevronRight size={12} className="text-gray-400" />
                  : <ChevronDown size={12} className="text-gray-400" />
                )}
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {CATEGORY_LABELS[category] ?? category}
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {selectedCount}/{catTags.length}
                </span>
                {!disabled && (
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleCategory(category, true)}
                      className="text-[9px] text-blue-500 hover:text-blue-700 px-1"
                    >전체 ON</button>
                    <button
                      onClick={() => toggleCategory(category, false)}
                      className="text-[9px] text-gray-400 hover:text-gray-600 px-1"
                    >전체 OFF</button>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {catTags.map(renderTag)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: 역할 배정 ─────────────────────────────────────────────────────────

function SectionAssign({ tags, allRoles, allTeams, myRoleIds = [] }: {
  tags: string[];
  allRoles: RoleDefinitionDto[];
  allTeams: TeamDto[];
  myRoleIds?: string[];
}) {
  const canView      = can(tags, 'GLOBAL_ROLE_VIEW', 'ROLE_VIEW_OWN');
  const canViewGlobal = can(tags, 'GLOBAL_ROLE_VIEW');
  const canAssign    = can(tags, 'GLOBAL_ROLE_ASSIGN', 'ROLE_ASSIGN_OWN');
  const canRevoke    = can(tags, 'GLOBAL_ROLE_REVOKE', 'ROLE_REVOKE_OWN');

  const [searchId, setSearchId] = useState('');
  const [lookupSt, setLookupSt] = useState<'idle'|'loading'|'found'|'not-found'|'error'>('idle');
  const [lookupErr, setLookupErr] = useState('');
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [actSt, setActSt]         = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [actMsg, setActMsg]       = useState('');

  const teamMap = useMemo(() => {
    const m = new Map<string, TeamDto>();
    for (const t of allTeams) m.set(t.teamId, t);
    return m;
  }, [allTeams]);

  // _OWN 권한만 있는 경우: 내가 소속된 팀의 역할만 표시
  const myTeamIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRoles) {
      if (myRoleIds.includes(r.roleId) && r.teamId) s.add(r.teamId);
    }
    return s;
  }, [allRoles, myRoleIds]);

  const visibleRoles = useMemo(() =>
    canViewGlobal
      ? allRoles                                            // GLOBAL_ROLE_VIEW: 전체
      : allRoles.filter(r => r.teamId && myTeamIds.has(r.teamId)), // ROLE_VIEW_OWN: 내 팀만
    [allRoles, canViewGlobal, myTeamIds]
  );

  const rolesByTeam = useMemo(() => {
    const map = new Map<string, RoleDefinitionDto[]>();
    for (const role of visibleRoles) {
      const teamId = role.teamId ?? '__NONE__';
      if (!map.has(teamId)) map.set(teamId, []);
      map.get(teamId)!.push(role);
    }
    return map;
  }, [visibleRoles]);

  const handleLookup = async () => {
    const uid = searchId.trim();
    if (!uid) return;
    setLookupSt('loading'); setLookupErr(''); setActSt('idle');
    try {
      const data = await fetchUserPermissionTags(uid);
      setUserRoleIds(data.roleIds ?? []);
      setLookupSt(data.roleIds?.length ? 'found' : 'not-found');
    } catch (e: unknown) {
      if (e instanceof NotFoundError) { setUserRoleIds([]); setLookupSt('not-found'); }
      else { setLookupSt('error'); setLookupErr(e instanceof Error ? e.message : '조회 실패'); }
    }
  };

  const doAction = async (action: () => Promise<void>, msg: string) => {
    setActSt('loading'); setActMsg('');
    try { await action(); setActSt('success'); setActMsg(msg); await handleLookup(); }
    catch (e: unknown) { setActSt('error'); setActMsg(e instanceof Error ? e.message : '실패'); }
  };

  if (!canView && !canAssign && !canRevoke) return <SectionLocked tag="ROLE_VIEW_OWN" />;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">사용자 ID 조회</label>
        <div className="flex gap-2">
          <input
            value={searchId}
            onChange={e => { setSearchId(e.target.value); setLookupSt('idle'); }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="userId 입력 후 Enter"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ActionBtn onClick={handleLookup} disabled={!searchId.trim() || !canView} disabledReason={!canView ? 'ROLE_VIEW_OWN 권한 필요' : undefined} loading={lookupSt === 'loading'} icon={<Search size={13} />}>조회</ActionBtn>
        </div>
        {lookupSt === 'error' && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{lookupErr}</p>}
        {lookupSt === 'not-found' && <p className="text-xs text-amber-500 flex items-center gap-1"><AlertCircle size={12}/>이 사용자에게 배정된 역할이 없습니다.</p>}
      </div>

      {(lookupSt === 'found' || lookupSt === 'not-found') && (
        <div className="space-y-3">
          <div className="px-1 flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{searchId.trim()}</span>
            <span className="ml-auto text-xs text-gray-400">배정 역할: {userRoleIds.length}개</span>
          </div>

          {[...rolesByTeam.entries()].map(([teamId, roles]) => {
            const team = teamMap.get(teamId);
            return (
              <div key={teamId} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center gap-2">
                  {team ? <TeamChip team={team} /> : <span className="text-[10px] text-gray-400">팀 미지정</span>}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {roles.map(role => {
                    const roleHeld = userRoleIds.includes(role.roleId);
                    return (
                      <div key={role.roleId} className={`flex items-center gap-3 px-4 py-2.5 ${roleHeld ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{role.roleId}</span>
                            <RoleTypeBadge type={role.type} />
                            {role.system && <span className="text-[9px] font-bold text-rose-500 px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20">SYSTEM</span>}
                            {roleHeld && <span className="text-[9px] font-bold text-blue-500 px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20">보유중</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{role.displayName}</p>
                        </div>
                        {roleHeld ? (
                          <ActionBtn onClick={() => doAction(() => revokeRole(searchId.trim(), role.roleId), `${role.roleId} 제거 완료`)} disabled={!canRevoke} disabledReason="ROLE_REVOKE 권한 필요" loading={actSt === 'loading'} variant="revoke" icon={<Minus size={12} />}>제거</ActionBtn>
                        ) : (
                          <ActionBtn onClick={() => doAction(() => assignRole(searchId.trim(), role.roleId), `${role.roleId} 배정 완료`)} disabled={!canAssign} disabledReason="ROLE_ASSIGN 권한 필요" loading={actSt === 'loading'} variant="assign" icon={<Plus size={12} />}>배정</ActionBtn>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {actSt !== 'idle' && (
            <div className="px-1">
              <Feedback status={actSt} msg={actMsg} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section: 역할 정의 ─────────────────────────────────────────────────────────

interface RoleFormState {
  roleId: string;
  displayName: string;
  loreDescription: string;
  teamId: string;
  permissionTagIds: Set<string>;
  manageableByRoleIds: Set<string>;
}

const emptyRoleForm = (): RoleFormState => ({
  roleId: '', displayName: '', loreDescription: '', teamId: '',
  permissionTagIds: new Set(), manageableByRoleIds: new Set(),
});

// ── Section: 팀 구성원 조회 + 역할 배정 ─────────────────────────────────────

function SectionMembers({ tags, allRoles, allTeams, myRoleIds = [] }: {
  tags: string[];
  allRoles: RoleDefinitionDto[];
  allTeams: TeamDto[];
  myRoleIds?: string[];
}) {
  const canViewMembers = can(tags, 'TEAM_MEMBER_VIEW', 'GLOBAL_ROLE_VIEW');
  const canAssign = can(tags, 'GLOBAL_ROLE_ASSIGN', 'ROLE_ASSIGN_OWN');
  const canRevoke = can(tags, 'GLOBAL_ROLE_REVOKE', 'ROLE_REVOKE_OWN');

  const [selectedTeam, setSelectedTeam] = useState('');
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [memberSt, setMemberSt] = useState<'idle'|'loading'|'loaded'|'error'>('idle');
  const [memberErr, setMemberErr] = useState('');
  const [actSt, setActSt] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [actMsg, setActMsg] = useState('');
  const [expandedUser, setExpandedUser] = useState<string|null>(null);

  // 신규 구성원 추가
  const [newUserId, setNewUserId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [addSt, setAddSt] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [addMsg, setAddMsg] = useState('');

  // 내가 소속된 팀 목록
  const myTeamIds = useMemo(() => {
    const s = new Set<string>();
    for (const role of allRoles) {
      if (myRoleIds.includes(role.roleId) && role.teamId) s.add(role.teamId);
    }
    return s;
  }, [allRoles, myRoleIds]);

  // 선택 가능한 팀: GLOBAL_ROLE_VIEW 있으면 전체, 아니면 자기 팀만
  const selectableTeams = useMemo(() => {
    if (can(tags, 'GLOBAL_ROLE_VIEW')) return allTeams;
    return allTeams.filter(t => myTeamIds.has(t.teamId));
  }, [allTeams, myTeamIds, tags]);

  // 해당 팀의 역할 (priority 순 정렬)
  const teamRoles = useMemo(() =>
    allRoles
      .filter(r => r.teamId === selectedTeam)
      .sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999)),
    [allRoles, selectedTeam]
  );

  // 내 해당 팀 최고 priority
  const myBestPriority = useMemo(() => {
    let best = Infinity;
    for (const r of allRoles) {
      if (myRoleIds.includes(r.roleId) && r.teamId === selectedTeam && r.priority < best)
        best = r.priority;
    }
    return best;
  }, [allRoles, myRoleIds, selectedTeam]);

  const loadMembers = async (teamId: string) => {
    if (!teamId) return;
    setMemberSt('loading'); setMemberErr('');
    try {
      const data = await fetchTeamMembers(teamId);
      setMembers(data);
      setMemberSt('loaded');
    } catch (e) {
      setMemberSt('error');
      setMemberErr(e instanceof Error ? e.message : '조회 실패');
    }
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    setExpandedUser(null);
    setNewUserId(''); setNewRoleId(''); setAddSt('idle');
    if (teamId) loadMembers(teamId);
    else { setMembers([]); setMemberSt('idle'); }
  };

  const handleAddMember = async () => {
    const uid = newUserId.trim();
    if (!uid || !newRoleId) return;
    // priority 체크: 배정하려는 역할이 내 최고 priority 이하이면 차단
    const role = teamRoles.find(r => r.roleId === newRoleId);
    if (role && myBestPriority !== Infinity && role.priority <= myBestPriority) {
      setAddSt('error');
      setAddMsg(`우선순위 ${role.priority} 역할은 부여할 수 없습니다 (내 최고: ${myBestPriority})`);
      return;
    }
    setAddSt('loading'); setAddMsg('');
    try {
      await assignRole(uid, newRoleId);
      setAddSt('success');
      setAddMsg(`${uid} → ${newRoleId} 배정 완료`);
      setNewUserId(''); setNewRoleId('');
      loadMembers(selectedTeam);
    } catch (e) {
      setAddSt('error');
      setAddMsg(e instanceof Error ? e.message : '배정 실패');
    }
  };

  const doAction = async (action: () => Promise<void>, msg: string) => {
    setActSt('loading'); setActMsg('');
    try { await action(); setActSt('success'); setActMsg(msg); loadMembers(selectedTeam); }
    catch (e) { setActSt('error'); setActMsg(e instanceof Error ? e.message : '실패'); }
  };

  if (!canViewMembers) return <SectionLocked tag="TEAM_MEMBER_VIEW" />;

  return (
    <div className="space-y-4">
      {/* 팀 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">팀 선택</label>
        <select value={selectedTeam} onChange={e => handleTeamChange(e.target.value)} className={inputCls}>
          <option value="">팀을 선택하세요...</option>
          {selectableTeams.map(t => (
            <option key={t.teamId} value={t.teamId}>{t.displayName} ({t.teamId})</option>
          ))}
        </select>
      </div>

      {memberSt === 'loading' && <p className="text-xs text-gray-400 flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin" />구성원 조회 중...</p>}
      {memberSt === 'error' && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{memberErr}</p>}

      {memberSt === 'loaded' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{selectedTeam} 팀 — {members.length}명</p>
            <button
              onClick={() => loadMembers(selectedTeam)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="새로고침"
            ><RefreshCw size={12} /></button>
          </div>

          {/* 신규 구성원 추가 */}
          {canAssign && (
            <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-800 p-3 space-y-2 bg-blue-50/30 dark:bg-blue-900/5">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <Plus size={11} />신규 구성원 추가
              </p>
              <div className="flex gap-2">
                <input
                  value={newUserId}
                  onChange={e => { setNewUserId(e.target.value); setAddSt('idle'); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                  placeholder="userId 입력"
                  className={`${inputCls} flex-1`}
                />
                <select
                  value={newRoleId}
                  onChange={e => { setNewRoleId(e.target.value); setAddSt('idle'); }}
                  className={`${inputCls} flex-1`}
                >
                  <option value="">역할 선택...</option>
                  {teamRoles
                    .filter(r => myBestPriority === Infinity || r.priority > myBestPriority)
                    .map(r => (
                      <option key={r.roleId} value={r.roleId}>
                        [{r.priority}] {r.roleId} — {r.displayName}
                      </option>
                    ))
                  }
                </select>
                <ActionBtn
                  onClick={handleAddMember}
                  disabled={!newUserId.trim() || !newRoleId}
                  loading={addSt === 'loading'}
                  variant="assign"
                  icon={<Plus size={12} />}
                >추가</ActionBtn>
              </div>
              {addSt !== 'idle' && <Feedback status={addSt} msg={addMsg} />}
            </div>
          )}

          {members.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">이 팀에 소속된 구성원이 없습니다.</p>}

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
            {members.map(member => {
              const isExpanded = expandedUser === member.userId;
              return (
                <div key={member.userId}>
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : member.userId)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <Users size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white flex-1">{member.userId}</span>
                    <div className="flex items-center gap-1">
                      {member.roleIds.map(rid => (
                        <span key={rid} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{rid}</span>
                      ))}
                    </div>
                    {isExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                  </button>

                  {/* 확장: 역할 배정/제거 UI */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 bg-gray-50/50 dark:bg-gray-800/20 space-y-2">
                      {teamRoles.map(role => {
                        const hasRole = member.roleIds.includes(role.roleId);
                        const priorityLocked = myBestPriority !== Infinity && role.priority <= myBestPriority;
                        return (
                          <div key={role.roleId} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${hasRole ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800/40'} ${priorityLocked ? 'opacity-50' : ''}`}>
                            <span className="text-[9px] font-mono text-gray-400 w-4 text-center">{role.priority}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{role.roleId}</span>
                              <span className="text-[10px] text-gray-400 ml-1.5">{role.displayName}</span>
                            </div>
                            {hasRole ? (
                              <ActionBtn
                                onClick={() => doAction(() => revokeRole(member.userId, role.roleId), `${role.roleId} 제거 완료`)}
                                disabled={!canRevoke || priorityLocked}
                                disabledReason={priorityLocked ? '상위 우선순위 역할은 제거 불가' : 'ROLE_REVOKE 권한 필요'}
                                loading={actSt === 'loading'}
                                variant="revoke" icon={<Minus size={10} />}
                              >제거</ActionBtn>
                            ) : (
                              <ActionBtn
                                onClick={() => doAction(() => assignRole(member.userId, role.roleId), `${role.roleId} 배정 완료`)}
                                disabled={!canAssign || priorityLocked}
                                disabledReason={priorityLocked ? '상위 우선순위 역할은 부여 불가' : 'ROLE_ASSIGN 권한 필요'}
                                loading={actSt === 'loading'}
                                variant="assign" icon={<Plus size={10} />}
                              >배정</ActionBtn>
                            )}
                          </div>
                        );
                      })}
                      {actSt !== 'idle' && <Feedback status={actSt} msg={actMsg} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionDefine({ tags, allRoles, allTeams, allPermTags, onRefresh, myRoleIds = [] }: {
  tags: string[];
  allRoles: RoleDefinitionDto[];
  allTeams: TeamDto[];
  allPermTags: PermissionTagDto[];
  onRefresh: () => void;
  myRoleIds?: string[];
}) {
  const canCreate = can(tags, 'GLOBAL_ROLE_CREATE', 'ROLE_CREATE_OWN');
  const canModify = can(tags, 'GLOBAL_ROLE_MODIFY', 'ROLE_MODIFY_OWN');
  const canDelete = can(tags, 'GLOBAL_ROLE_DELETE', 'ROLE_DELETE_OWN');
  const canAssignAdmin = can(tags, 'GLOBAL_ROLE_PERMISSION_ASSIGN');
  const canAssignPerm = canCreate || canModify;

  const [creating, setCreating]   = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]           = useState<RoleFormState>(emptyRoleForm());
  const [saveSt, setSaveSt]       = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [saveMsg, setSaveMsg]     = useState('');
  const [deleteSt, setDeleteSt]   = useState<Record<string,'idle'|'loading'>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const teamMap = useMemo(() => {
    const m = new Map<string, TeamDto>();
    for (const t of allTeams) m.set(t.teamId, t);
    return m;
  }, [allTeams]);

  const rolesByTeam = useMemo(() => {
    const map = new Map<string, RoleDefinitionDto[]>();
    for (const role of allRoles) {
      const teamId = role.teamId ?? '__NONE__';
      if (!map.has(teamId)) map.set(teamId, []);
      map.get(teamId)!.push(role);
    }
    // 팀 내 priority 순 정렬
    for (const [, roles] of map) {
      roles.sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999));
    }
    return map;
  }, [allRoles]);

  /** 내 팀별 최고(최소) priority 계산 */
  const myBestPriorityByTeam = useMemo(() => {
    const map = new Map<string, number>();
    for (const role of allRoles) {
      if (myRoleIds.includes(role.roleId) && role.teamId) {
        const cur = map.get(role.teamId) ?? Infinity;
        if (role.priority < cur) map.set(role.teamId, role.priority);
      }
    }
    return map;
  }, [allRoles, myRoleIds]);

  /** 대상 역할을 수정/삭제할 수 있는지 (priority 기반) */
  const canTouchRole = (role: RoleDefinitionDto): boolean => {
    if (!role.teamId) return true;
    const myBest = myBestPriorityByTeam.get(role.teamId);
    if (myBest === undefined) return true; // 해당 팀에 내 역할 없음 → GLOBAL 권한으로 접근 중
    return role.priority > myBest;
  };

  const [reorderSt, setReorderSt] = useState<'idle'|'loading'>('idle');

  const handleMove = async (teamId: string, roleId: string, direction: 'up' | 'down') => {
    const roles = rolesByTeam.get(teamId);
    if (!roles) return;
    const idx = roles.findIndex(r => r.roleId === roleId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= roles.length) return;
    const swapRole = roles[swapIdx];
    if (!canTouchRole(swapRole)) return;
    const newOrder = [...roles];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    setReorderSt('loading');
    try {
      await reorderRoles(teamId, newOrder.map(r => r.roleId));
      onRefresh();
    } catch (e) { alert(e instanceof Error ? e.message : '순서 변경 실패'); }
    finally { setReorderSt('idle'); }
  };

  /** GLOBAL 스코프 태그의 tagId 집합 (비-GLOBAL 팀 역할 편집 시 자동 제거용) */
  const globalTagIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of allPermTags) {
      if (t.scope === 'GLOBAL') s.add(t.tagId);
    }
    return s;
  }, [allPermTags]);

  /** 비-GLOBAL 팀 역할이면 GLOBAL 스코프 태그를 제거한 Set 반환 */
  const stripGlobalTags = (tagIds: Set<string>, teamId: string): Set<string> => {
    if (!teamId || teamId === 'GLOBAL') return tagIds;
    const filtered = new Set<string>();
    for (const id of tagIds) {
      if (!globalTagIds.has(id)) filtered.add(id);
    }
    return filtered;
  };

  const loadRoleDetail = async (roleId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchRoleDefinition(roleId);
      const detailTeamId = detail.teamId ?? '';
      // 비-GLOBAL 팀 역할: 서버에서 로드된 GLOBAL 태그를 폼에서 제거 (UI에 표시되지 않으므로 편집 불가 → 깨끗한 상태로 시작)
      const cleanedTags = stripGlobalTags(new Set(detail.permissionTagIds ?? []), detailTeamId);
      setForm({
        roleId: detail.roleId,
        displayName: detail.displayName,
        loreDescription: detail.loreDescription ?? '',
        teamId: detailTeamId,
        permissionTagIds: cleanedTags,
        manageableByRoleIds: new Set(detail.manageableByRoleIds ?? []),
      });
    } catch {
      // fallback to basic info
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!form.roleId.trim() || !form.displayName.trim() || !form.teamId) return;
    setSaveSt('loading'); setSaveMsg('');
    try {
      const createTags = stripGlobalTags(form.permissionTagIds, form.teamId);
      await createRoleDefinition({
        roleId: form.roleId.trim(),
        displayName: form.displayName.trim(),
        loreDescription: form.loreDescription || undefined,
        type: 'PERMISSION',
        teamId: form.teamId || undefined,
        adminAccountRequired: false,
        permissionTagIds: [...createTags],
        manageableByRoleIds: [...form.manageableByRoleIds],
      });
      setSaveSt('success'); setSaveMsg(`${form.roleId} 역할 생성 완료`);
      setCreating(false); setForm(emptyRoleForm()); onRefresh();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleUpdate = async (roleId: string) => {
    setSaveSt('loading'); setSaveMsg('');
    // 비-GLOBAL 팀 역할 저장 시: GLOBAL 태그가 혼입되지 않도록 한 번 더 필터링
    const roleTeamId = allRoles.find(r => r.roleId === roleId)?.teamId ?? form.teamId;
    const cleanedTags = stripGlobalTags(form.permissionTagIds, roleTeamId);
    try {
      await updateRoleDefinition(roleId, {
        displayName: form.displayName.trim(),
        loreDescription: form.loreDescription || undefined,
        adminAccountRequired: false,
        permissionTagIds: [...cleanedTags],
        manageableByRoleIds: [...form.manageableByRoleIds],
      });
      setSaveSt('success'); setSaveMsg(`${roleId} 수정 완료`);
      setEditingId(null); setForm(emptyRoleForm()); onRefresh();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm(`'${roleId}' 역할을 삭제하시겠습니까?\n이 역할을 가진 모든 사용자 배정도 함께 제거됩니다.`)) return;
    setDeleteSt(p => ({ ...p, [roleId]: 'loading' }));
    try { await deleteRoleDefinition(roleId); onRefresh(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : '삭제 실패'); }
    finally { setDeleteSt(p => ({ ...p, [roleId]: 'idle' })); }
  };

  const startEdit = async (role: RoleDefinitionDto) => {
    if (editingId === role.roleId) {
      setEditingId(null); setForm(emptyRoleForm()); setSaveSt('idle');
      return;
    }
    setEditingId(role.roleId); setCreating(false); setSaveSt('idle');
    await loadRoleDetail(role.roleId);
  };

  // The teamId for the role being edited/created — controls which permission tags are visible
  const activeEditTeamId = creating ? form.teamId : (editingId ? (allRoles.find(r => r.roleId === editingId)?.teamId ?? '') : '');

  const renderForm = (mode: 'create' | 'edit', roleId?: string) => (
    <div className="p-4 space-y-4 bg-blue-50/30 dark:bg-blue-900/5 border-t border-blue-200 dark:border-blue-800">
      {loadingDetail && <div className="flex items-center gap-2 text-xs text-gray-400"><RefreshCw size={12} className="animate-spin" />역할 상세 정보 로딩 중...</div>}
      
      <div className="grid grid-cols-2 gap-3">
        {mode === 'create' && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">역할 ID *</label>
            <input value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value.toUpperCase().replace(/\s/g,'_') }))} placeholder="ALPHA_LEAD" className={`${inputCls} mt-1`} />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">표시명 *</label>
          <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="알파팀 팀장" className={`${inputCls} mt-1`} />
        </div>
        {mode === 'create' && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">소속 팀 *</label>
            <select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))} className={`${inputCls} mt-1`}>
              <option value="">팀 선택...</option>
              {allTeams.map(t => <option key={t.teamId} value={t.teamId}>{t.displayName} ({t.teamId})</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">설명 (선택)</label>
        <input value={form.loreDescription} onChange={e => setForm(f => ({ ...f, loreDescription: e.target.value }))} placeholder="역할에 대한 설명" className={`${inputCls} mt-1`} />
      </div>

      {/* Permission Tag Editor — passes editingTeamId for GLOBAL/TEAM_SCOPED filtering */}
      {canAssignPerm && (
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2">
            <Tag size={11} />권한 태그 설정
            {!canAssignAdmin && <span className="text-[9px] text-amber-500">(일반 권한만 변경 가능)</span>}
          </label>
          <PermissionTagEditor
            allTags={allPermTags}
            selectedTagIds={form.permissionTagIds}
            onChange={newSet => setForm(f => ({ ...f, permissionTagIds: newSet }))}
            canAssignAdmin={canAssignAdmin}
            editingTeamId={activeEditTeamId}
          />
        </div>
      )}

      {/* Manageable By */}
      <details className="group">
        <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300">
          <ChevronRight size={11} className="group-open:rotate-90 transition-transform" />
          <Shield size={11} />고급: 관리 위임 설정
          <span className="text-[9px] text-gray-400 ml-1">(글로벌 관리자는 자동 우회)</span>
        </summary>
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 mb-2">
            이 역할을 배정/제거할 수 있는 역할을 지정합니다. 글로벌 관리 권한(ROLE_ASSIGN_ANY)을 가진 사용자는 이 설정과 무관하게 모든 역할을 관리합니다.
            역할 생성 시 생성자의 역할이 자동으로 추가됩니다.
          </p>
          <div className="max-h-[200px] overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
            {allRoles.filter(r => r.roleId !== form.roleId).map(role => {
              const isSelected = form.manageableByRoleIds.has(role.roleId);
              return (
                <div
                  key={role.roleId}
                  onClick={() => {
                    const next = new Set(form.manageableByRoleIds);
                    if (isSelected) next.delete(role.roleId);
                    else next.add(role.roleId);
                    setForm(f => ({ ...f, manageableByRoleIds: next }));
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs ${
                    isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <input type="checkbox" checked={isSelected} readOnly className="rounded" />
                  <span className="font-mono font-bold">{role.roleId}</span>
                  <span className="text-gray-400 truncate">{role.displayName}</span>
                  {role.teamId && <TeamChip team={teamMap.get(role.teamId)} />}
                </div>
              );
            })}
          </div>
        </div>
      </details>

      <div className="flex items-center gap-2 pt-1">
        <ActionBtn onClick={mode === 'create' ? handleCreate : () => handleUpdate(roleId!)} loading={saveSt === 'loading'} icon={<Save size={13} />}>
          {mode === 'create' ? '역할 생성' : '저장'}
        </ActionBtn>
        <ActionBtn onClick={() => { mode === 'create' ? setCreating(false) : setEditingId(null); setForm(emptyRoleForm()); setSaveSt('idle'); }} variant="ghost" icon={<X size={13} />}>취소</ActionBtn>
        {saveSt !== 'idle' && <Feedback status={saveSt} msg={saveMsg} />}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">역할 정의 ({allRoles.length}개)</p>
        <ActionBtn onClick={() => { setCreating(v => !v); setEditingId(null); setForm(emptyRoleForm()); setSaveSt('idle'); }} disabled={!canCreate} disabledReason="ROLE_CREATE 권한 필요" variant="primary" icon={creating ? <X size={13} /> : <Plus size={13} />}>
          {creating ? '취소' : '새 역할 만들기'}
        </ActionBtn>
      </div>
      {creating && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
          {renderForm('create')}
        </div>
      )}

      {[...rolesByTeam.entries()].map(([teamId, roles]) => {
        const team = teamMap.get(teamId);
        return (
          <div key={teamId} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center gap-2">
              {team ? <TeamChip team={team} /> : <span className="text-[10px] text-gray-400">팀 미지정</span>}
              <span className="text-[10px] text-gray-400 ml-auto">{roles.length}개 역할</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {roles.map((role, idx) => {
                const isSelfHeld = myRoleIds.includes(role.roleId);
                const priorityLocked = !canTouchRole(role);
                const lockReason = priorityLocked ? `우선순위 ${role.priority} — 같거나 상위 역할은 수정/삭제 불가` : '';
                const isFirst = idx === 0;
                const isLast = idx === roles.length - 1;
                return (
                <React.Fragment key={role.roleId}>
                  <div className={`px-4 py-3 flex items-center gap-3 ${isSelfHeld ? 'bg-amber-50/40 dark:bg-amber-900/5' : ''} ${priorityLocked ? 'opacity-70' : ''}`}>
                    {/* Priority 순서 변경 화살표 */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleMove(teamId, role.roleId, 'up')}
                        disabled={isFirst || priorityLocked || reorderSt === 'loading' || role.system}
                        className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="위로 이동 (우선순위 높임)"
                      ><ArrowUp size={11} /></button>
                      <span className="text-[9px] font-mono text-center text-gray-400 leading-none w-5">{role.priority}</span>
                      <button
                        onClick={() => handleMove(teamId, role.roleId, 'down')}
                        disabled={isLast || reorderSt === 'loading' || role.system}
                        className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="아래로 이동 (우선순위 낮춤)"
                      ><ArrowDown size={11} /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{role.roleId}</span>
                        <RoleTypeBadge type={role.type} />
                        {role.system && <span className="text-[9px] font-bold text-rose-500 px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20">SYSTEM</span>}
                        {isSelfHeld && <span className="text-[9px] font-bold text-amber-600 px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 flex items-center gap-0.5"><Shield size={7} />내 역할</span>}
                        {role.parentRoleId && <span className="text-[9px] text-gray-400 font-mono">↑{role.parentRoleId}</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.displayName}</p>
                      {role.loreDescription && <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">{role.loreDescription}</p>}
                      {(role.permissionTagIds?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(role.permissionTagIds ?? []).slice(0, 8).map(t => (
                            <span key={t} className="text-[9px] font-mono px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t}</span>
                          ))}
                          {(role.permissionTagIds?.length ?? 0) > 8 && <span className="text-[9px] text-gray-400">+{(role.permissionTagIds?.length ?? 0) - 8}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ActionBtn
                        onClick={() => startEdit(role)}
                        disabled={!canModify || role.system || priorityLocked}
                        disabledReason={priorityLocked ? lockReason : role.system ? '시스템 역할은 수정할 수 없습니다' : 'ROLE_MODIFY 권한 필요'}
                        variant="ghost" icon={<Pencil size={12} />}
                      >수정</ActionBtn>
                      <ActionBtn
                        onClick={() => handleDelete(role.roleId)}
                        disabled={!canDelete || role.system || priorityLocked}
                        disabledReason={priorityLocked ? lockReason : role.system ? '시스템 역할은 삭제할 수 없습니다' : 'ROLE_DELETE 권한 필요'}
                        loading={deleteSt[role.roleId] === 'loading'}
                        variant="danger" icon={<Trash2 size={12} />}
                      >삭제</ActionBtn>
                    </div>
                  </div>
                  {editingId === role.roleId && renderForm('edit', role.roleId)}
                </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}

      {allRoles.length === 0 && <p className="px-5 py-8 text-sm text-center text-gray-400">역할 정의가 없습니다.</p>}
    </div>
  );
}

// ── Section: 팀 관리 ───────────────────────────────────────────────────────────

function SectionTeam({ tags, allRoles, allTeams, onRefreshTeams }: {
  tags: string[];
  allRoles: RoleDefinitionDto[];
  allTeams: TeamDto[];
  onRefreshTeams: () => void;
}) {
  const canCreate = can(tags, 'GLOBAL_TEAM_CREATE');
  const canManage = can(tags, 'GLOBAL_TEAM_MANAGE', 'TEAM_MANAGE_OWN');
  const canDelete = can(tags, 'GLOBAL_TEAM_DELETE', 'TEAM_DELETE_OWN');
  const canView   = can(tags, 'TEAM_VIEW_ANY', 'GLOBAL_TEAM_CREATE', 'GLOBAL_TEAM_MANAGE', 'TEAM_MANAGE_OWN', 'GLOBAL_TEAM_DELETE', 'TEAM_DELETE_OWN');

  const [creating, setCreating]   = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState({ teamId: '', displayName: '', color: '', parentTeamId: '' });
  const [saveSt, setSaveSt]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [deleteSt, setDeleteSt] = useState<Record<string,'idle'|'loading'>>({});

  const resetForm = () => setForm({ teamId: '', displayName: '', color: '', parentTeamId: '' });

  const handleCreate = async () => {
    if (!form.teamId.trim() || !form.displayName.trim()) return;
    setSaveSt('loading'); setSaveMsg('');
    try {
      await createTeam({ teamId: form.teamId.trim(), displayName: form.displayName.trim(), color: form.color || undefined, parentTeamId: form.parentTeamId || undefined });
      setSaveSt('success'); setSaveMsg(`${form.teamId} 팀 생성 완료`);
      setCreating(false); resetForm(); onRefreshTeams();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleUpdate = async (teamId: string) => {
    setSaveSt('loading'); setSaveMsg('');
    try {
      await updateTeam(teamId, { displayName: form.displayName.trim(), color: form.color || undefined });
      setSaveSt('success'); setSaveMsg(`${teamId} 수정 완료`);
      setEditingId(null); resetForm(); onRefreshTeams();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleDelete = async (teamId: string) => {
    if (teamId === 'GLOBAL') { alert('Global 팀은 삭제할 수 없습니다.'); return; }
    if (!confirm(`'${teamId}' 팀을 삭제하시겠습니까?`)) return;
    setDeleteSt(p => ({ ...p, [teamId]: 'loading' }));
    try { await deleteTeam(teamId); onRefreshTeams(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : '삭제 실패'); }
    finally { setDeleteSt(p => ({ ...p, [teamId]: 'idle' })); }
  };

  const roleCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRoles) {
      if (r.teamId) m.set(r.teamId, (m.get(r.teamId) ?? 0) + 1);
    }
    return m;
  }, [allRoles]);

  if (!canView) return <SectionLocked tag="TEAM_VIEW_ANY" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          팀 ({allTeams.length}개)
        </p>
        <ActionBtn onClick={() => { setCreating(v => !v); setEditingId(null); resetForm(); setSaveSt('idle'); }} disabled={!canCreate} disabledReason="TEAM_CREATE 권한 필요" variant="primary" icon={creating ? <X size={13} /> : <Plus size={13} />}>
          {creating ? '취소' : '새 팀 만들기'}
        </ActionBtn>
      </div>

      {creating && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">팀 ID *</label>
              <input value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value.toUpperCase().replace(/\s/g,'_') }))} placeholder="TEAM_ALPHA" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">팀 이름 *</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="알파팀" className={`${inputCls} mt-1`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">색상 (선택)</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.color || '#3B82F6'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800" />
                <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#3B82F6" className={`${inputCls} flex-1`} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">상위 팀 (선택)</label>
              <select value={form.parentTeamId} onChange={e => setForm(f => ({ ...f, parentTeamId: e.target.value }))} className={`${inputCls} mt-1`}>
                <option value="">없음 (최상위)</option>
                {allTeams.map(t => <option key={t.teamId} value={t.teamId}>{t.teamId} — {t.displayName}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ActionBtn onClick={handleCreate} loading={saveSt === 'loading'} icon={<Save size={13} />}>팀 생성</ActionBtn>
            <ActionBtn onClick={() => { setCreating(false); resetForm(); setSaveSt('idle'); }} variant="ghost" icon={<X size={13} />}>취소</ActionBtn>
            {saveSt !== 'idle' && <Feedback status={saveSt} msg={saveMsg} />}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
        {allTeams.length === 0 && <p className="px-5 py-8 text-sm text-center text-gray-400">등록된 팀이 없습니다.</p>}
        {allTeams.map(team => {
          const isGlobal = team.teamId === 'GLOBAL';
          const roleCount = roleCountMap.get(team.teamId) ?? 0;
          return (
            <React.Fragment key={team.teamId}>
              <div className="px-4 py-3 flex items-center gap-3">
                {team.color && <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm border border-white dark:border-gray-700" style={{ backgroundColor: team.color }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{team.teamId}</span>
                    {isGlobal && (
                      <span className="text-[9px] font-bold text-indigo-500 px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 flex items-center gap-0.5">
                        <Globe size={8} />시스템
                      </span>
                    )}
                    {team.parentTeamId && <span className="text-[9px] text-gray-400 font-mono">↑{team.parentTeamId}</span>}
                    <span className="text-[9px] text-gray-400">{roleCount}개 역할</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{team.displayName}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ActionBtn
                    onClick={() => { setEditingId(editingId === team.teamId ? null : team.teamId); setForm({ teamId: team.teamId, displayName: team.displayName, color: team.color ?? '', parentTeamId: team.parentTeamId ?? '' }); setSaveSt('idle'); setCreating(false); }}
                    disabled={!canManage}
                    disabledReason="TEAM_MANAGE 권한 필요"
                    variant="ghost" icon={<Pencil size={12} />}
                  >편집</ActionBtn>
                  <ActionBtn
                    onClick={() => handleDelete(team.teamId)}
                    disabled={!canDelete || isGlobal}
                    disabledReason={isGlobal ? 'Global 팀은 삭제할 수 없습니다' : 'TEAM_DELETE 권한 필요'}
                    loading={deleteSt[team.teamId] === 'loading'}
                    variant="danger" icon={<Trash2 size={12} />}
                  >삭제</ActionBtn>
                </div>
              </div>
              {editingId === team.teamId && (
                <div className="px-4 pb-4 pt-3 bg-gray-50 dark:bg-gray-800/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">팀 이름 *</label>
                      <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className={`${inputCls} mt-1`} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">색상</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={form.color || '#3B82F6'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-10 cursor-pointer rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800" />
                        <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className={`${inputCls} flex-1`} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionBtn onClick={() => handleUpdate(team.teamId)} loading={saveSt === 'loading'} icon={<Save size={13} />}>저장</ActionBtn>
                    <ActionBtn onClick={() => { setEditingId(null); resetForm(); setSaveSt('idle'); }} variant="ghost" icon={<X size={13} />}>취소</ActionBtn>
                    {saveSt !== 'idle' && <Feedback status={saveSt} msg={saveMsg} />}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: 캐시 관리 ─────────────────────────────────────────────────────────

function SectionCache({ tags }: { tags: string[] }) {
  const canUser = can(tags, 'GLOBAL_CACHE_RELOAD_USER');
  const canAll  = can(tags, 'GLOBAL_CACHE_RELOAD_ALL');

  const [userId, setUserId]   = useState('');
  const [userSt, setUserSt]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [userMsg, setUserMsg] = useState('');
  const [allSt, setAllSt]     = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [allMsg, setAllMsg]   = useState('');

  const handleUserReload = async () => {
    const uid = userId.trim(); if (!uid) return;
    setUserSt('loading'); setUserMsg('');
    try { await reloadUserPermissionCache(uid); setUserSt('success'); setUserMsg(`${uid} 캐시 새로고침 완료`); }
    catch (e: unknown) { setUserSt('error'); setUserMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleAllReload = async () => {
    if (!confirm('모든 사용자의 역할 캐시를 초기화하시겠습니까?')) return;
    setAllSt('loading'); setAllMsg('');
    try { await reloadAllPermissionCache(); setAllSt('success'); setAllMsg('전체 캐시 초기화 완료'); }
    catch (e: unknown) { setAllSt('error'); setAllMsg(e instanceof Error ? e.message : '실패'); }
  };

  if (!canUser && !canAll) return null;

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-5 space-y-3 ${canUser ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-50'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5">
              {!canUser && <Lock size={13} className="text-gray-400" />}사용자 캐시 새로고침
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">특정 사용자의 역할 캐시를 무효화합니다.</p>
          </div>
          {!canUser && <PermissionBadge tag="GLOBAL_CACHE_RELOAD_USER" />}
        </div>
        <div className="flex gap-2">
          <input value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUserReload()} disabled={!canUser} placeholder="userId" className={`${inputCls} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`} />
          <ActionBtn onClick={handleUserReload} disabled={!canUser || !userId.trim()} loading={userSt === 'loading'} variant="ghost" icon={<RefreshCw size={13} />}>새로고침</ActionBtn>
        </div>
        {userSt !== 'idle' && <Feedback status={userSt} msg={userMsg} />}
      </div>

      <div className={`rounded-xl border p-5 space-y-3 ${canAll ? 'border-rose-200 dark:border-rose-900' : 'border-gray-100 dark:border-gray-800 opacity-50'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5">
              {!canAll && <Lock size={13} className="text-gray-400" />}전체 캐시 초기화
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">모든 사용자의 역할 캐시를 한 번에 초기화합니다. 역할 정의 변경 후 즉시 반영할 때 사용하세요.</p>
          </div>
          {!canAll && <PermissionBadge tag="GLOBAL_CACHE_RELOAD_ALL" />}
        </div>
        <ActionBtn onClick={handleAllReload} disabled={!canAll} loading={allSt === 'loading'} variant="danger" icon={<RefreshCw size={13} />}>전체 캐시 초기화</ActionBtn>
        {allSt !== 'idle' && <Feedback status={allSt} msg={allMsg} />}
      </div>
    </div>
  );
}

// ── Main: Multi-panel layout ───────────────────────────────────────────────────

interface AdminUsersProps {
  permissionTags?: string[];
  myRoleIds?: string[];
}

export default function AdminUsers({ permissionTags = [], myRoleIds = [] }: AdminUsersProps) {
  const tags = permissionTags;
  const [allRoles, setAllRoles]   = useState<RoleDefinitionDto[]>([]);
  const [allTeams, setAllTeams]   = useState<TeamDto[]>([]);
  const [allPermTags, setAllPermTags] = useState<PermissionTagDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setRolesLoading(true);
    try {
      // Sequential to allow token refresh on first call
      try { setAllRoles(await fetchRoleDefinitions()); } catch { setAllRoles([]); }
      try { setAllTeams(await fetchTeams()); } catch { setAllTeams([]); }
      try { setAllPermTags(await fetchPermissionTags()); } catch (e) { console.error('[AdminUsers] 권한 태그 로드 실패:', e); setAllPermTags([]); }
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshAll = useCallback(() => { loadAll(); }, [loadAll]);

  // Determine which panels to show based on permissions
  const showAssign = can(tags, 'GLOBAL_ROLE_VIEW', 'ROLE_VIEW_OWN', 'GLOBAL_ROLE_ASSIGN', 'ROLE_ASSIGN_OWN', 'GLOBAL_ROLE_REVOKE', 'ROLE_REVOKE_OWN');
  const showDefine = can(tags, 'GLOBAL_ROLE_CREATE', 'ROLE_CREATE_OWN', 'GLOBAL_ROLE_MODIFY', 'ROLE_MODIFY_OWN', 'GLOBAL_ROLE_DELETE', 'ROLE_DELETE_OWN', 'GLOBAL_ROLE_VIEW', 'ROLE_VIEW_OWN');
  const showTeam   = can(tags, 'GLOBAL_TEAM_CREATE', 'GLOBAL_TEAM_MANAGE', 'TEAM_MANAGE_OWN', 'GLOBAL_TEAM_DELETE', 'TEAM_DELETE_OWN', 'TEAM_VIEW_ANY');
  const showMembers = can(tags, 'TEAM_MEMBER_VIEW', 'GLOBAL_ROLE_VIEW');
  const showCache  = can(tags, 'GLOBAL_CACHE_RELOAD_USER', 'GLOBAL_CACHE_RELOAD_ALL');
  const showBackup  = can(tags, 'GLOBAL_BACKUP_CREATE', 'GLOBAL_BACKUP_RESTORE');
  const showLog     = can(tags, 'GLOBAL_LOG_VIEW');

  const hasAnything = showAssign || showMembers || showDefine || showTeam || showCache || showBackup || showLog;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">역할 · 팀 관리</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">보유한 권한에 따라 사용 가능한 기능이 표시됩니다.</p>
        </div>
        <button onClick={refreshAll} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="새로고침">
          <RefreshCw size={15} className={rolesLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Multi-panel layout — all permitted sections displayed simultaneously */}
      <div className="space-y-4">
        {showMembers && (
          <Panel title="구성원 조회 · 역할 배정" icon={Users} badge={
            <span className="text-[10px] text-gray-400 font-medium">{allTeams.length}개 팀</span>
          }>
            <SectionMembers tags={tags} allRoles={allRoles} allTeams={allTeams} myRoleIds={myRoleIds} />
          </Panel>
        )}

        {showAssign && (
          <Panel title="사용자 ID 직접 조회" icon={Search} defaultOpen={!showMembers} badge={
            <span className="text-[10px] text-gray-400 font-medium">{allRoles.length}개 역할</span>
          }>
            <SectionAssign tags={tags} allRoles={allRoles} allTeams={allTeams} myRoleIds={myRoleIds} />
          </Panel>
        )}

        {showDefine && (
          <Panel title="역할 정의" icon={Shield} badge={
            <span className="text-[10px] text-gray-400 font-medium">{allRoles.length}개</span>
          }>
            <SectionDefine tags={tags} allRoles={allRoles} allTeams={allTeams} allPermTags={allPermTags} onRefresh={refreshAll} myRoleIds={myRoleIds} />
          </Panel>
        )}

        {showTeam && (
          <Panel title="팀 관리" icon={Building2} badge={
            <span className="text-[10px] text-gray-400 font-medium">{allTeams.length}개</span>
          }>
            <SectionTeam tags={tags} allRoles={allRoles} allTeams={allTeams} onRefreshTeams={refreshAll} />
          </Panel>
        )}

        {showCache && (
          <Panel title="캐시 관리" icon={Server} defaultOpen={false}>
            <SectionCache tags={tags} />
          </Panel>
        )}

        {/* ── Admin 전용 패널 (GLOBAL 권한) ── */}
        {showBackup && (
          <Panel title="백업 관리" icon={HardDrive} defaultOpen={false} badge={
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 flex items-center gap-0.5">
              <Globe size={7} />GLOBAL 전용
            </span>
          }>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="mb-2">시스템 백업을 생성하고 복원할 수 있습니다.</p>
              <p className="text-xs text-gray-400">백업 관리 API: POST /api/management/backups</p>
            </div>
          </Panel>
        )}

        {showLog && (
          <Panel title="로그 조회" icon={ScrollText} defaultOpen={false} badge={
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 flex items-center gap-0.5">
              <Globe size={7} />GLOBAL 전용
            </span>
          }>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="mb-2">시스템 운영 및 접속 로그를 조회할 수 있습니다.</p>
              <p className="text-xs text-gray-400">로그 조회 API: GET /api/management/log</p>
            </div>
          </Panel>
        )}

        {!hasAnything && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-600">
            <Lock size={32} />
            <p className="text-sm font-medium">접근 가능한 관리 기능이 없습니다</p>
            <p className="text-xs text-gray-400">역할 · 팀 관리 권한이 부여된 후 다시 시도하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
