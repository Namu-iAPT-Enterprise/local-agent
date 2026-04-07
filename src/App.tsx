import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Plus, Menu, Brain, ChevronDown, Check } from 'lucide-react';
import TemplateCards from './components/TemplateCards';
import Sidebar from './components/Sidebar';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useTheme } from './context/ThemeContext';
import { useLang } from './context/LanguageContext';
import { useChat, ModelOption, LOCAL_MODELS } from './hooks/useChat';
import MarkdownRenderer from './components/MarkdownRenderer';
import ThinkingBlock from './components/ThinkingBlock';
import { getAccessToken, logout as authLogout } from './api/auth';

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

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState('');
  const [page, setPage] = useState<'login' | 'signup' | 'home' | 'settings'>(
    getAccessToken() ? 'home' : 'login'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(LOCAL_MODELS[0]);
  const { bgImage } = useTheme();
  const { tr } = useLang();
  const { messages, isStreaming, send, clear, stop } = useChat();

  const handleLogout = async () => {
    await authLogout();
    clear();
    setPage('login');
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
    send(text, thinkingMode, selectedModel);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (page === 'login')    return <Login onLogin={() => setPage('home')} onSignup={() => setPage('signup')} />;
  if (page === 'signup')   return <Signup onSignup={() => setPage('home')} onLogin={() => setPage('login')} />;
  if (page === 'settings') return <Settings onBack={() => setPage('home')} />;

  const hasMessages = messages.length > 0;

  const chatInputProps = {
    textareaRef,
    input,
    setInput,
    isStreaming,
    thinkingMode,
    onThinkingToggle: () => setThinkingMode((v) => !v),
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
        <Sidebar onSettings={() => setPage('settings')} onNewChat={clear} onLogout={handleLogout} />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 flex-shrink-0">
            <Sidebar
              onSettings={() => { setPage('settings'); setMobileMenuOpen(false); }}
              onNewChat={() => { clear(); setMobileMenuOpen(false); }}
              onLogout={() => { handleLogout(); setMobileMenuOpen(false); }}
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
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full max-w-2xl xl:max-w-3xl mx-auto px-4 sm:px-6">
                <div className="flex-1 min-h-0 overflow-y-auto pt-6 pb-2 space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 flex-shrink-0">
                        N
                      </div>
                    )}
                    <div className={`rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'max-w-[75%] px-4 py-2.5 bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap leading-relaxed'
                        : msg.error
                        ? 'max-w-[75%] px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-sm whitespace-pre-wrap leading-relaxed'
                        : 'w-full'
                    }`}>
                      {msg.role === 'assistant' && !msg.error ? (() => {
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
                  <div className="mt-6 md:mt-8 w-full">
                    <TemplateCards onSelect={(t) => setInput(t.description.replace('...', ''))} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
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
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
