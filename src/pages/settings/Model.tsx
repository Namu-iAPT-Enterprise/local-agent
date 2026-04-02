import React, { useState } from 'react';
import { Info, Plus, X, Pencil, Search, Lightbulb } from 'lucide-react';

const platforms = ['Gemini', 'OpenAI', 'Anthropic', 'Ollama', 'Custom'];

function AddModelModal({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState('Gemini');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[560px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Model</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        <div className="px-7 py-5 flex flex-col gap-5">
          {/* Model Platform */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-red-500">*</span> Model Platform
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-500">
                {/* Gemini-style diamond icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2 L14.5 12 L12 22 L9.5 12 Z" fill="#4285F4" />
                  <path d="M2 12 L12 9.5 L22 12 L12 14.5 Z" fill="#EA4335" />
                  <path d="M12 2 L14.5 12 L12 14.5 L9.5 12 Z" fill="#FBBC05" />
                  <path d="M12 14.5 L14.5 12 L22 12 L12 22 Z" fill="#34A853" />
                </svg>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none appearance-none cursor-pointer"
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">base url</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-red-500">*</span> API Key
            </label>
            <div className="flex items-center px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none"
              />
              <Pencil size={15} className="text-gray-400 flex-shrink-0" />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <Lightbulb size={13} className="text-yellow-400 flex-shrink-0" />
              To add multiple API Keys for auto-rotation, configure in platform edit later
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
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none"
              />
              <Search size={15} className="text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-5 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 rounded-xl bg-gray-800 dark:bg-gray-600 hover:bg-gray-900 dark:hover:bg-gray-500 text-white text-sm font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Model() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Model</h2>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Clear status
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Add Model
          </button>
        </div>
      </div>

      {/* Note banner */}
      <div className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
        Note: only Gemini CLI Agent currently supports custom models.
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Info size={40} strokeWidth={1.2} />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No configured models</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Need help? Check out the detailed{' '}
          <a href="#" className="text-blue-500 hover:underline">
            configuration guide
          </a>
          .
        </p>
      </div>

      {showModal && <AddModelModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
