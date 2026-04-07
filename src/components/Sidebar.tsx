import React, { useState } from 'react';
import { Plus, Search, Settings, LayoutList, PanelLeftClose, PanelLeftOpen, Inbox } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';

interface SidebarProps {
  onSettings?: () => void;
  onNewChat?: () => void;
}

export default function Sidebar({ onSettings, onNewChat }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { bgImage } = useTheme();
  const { tr } = useLang();

  return (
    <aside className={`flex flex-col h-screen flex-shrink-0 transition-all duration-200 bg-gray-100 dark:bg-gray-900 ${collapsed ? 'w-16' : 'w-56'}`}>
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 4 L20 18 H4 Z" fill="white" />
              <circle cx="12" cy="10" r="2.5" fill="#111" />
            </svg>
          </div>
        </div>
      ) : (
        /* Expanded: logo + name on left, collapse icon on right */
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
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      )}

      {/* New Chat + list toggle */}
      <div className={`flex items-center gap-2 mt-3 px-3`}>
        <button
          onClick={onNewChat}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors text-sm font-medium text-gray-800 ${collapsed ? 'justify-center w-full' : 'flex-1'}`}
          title={collapsed ? tr.newChat : undefined}
        >
          <Plus size={16} />
          {!collapsed && tr.newChat}
        </button>
        {!collapsed && (
          <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors" title="Chat list">
            <LayoutList size={17} />
          </button>
        )}
      </div>

      {/* Search */}
      <button
        className={`flex items-center gap-2.5 py-2.5 mt-2 mx-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm ${collapsed ? 'justify-center px-2' : 'px-3'}`}
        title={collapsed ? tr.search : undefined}
      >
        <Search size={17} />
        {!collapsed && tr.search}
      </button>

      {/* Empty chat history */}
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
        <Inbox size={collapsed ? 28 : 40} strokeWidth={1.2} />
        {!collapsed && <span className="text-sm">{tr.noChatHistory}</span>}
      </div>

      {/* Bottom: Settings */}
      <div className="px-2 pb-5">
        <button
          onClick={onSettings}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? tr.settings : undefined}
        >
          <Settings size={17} />
          {!collapsed && tr.settings}
        </button>
      </div>
    </aside>
  );
}
