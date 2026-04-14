import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { LOCAL_MODELS, type ModelOption } from '../../hooks/useChat';

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

export function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
      >
        <PlatformDot platform={selected.platform} />
        <span className="max-w-[120px] truncate">{selected.name}</span>
        <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1.5 left-0 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Local</span>
          </div>
          {LOCAL_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <PlatformDot platform={m.platform} />
              <span className="flex-1 text-gray-700 dark:text-gray-200 truncate">{m.name}</span>
              <span className="text-[10px] text-gray-400">{m.platform}</span>
              {selected.id === m.id && <Check size={13} className="text-blue-500 flex-shrink-0" />}
            </button>
          ))}

          {apiModels.length > 0 && (
            <>
              <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
              <div className="px-3 pt-1.5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">API Models</span>
              </div>
              {apiModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
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
