import React from 'react';

export default function About() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 4 L20 18 H4 Z" fill="white" />
              <circle cx="12" cy="10" r="2.5" fill="#111" />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white">NAMU LA</div>
            <div className="text-xs text-gray-400">Version 0.0.2</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          A local AI agent desktop application built with Electron, React, and Tailwind CSS.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">Check for Updates</span>
          <button className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Check
          </button>
        </div>
      </div>
    </div>
  );
}
