import React, { useState } from 'react';
import { Search, RefreshCw, CheckCircle, AlertCircle, Plus, Pencil } from 'lucide-react';
import {
  fetchUserPermissionRoles,
  createUserPermissionRoles,
  updateUserPermissionRoles,
  NotFoundError,
  type PermissionRole,
} from '../../api/gateway';

// ── 역할 메타데이터 ─────────────────────────────────────────────────────────────

const ALL_ROLES: PermissionRole[] = ['WANDERER', 'KEEPER', 'HERALD', 'SOVEREIGN'];

const ROLE_META: Record<PermissionRole, { label: string; desc: string; color: string }> = {
  WANDERER: {
    label: 'WANDERER',
    desc: '기본 탐색 권한. 채팅·파일 조회 허용.',
    color: 'text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/20',
  },
  KEEPER: {
    label: 'KEEPER',
    desc: '지식 관리 권한. 지식 등록·수정·삭제 허용.',
    color: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
  },
  HERALD: {
    label: 'HERALD',
    desc: '공지 발송 권한. 역할별·전체 공지 허용.',
    color: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
  },
  SOVEREIGN: {
    label: 'SOVEREIGN',
    desc: '최고 권한. 역할 관리·캐시 초기화 허용.',
    color: 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20',
  },
};

// ── 상태 타입 ───────────────────────────────────────────────────────────────────

type LookupStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';
type SaveStatus   = 'idle' | 'loading' | 'success' | 'error';

export default function AdminUsers() {
  const [searchId, setSearchId]         = useState('');
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const [lookupError, setLookupError]   = useState('');

  // 조회된 현재 역할 (found 상태) / null = 미등록(not-found 상태)
  const [currentRoles, setCurrentRoles] = useState<PermissionRole[] | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<PermissionRole>>(new Set());

  const [saveStatus, setSaveStatus]     = useState<SaveStatus>('idle');
  const [saveError, setSaveError]       = useState('');

  const isNew = lookupStatus === 'not-found'; // 신규 등록 모드

  // ── 조회 ────────────────────────────────────────────────────────────────────

  const handleLookup = async () => {
    const uid = searchId.trim();
    if (!uid) return;
    setLookupStatus('loading');
    setLookupError('');
    setCurrentRoles(null);
    setSaveStatus('idle');
    try {
      const data = await fetchUserPermissionRoles(uid);
      setCurrentRoles(data.permissionRoles);
      setSelectedRoles(new Set(data.permissionRoles));
      setLookupStatus('found');
    } catch (e: unknown) {
      if (e instanceof NotFoundError) {
        setCurrentRoles(null);
        setSelectedRoles(new Set());
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

  // ── 역할 토글 ────────────────────────────────────────────────────────────────

  const toggleRole = (role: PermissionRole) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
    setSaveStatus('idle');
  };

  // ── 저장 ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const uid = searchId.trim();
    const roles = ALL_ROLES.filter((r) => selectedRoles.has(r));
    setSaveStatus('loading');
    setSaveError('');
    try {
      if (isNew) {
        await createUserPermissionRoles(uid, roles);
      } else {
        await updateUserPermissionRoles(uid, roles);
      }
      setCurrentRoles(roles);
      setLookupStatus('found');
      setSaveStatus('success');
    } catch (e: unknown) {
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : '저장 실패');
    }
  };

  const hasChanges = (() => {
    if (lookupStatus !== 'found' && lookupStatus !== 'not-found') return false;
    if (isNew) return selectedRoles.size > 0;
    if (!currentRoles) return false;
    if (currentRoles.length !== selectedRoles.size) return true;
    return currentRoles.some((r) => !selectedRoles.has(r));
  })();

  const showEditor = lookupStatus === 'found' || lookupStatus === 'not-found';

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">역할 관리</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          사용자 ID로 조회 후 권한 역할(Permission Role)을 편집합니다.
        </p>
      </div>

      {/* 역할 범례 */}
      <div className="grid grid-cols-2 gap-2">
        {ALL_ROLES.map((role) => {
          const m = ROLE_META[role];
          return (
            <div key={role} className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${m.color}`}>
              <span className="font-bold font-mono text-xs mt-0.5 flex-shrink-0">{m.label}</span>
              <span className="text-xs opacity-80">{m.desc}</span>
            </div>
          );
        })}
      </div>

      {/* 조회 폼 */}
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
            <Plus size={14} />
            역할 레코드가 없습니다. 아래에서 역할을 선택하고 등록하세요.
          </p>
        )}
      </div>

      {/* 역할 편집 패널 */}
      {showEditor && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden">
          {/* 헤더 */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            {isNew
              ? <Plus size={15} className="text-amber-500" />
              : <Pencil size={15} className="text-blue-500" />}
            <span className="text-sm font-semibold text-gray-800 dark:text-white">{searchId.trim()}</span>
            <span className="ml-auto text-xs text-gray-400">
              {isNew ? '신규 등록' : '역할 수정'}
            </span>
          </div>

          {/* 역할 체크박스 */}
          <div className="px-5 py-4 space-y-2">
            {ALL_ROLES.map((role) => {
              const m = ROLE_META[role];
              const checked = selectedRoles.has(role);
              return (
                <label
                  key={role}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? m.color
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role)}
                    className="w-4 h-4 rounded accent-current"
                  />
                  <span className="font-bold font-mono text-xs">{m.label}</span>
                  <span className="text-xs flex-1">{m.desc}</span>
                </label>
              );
            })}
          </div>

          {/* 저장 피드백 + 버튼 */}
          <div className="px-5 pb-5 space-y-3">
            {saveStatus === 'success' && (
              <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={14} />
                {isNew ? '역할이 등록되었습니다.' : '역할이 저장되었습니다.'}
              </p>
            )}
            {saveStatus === 'error' && (
              <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={14} />{saveError}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'loading'}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saveStatus === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />저장 중...
                </span>
              ) : isNew ? '역할 등록' : '변경사항 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
