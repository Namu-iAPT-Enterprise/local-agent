import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle, AlertCircle, Plus, Minus, List } from 'lucide-react';
import {
  fetchUserPermissionTags,
  fetchRoleDefinitions,
  assignRole,
  revokeRole,
  reloadUserPermissionCache,
  reloadAllPermissionCache,
  NotFoundError,
  type RoleDefinitionDto,
} from '../../api/gateway';

// ── State types ────────────────────────────────────────────────────────────────

type LookupStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';
type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export default function AdminUsers() {
  const [searchId, setSearchId]         = useState('');
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const [lookupError, setLookupError]   = useState('');

  // User's current permission tags (from role server)
  const [userTags, setUserTags] = useState<string[]>([]);

  // All available role definitions (loaded once)
  const [allRoles, setAllRoles]       = useState<RoleDefinitionDto[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [actionMsg, setActionMsg]       = useState('');

  // Load role definitions on mount
  useEffect(() => {
    fetchRoleDefinitions()
      .then((defs) => { setAllRoles(defs); setRolesLoaded(true); })
      .catch(() => setRolesLoaded(true)); // still show UI even if fetch fails
  }, []);

  // ── Lookup user ──────────────────────────────────────────────────────────────

  const handleLookup = async () => {
    const uid = searchId.trim();
    if (!uid) return;
    setLookupStatus('loading');
    setLookupError('');
    setActionStatus('idle');
    try {
      const data = await fetchUserPermissionTags(uid);
      setUserTags(data.permissionTags ?? []);
      setLookupStatus('found');
    } catch (e: unknown) {
      if (e instanceof NotFoundError) {
        setUserTags([]);
        setLookupStatus('not-found');
      } else {
        setLookupStatus('error');
        setLookupError(e instanceof Error ? e.message : '조회 실패');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLookup();
  };

  // ── Assign / Revoke ──────────────────────────────────────────────────────────

  const handleAssign = async (roleId: string) => {
    const uid = searchId.trim();
    setActionStatus('loading');
    setActionMsg('');
    try {
      await assignRole(uid, roleId);
      setActionStatus('success');
      setActionMsg(`${roleId} 역할이 배정되었습니다.`);
      // Refresh user info
      await handleLookup();
    } catch (e: unknown) {
      setActionStatus('error');
      setActionMsg(e instanceof Error ? e.message : '배정 실패');
    }
  };

  const handleRevoke = async (roleId: string) => {
    const uid = searchId.trim();
    setActionStatus('loading');
    setActionMsg('');
    try {
      await revokeRole(uid, roleId);
      setActionStatus('success');
      setActionMsg(`${roleId} 역할이 제거되었습니다.`);
      await handleLookup();
    } catch (e: unknown) {
      setActionStatus('error');
      setActionMsg(e instanceof Error ? e.message : '제거 실패');
    }
  };

  const showEditor = lookupStatus === 'found' || lookupStatus === 'not-found';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">역할 관리</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          사용자 ID로 조회 후 역할을 배정하거나 제거합니다.
        </p>
      </div>

      {/* Role definitions legend */}
      {rolesLoaded && allRoles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <List size={12} /> 등록된 역할 정의 ({allRoles.length}개)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allRoles.map((role) => (
              <div key={role.roleId}
                className="flex items-start gap-2.5 p-3 rounded-lg border text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold font-mono text-xs text-gray-800 dark:text-gray-200">{role.roleId}</span>
                  <span className="text-[10px] text-gray-400 uppercase">{role.type}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                  {role.displayName}
                  {role.loreDescription && <span className="block text-[10px] opacity-70 mt-0.5">{role.loreDescription}</span>}
                </span>
                {role.system && <span className="text-[9px] font-bold text-rose-500">SYSTEM</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lookup form */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          사용자 ID 조회
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => { setSearchId(e.target.value); setLookupStatus('idle'); }}
            onKeyDown={handleKeyDown}
            placeholder="userId를 입력하세요"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLookup}
            disabled={lookupStatus === 'loading' || !searchId.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {lookupStatus === 'loading'
              ? <RefreshCw size={14} className="animate-spin" />
              : <Search size={14} />}
            조회
          </button>
        </div>

        {lookupStatus === 'error' && (
          <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={14} />{lookupError}
          </p>
        )}
        {lookupStatus === 'not-found' && (
          <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle size={14} />
            이 사용자에게 배정된 역할이 없습니다. 아래에서 역할을 배정하세요.
          </p>
        )}
      </div>

      {/* Role assign/revoke panel */}
      {showEditor && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{searchId.trim()}</span>
            <span className="ml-auto text-xs text-gray-400">
              보유 태그: {userTags.length}개
            </span>
          </div>

          {/* Role list with assign/revoke buttons */}
          <div className="px-5 py-4 space-y-2">
            {allRoles.map((role) => {
              // Check if any of this role's tags are in user's tags (approximate ownership check)
              // A more precise check would require fetching user's roleIds, but tags are sufficient for UI
              const hasRole = role.permissionTagIds
                ? role.permissionTagIds.some(tag => userTags.includes(tag))
                : false;

              return (
                <div
                  key={role.roleId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    hasRole
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <span className="font-bold font-mono text-xs text-gray-800 dark:text-gray-200">{role.roleId}</span>
                    <span className="ml-2 text-xs text-gray-500">{role.displayName}</span>
                  </div>
                  {hasRole ? (
                    <button
                      onClick={() => handleRevoke(role.roleId)}
                      disabled={role.system || actionStatus === 'loading'}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={12} />제거
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAssign(role.roleId)}
                      disabled={actionStatus === 'loading'}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={12} />배정
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action feedback */}
          {actionStatus !== 'idle' && (
            <div className="px-5 pb-4">
              {actionStatus === 'success' && (
                <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={14} />{actionMsg}
                </p>
              )}
              {actionStatus === 'error' && (
                <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={14} />{actionMsg}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cache management */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">캐시 관리</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            권한 변경사항이 즉시 반영되지 않을 경우 캐시를 새로고침하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const uid = searchId.trim();
              if (!uid) return alert('사용자 ID를 입력하세요.');
              try {
                await reloadUserPermissionCache(uid);
                alert(`${uid} 사용자의 캐시가 새로고침 되었습니다.`);
              } catch (e: any) {
                alert(`캐시 새로고침 실패: ${e.message}`);
              }
            }}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            특정 사용자 캐시 새로고침
          </button>
          <button
            onClick={async () => {
              if (!confirm('모든 사용자의 권한 캐시를 새로고침 하시겠습니까?')) return;
              try {
                await reloadAllPermissionCache();
                alert('전체 사용자의 캐시가 새로고침 되었습니다.');
              } catch (e: any) {
                alert(`전체 캐시 새로고침 실패: ${e.message}`);
              }
            }}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/40 transition-colors"
          >
            모든 사용자 캐시 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
