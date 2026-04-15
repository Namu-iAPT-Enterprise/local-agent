import React, { useState } from 'react';
import { Search, Download, Trash2, Zap } from 'lucide-react';
import {
  catalogSkills,
  getInstalledSkillIds,
  installSkill,
  uninstallSkill,
  type Skill,
} from '../../data/skills';

type Tab = 'all' | 'installed';

export default function SkillsHub() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [installedIds, setInstalledIds] = useState<string[]>(() => getInstalledSkillIds());

  const handleInstall = (id: string) => {
    installSkill(id);
    setInstalledIds((prev) => [...prev, id]);
  };

  const handleUninstall = (id: string) => {
    uninstallSkill(id);
    setInstalledIds((prev) => prev.filter((i) => i !== id));
  };

  const filtered = catalogSkills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'all' || installedIds.includes(s.id);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Skills Hub</h2>
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['all', 'installed'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  tab === t
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t === 'installed' ? `Installed (${installedIds.length})` : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 w-56">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="flex-1 outline-none bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Usage tip */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
        <Zap size={13} className="text-blue-500 flex-shrink-0" />
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Type <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 font-mono text-xs">/skill-name</kbd> in the chat input to activate an installed skill.
        </p>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {tab === 'installed' ? 'No installed skills.' : 'No skills found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              installed={installedIds.includes(skill.id)}
              onInstall={() => handleInstall(skill.id)}
              onUninstall={() => handleUninstall(skill.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skill Card ─────────────────────────────────────────────────────────────────
function SkillCard({
  skill,
  installed,
  onInstall,
  onUninstall,
}: {
  skill: Skill;
  installed: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  return (
    <div className="relative flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors min-h-[130px]">
      {/* Icon + title */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${skill.color} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
          {skill.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {skill.name}
            </span>
            {installed && (
              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 font-medium border border-green-200 dark:border-green-800">
                Installed
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 capitalize">{skill.source}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 flex-1">
        {skill.description}
      </p>

      {/* Install / Uninstall — bottom-right corner */}
      <div className="flex justify-end">
        {installed ? (
          <button
            onClick={onUninstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/50 transition-colors"
          >
            <Trash2 size={12} />
            Uninstall
          </button>
        ) : (
          <button
            onClick={onInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-black hover:bg-neutral-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
          >
            <Download size={12} />
            Install
          </button>
        )}
      </div>
    </div>
  );
}
