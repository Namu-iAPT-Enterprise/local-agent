import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import {
  Cpu,
  Users,
  Zap,
  Monitor,
  Globe,
  LayoutGrid,
  Info,
  Moon,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Database,
} from 'lucide-react';
import Model from './settings/Model';
import Assistants from './settings/Assistants';
import SkillsHub from './settings/SkillsHub';
import Display from './settings/Display';
import Remote from './settings/Remote';
import System from './settings/System';
import About from './settings/About';
import Knowledge from './settings/Knowledge';

const TAB_IDS = ['model','assistants','skills-hub','display','remote','system','knowledge','about'] as const;
const TAB_ICONS = { model: Cpu, assistants: Users, 'skills-hub': Zap, display: Monitor, remote: Globe, system: LayoutGrid, knowledge: Database, about: Info };
const TAB_COMPONENTS = { model: Model, assistants: Assistants, 'skills-hub': SkillsHub, display: Display, remote: Remote, system: System, knowledge: Knowledge, about: About };

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('model');
  const [collapsed, setCollapsed] = useState(false);
  const { bgImage } = useTheme();
  const { tr } = useLang();

  const tabLabels: Record<string, string> = {
    model: tr.model, assistants: tr.assistants, 'skills-hub': tr.skillsHub,
    display: tr.display, remote: tr.remote, system: tr.system, knowledge: tr.knowledge, about: tr.about,
  };
  const tabs = TAB_IDS.map((id) => ({ id, label: tabLabels[id], icon: TAB_ICONS[id], component: TAB_COMPONENTS[id] }));
  const ActiveComponent = TAB_COMPONENTS[activeTab as keyof typeof TAB_COMPONENTS] ?? Model;

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      {/* Settings sidebar — no wallpaper, always solid */}
      <aside className={`flex flex-col h-screen flex-shrink-0 transition-all duration-200 bg-gray-50 dark:bg-gray-900 ${collapsed ? 'w-16' : 'w-56'}`}>
        {collapsed ? (
          /* Collapsed: collapse icon on top, logo below */
          <div className="flex flex-col items-center pt-4 pb-2 gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
              <SettingsIcon size={22} className="text-white" />
            </div>
          </div>
        ) : (
          /* Expanded: logo + name on left, collapse icon on right */
          <div className="flex items-center justify-between px-3 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                <SettingsIcon size={22} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">SETTINGS</span>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        )}

        {/* Tab list */}
        <nav className="flex flex-col gap-0.5 px-2 mt-2 flex-1 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={collapsed ? label : undefined}
              className={`flex items-center w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center' : 'gap-2.5'} ${
                activeTab === id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {!collapsed && label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-5 flex flex-col gap-1">
          {!collapsed && (
            <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 transition-colors">
              <Moon size={15} />
              Theme · Light
            </button>
          )}
          <button
            onClick={onBack}
            title={collapsed ? 'Back to Chat' : undefined}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-200 font-medium transition-colors ${collapsed ? 'justify-center' : 'gap-2.5'}`}
          >
            <ArrowLeft size={16} />
            {!collapsed && tr.backToChat}
          </button>
        </div>
      </aside>

      {/* Main content — wallpaper applied here only */}
      <main
        className="relative flex flex-col flex-1 overflow-y-auto bg-white dark:bg-gray-950"
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {bgImage && <div className="absolute inset-0 bg-white/90 dark:bg-gray-950/20 pointer-events-none z-0" />}
        <div className="relative z-10 flex-1 flex justify-center px-10 py-8">
          <div className="w-full max-w-3xl">
            <ActiveComponent />
          </div>
        </div>
      </main>
    </div>
  );
}
