import React, { useState } from 'react';

export default function GeminiCLI() {
  const [proxy, setProxy] = useState('');
  const [projectId, setProjectId] = useState('');

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Google Account */}
      <div className="flex items-center justify-between bg-white rounded-xl px-6 py-4 border border-gray-200">
        <span className="text-sm text-gray-700">Google Account</span>
        <button className="px-4 py-2 rounded-full bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
          Login with Google
        </button>
      </div>

      {/* Proxy */}
      <div className="bg-white rounded-xl px-6 py-4 border border-gray-200">
        <label className="block text-sm text-gray-700 mb-2">Proxy</label>
        <input
          type="text"
          value={proxy}
          onChange={(e) => setProxy(e.target.value)}
          placeholder="Only support http/https protocol"
          className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Google Cloud Project */}
      <div className="bg-white rounded-xl px-6 py-4 border border-gray-200">
        <label className="block text-sm font-mono text-blue-600 mb-2">GOOGLE_CLOUD_PROJECT</label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Enter your Google Cloud Project ID"
          className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>
    </div>
  );
}
