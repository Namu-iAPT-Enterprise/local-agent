import React, { useState, useEffect } from 'react';
import { Info, Plus, X, Pencil, Search, Lightbulb, Trash2, CheckCircle, AlertCircle, Loader, Zap } from 'lucide-react';
import { testOpenAICompatibleConnection } from '../../api/openaiClient';

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORMS: Record<string, { baseUrl: string; docsUrl?: string }> = {
  OpenRouter:  { baseUrl: 'https://openrouter.ai/api/v1' },
  OpenAI:      { baseUrl: 'https://api.openai.com/v1' },
  Anthropic:   { baseUrl: 'https://api.anthropic.com/v1' },
  Gemini:      { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  Ollama:      { baseUrl: 'http://localhost:11434/v1' },
  Custom:      { baseUrl: '' },
};

const platformOrder = ['OpenRouter', 'OpenAI', 'Anthropic', 'Gemini', 'Ollama', 'Custom'];

// ── Platform icon ──────────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  if (platform === 'OpenRouter') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#6366f1" />
      <path d="M7 12h10M14 8l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (platform === 'OpenAI') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-gray-800 dark:text-gray-200">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
  if (platform === 'Anthropic') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-orange-500">
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.378-3.504h6.35l1.382 3.504h3.6L10.173 3.52zm-1.018 9.99 2.19-5.584 2.19 5.585H9.155z" />
    </svg>
  );
  if (platform === 'Gemini') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L14.5 12 L12 22 L9.5 12 Z" fill="#4285F4" />
      <path d="M2 12 L12 9.5 L22 12 L12 14.5 Z" fill="#EA4335" />
      <path d="M12 2 L14.5 12 L12 14.5 L9.5 12 Z" fill="#FBBC05" />
      <path d="M12 14.5 L14.5 12 L22 12 L12 22 Z" fill="#34A853" />
    </svg>
  );
  if (platform === 'Ollama') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-gray-700 dark:text-gray-300">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">O</text>
    </svg>
  );
  return <Zap size={size} className="text-gray-400" />;
}

// ── Saved model type ───────────────────────────────────────────────────────────

interface SavedModel {
  id: string;
  platform: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  status: 'untested' | 'connected' | 'error';
  error?: string;
}

// ── Test connection ────────────────────────────────────────────────────────────

function testConnection(baseUrl: string, apiKey: string, modelName: string): Promise<{ ok: boolean; error?: string }> {
  // Same path as chat: browser → provider (subject to CORS).
  return testOpenAICompatibleConnection(baseUrl, apiKey, modelName);
}

// ── Add / Edit Modal ───────────────────────────────────────────────────────────

interface ModalProps {
  initial?: SavedModel;
  onClose: () => void;
  onSave: (m: Omit<SavedModel, 'id' | 'status'>) => void;
}

function ModelModal({ initial, onClose, onSave }: ModalProps) {
  const [platform, setPlatform] = useState(initial?.platform ?? 'OpenRouter');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? PLATFORMS['OpenRouter'].baseUrl);
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [modelName, setModelName] = useState(initial?.modelName ?? '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    setBaseUrl(PLATFORMS[p].baseUrl);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(baseUrl, apiKey, modelName);
    setTestResult(result);
    setTesting(false);
  };

  const needsApiKey = platform !== 'Ollama';

  const handleConfirm = () => {
    if (!modelName.trim() || !baseUrl.trim()) return;
    if (needsApiKey && !apiKey.trim()) return;
    onSave({ platform, baseUrl, apiKey: apiKey.trim(), modelName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial ? 'Edit Model' : 'Add Model'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        <div className="px-7 py-5 flex flex-col gap-5">
          {/* Platform */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-red-500">*</span> Model Platform
            </label>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <PlatformIcon platform={platform} />
              <select
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none appearance-none cursor-pointer"
              >
                {platformOrder.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              {needsApiKey && <span className="text-red-500">*</span>}
              API Key{!needsApiKey && <span className="text-gray-400 font-normal"> (optional for local Ollama)</span>}
            </label>
            <div className="flex items-center px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                placeholder={platform === 'Ollama' ? 'Leave empty for local' : 'sk-...'}
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none"
              />
              <button type="button" onClick={() => setShowKey((v) => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Pencil size={15} />
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lightbulb size={13} className="text-yellow-400 flex-shrink-0" />
              Stored on this device. Chat sends it directly from this app to the provider you configure (not through the local backend).
            </p>
          </div>

          {/* Model Name */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-red-500">*</span> Model Name
            </label>
            <div className="flex items-center px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={
                  platform === 'OpenRouter' ? 'e.g. meta-llama/llama-3.1-8b-instruct' :
                  platform === 'OpenAI' ? 'e.g. gpt-4o' :
                  platform === 'Anthropic' ? 'e.g. claude-sonnet-4-6' :
                  platform === 'Gemini' ? 'e.g. gemini-2.0-flash' :
                  platform === 'Ollama' ? 'e.g. qwen3:8b' : 'Model name'
                }
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none"
              />
              <Search size={15} className="text-gray-400 flex-shrink-0" />
            </div>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm ${
              testResult.ok
                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
            }`}>
              {testResult.ok
                ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
                : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
              <span>{testResult.ok ? 'Connection successful!' : testResult.error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 bg-gray-50 dark:bg-gray-800/60 rounded-b-2xl border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleTest}
            disabled={!baseUrl.trim() || (needsApiKey && !apiKey.trim()) || testing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
            Test Connection
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!modelName.trim() || !baseUrl.trim() || (needsApiKey && !apiKey.trim())}
              className="px-6 py-2.5 rounded-xl bg-gray-800 dark:bg-blue-600 hover:bg-gray-900 dark:hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {initial ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Model card ─────────────────────────────────────────────────────────────────

function ModelCard({ model, onEdit, onDelete, onTest }: {
  model: SavedModel;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <PlatformIcon platform={model.platform} size={22} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{model.modelName}</span>
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {model.platform}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">{model.baseUrl}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {/* Status badge */}
        {model.status === 'connected' && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
            <CheckCircle size={11} /> Connected
          </span>
        )}
        {model.status === 'error' && (
          <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800" title={model.error}>
            <AlertCircle size={11} /> Error
          </span>
        )}
        {model.status === 'untested' && (
          <button
            onClick={onTest}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Zap size={11} /> Test
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'namu_models';

export default function Model() {
  const [models, setModels] = useState<SavedModel[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<SavedModel | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  }, [models]);

  const handleSave = (data: Omit<SavedModel, 'id' | 'status'>) => {
    if (editingModel) {
      setModels((prev) => prev.map((m) =>
        m.id === editingModel.id ? { ...editingModel, ...data, status: 'untested' } : m
      ));
    } else {
      setModels((prev) => [...prev, { ...data, id: crypto.randomUUID(), status: 'untested' }]);
    }
    setEditingModel(null);
  };

  const handleDelete = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
  };

  const handleTest = async (id: string) => {
    const model = models.find((m) => m.id === id);
    if (!model) return;
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, status: 'untested' } : m));
    const result = await testConnection(model.baseUrl, model.apiKey, model.modelName);
    setModels((prev) => prev.map((m) =>
      m.id === id ? { ...m, status: result.ok ? 'connected' : 'error', error: result.error } : m
    ));
  };

  const handleClearStatus = () => {
    setModels((prev) => prev.map((m) => ({ ...m, status: 'untested', error: undefined })));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Model</h2>
        <div className="flex items-center gap-2">
          {models.length > 0 && (
            <button
              onClick={handleClearStatus}
              className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Clear status
            </button>
          )}
          <button
            onClick={() => { setEditingModel(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Add Model
          </button>
        </div>
      </div>

      {/* Model list or empty state */}
      {models.length > 0 ? (
        <div className="flex flex-col gap-2">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onEdit={() => { setEditingModel(model); setShowModal(true); }}
              onDelete={() => handleDelete(model.id)}
              onTest={() => handleTest(model.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <Info size={40} strokeWidth={1.2} />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No configured models</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add a model using an API key from OpenRouter, OpenAI, Anthropic, Gemini, or Ollama.
          </p>
        </div>
      )}

      {(showModal || editingModel) && (
        <ModelModal
          initial={editingModel ?? undefined}
          onClose={() => { setShowModal(false); setEditingModel(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
