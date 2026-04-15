import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Settings, PanelLeftClose, PanelLeftOpen,
  Inbox, LogOut, Trash2, MessageSquare,
  ChevronDown, ChevronUp, LayoutGrid, Shield,
  RefreshCw, ShieldPlus, User,
  CheckCircle, AlertCircle, Server
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { getSessions, deleteChatHistory, ChatSessionInfo } from '../api/chat';
import { postManagementRequest, reloadUserPermissionCache } from '../api/gateway';
import type { AllowedApi } from '../api/gateway';
import type { PermissionStatus } from '../hooks/usePermissions';
import { APP_FEATURES, getMappedApiInfo, FeatureCategory } from '../config/apiPermissions';

const METHOD_COLORS: Record<string, string> = {
  GET:    'text-sky-500 dark:text-sky-400',
  POST:   'text-emerald-500 dark:text-emerald-400',
  PUT:    'text-violet-500 dark:text-violet-400',
  DELETE: 'text-red-500 dark:text-red-400',
  PATCH:  'text-amber-500 dark:text-amber-400',
};

const CATEGORY_COLOR: Record<FeatureCategory, string> = {
  chat:      'text-blue-500',
  file:      'text-blue-500',
  knowledge: 'text-emerald-500',
  notice:    'text-amber-500',
  admin:     'text-rose-500',
  request:   'text-violet-500',
};

/** Default badge color for role IDs. Unknown roles get a neutral style. */
const ROLE_BADGE_DEFAULT = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

function hasAppAccess(featureKeys: string[], allowedApis: AllowedApi[]): boolean {
  return allowedApis.some(api => api.featureKey && featureKeys.includes(api.featureKey));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  onSettings?: () => void;
  onNewChat?: () => void;
  onLogout?: () => void;
  onSelectSession?: (session: ChatSessionInfo) => void;
  activeSessionId?: string | null;
  refreshTrigger?: number;
  permissionsStatus?: PermissionStatus;
  allowedApis?: AllowedApi[];
  roleIds?: string[];
  enabledFeatures?: string[];
  accountRole?: string | null;
  userId?: string | null;
  onFeatureClick?: (featureKey: string) => void;
  onRefreshPermissions?: () => void;
}

export default function Sidebar({
  onSettings,
  onNewChat,
  onLogout,
  onSelectSession,
  activeSessionId,
  refreshTrigger = 0,
  permissionsStatus = 'idle',
  allowedApis = [],
  roleIds = [],
  enabledFeatures = [],
  accountRole = null,
  userId = null,
  onFeatureClick,
  onRefreshPermissions,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { bgImage } = useTheme();
  const { tr } = useLang();

  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [appsExpanded, setAppsExpanded] = useState(true);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverRefreshState, setServerRefreshState] = useState<'idle' | 'confirm' | 'loading'>('idle');

  // 기본 권한 요청 상태 ('idle' | 'loading' | 'success' | 'error')
  const [roleReqStatus, setRoleReqStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const loadSessions = useCallback(async () => {
    try { setSessions(await getSessions()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await deleteChatHistory(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshPermissions?.();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleServerRefresh = async () => {
    if (serverRefreshState === 'idle') {
      setServerRefreshState('confirm');
      setTimeout(() => {
        setServerRefreshState((prev) => (prev === 'confirm' ? 'idle' : prev));
      }, 3000);
    } else if (serverRefreshState === 'confirm') {
      if (!userId) return;
      setServerRefreshState('loading');
      try {
        await reloadUserPermissionCache(userId);
        await onRefreshPermissions?.();
      } catch (e) {
        console.error('Server refresh failed:', e);
      } finally {
        setServerRefreshState('idle');
      }
    }
  };

  // Request role assignment from admin
  const handleRequestDefaultRole = async () => {
    if (!userId || roleReqStatus === 'loading' || roleReqStatus === 'success') return;
    setRoleReqStatus('loading');
    try {
      await postManagementRequest({
        source: 'frontend',
        type: 'ROLE_REQUEST',
        title: `역할 배정 요청 — ${userId}`,
        message: `사용자 '${userId}'에게 역할을 배정해 주세요.`,
      });
      setRoleReqStatus('success');
    } catch {
      setRoleReqStatus('error');
    }
  };

  const filtered = search.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const isAdmin = accountRole === 'ADMIN';
  const hasAdminAccess = isAdmin || enabledFeatures.includes('ROLE_DEFINE_CREATE');
  const isLoaded = permissionsStatus === 'loaded' || permissionsStatus === 'loading';
  const hasNoRoles = isLoaded && roleIds.length === 0;

  function hasFeatureAccess(f: typeof APP_FEATURES[number]): boolean {
    // adminOnly 기능은 ADMIN 계정이거나, 해당 기능의 권한 태그 중 하나라도 허용된 경우 표시
    if (f.adminOnly) return hasAdminAccess || hasAppAccess(f.requiredFeatureKeys, allowedApis);
    return hasAppAccess(f.requiredFeatureKeys, allowedApis);
  }

  // Apps: 권한 충족 항목만 표시
  const appFeatures = isLoaded
    ? APP_FEATURES.filter((f) => hasFeatureAccess(f))
    : [];

  // 권한 패널: 모든 allowedApis를 이름과 아이콘으로 매핑
  const allowedApiItems = isLoaded
    ? allowedApis.map(api => ({ ...api, ...getMappedApiInfo(api) }))
    : [];

  const showApps = appFeatures.length > 0;

  return (
    <aside className={`flex flex-col h-screen flex-shrink-0 transition-all duration-200 bg-gray-100 dark:bg-gray-900 ${collapsed ? 'w-16' : 'w-72'}`}>

      {/* Header */}
      {collapsed ? (
        <div className="flex flex-col items-center pt-4 pb-2 gap-3">
          <button onClick={() => setCollapsed(false)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Expand">
            <PanelLeftOpen size={18} />
          </button>
          <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 4 L20 18 H4 Z" fill="white" /><circle cx="12" cy="10" r="2.5" fill="#111" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 4 L20 18 H4 Z" fill="white" /><circle cx="12" cy="10" r="2.5" fill="#111" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">NAMU LA</span>
          </div>
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Collapse">
            <PanelLeftClose size={18} />
          </button>
        </div>
      )}

      {/* New Chat */}
      <div className="flex items-center gap-2 mt-3 px-3">
        <button
          onClick={() => { onNewChat?.(); setSearch(''); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors text-sm font-medium text-gray-800 ${collapsed ? 'justify-center w-full' : 'flex-1'}`}
          title={collapsed ? tr.newChat : undefined}
        >
          <Plus size={16} />{!collapsed && tr.newChat}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="mt-2 px-3">
          {searching ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                onBlur={() => { if (!search) setSearching(false); }}
                placeholder="Search chats…"
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400" />
            </div>
          ) : (
            <button onClick={() => setSearching(true)}
              className="flex items-center gap-2.5 w-full py-2 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
              <Search size={14} />{tr.search}
            </button>
          )}
        </div>
      )}

      {/* ── Apps section ── */}
      {showApps && (
        <div className="mt-2 px-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="w-full h-px bg-gray-200 dark:bg-gray-700 mb-1" />
              {appFeatures.map((f) => {
                const Icon = f.icon;
                return (
                  <button key={f.id} title={`${f.label} — ${f.description}`}
                    onClick={() => onFeatureClick?.(f.requiredFeatureKeys[0])} // Use first required featureKey for navigation
                    className={`w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer ${CATEGORY_COLOR[f.category]}`}>
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <button onClick={() => setAppsExpanded((v) => !v)}
                className="flex items-center justify-between w-full px-1 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <div className="flex items-center gap-1.5"><LayoutGrid size={12} /><span>Apps</span></div>
                <ChevronDown size={13} className={`transition-transform duration-200 ${appsExpanded ? '' : '-rotate-90'}`} />
              </button>
              {appsExpanded && (
                <div className="mt-0.5 space-y-0.5 pb-1">
                  {appFeatures.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button key={f.id} title={f.description}
                        onClick={() => onFeatureClick?.(f.requiredFeatureKeys[0])}
                        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/60 transition-colors text-left cursor-pointer">
                        <Icon size={14} className={`flex-shrink-0 ${CATEGORY_COLOR[f.category]}`} />
                        <span className="flex-1 text-xs font-medium truncate">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!collapsed && showApps && <div className="mx-3 mt-2 mb-0.5 border-t border-gray-200 dark:border-gray-700" />}

      {/* Session list — flex-1 so it shrinks when profile panel expands */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-1 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            {collapsed ? <Inbox size={28} strokeWidth={1.2} /> : <><Inbox size={36} strokeWidth={1.2} /><span className="text-xs">{tr.noChatHistory}</span></>}
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {filtered.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div key={session.id} onClick={() => onSelectSession?.(session)}
                  className={`group relative flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${isActive ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/60'}`}>
                  {!collapsed && (
                    <>
                      <MessageSquare size={13} className="flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium leading-snug">{session.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(session.updatedAt)}</p>
                      </div>
                      <button onClick={(e) => handleDelete(e, session.id)} disabled={deletingId === session.id}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all disabled:opacity-50" title="Delete chat">
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                  {collapsed && <MessageSquare size={17} className="mx-auto text-gray-400" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom area ── */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 relative">

        {/* 권한 패널 — absolute 플로팅, 프로필 카드 위에 떠있음 */}
        {!collapsed && rolesExpanded && (
          <div className="absolute bottom-full left-0 right-0 z-20
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            rounded-t-xl shadow-xl
            px-3 pt-3 pb-3
            max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Shield size={10} />내 권한
              </p>
              <button onClick={handleServerRefresh} title="서버 권한 새로고침 (캐시 지우기)"
                className={`p-1 rounded-md transition-colors text-[10px] font-bold flex items-center gap-1 ${
                  serverRefreshState === 'confirm'
                    ? 'bg-red-500 text-white hover:bg-red-600 px-1.5'
                    : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>
                {serverRefreshState === 'confirm' ? '임시 권한이 소멸합니다!' : serverRefreshState === 'loading' ? <RefreshCw size={12} className="animate-spin" /> : <Server size={12} />}
              </button>
            </div>

            {/* Role Badges */}
            {roleIds.length > 0 ? (
              <div className="flex flex-wrap gap-1 mb-2">
                {roleIds.map((r) => (
                  <span key={r} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_BADGE_DEFAULT}`}>{r}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">역할 없음</p>
            )}

            {/* Allowed features */}
            {allowedApiItems.length > 0 && (
              <div className="space-y-0.5">
                {allowedApiItems.map((apiItem, idx) => {
                  const Icon = apiItem.icon;
                  return (
                    <div key={`${apiItem.method}-${apiItem.path}-${idx}`} className="flex items-center gap-2 px-1.5 py-1 rounded text-xs text-gray-500 dark:text-gray-400">
                      <Icon size={11} className={`flex-shrink-0 ${CATEGORY_COLOR[apiItem.category]}`} />
                      <span className="flex-1 truncate">{apiItem.label}</span>
                      <span className={`text-[9px] font-bold font-mono ${METHOD_COLORS[apiItem.method] ?? 'text-gray-400'}`}>{apiItem.method}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Profile card */}
        {!collapsed ? (
          <div className="px-3 pt-2 pb-3 space-y-2">
            {/* User info row */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{userId ?? '—'}</p>
                <p className={`text-[10px] font-medium ${accountRole === 'ADMIN' ? 'text-rose-500' : 'text-gray-400'}`}>
                  {accountRole ?? '—'}
                </p>
              </div>
              {/* 권한 보기 토글 */}
              <button onClick={() => setRolesExpanded((v) => !v)}
                title="내 권한 보기"
                className={`p-1.5 rounded-lg transition-colors ${rolesExpanded ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {rolesExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              {/* 새로고침 */}
              <button onClick={handleRefresh} title="새로고침"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* 기본 권한 요청 버튼 (권한 없을 때만) */}
            {hasNoRoles && (
              <button
                onClick={handleRequestDefaultRole}
                disabled={roleReqStatus === 'loading' || roleReqStatus === 'success'}
                title={
                  roleReqStatus === 'success'
                    ? '요청이 전송되었습니다. 관리자 처리 후 반영됩니다.'
                    : roleReqStatus === 'error'
                    ? '요청 전송에 실패했습니다. 다시 시도하세요.'
                    : '역할 배정을 관리자에게 요청합니다.'
                }
                className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium rounded-lg border border-dashed border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {roleReqStatus === 'loading' && <RefreshCw size={13} className="animate-spin" />}
                {roleReqStatus === 'success' && <CheckCircle size={13} className="text-emerald-500" />}
                {roleReqStatus === 'error'   && <AlertCircle size={13} className="text-red-500" />}
                {(roleReqStatus === 'idle' || roleReqStatus === 'error') && <ShieldPlus size={13} />}
                {roleReqStatus === 'idle'    && '역할 배정 요청'}
                {roleReqStatus === 'loading' && '요청 중...'}
                {roleReqStatus === 'success' && '요청 완료'}
                {roleReqStatus === 'error'   && '재시도'}
              </button>
            )}

            {/* Settings + Logout */}
            <div className="flex gap-1">
              <button onClick={onSettings}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Settings size={14} />설정
              </button>
              <button onClick={onLogout}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors">
                <LogOut size={14} />로그아웃
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed bottom */
          <div className="flex flex-col items-center gap-1 py-3">
            <button onClick={handleRefresh} title="권한 새로고침"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={onSettings} title="Settings"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Settings size={15} />
            </button>
            <button onClick={onLogout} title="Logout"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
