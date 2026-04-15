import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  defaultAssistants,
  getCustomAssistants,
  saveCustomAssistant,
  deleteCustomAssistant,
  isAssistantVisible,
  setAssistantVisibility,
  type OfficeAssistant,
} from '../../data/officeAssistants';
import CreateAssistantModal from '../../components/CreateAssistantModal';

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-checked={enabled}
      role="switch"
      className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        enabled ? 'bg-gray-800 dark:bg-gray-400' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Assistants() {
  const [customAssistants, setCustomAssistants] = useState<OfficeAssistant[]>(() => getCustomAssistants());
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    [...defaultAssistants, ...getCustomAssistants()].forEach((a) => {
      map[a.id] = isAssistantVisible(a.id);
    });
    return map;
  });
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = (id: string) => {
    const next = !visibility[id];
    setAssistantVisibility(id, next);
    setVisibility((prev) => ({ ...prev, [id]: next }));
  };

  const handleDelete = (id: string) => {
    deleteCustomAssistant(id);
    setCustomAssistants((prev) => prev.filter((a) => a.id !== id));
    setVisibility((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleCreate = (assistant: OfficeAssistant) => {
    saveCustomAssistant(assistant);
    setAssistantVisibility(assistant.id, true);
    setCustomAssistants((prev) => [...prev, assistant]);
    setVisibility((prev) => ({ ...prev, [assistant.id]: true }));
  };

  const renderRow = (a: OfficeAssistant, isDefault: boolean) => {
    const Icon = a.icon;
    const visible = visibility[a.id] ?? true;
    return (
      <div
        key={a.id}
        className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-gray-600 dark:text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{a.description}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Toggle enabled={visible} onChange={() => handleToggle(a.id)} />
          {!isDefault && (
            <button
              onClick={() => handleDelete(a.id)}
              className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors"
              aria-label={`Delete ${a.name}`}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Assistants</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <Plus size={14} />
          Create Assistant
        </button>
      </div>

      <p className="text-xs text-gray-400 px-1 -mt-2">
        Toggle to show or hide an assistant on the main page.
      </p>

      {/* Default assistants */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1 mb-1">기본 어시스턴트</p>
        {defaultAssistants.map((a) => renderRow(a, true))}
      </div>

      {/* Custom assistants */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1 mb-1">내 어시스턴트</p>
        {customAssistants.length === 0 ? (
          <div className="px-4 py-5 text-center text-xs text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            아직 만든 어시스턴트가 없습니다.
          </div>
        ) : (
          customAssistants.map((a) => renderRow(a, false))
        )}
      </div>

      {showCreate && (
        <CreateAssistantModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
