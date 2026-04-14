import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Plus, Menu, Brain, ChevronDown, Check, Copy, RefreshCw, ChevronLeft, ChevronRight, Pencil, Database, ShieldAlert } from 'lucide-react';
import AssistantCards from './components/AssistantCards';
import CreateAssistantModal from './components/CreateAssistantModal';
import Sidebar from './components/Sidebar';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminUsersScreen from './components/AdminUsersScreen';
import RequestsScreen from './components/RequestsScreen';
import KnowledgeScreen from './components/KnowledgeScreen';
import { useTheme } from './context/ThemeContext';
import { useLang } from './context/LanguageContext';
import { useChat, ModelOption, LOCAL_MODELS } from './hooks/useChat';
import type { AssistantVariant } from './hooks/useChat';
import MarkdownRenderer from './components/MarkdownRenderer';
import ThinkingBlock from './components/ThinkingBlock';
import { getAccessToken, getAccountRole, saveAccountRole, logout as authLogout, getMe, getUserId } from './api/auth';
import { createUserPermissionRoles } from './api/gateway';
import type { ChatSessionInfo } from './api/chat';
import { usePermissions } from './hooks/usePermissions';
import { defaultAssistants, getCustomAssistants, saveCustomAssistant, type OfficeAssistant } from './data/officeAssistants';

// ── Code detection for user messages ─────────────────────────────────────────

function detectCodeLanguage(text: string): string | null {
  const t = text.trim();
  if (/<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return 'html';
  if (/<\/?(?:html|head|body|div|span|p|a|ul|ol|li|h[1-6]|table|tr|td|th|form|input|button|script|style|link|meta|img|nav|section|article|header|footer|main)\b/i.test(t) && t.includes('</')) return 'html';
  if (/public\s+class\s+\w+/.test(t) || /public\s+static\s+void\s+main/.test(t)) return 'java';
  if (/^\s*(?:import\s+React|const\s+\w+\s*=|function\s+\w+\s*\(|export\s+default|export\s+(?:const|function))/m.test(t)) return 'tsx';
  if (/^\s*(?:def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|class\s+\w+\s*:)/m.test(t)) return 'python';
  if (/^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s/im.test(t)) return 'sql';
  if (/^\s*(?:#include|int\s+main\s*\(|void\s+\w+\s*\()/m.test(t)) return 'cpp';
  if (/^\s*(?:func\s+\w+|package\s+\w+|import\s+")/m.test(t)) return 'go';
  if (/^\s*(?:\{|\[)[\s\S]*(?:\}|\])$/.test(t) && (() => { try { JSON.parse(t); return true; } catch { return false; } })()) return 'json';
  return null;
}

function UserMessage({ content }: { content: string }) {
  const hasFences = /```/.test(content);
  const detectedLang = !hasFences ? detectCodeLanguage(content) : null;

  if (hasFences || detectedLang) {
    const mdContent = hasFences ? content : `\`\`\`${detectedLang}\n${content}\n\`\`\``;
    return (
      <div className="max-w-[80%] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-br-sm overflow-hidden">
        <div className="px-4 py-3">
          <MarkdownRenderer content={mdContent} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[88%] sm:max-w-[75%] px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-br-sm whitespace-pre-wrap leading-relaxed text-sm">
      {content}
    </div>
  );
}

// ── Model selector dropdown ───────────────────────────────────────────────────

const STORAGE_KEY = 'namu_models';

interface SavedModelRecord {
  id: string;
  platform: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

function PlatformDot({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    Ollama:     'bg-gray-500',
    OpenRouter: 'bg-indigo-500',
    OpenAI:     'bg-green-500',
    Anthropic:  'bg-orange-500',
    Gemini:     'bg-blue-500',
    Custom:     'bg-gray-400',
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[platform] ?? 'bg-gray-400'}`} />;
}

interface ModelSelectorProps {
  selected: ModelOption;
  onChange: (m: ModelOption) => void;
}

function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load API models from localStorage on each open
  const [apiModels, setApiModels] = useState<ModelOption[]>([]);
  useEffect(() => {
    if (!open) return;
    try {
      const raw: SavedModelRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      setApiModels(raw.map((m) => ({
        id: m.id,
        name: m.modelName,
        platform: m.platform,
        baseUrl: m.baseUrl,
        apiKey: m.apiKey,
        isLocal: false,
      })));
    } catch {
      setApiModels([]);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (m: ModelOption) => { onChange(m); setOpen(false); };

  return (
    <div ref={ref} className="relative min-w-0 max-w-[140px] sm:max-w-none">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
      >
        <PlatformDot platform={selected.platform} />
        <span className="max-w-[120px] truncate">{selected.name}</span>
        <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1.5 left-0 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Local models */}
          <div className="px-3 pt-2.5 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Local</span>
          </div>
          {LOCAL_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <PlatformDot platform={m.platform} />
              <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{m.name}</span>
              <span className="text-[10px] text-gray-400">{m.platform}</span>
              {selected.id === m.id && <Check size={13} className="text-blue-500 flex-shrink-0" />}
            </button>
          ))}

          {/* API models from settings */}
          {apiModels.length > 0 && (
            <>
              <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
              <div className="px-3 pt-1.5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">API Models</span>
              </div>
              {apiModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pick(m)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <PlatformDot platform={m.platform} />
                  <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{m.name}</span>
                  <span className="text-[10px] text-gray-400">{m.platform}</span>
                  {selected.id === m.id && <Check size={13} className="text-blue-500 flex-shrink-0" />}
                </button>
              ))}
            </>
          )}

          {apiModels.length === 0 && (
            <p className="px-3 pb-2.5 text-[11px] text-gray-400 dark:text-gray-500">
              Add API models in Settings → Model
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Copy hook ────────────────────────────────────────────────────────────────

/** Works in Electron (file://) and browsers — tries Clipboard API first, falls back to execCommand. */
function copyText(text: string): void {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
  } else {
    execCommandCopy(text);
  }
}

function execCommandCopy(text: string): void {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(el); }
}

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback((text: string) => {
    copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);
  return [copied, copy];
}

// ── User message actions (copy + edit) ───────────────────────────────────────

function UserMessageActions({ content, onEdit }: { content: string; onEdit: () => void }) {
  const [copied, copy] = useCopy();
  return (
    <div className="flex items-center gap-1 mt-1 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => copy(content)}
        title="Copy"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
      <button
        onClick={onEdit}
        title="Edit"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

// ── Assistant message actions (copy + refresh + variant swiper) ───────────────

interface AssistantMessageActionsProps {
  content: string;
  isStreaming: boolean;
  variants?: AssistantVariant[];
  activeVariantIdx?: number;
  onRegenerate: () => void;
  onVariantChange: (idx: number) => void;
}

function AssistantMessageActions({
  content, isStreaming, variants, activeVariantIdx, onRegenerate, onVariantChange,
}: AssistantMessageActionsProps) {
  const [copied, copy] = useCopy();
  const hasVariants = variants && variants.length > 1;
  const currentIdx = activeVariantIdx ?? (variants ? variants.length - 1 : 0);
  const total = variants?.length ?? 1;

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => copy(content)}
        title="Copy"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRegenerate}
        disabled={isStreaming}
        title="Regenerate"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
      >
        <RefreshCw size={13} />
      </button>
      {hasVariants && (
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onVariantChange(currentIdx - 1)}
            disabled={currentIdx === 0 || isStreaming}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums min-w-[28px] text-center">
            {currentIdx + 1}/{total}
          </span>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onVariantChange(currentIdx + 1)}
            disabled={currentIdx === total - 1 || isStreaming}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState('');
  const [page, setPage] = useState<'login' | 'signup' | 'home' | 'settings' | 'admin-users' | 'requests' | 'knowledge'>(() => {
    const hash = window.location.hash.replace('#', '');
    if (['login', 'signup', 'home', 'settings', 'admin-users', 'requests', 'knowledge'].includes(hash)) {
      return hash as any;
    }
    return getAccessToken() ? 'home' : 'login';
  });

  const navigateTo = (newPage: typeof page) => {
    setPage(newPage);
    window.history.pushState({ page: newPage }, '', `#${newPage}`);
  };

  useEffect(() => {
    // Sync initial state to history if not there
    if (!window.history.state?.page) {
      window.history.replaceState({ page }, '', `#${page}`);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setPage(event.state.page);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (['login', 'signup', 'home', 'settings', 'admin-users', 'requests', 'knowledge'].includes(hash)) {
          setPage(hash as any);
        } else {
          setPage(getAccessToken() ? 'home' : 'login');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('namu_thinking_mode');
    return saved !== null ? saved === 'true' : false;
  });
  const [ragMode, setRagMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('namu_rag_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [selectedModel, setSelectedModel] = useState<ModelOption>(() => {
    const saved = localStorage.getItem('namu_selected_model');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return LOCAL_MODELS[0];
  });
  const [sessionRefresh, setSessionRefresh] = useState(0);
  const [accountRole, setAccountRole] = useState<string | null>(getAccountRole());
  const { bgImage } = useTheme();
  const { tr } = useLang();
  const { messages, isStreaming, send, regenerate, setVariant, prepareEdit, clear, stop, loadSession, sessionId } = useChat();

  // Office assistants state
  const [customAssistants, setCustomAssistants] = useState<OfficeAssistant[]>(() => getCustomAssistants());
  const [activeAssistant, setActiveAssistant] = useState<OfficeAssistant | null>(() => {
    const saved = localStorage.getItem('namu_active_assistant');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem('namu_thinking_mode', String(thinkingMode));
  }, [thinkingMode]);

  useEffect(() => {
    localStorage.setItem('namu_rag_mode', String(ragMode));
  }, [ragMode]);

  useEffect(() => {
    localStorage.setItem('namu_selected_model', JSON.stringify(selectedModel));
  }, [selectedModel]);

  useEffect(() => {
    if (activeAssistant) {
      localStorage.setItem('namu_active_assistant', JSON.stringify(activeAssistant));
    } else {
      localStorage.removeItem('namu_active_assistant');
    }
  }, [activeAssistant]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const allAssistants = [...defaultAssistants, ...customAssistants];

  // 로그인/회원가입 화면이 아닌 모든 페이지를 "로그인 상태"로 간주합니다.
  // admin-users, requests, knowledge 등 권한이 필요한 페이지도 포함해야
  // usePermissions 훅이 해당 페이지 진입 시 권한을 초기화하지 않습니다.
  const isLoggedIn = page !== 'login' && page !== 'signup';
  const permissions = usePermissions(isLoggedIn);
  const hasAdminAccess = accountRole === 'ADMIN' || permissions.permissionRoles.includes('SOVEREIGN');
  // Knowledge 화면: SOVEREIGN은 무조건 접근, KEEPER는 allowedApis에 KNOWLEDGE_REGISTER가 있으면 접근
  const hasKnowledgeAccess = accountRole === 'ADMIN'
    || permissions.permissionRoles.includes('SOVEREIGN')
    || permissions.permissionRoles.includes('KEEPER')
    || permissions.allowedApis.some((a) => a.featureKey === 'KNOWLEDGE_REGISTER');

  // Redirect to login when token refresh fails across the app
  useEffect(() => {
    const handler = () => { clear(); navigateTo('login'); };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [clear]);

  // 로그인 상태가 될 때마다 서버에서 계정 역할을 새로 가져옵니다.
  // 페이지 새로고침·로그인 직후 모두 최신 역할을 반영합니다.
  useEffect(() => {
    if (!isLoggedIn) return;
    getMe()
      .then((me) => {
        saveAccountRole(me.role);
        setAccountRole(me.role);
      })
      .catch(() => {
        // 네트워크 오류 등 실패 시 localStorage 캐시 유지
      });
  }, [isLoggedIn]);

  // Refresh session list + auto-focus input after streaming ends
  const prevStreaming = useRef(false);
  useEffect(() => {
    if (prevStreaming.current && !isStreaming) {
      textareaRef.current?.focus();
      const timer = setTimeout(() => setSessionRefresh((n) => n + 1), 800);
      return () => clearTimeout(timer);
    }
    prevStreaming.current = isStreaming;
  }, [isStreaming]);

  const handleLogin = (_uid: string) => {
    navigateTo('home');
    setSessionRefresh((n) => n + 1);
    // 역할 갱신은 isLoggedIn useEffect 가 처리합니다.
  };

  const handleLogout = async () => {
    await authLogout();
    clear();
    setAccountRole(null);
    navigateTo('login');
  };

  const handleSelectSession = async (session: ChatSessionInfo) => {
    const restoredModel = await loadSession(session.id, {
      modelName: session.modelName,
      platform: session.platform,
    });
    if (restoredModel) setSelectedModel(restoredModel);
    setMobileMenuOpen(false);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    
    // If an assistant is active, prepend the system prompt
    const messageToSend = activeAssistant 
      ? `${activeAssistant.systemPrompt}\n\n${text}` 
      : text;
    
    send(messageToSend, thinkingMode, selectedModel, ragMode);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (page === 'login')    return <Login onLogin={handleLogin} onSignup={() => navigateTo('signup')} />;
  if (page === 'signup')   return <Signup onSignup={handleLogin} onLogin={() => navigateTo('login')} />;
  if (page === 'settings') return (
    <Settings
      onBack={() => navigateTo('home')}
      accountRole={accountRole}
      permissionRoles={permissions.permissionRoles}
    />
  );
  // 계정 관리 화면 — ADMIN 계정 역할 또는 SOVEREIGN 권한 역할 필요
  // 권한 로딩이 끝나기 전(idle·loading)에는 판단을 보류합니다.
  // 로딩 중에 섣불리 hasAdminAccess=false로 판정해 홈으로 튕기는 것을 방지합니다.
  if (page === 'admin-users') {
    if (permissions.status === 'idle' || permissions.status === 'loading') return null;
    if (!hasAdminAccess) {
      navigateTo('home');
      return null;
    }
    return <AdminUsersScreen onBack={() => navigateTo('home')} />;
  }

  if (page === 'requests') {
    if (permissions.status === 'idle' || permissions.status === 'loading') return null;
    if (!hasAdminAccess) {
      navigateTo('home');
      return null;
    }
    return <RequestsScreen onBack={() => navigateTo('home')} />;
  }

  // 지식 관리 화면 — KEEPER·SOVEREIGN 권한 역할 또는 ADMIN 계정 역할 필요
  // 권한 로딩이 끝나기 전(idle·loading)에는 판단을 보류합니다.
  if (page === 'knowledge') {
    if (permissions.status === 'idle' || permissions.status === 'loading') return null;
    if (!hasKnowledgeAccess) {
      navigateTo('home');
      return null;
    }
    return <KnowledgeScreen onBack={() => navigateTo('home')} />;
  }

  const hasMessages = messages.length > 0;

  const chatInputProps = {
    textareaRef,
    input,
    setInput,
    isStreaming,
    thinkingMode,
    onThinkingToggle: () => setThinkingMode((v) => !v),
    ragMode,
    onRagToggle: () => setRagMode((v) => !v),
    selectedModel,
    onModelChange: setSelectedModel,
    onSend: handleSend,
    onStop: stop,
    onKeyDown: handleKeyDown,
    placeholder: tr.inputPlaceholder,
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar
          onSettings={() => navigateTo('settings')}
          onNewChat={() => { clear(); setSessionRefresh((n) => n + 1); }}
          onLogout={handleLogout}
          onSelectSession={handleSelectSession}
          activeSessionId={sessionId}
          refreshTrigger={sessionRefresh}
          permissionsStatus={permissions.status}
          allowedApis={permissions.allowedApis}
          permissionRoles={permissions.permissionRoles}
          accountRole={accountRole}
          onFeatureClick={(key) => {
            if (key === 'ADMIN_USERS') navigateTo('admin-users');
            if (key === 'ADMIN_REQUESTS') navigateTo('requests');
            if (['KNOWLEDGE_REGISTER', 'KNOWLEDGE_UPDATE', 'KNOWLEDGE_PURGE'].includes(key)) navigateTo('knowledge');
          }}
          userId={getUserId()}
          onRefreshPermissions={() => permissions.reload()}
          onCreateDefaultRoles={async () => {
            const uid = getUserId();
            if (!uid) return;
            try { await createUserPermissionRoles(uid, ['WANDERER']); } catch { /* already exists */ }
            permissions.reload();
          }}
        />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 flex-shrink-0">
            <Sidebar
              onSettings={() => { navigateTo('settings'); setMobileMenuOpen(false); }}
              onNewChat={() => { clear(); setSessionRefresh((n) => n + 1); setMobileMenuOpen(false); }}
              onLogout={() => { handleLogout(); setMobileMenuOpen(false); }}
              onSelectSession={handleSelectSession}
              activeSessionId={sessionId}
              refreshTrigger={sessionRefresh}
              permissionsStatus={permissions.status}
              allowedApis={permissions.allowedApis}
              permissionRoles={permissions.permissionRoles}
              accountRole={accountRole}
              onFeatureClick={(key) => {
                if (key === 'ADMIN_USERS') { navigateTo('admin-users'); setMobileMenuOpen(false); }
                if (key === 'ADMIN_REQUESTS') { navigateTo('requests'); setMobileMenuOpen(false); }
                if (['KNOWLEDGE_REGISTER', 'KNOWLEDGE_UPDATE', 'KNOWLEDGE_PURGE'].includes(key)) { navigateTo('knowledge'); setMobileMenuOpen(false); }
              }}
              userId={getUserId()}
              onRefreshPermissions={() => permissions.reload()}
              onCreateDefaultRoles={async () => {
                const uid = getUserId();
                if (!uid) return;
                try { await createUserPermissionRoles(uid, ['WANDERER']); } catch { /* already exists */ }
                permissions.reload();
              }}
            />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <main
        className="relative flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-950"
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {bgImage && <div className="absolute inset-0 bg-white/90 dark:bg-gray-950/20 pointer-events-none z-0" />}

        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 md:hidden flex-shrink-0">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">NAMU LA</span>
            <div className="w-9" />
          </div>

          {hasMessages ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full max-w-2xl xl:max-w-3xl mx-auto px-3 sm:px-6">
                <div className="hide-scrollbar flex-1 min-h-0 overflow-y-auto pt-4 sm:pt-6 pb-2 space-y-4 sm:space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 flex-shrink-0">
                        N
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <div className="flex flex-col items-end">
                        <UserMessage content={msg.content} />
                        <UserMessageActions
                          content={msg.content}
                          onEdit={() => {
                            const t = prepareEdit(i);
                            setInput(t);
                            setTimeout(() => {
                              const el = textareaRef.current;
                              if (!el) return;
                              el.focus();
                              el.setSelectionRange(t.length, t.length);
                            }, 0);
                          }}
                        />
                      </div>
                    ) : (
                    <div className="flex flex-col w-full">
                      <div className={`rounded-2xl text-sm ${
                        msg.error
                          ? 'max-w-[75%] px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-sm whitespace-pre-wrap leading-relaxed'
                          : 'w-full'
                      }`}>
                        {!msg.error ? (() => {
                          const isLast = i === messages.length - 1;
                          const thinkingStreaming = isStreaming && isLast && !msg.content;
                          return (
                            <div className="py-1">
                              {msg.thinking && (
                                <ThinkingBlock thinking={msg.thinking} isStreaming={thinkingStreaming} />
                              )}
                              {msg.content ? (
                                <MarkdownRenderer content={msg.content} />
                              ) : isStreaming && isLast && !msg.thinking ? (
                                msg.status === 'connecting' ? (
                                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-1">
                                    <span className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 animate-spin flex-shrink-0" />
                                    <span>Connecting…</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-1">
                                    <span className="flex gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                  </div>
                                )
                              ) : null}
                              {isStreaming && isLast && msg.content && (
                                <span className="inline-block w-0.5 h-4 bg-gray-400 dark:bg-gray-500 ml-0.5 align-middle animate-pulse" />
                              )}
                            </div>
                          );
                        })() : msg.content}
                      </div>
                      {!msg.error && !(isStreaming && i === messages.length - 1) && (
                        <AssistantMessageActions
                          content={msg.content}
                          isStreaming={isStreaming}
                          variants={msg.variants}
                          activeVariantIdx={msg.activeVariantIdx}
                          onRegenerate={() => regenerate(i, thinkingMode, selectedModel, ragMode)}
                          onVariantChange={(idx) => setVariant(i, idx)}
                        />
                      )}
                    </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
                </div>

                <div className="flex-shrink-0 pt-3 pb-4 md:pb-5">
                  <ChatInput {...chatInputProps} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-4 py-8 sm:px-8 md:px-12 md:py-12 lg:px-16 overflow-y-auto">
              <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8 text-center px-2">
                  {tr.greeting}
                </h1>
                <div className="w-full max-w-[720px]">
                  <ChatInput {...chatInputProps} />
                  <div className="mt-6 w-full">
                    <AssistantCards
                      assistants={allAssistants}
                      activeAssistantId={activeAssistant?.id ?? null}
                      onSelectAssistant={(assistant) => {
                        setActiveAssistant(assistant);
                        setInput(assistant.promptPrefix);
                        setTimeout(() => textareaRef.current?.focus(), 0);
                      }}
                      onCreateAssistant={() => setShowCreateModal(true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Permission error toast — fixed bottom-right, never affects layout */}
      {permissions.status === 'error' && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-xs text-red-500 dark:text-red-400 pointer-events-none select-none">
          <ShieldAlert size={13} className="flex-shrink-0" />
          <span>역할 권한 서비스에 연결할 수 없습니다.</span>
        </div>
      )}

      {/* Create Assistant Modal */}
      {showCreateModal && (
        <CreateAssistantModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(assistant) => {
            saveCustomAssistant(assistant);
            setCustomAssistants((prev) => [...prev, assistant]);
          }}
        />
      )}
    </div>
  );
}

// ── ChatInput ────────────────────────────────────────────────────────────────

interface ChatInputProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  thinkingMode: boolean;
  onThinkingToggle: () => void;
  ragMode: boolean;
  onRagToggle: () => void;
  selectedModel: ModelOption;
  onModelChange: (m: ModelOption) => void;
  onSend: () => void;
  onStop?: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
}

function ChatInput({
  textareaRef, input, setInput,
  isStreaming, thinkingMode, onThinkingToggle,
  ragMode, onRagToggle,
  selectedModel, onModelChange,
  onSend, onStop, onKeyDown, placeholder,
}: ChatInputProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-md overflow-visible">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={3}
        disabled={isStreaming}
        className="w-full px-4 md:px-5 pt-4 pb-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none bg-transparent disabled:opacity-60 rounded-t-2xl"
      />
      <div className="flex items-center justify-between px-3 md:px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Plus size={16} />
        </button>

        <div className="flex items-center gap-2">
          {/* Model dropdown */}
          <ModelSelector selected={selectedModel} onChange={onModelChange} />

          {/* RAG toggle — available for all models */}
          {(
            
            <button
              onClick={onRagToggle}
              title={ragMode ? 'Knowledge base ON — click to disable' : 'Knowledge base OFF — click to enable'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                ragMode
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Database size={13} />
              <span className="hidden sm:inline">Knowledge</span>
            </button>
          )}

          {/* Thinking toggle */}
          <button
            onClick={onThinkingToggle}
            title={thinkingMode ? 'Thinking mode ON' : 'Thinking mode OFF'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              thinkingMode
                ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Brain size={13} />
            <span className="hidden sm:inline">Thinking</span>
          </button>

          {isStreaming ? (
            <button
              onClick={() => onStop?.()}
              title="Stop generation"
              className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
            >
              <span className="w-3 h-3 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700 disabled:hover:text-gray-500 transition-colors"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}