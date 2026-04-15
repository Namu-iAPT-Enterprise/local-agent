import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Menu, ShieldAlert } from 'lucide-react';
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
import {
  useChat,
  ModelOption,
  LOCAL_MODELS,
  resolveStoredSelectedModel,
  readSingleFileAsAttachment,
  isProbablyImageFile,
  getFileBasename,
  type PendingChatAttachment,
} from './hooks/useChat';
import { getAccessToken, getAccountRole, saveAccountRole, logout as authLogout, getMe, getUserId } from './api/auth';
// v2: role assignment is done through AdminUsers page, not auto-created
import type { ChatSessionInfo } from './api/chat';
import { usePermissions } from './hooks/usePermissions';
import {
  defaultAssistants,
  getCustomAssistants,
  saveCustomAssistant,
  updateCustomAssistant,
  deleteCustomAssistant,
  saveAssistantOverride,
  getAssistantOverrides,
  isAssistantVisible,
  type OfficeAssistant,
} from './data/officeAssistants';
import { ChatInput } from './components/chat/ChatInput';
import { ChatMessageList } from './components/chat/ChatMessageList';
import { EmptyChatHome } from './components/chat/EmptyChatHome';
import { AssistantChatIntro } from './components/chat/AssistantChatIntro';

// ── App ───────────────────────────────────────────────────────────────────────

type AppPage = 'login' | 'signup' | 'home' | 'settings' | 'admin-users' | 'requests' | 'knowledge';
const APP_PAGE_HASHES: readonly AppPage[] = ['login', 'signup', 'home', 'settings', 'admin-users', 'requests', 'knowledge'];
function isAppPage(hash: string): hash is AppPage {
  return (APP_PAGE_HASHES as readonly string[]).includes(hash);
}

export default function App() {
  const [input, setInput] = useState('');
  const [page, setPage] = useState<AppPage>(() => {
    const hash = window.location.hash.replace('#', '');
    if (isAppPage(hash)) return hash;
    return getAccessToken() ? 'home' : 'login';
  });

  const navigateTo = (newPage: AppPage) => {
    setPage(newPage);
    window.history.pushState({ page: newPage }, '', `#${newPage}`);
  };

  useEffect(() => {
    if (!window.history.state?.page) {
      window.history.replaceState({ page }, '', `#${page}`);
    }

    const handlePopState = (event: PopStateEvent) => {
      const st = event.state as { page?: unknown } | null;
      if (st && typeof st.page === 'string' && isAppPage(st.page)) {
        setPage(st.page);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (isAppPage(hash)) {
          setPage(hash);
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
  const [selectedModel, setSelectedModel] = useState<ModelOption>(() =>
    resolveStoredSelectedModel(localStorage.getItem('namu_selected_model')),
  );
  const [sessionRefresh, setSessionRefresh] = useState(0);
  const [accountRole, setAccountRole] = useState<string | null>(getAccountRole());
  const { bgImage } = useTheme();
  const { tr } = useLang();
  const { messages, isStreaming, send, regenerate, setVariant, prepareEdit, clear, stop, loadSession, sessionId } = useChat();

  const [customAssistants, setCustomAssistants] = useState<OfficeAssistant[]>(() => getCustomAssistants());
  const [defaultOverrides, setDefaultOverrides] = useState<Record<string, Partial<OfficeAssistant>>>(() => getAssistantOverrides());
  const [editingAssistant, setEditingAssistant] = useState<OfficeAssistant | null>(null);
  const [activeAssistant, setActiveAssistant] = useState<OfficeAssistant | null>(() => {
    const saved = localStorage.getItem('namu_active_assistant');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        void 0;
      }
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

  const allAssistants = [
    ...defaultAssistants
      .filter((a) => isAssistantVisible(a.id))
      .map((a) => ({ ...a, ...defaultOverrides[a.id] })),
    ...customAssistants.filter((a) => isAssistantVisible(a.id)),
  ];

  /** Merge persisted selection with catalog so Lucide icons / prompts stay valid. */
  const activeAssistantResolved = useMemo(() => {
    if (!activeAssistant?.id) return null;
    return allAssistants.find((a) => a.id === activeAssistant.id) ?? null;
  }, [activeAssistant, allAssistants]);

  const handleClearAssistant = useCallback(() => {
    setActiveAssistant(null);
  }, []);

  const handleEditAssistant = useCallback((assistant: OfficeAssistant) => {
    setEditingAssistant(assistant);
  }, []);

  const handleSaveEditedAssistant = useCallback((updated: OfficeAssistant) => {
    if (updated.isDefault) {
      // Save override for built-in assistants
      const override = { name: updated.name, description: updated.description, systemPrompt: updated.systemPrompt, promptPrefix: updated.promptPrefix };
      saveAssistantOverride(updated.id, override);
      setDefaultOverrides((prev) => ({ ...prev, [updated.id]: override }));
    } else {
      // Update custom assistant in storage
      updateCustomAssistant(updated);
      setCustomAssistants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    }
    // Refresh active assistant if it's the one being edited
    if (activeAssistant?.id === updated.id) setActiveAssistant(updated);
    setEditingAssistant(null);
  }, [activeAssistant]);

  const handleDeleteAssistant = useCallback((id: string) => {
    deleteCustomAssistant(id);
    setCustomAssistants((prev) => prev.filter((a) => a.id !== id));
    if (activeAssistant?.id === id) setActiveAssistant(null);
  }, [activeAssistant]);

  /** Never show office-assistant promptPrefix in the composer — only systemPrompt is used on send. */
  useEffect(() => {
    if (!activeAssistantResolved) return;
    const p = activeAssistantResolved.promptPrefix;
    if (!p) return;
    setInput((prev) => {
      if (!prev.startsWith(p)) return prev;
      return prev.slice(p.length).replace(/^\s+/, '');
    });
  }, [activeAssistantResolved?.id]);

  const isLoggedIn = page !== 'login' && page !== 'signup';
  const permissions = usePermissions(isLoggedIn);

  // 계정 레벨 ADMIN 이거나 역할 정의 권한이 있으면 관리 페이지 접근 허용
  const hasAdminAccess = accountRole === 'ADMIN' || permissions.enabledFeatures.includes('ROLE_DEFINE_CREATE');
  // 역할 배정/조회/정의/팀/캐시 권한 중 하나라도 있으면 admin-users 페이지 진입 허용
  const hasAdminUsersAccess = hasAdminAccess || ['ROLE_VIEW_ANY','ROLE_VIEW_OWN','ROLE_ASSIGN_ANY','ROLE_ASSIGN_OWN','ROLE_REVOKE_ANY','ROLE_REVOKE_OWN','ROLE_CREATE','ROLE_CREATE_OWN','ROLE_MODIFY','ROLE_MODIFY_OWN','ROLE_DELETE','ROLE_DELETE_OWN','TEAM_VIEW_ANY','TEAM_CREATE','TEAM_MANAGE_ANY','TEAM_MANAGE_OWN','TEAM_DELETE_ANY','TEAM_DELETE_OWN','CACHE_RELOAD_USER','CACHE_RELOAD_ALL'].some(t => permissions.permissionTags.includes(t));
  // 문의사항 조회 권한
  const hasRequestsAccess = hasAdminAccess || permissions.enabledFeatures.includes('REQUEST_VIEW_ALL');
  // 지식 관리 권한
  const hasKnowledgeAccess = accountRole === 'ADMIN'
    || ['KNOWLEDGE_CREATE','KNOWLEDGE_MODIFY','KNOWLEDGE_DELETE'].some(t => permissions.enabledFeatures.includes(t));

  useEffect(() => {
    const handler = () => { clear(); navigateTo('login'); };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [clear]);

  useEffect(() => {
    if (!isLoggedIn) return;
    getMe()
      .then((me) => {
        saveAccountRole(me.role);
        setAccountRole(me.role);
      })
      .catch(() => {
        // keep cached role on failure
      });
  }, [isLoggedIn]);

  const prevStreaming = useRef(false);
  useEffect(() => {
    if (prevStreaming.current && !isStreaming) {
      textareaRef.current?.focus();
      const timer = setTimeout(() => setSessionRefresh((n) => n + 1), 800);
      return () => clearTimeout(timer);
    }
    prevStreaming.current = isStreaming;
  }, [isStreaming]);

  const handleLogin = (userId: string) => {
    void userId;
    navigateTo('home');
    setSessionRefresh((n) => n + 1);
  };

  const handleLogout = async () => {
    await authLogout();
    clear();
    setPendingAttachments([]);
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
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);

  const addPendingFilesFromBrowser = async (fileArr: File[]) => {
    if (!fileArr.length) return;
    const ids: string[] = fileArr.map(() => crypto.randomUUID());
    setPendingAttachments((p) => [
      ...p,
      ...fileArr.map((file, i) => {
        const id = ids[i];
        if (id === undefined) throw new Error('addPendingFiles: id mismatch');
        return {
          id,
          kind: (isProbablyImageFile(file) ? 'image' : 'file') as 'image' | 'file',
          name: getFileBasename(file),
          status: 'loading' as const,
        };
      }),
    ]);
    try {
      const results = await Promise.all(
        fileArr.map((f, i) => {
          const id = ids[i];
          if (id === undefined) {
            return Promise.resolve({ error: 'addPendingFiles: id mismatch' });
          }
          return readSingleFileAsAttachment(f, id).catch((err: unknown) => ({
            error: err instanceof Error ? err.message : String(err),
          }));
        }),
      );
      const errors: string[] = [];
      setPendingAttachments((prev) => {
        let next = [...prev];
        for (let i = 0; i < results.length; i++) {
          const id = ids[i];
          if (id === undefined) continue;
          const r = results[i];
          if ('error' in r) {
            next = next.filter((a) => a.id !== id);
            errors.push(r.error);
          } else {
            next = next.map((a) => (a.id === id ? r.attachment : a));
          }
        }
        return next;
      });
      if (errors.length) window.alert(errors.join('\n'));
    } catch (e) {
      setPendingAttachments((prev) => prev.filter((a) => !ids.includes(a.id)));
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Could not read file(s): ${msg}`);
    }
  };

  const handleChatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    e.target.value = '';
    await addPendingFilesFromBrowser(list);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((p) => {
      const x = p.find((a) => a.id === id);
      if (x?.previewUrl) URL.revokeObjectURL(x.previewUrl);
      return p.filter((a) => a.id !== id);
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (pendingAttachments.some((a) => a.status === 'loading')) return;
    if ((!text && pendingAttachments.length === 0) || isStreaming) return;
    setInput('');

    send(
      text,
      thinkingMode,
      selectedModel,
      ragMode,
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      activeAssistantResolved?.systemPrompt
        ? { systemPrompt: activeAssistantResolved.systemPrompt }
        : undefined,
    );
    setPendingAttachments([]);
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
      permissionTags={permissions.permissionTags}
      enabledFeatures={permissions.enabledFeatures}
    />
  );
  if (page === 'admin-users') {
    if (permissions.status === 'idle' || permissions.status === 'loading') return null;
    if (!hasAdminUsersAccess) {
      navigateTo('home');
      return null;
    }
    return <AdminUsersScreen onBack={() => navigateTo('home')} permissionTags={permissions.permissionTags} />;
  }

  if (page === 'requests') {
    if (permissions.status === 'idle' || permissions.status === 'loading') return null;
    if (!hasRequestsAccess) {
      navigateTo('home');
      return null;
    }
    return <RequestsScreen onBack={() => navigateTo('home')} />;
  }

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
    chatFileInputRef,
    onChatFileChange: handleChatFileChange,
    onAddFilesFromBrowser: addPendingFilesFromBrowser,
    pendingAttachments,
    onRemovePendingAttachment: removePendingAttachment,
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
    activeAssistant: activeAssistantResolved
      ? {
          id: activeAssistantResolved.id,
          name: activeAssistantResolved.name,
          Icon: activeAssistantResolved.icon,
        }
      : null,
    onClearAssistant: handleClearAssistant,
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar
          onSettings={() => navigateTo('settings')}
          onNewChat={() => { clear(); setPendingAttachments([]); setSessionRefresh((n) => n + 1); }}
          onLogout={handleLogout}
          onSelectSession={handleSelectSession}
          activeSessionId={sessionId}
          refreshTrigger={sessionRefresh}
          permissionsStatus={permissions.status}
          allowedApis={permissions.allowedApis}
          roleIds={permissions.roleIds}
          enabledFeatures={permissions.enabledFeatures}
          accountRole={accountRole}
          onFeatureClick={(key) => {
            if (['ADMIN_USERS', 'ROLE_ASSIGN', 'ROLE_DEFINE_CREATE', 'ROLE_VIEW', 'ROLE_REVOKE'].includes(key)) navigateTo('admin-users');
            if (key === 'REQUEST_VIEW_ALL') navigateTo('requests');
            if (['KNOWLEDGE_CREATE', 'KNOWLEDGE_MODIFY', 'KNOWLEDGE_DELETE'].includes(key)) navigateTo('knowledge');
          }}
          userId={getUserId()}
          onRefreshPermissions={() => permissions.reload()}
        />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 flex-shrink-0">
            <Sidebar
              onSettings={() => { navigateTo('settings'); setMobileMenuOpen(false); }}
              onNewChat={() => { clear(); setPendingAttachments([]); setSessionRefresh((n) => n + 1); setMobileMenuOpen(false); }}
              onLogout={() => { handleLogout(); setMobileMenuOpen(false); }}
              onSelectSession={handleSelectSession}
              activeSessionId={sessionId}
              refreshTrigger={sessionRefresh}
              permissionsStatus={permissions.status}
              allowedApis={permissions.allowedApis}
              roleIds={permissions.roleIds}
              enabledFeatures={permissions.enabledFeatures}
              accountRole={accountRole}
              onFeatureClick={(key) => {
                if (['ADMIN_USERS', 'ROLE_ASSIGN', 'ROLE_DEFINE_CREATE', 'ROLE_VIEW', 'ROLE_REVOKE'].includes(key)) { navigateTo('admin-users'); setMobileMenuOpen(false); }
                if (key === 'REQUEST_VIEW_ALL') { navigateTo('requests'); setMobileMenuOpen(false); }
                if (['KNOWLEDGE_CREATE', 'KNOWLEDGE_MODIFY', 'KNOWLEDGE_DELETE'].includes(key)) { navigateTo('knowledge'); setMobileMenuOpen(false); }
              }}
              userId={getUserId()}
              onRefreshPermissions={() => permissions.reload()}
            />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} role="presentation" />
        </div>
      )}

      <main
        className="relative flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-950"
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {bgImage && <div className="absolute inset-0 bg-white/90 dark:bg-gray-950/20 pointer-events-none z-0" />}

        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 md:hidden flex-shrink-0">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">NAMU LA</span>
            <div className="w-9" />
          </div>

          {hasMessages ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full max-w-2xl xl:max-w-3xl mx-auto px-3 sm:px-6">
                <div className="hide-scrollbar flex-1 min-h-0 overflow-y-auto pt-4 sm:pt-6 pb-2 space-y-4 sm:space-y-6">
                  <ChatMessageList
                    messages={messages}
                    isStreaming={isStreaming}
                    messagesEndRef={messagesEndRef}
                    textareaRef={textareaRef}
                    prepareEdit={prepareEdit}
                    setInput={setInput}
                    regenerate={regenerate}
                    setVariant={setVariant}
                    thinkingMode={thinkingMode}
                    selectedModel={selectedModel}
                    ragMode={ragMode}
                    assistantSystemPrompt={activeAssistantResolved?.systemPrompt ?? null}
                  />
                </div>

                <div className="flex-shrink-0 pt-3 pb-4 md:pb-5">
                  <ChatInput {...chatInputProps} />
                </div>
              </div>
            </div>
          ) : activeAssistantResolved ? (
            <AssistantChatIntro
              id={activeAssistantResolved.id}
              name={activeAssistantResolved.name}
              description={activeAssistantResolved.description}
              Icon={activeAssistantResolved.icon}
              chatInputProps={chatInputProps}
            />
          ) : (
            <EmptyChatHome
              greeting={tr.greeting}
              chatInputProps={chatInputProps}
              assistants={allAssistants}
              activeAssistantId={activeAssistant?.id ?? null}
              onSelectAssistant={(assistant) => {
                clear();
                setPendingAttachments([]);
                setActiveAssistant(assistant);
                setInput('');
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              onCreateAssistant={() => setShowCreateModal(true)}
              onEditAssistant={handleEditAssistant}
              onDeleteAssistant={handleDeleteAssistant}
            />
          )}
        </div>
      </main>

      {permissions.status === 'error' && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-xs text-red-500 dark:text-red-400 pointer-events-none select-none">
          <ShieldAlert size={13} className="flex-shrink-0" />
          <span>역할 권한 서비스에 연결할 수 없습니다.</span>
        </div>
      )}

      {showCreateModal && (
        <CreateAssistantModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(assistant) => {
            saveCustomAssistant(assistant);
            setCustomAssistants((prev) => [...prev, assistant]);
          }}
        />
      )}

      {editingAssistant && (
        <CreateAssistantModal
          onClose={() => setEditingAssistant(null)}
          onCreate={handleSaveEditedAssistant}
          initialValues={editingAssistant}
        />
      )}
    </div>
  );
}
