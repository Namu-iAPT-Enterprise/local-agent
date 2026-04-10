import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Settings, PanelLeftClose, PanelLeftOpen,
  Inbox, LogOut, Trash2, MessageSquare,
  ChevronDown, LayoutGrid,
  Users, HardDrive, ScrollText,
  MessageSquare as ChatIcon, Upload, FolderOpen,
  BookPlus, FileEdit, Trash2 as TrashIcon,
  Megaphone, Bell,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { getSessions, deleteChatHistory, ChatSessionInfo } from '../api/chat';
import type { AllowedApi } from '../api/gateway';
import type { PermissionStatus } from '../hooks/usePermissions';

// ── Feature definitions (mirrored from FeatureCards) ─────────────────────────

interface FeatureDef {
  featureKey: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  pathPrefix: string;
  label: string;
  description: string;
  category: 'chat' | 'file' | 'knowledge' | 'notice' | 'admin';
  icon: React.ElementType;
  adminOnly?: boolean;
}

const FEATURES: FeatureDef[] = [
  { featureKey: 'CHAT_MESSAGE',      method: 'POST',   pathPrefix: '/api/chat/message',  label: '채팅 전송',     description: '채팅 메시지 전송',        category: 'chat',      icon: ChatIcon  },
  { featureKey: 'FILE_UPLOAD',       method: 'POST',   pathPrefix: '/api/files',          label: '파일 업로드',   description: '파일 업로드',              category: 'file',      icon: Upload    },
  { featureKey: 'FILE_VIEW',         method: 'GET',    pathPrefix: '/api/files',          label: '파일 조회',     description: '파일 목록 및 다운로드',    category: 'file',      icon: FolderOpen },
  { featureKey: 'KNOWLEDGE_REGISTER',method: 'POST',   pathPrefix: '/api/knowledge',      label: '지식 등록',     description: '지식 RAG 등록',           category: 'knowledge', icon: BookPlus  },
  { featureKey: 'KNOWLEDGE_UPDATE',  method: 'PUT',    pathPrefix: '/api/knowledge',      label: '지식 수정',     description: '지식 항목 수정',           category: 'knowledge', icon: FileEdit  },
  { featureKey: 'KNOWLEDGE_DELETE',  method: 'DELETE', pathPrefix: '/api/knowledge',      label: '지식 삭제',     description: '지식 항목 삭제',           category: 'knowledge', icon: TrashIcon },
  { featureKey: 'NOTICE_SEND_ROLE',  method: 'POST',   pathPrefix: '/api/notice',         label: '역할 공지',     description: '특정 역할 대상 공지 발송', category: 'notice',    icon: Megaphone },
  { featureKey: 'NOTICE_SEND_ALL',   method: 'POST',   pathPrefix: '/api/notice/all',     label: '전체 공지',     description: '전체 사용자 공지 발송',    category: 'notice',    icon: Bell      },
  { featureKey: 'ADMIN_USERS',       method: 'GET',    pathPrefix: '/api/admin/users',    label: '계정 관리',     description: '사용자 계정 조회 및 관리', category: 'admin',     icon: Users,    adminOnly: true },
  { featureKey: 'ADMIN_BACKUP',      method: 'GET',    pathPrefix: '/api/backups',        label: '백업 관리',     description: '시스템 백업 조회',         category: 'admin',     icon: HardDrive, adminOnly: true },
  { featureKey: 'ADMIN_LOG',         method: 'GET',    pathPrefix: '/api/log',            label: '로그 조회',     description: '시스템 운영 로그',          category: 'admin',     icon: ScrollText, adminOnly: true },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    'text-sky-500 dark:text-sky-400',
  POST:   'text-emerald-500 dark:text-emerald-400',
  PUT:    'text-violet-500 dark:text-violet-400',
  DELETE: 'text-red-500 dark:text-red-400',
};

const CATEGORY_COLOR: Record<FeatureDef['category'], string> = {
  chat:      'text-blue-500',
  file:      'text-blue-500',
  knowledge: 'text-emerald-500',
  notice:    'text-amber-500',
  admin:     'text-rose-500',
};

function isFeatureAllowed(feature: FeatureDef, allowedApis: AllowedApi[]): boolean {
  return allowedApis.some((api) => {
    if (feature.featureKey && api.featureKey) return api.featureKey === feature.featureKey;
    return api.method.toUpperCase() === feature.method && api.path.startsWith(feature.pathPrefix);
  });
}

// ── Sidebar props ─────────────────────────────────────────────────────────────

interface SidebarProps {
  onSettings?: () => void;
  onNewChat?: () => void;
  onLogout?: () => void;
  onSelectSession?: (session: ChatSessionInfo) => void;
  activeSessionId?: string | null;
  refreshTrigger?: number;
  // Permissions
  permissionsStatus?: PermissionStatus;
  allowedApis?: AllowedApi[];
  permissionRoles?: string[];
  accountRole?: string | null;
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
  permissionRoles = [],
  accountRole = null,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { bgImage } = useTheme();
  const { tr } = useLang();

  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [appsExpanded, setAppsExpanded] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await deleteChatHistory(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = search.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Compute visible apps
  const isAdmin = accountRole === 'ADMIN';
  const visibleFeatures = (permissionsStatus === 'loaded' || permissionsStatus === 'loading')
    ? FEATURES.filter((f) => {
        if (f.adminOnly) return isAdmin;
        return isFeatureAllowed(f, allowedApis);
      })
    : [];

  const showApps = visibleFeatures.length > 0;

  return (
    <aside className={`flex flex-col h-screen flex-shrink-0 transition-all duration-200 bg-gray-100 dark:bg-gray-900 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      {collapsed ? (
        <div className="flex flex-col items-center pt-4 pb-2 gap-3">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
          <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 4 L20 18 H4 Z" fill="white" />
              <circle cx="12" cy="10" r="2.5" fill="#111" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 4 L20 18 H4 Z" fill="white" />
                <circle cx="12" cy="10" r="2.5" fill="#111" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">NAMU LA</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      )}

      {/* New Chat button */}
      <div className="flex items-center gap-2 mt-3 px-3">
        <button
          onClick={() => { onNewChat?.(); setSearch(''); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors text-sm font-medium text-gray-800 ${collapsed ? 'justify-center w-full' : 'flex-1'}`}
          title={collapsed ? tr.newChat : undefined}
        >
          <Plus size={16} />
          {!collapsed && tr.newChat}
        </button>
      </div>

      {/* Search — only in expanded mode */}
      {!collapsed && (
        <div className="mt-2 px-3">
          {searching ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => { if (!search) setSearching(false); }}
                placeholder="Search chats…"
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
          ) : (
            <button
              onClick={() => setSearching(true)}
              className="flex items-center gap-2.5 w-full py-2 px-3 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Search size={14} />
              {tr.search}
            </button>
          )}
        </div>
      )}

      {/* ── Apps section ── */}
      {showApps && (
        <div className="mt-2 px-3">
          {collapsed ? (
            /* Collapsed: just an icon for each app, stacked */
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="w-full h-px bg-gray-200 dark:bg-gray-700 mb-1" />
              {visibleFeatures.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.featureKey}
                    title={`${f.label} — ${f.description}`}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${CATEGORY_COLOR[f.category]}`}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          ) : (
            /* Expanded: collapsible Apps panel */
            <div>
              <button
                onClick={() => setAppsExpanded((v) => !v)}
                className="flex items-center justify-between w-full px-1 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <LayoutGrid size={12} />
                  <span>Apps</span>
                </div>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${appsExpanded ? '' : '-rotate-90'}`}
                />
              </button>

              {appsExpanded && (
                <div className="mt-0.5 space-y-0.5 pb-1">
                  {visibleFeatures.map((f) => {
                    const Icon = f.icon;
                    const methodColor = METHOD_COLORS[f.method] ?? 'text-gray-400';
                    return (
                      <div
                        key={f.featureKey}
                        title={f.description}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/60 cursor-default transition-colors"
                      >
                        <Icon size={14} className={`flex-shrink-0 ${CATEGORY_COLOR[f.category]}`} />
                        <span className="flex-1 text-xs font-medium truncate">{f.label}</span>
                        <span className={`text-[9px] font-bold font-mono flex-shrink-0 ${methodColor}`}>
                          {f.method}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Divider before session list */}
      {!collapsed && showApps && (
        <div className="mx-3 mt-2 mb-0.5 border-t border-gray-200 dark:border-gray-700" />
      )}

      {/* Session list */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-1 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            {collapsed ? (
              <Inbox size={28} strokeWidth={1.2} />
            ) : (
              <>
                <Inbox size={36} strokeWidth={1.2} />
                <span className="text-xs">{tr.noChatHistory}</span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {filtered.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession?.(session)}
                  className={`group relative flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    isActive
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/60'
                  }`}
                >
                  {!collapsed && (
                    <>
                      <MessageSquare size={13} className="flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium leading-snug">{session.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(session.updatedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        disabled={deletingId === session.id}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all disabled:opacity-50"
                        title="Delete chat"
                      >
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

      {/* Bottom: Settings + Logout */}
      <div className="px-2 pb-5 flex border-t border-gray-200 dark:border-gray-800 pt-2">
        <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} gap-1 w-full justify-center`}>
          <button
            onClick={onSettings}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative group"
            title="Settings"
          >
            <Settings size={17} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">Settings</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors relative group"
            title="Logout"
          >
            <LogOut size={17} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
