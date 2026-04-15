import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, CheckCircle, AlertCircle, Plus, Minus,
  Lock, Shield, Users, Building2, Server,
  Pencil, Trash2, X, Save
} from 'lucide-react';
import {
  fetchUserPermissionTags,
  fetchRoleDefinitions,
  assignRole, revokeRole,
  createRoleDefinition, updateRoleDefinition, deleteRoleDefinition,
  fetchTeams, createTeam, updateTeam, deleteTeam,
  reloadUserPermissionCache, reloadAllPermissionCache,
  NotFoundError,
  type RoleDefinitionDto, type TeamDto,
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

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabId = 'assign' | 'define' | 'team' | 'cache';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  anyVisibleTag: string[];
  anyActiveTag: string[];
}

const TABS: TabDef[] = [
  { id: 'assign', label: '역할 배정', icon: Users,     anyVisibleTag: ['ROLE_VIEW_ANY','ROLE_ASSIGN_ANY','ROLE_REVOKE_ANY'],              anyActiveTag: ['ROLE_ASSIGN_ANY','ROLE_REVOKE_ANY'] },
  { id: 'define', label: '역할 정의', icon: Shield,    anyVisibleTag: ['ROLE_CREATE','ROLE_MODIFY','ROLE_DELETE','ROLE_VIEW_ANY'],         anyActiveTag: ['ROLE_CREATE','ROLE_MODIFY','ROLE_DELETE'] },
  { id: 'team',   label: '팀 관리',   icon: Building2, anyVisibleTag: ['TEAM_CREATE','TEAM_MANAGE_ANY','TEAM_DELETE_ANY','TEAM_VIEW_ANY'], anyActiveTag: ['TEAM_CREATE','TEAM_MANAGE_ANY','TEAM_DELETE_ANY'] },
  { id: 'cache',  label: '캐시',      icon: Server,    anyVisibleTag: ['CACHE_RELOAD_USER','CACHE_RELOAD_ALL'],                           anyActiveTag: ['CACHE_RELOAD_USER','CACHE_RELOAD_ALL'] },
];

// ── Tab: 역할 배정 ─────────────────────────────────────────────────────────────

function TabAssign({ tags, allRoles }: { tags: string[]; allRoles: RoleDefinitionDto[] }) {
  const canView   = can(tags, 'ROLE_VIEW_ANY');
  const canAssign = can(tags, 'ROLE_ASSIGN_ANY');
  const canRevoke = can(tags, 'ROLE_REVOKE_ANY');

  const [searchId, setSearchId] = useState('');
  const [lookupSt, setLookupSt] = useState<'idle'|'loading'|'found'|'not-found'|'error'>('idle');
  const [lookupErr, setLookupErr] = useState('');
  const [userTags, setUserTags]   = useState<string[]>([]);
  const [actSt, setActSt]         = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [actMsg, setActMsg]       = useState('');

  const handleLookup = async () => {
    const uid = searchId.trim();
    if (!uid) return;
    setLookupSt('loading'); setLookupErr(''); setActSt('idle');
    try {
      const data = await fetchUserPermissionTags(uid);
      setUserTags(data.permissionTags ?? []);
      setLookupSt('found');
    } catch (e: unknown) {
      if (e instanceof NotFoundError) { setUserTags([]); setLookupSt('not-found'); }
      else { setLookupSt('error'); setLookupErr(e instanceof Error ? e.message : '조회 실패'); }
    }
  };

  const doAction = async (action: () => Promise<void>, msg: string) => {
    setActSt('loading'); setActMsg('');
    try { await action(); setActSt('success'); setActMsg(msg); await handleLookup(); }
    catch (e: unknown) { setActSt('error'); setActMsg(e instanceof Error ? e.message : '실패'); }
  };

  if (!canView && !canAssign && !canRevoke) return <SectionLocked tag="ROLE_VIEW_ANY" />;

  return (
    <div className="space-y-5">
      {/* Lookup */}
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
          <ActionBtn onClick={handleLookup} disabled={!searchId.trim() || !canView} disabledReason={!canView ? 'ROLE_VIEW_ANY 권한 필요' : undefined} loading={lookupSt === 'loading'} icon={<Search size={13} />}>조회</ActionBtn>
        </div>
        {lookupSt === 'error' && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/>{lookupErr}</p>}
        {lookupSt === 'not-found' && <p className="text-xs text-amber-500 flex items-center gap-1"><AlertCircle size={12}/>이 사용자에게 배정된 역할이 없습니다.</p>}
      </div>

      {/* Role list */}
      {(lookupSt === 'found' || lookupSt === 'not-found') && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/40">
            <Users size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{searchId.trim()}</span>
            <span className="ml-auto text-xs text-gray-400">보유 태그: {userTags.length}개</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {allRoles.map(role => {
              const roleHeld = role.permissionTagIds?.some(t => userTags.includes(t)) ?? false;
              return (
                <div key={role.roleId} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{role.roleId}</span>
                      <RoleTypeBadge type={role.type} />
                      {role.system && <span className="text-[9px] font-bold text-rose-500 px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20">SYSTEM</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{role.displayName}</p>
                  </div>
                  {roleHeld ? (
                    <ActionBtn onClick={() => doAction(() => revokeRole(searchId.trim(), role.roleId), `${role.roleId} 제거 완료`)} disabled={!canRevoke} disabledReason="ROLE_REVOKE_ANY 권한 필요" loading={actSt === 'loading'} variant="revoke" icon={<Minus size={12} />}>제거</ActionBtn>
                  ) : (
                    <ActionBtn onClick={() => doAction(() => assignRole(searchId.trim(), role.roleId), `${role.roleId} 배정 완료`)} disabled={!canAssign} disabledReason="ROLE_ASSIGN_ANY 권한 필요" loading={actSt === 'loading'} variant="assign" icon={<Plus size={12} />}>배정</ActionBtn>
                  )}
                </div>
              );
            })}
          </div>
          {actSt !== 'idle' && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <Feedback status={actSt} msg={actMsg} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: 역할 정의 ─────────────────────────────────────────────────────────────

interface RoleFormState { roleId: string; displayName: string; loreDescription: string; }
const emptyRoleForm = (): RoleFormState => ({ roleId: '', displayName: '', loreDescription: '' });

interface RoleFormProps {
  mode: 'create' | 'edit';
  form: RoleFormState;
  setForm: React.Dispatch<React.SetStateAction<RoleFormState>>;
  saveSt: string; saveMsg: string;
  onSave: () => void;
  onCancel: () => void;
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

function RoleForm({ mode, form, setForm, saveSt, saveMsg, onSave, onCancel }: RoleFormProps) {
  return (
    <div className="mt-3 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
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
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">설명 (선택)</label>
        <input value={form.loreDescription} onChange={e => setForm(f => ({ ...f, loreDescription: e.target.value }))} placeholder="역할에 대한 설명" className={`${inputCls} mt-1`} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <ActionBtn onClick={onSave} loading={saveSt === 'loading'} icon={<Save size={13} />}>
          {mode === 'create' ? '역할 생성' : '저장'}
        </ActionBtn>
        <ActionBtn onClick={onCancel} variant="ghost" icon={<X size={13} />}>취소</ActionBtn>
        {saveSt !== 'idle' && <Feedback status={saveSt} msg={saveMsg} />}
      </div>
    </div>
  );
}

function TabDefine({ tags, allRoles, onRefresh }: { tags: string[]; allRoles: RoleDefinitionDto[]; onRefresh: () => void }) {
  const canCreate = can(tags, 'ROLE_CREATE');
  const canModify = can(tags, 'ROLE_MODIFY');
  const canDelete = can(tags, 'ROLE_DELETE');

  const [creating, setCreating]   = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm]           = useState<RoleFormState>(emptyRoleForm());
  const [saveSt, setSaveSt]       = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [saveMsg, setSaveMsg]     = useState('');
  const [deleteSt, setDeleteSt]   = useState<Record<string,'idle'|'loading'>>({});

  const handleCreate = async () => {
    if (!form.roleId.trim() || !form.displayName.trim()) return;
    setSaveSt('loading'); setSaveMsg('');
    try {
      await createRoleDefinition({ roleId: form.roleId.trim(), displayName: form.displayName.trim(), loreDescription: form.loreDescription || undefined, type: 'PERMISSION', adminAccountRequired: false });
      setSaveSt('success'); setSaveMsg(`${form.roleId} 역할 생성 완료`);
      setCreating(false); setForm(emptyRoleForm()); onRefresh();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleUpdate = async (roleId: string) => {
    setSaveSt('loading'); setSaveMsg('');
    try {
      await updateRoleDefinition(roleId, { displayName: form.displayName.trim(), loreDescription: form.loreDescription || undefined, adminAccountRequired: false });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">역할 정의 ({allRoles.length}개)</p>
        <ActionBtn onClick={() => { setCreating(v => !v); setEditingId(null); setForm(emptyRoleForm()); setSaveSt('idle'); }} disabled={!canCreate} disabledReason="ROLE_CREATE 권한 필요" variant="primary" icon={creating ? <X size={13} /> : <Plus size={13} />}>
          {creating ? '취소' : '새 역할 만들기'}
        </ActionBtn>
      </div>
      {creating && <RoleForm mode="create" form={form} setForm={setForm} saveSt={saveSt} saveMsg={saveMsg} onSave={handleCreate} onCancel={() => { setCreating(false); setForm(emptyRoleForm()); setSaveSt('idle'); }} />}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
        {allRoles.length === 0 && <p className="px-5 py-8 text-sm text-center text-gray-400">역할 정의가 없습니다.</p>}
        {allRoles.map(role => (
          <React.Fragment key={role.roleId}>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{role.roleId}</span>
                  <RoleTypeBadge type={role.type} />
                  {role.system && <span className="text-[9px] font-bold text-rose-500 px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20">SYSTEM</span>}
                  {role.parentRoleId && <span className="text-[9px] text-gray-400 font-mono">↑{role.parentRoleId}</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.displayName}</p>
                {role.loreDescription && <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">{role.loreDescription}</p>}
                {(role.permissionTagIds?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {role.permissionTagIds!.slice(0, 6).map(t => (
                      <span key={t} className="text-[9px] font-mono px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t}</span>
                    ))}
                    {role.permissionTagIds!.length > 6 && <span className="text-[9px] text-gray-400">+{role.permissionTagIds!.length - 6}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ActionBtn
                  onClick={() => { setEditingId(editingId === role.roleId ? null : role.roleId); setForm({ roleId: role.roleId, displayName: role.displayName, loreDescription: role.loreDescription ?? '' }); setSaveSt('idle'); setCreating(false); }}
                  disabled={!canModify || role.system}
                  disabledReason={role.system ? '시스템 역할은 수정할 수 없습니다' : 'ROLE_MODIFY 권한 필요'}
                  variant="ghost" icon={<Pencil size={12} />}
                >수정</ActionBtn>
                <ActionBtn
                  onClick={() => handleDelete(role.roleId)}
                  disabled={!canDelete || role.system}
                  disabledReason={role.system ? '시스템 역할은 삭제할 수 없습니다' : 'ROLE_DELETE 권한 필요'}
                  loading={deleteSt[role.roleId] === 'loading'}
                  variant="danger" icon={<Trash2 size={12} />}
                >삭제</ActionBtn>
              </div>
            </div>
            {editingId === role.roleId && (
              <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/40">
                <RoleForm mode="edit" form={form} setForm={setForm} saveSt={saveSt} saveMsg={saveMsg} onSave={() => handleUpdate(role.roleId)} onCancel={() => { setEditingId(null); setForm(emptyRoleForm()); setSaveSt('idle'); }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Tab: 팀 관리 ───────────────────────────────────────────────────────────────

function TabTeam({ tags }: { tags: string[] }) {
  const canCreate = can(tags, 'TEAM_CREATE');
  const canManage = can(tags, 'TEAM_MANAGE_ANY');
  const canDelete = can(tags, 'TEAM_DELETE_ANY');
  const canView   = can(tags, 'TEAM_VIEW_ANY', 'TEAM_CREATE', 'TEAM_MANAGE_ANY', 'TEAM_DELETE_ANY');

  const [teams, setTeams]         = useState<TeamDto[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState({ teamId: '', displayName: '', color: '', parentTeamId: '' });
  const [saveSt, setSaveSt]   = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [deleteSt, setDeleteSt] = useState<Record<string,'idle'|'loading'>>({});

  const loadTeams = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try { setTeams(await fetchTeams()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [canView]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const resetForm = () => setForm({ teamId: '', displayName: '', color: '', parentTeamId: '' });

  const handleCreate = async () => {
    if (!form.teamId.trim() || !form.displayName.trim()) return;
    setSaveSt('loading'); setSaveMsg('');
    try {
      await createTeam({ teamId: form.teamId.trim(), displayName: form.displayName.trim(), color: form.color || undefined, parentTeamId: form.parentTeamId || undefined });
      setSaveSt('success'); setSaveMsg(`${form.teamId} 팀 생성 완료`);
      setCreating(false); resetForm(); await loadTeams();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleUpdate = async (teamId: string) => {
    setSaveSt('loading'); setSaveMsg('');
    try {
      await updateTeam(teamId, { displayName: form.displayName.trim(), color: form.color || undefined });
      setSaveSt('success'); setSaveMsg(`${teamId} 수정 완료`);
      setEditingId(null); resetForm(); await loadTeams();
    } catch (e: unknown) { setSaveSt('error'); setSaveMsg(e instanceof Error ? e.message : '실패'); }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm(`'${teamId}' 팀을 삭제하시겠습니까?`)) return;
    setDeleteSt(p => ({ ...p, [teamId]: 'loading' }));
    try { await deleteTeam(teamId); await loadTeams(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : '삭제 실패'); }
    finally { setDeleteSt(p => ({ ...p, [teamId]: 'idle' })); }
  };

  if (!canView) return <SectionLocked tag="TEAM_VIEW_ANY" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {loading && <RefreshCw size={11} className="animate-spin" />}팀 ({teams.length}개)
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
                {teams.map(t => <option key={t.teamId} value={t.teamId}>{t.teamId} — {t.displayName}</option>)}
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
        {teams.length === 0 && !loading && <p className="px-5 py-8 text-sm text-center text-gray-400">등록된 팀이 없습니다.</p>}
        {teams.map(team => (
          <React.Fragment key={team.teamId}>
            <div className="px-4 py-3 flex items-center gap-3">
              {team.color && <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm border border-white dark:border-gray-700" style={{ backgroundColor: team.color }} />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{team.teamId}</span>
                  {team.parentTeamId && <span className="text-[9px] text-gray-400 font-mono">↑{team.parentTeamId}</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{team.displayName}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <ActionBtn onClick={() => { setEditingId(editingId === team.teamId ? null : team.teamId); setForm({ teamId: team.teamId, displayName: team.displayName, color: team.color ?? '', parentTeamId: team.parentTeamId ?? '' }); setSaveSt('idle'); setCreating(false); }} disabled={!canManage} disabledReason="TEAM_MANAGE_ANY 권한 필요" variant="ghost" icon={<Pencil size={12} />}>편집</ActionBtn>
                <ActionBtn onClick={() => handleDelete(team.teamId)} disabled={!canDelete} disabledReason="TEAM_DELETE_ANY 권한 필요" loading={deleteSt[team.teamId] === 'loading'} variant="danger" icon={<Trash2 size={12} />}>삭제</ActionBtn>
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
        ))}
      </div>
    </div>
  );
}

// ── Tab: 캐시 관리 ─────────────────────────────────────────────────────────────

function TabCache({ tags }: { tags: string[] }) {
  const canUser = can(tags, 'CACHE_RELOAD_USER');
  const canAll  = can(tags, 'CACHE_RELOAD_ALL');

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

  if (!canUser && !canAll) return <SectionLocked tag="CACHE_RELOAD_USER" />;

  return (
    <div className="space-y-4">
      {/* User cache card */}
      <div className={`rounded-xl border p-5 space-y-3 ${canUser ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-50'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5">
              {!canUser && <Lock size={13} className="text-gray-400" />}사용자 캐시 새로고침
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">특정 사용자의 역할 캐시를 무효화합니다.</p>
          </div>
          {!canUser && <PermissionBadge tag="CACHE_RELOAD_USER" />}
        </div>
        <div className="flex gap-2">
          <input value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUserReload()} disabled={!canUser} placeholder="userId" className={`${inputCls} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`} />
          <ActionBtn onClick={handleUserReload} disabled={!canUser || !userId.trim()} loading={userSt === 'loading'} variant="ghost" icon={<RefreshCw size={13} />}>새로고침</ActionBtn>
        </div>
        {userSt !== 'idle' && <Feedback status={userSt} msg={userMsg} />}
      </div>

      {/* All cache card */}
      <div className={`rounded-xl border p-5 space-y-3 ${canAll ? 'border-rose-200 dark:border-rose-900' : 'border-gray-100 dark:border-gray-800 opacity-50'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5">
              {!canAll && <Lock size={13} className="text-gray-400" />}전체 캐시 초기화
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">모든 사용자의 역할 캐시를 한 번에 초기화합니다. 역할 정의 변경 후 즉시 반영할 때 사용하세요.</p>
          </div>
          {!canAll && <PermissionBadge tag="CACHE_RELOAD_ALL" />}
        </div>
        <ActionBtn onClick={handleAllReload} disabled={!canAll} loading={allSt === 'loading'} variant="danger" icon={<RefreshCw size={13} />}>전체 캐시 초기화</ActionBtn>
        {allSt !== 'idle' && <Feedback status={allSt} msg={allMsg} />}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminUsersProps {
  permissionTags?: string[];
}

export default function AdminUsers({ permissionTags = [] }: AdminUsersProps) {
  const tags = permissionTags;
  const [activeTab, setActiveTab] = useState<TabId>('assign');
  const [allRoles, setAllRoles]   = useState<RoleDefinitionDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try { setAllRoles(await fetchRoleDefinitions()); }
    catch { /* ignore */ }
    finally { setRolesLoading(false); }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  // Auto-select first visible tab
  const visibleTabs = TABS.filter(t => can(tags, ...t.anyVisibleTag));
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [tags]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">역할 · 팀 관리</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">보유한 권한에 따라 사용 가능한 기능이 표시됩니다.</p>
        </div>
        <button onClick={loadRoles} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="역할 목록 새로고침">
          <RefreshCw size={15} className={rolesLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {TABS.map(tab => {
          const isVisible = can(tags, ...tab.anyVisibleTag);
          const isActive  = can(tags, ...tab.anyActiveTag);
          const isCurrent = activeTab === tab.id;
          const Icon = tab.icon;

          if (!isVisible) {
            return (
              <div key={tab.id} title="이 기능에 대한 권한이 없습니다" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed select-none">
                <Lock size={11} /><span className="hidden sm:inline">{tab.label}</span>
              </div>
            );
          }

          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              isCurrent ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            } ${!isActive ? 'opacity-60' : ''}`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {!isActive && <Lock size={9} className="opacity-60" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'assign' && <TabAssign tags={tags} allRoles={allRoles} />}
        {activeTab === 'define' && <TabDefine tags={tags} allRoles={allRoles} onRefresh={loadRoles} />}
        {activeTab === 'team'   && <TabTeam   tags={tags} />}
        {activeTab === 'cache'  && <TabCache  tags={tags} />}
      </div>
    </div>
  );
}
