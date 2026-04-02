import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { LANGUAGES, LangCode } from '../../i18n/translations';

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? 'bg-gray-700 dark:bg-gray-500' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

function DirRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">{value}</span>
        <button className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <FolderOpen size={16} />
        </button>
      </div>
    </div>
  );
}

export default function System() {
  const { lang, setLang, tr } = useLang();
  const [closeToTray, setCloseToTray] = useState(true);
  const [timeout, setTimeout_] = useState(300);
  const [notifications, setNotifications] = useState(true);
  const [scheduledTask, setScheduledTask] = useState(true);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* General settings card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">

        {/* Language */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">{tr.language}</span>
          <div className="relative">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>

        {/* Close to Tray */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">{tr.closeToTray}</span>
          <Toggle enabled={closeToTray} onChange={() => setCloseToTray(!closeToTray)} />
        </div>

        {/* LLM Prompt Timeout */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">{tr.llmTimeout}</span>
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              className="w-20 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 outline-none text-right"
            />
            <span className="px-2 py-1.5 text-sm text-gray-400 bg-gray-50 dark:bg-gray-600 border-l border-gray-200 dark:border-gray-600">s</span>
          </div>
        </div>
      </div>

      {/* Notifications card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">{tr.notifications}</span>
          <Toggle enabled={notifications} onChange={() => setNotifications(!notifications)} />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">{tr.scheduledTaskCompletion}</span>
          <Toggle enabled={scheduledTask} onChange={() => setScheduledTask(!scheduledTask)} />
        </div>
      </div>

      {/* Directories card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 flex flex-col gap-4">
        <DirRow label={tr.cacheDirectory} value="/Users/zinko/.aionui-config" />
        <DirRow label={tr.workDirectory} value="/Users/zinko/.aionui" />
        <DirRow label={tr.logDirectory} value="/Users/zinko/Library/Logs/AionUi" />
      </div>
    </div>
  );
}
