import React, { useState, useEffect } from 'react';
import { Globe, Copy, Pencil, RefreshCw, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getActiveServerStack } from '../../config/serverProfile';

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

function getExpiryTime(minutesFromNow: number) {
  const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Remote() {
  const [activeTab, setActiveTab] = useState<'webui' | 'channels'>('webui');
  const [enableWebUI, setEnableWebUI] = useState(false);
  const [allowRemote, setAllowRemote] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrExpiry, setQrExpiry] = useState(() => getExpiryTime(5));

  const { webUiLanHost: localIP, webUiPort: port } = getActiveServerStack();
  const accessURL = `http://${localIP}:${port}`;
  const username = 'admin';
  const password = 'a$qnOZ0m0Ic$';
  const loginURL = `${accessURL}/login?user=${username}&token=${btoa(password)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const refreshQR = () => {
    setQrExpiry(getExpiryTime(5));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tab row */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('webui')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'webui'
              ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Globe size={14} />
          WebUI
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'channels'
              ? 'border-gray-800 dark:border-gray-200 text-gray-900 dark:text-white'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          Channels
        </button>
      </div>

      {activeTab === 'webui' && (
        <div className="flex flex-col gap-4">
          {/* Title + description */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">WebUI</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use NAMU LA as your "24/7 Remote Assistant" - arrange tasks from any remote device, anytime, anywhere.
            </p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {[['1', 'Enable WebUI'], ['2', 'Access URL'], ['3', 'Allow Remote Access']].map(([n, label]) => (
              <span key={n} className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">{n}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Main card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {/* Info banner */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-400">
              <Globe size={14} />
              Enable WebUI so your phone or remote browser can access NAMU LA.
            </div>

            {/* Enable WebUI row */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Enable WebUI</span>
                {enableWebUI && (
                  <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Running
                  </span>
                )}
              </div>
              <Toggle enabled={enableWebUI} onChange={() => setEnableWebUI(!enableWebUI)} />
            </div>

            {/* Access URL row — shown when enabled */}
            {enableWebUI && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Access URL</span>
                <div className="flex items-center gap-2">
                  <a href="#" className="text-sm text-blue-500 hover:underline font-mono">{accessURL}</a>
                  <button
                    onClick={() => copyToClipboard(accessURL)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="Copy URL"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Allow Remote Access row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">Allow Remote Access</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Use remote software/server for secure remote access{' '}
                  <a href="#" className="text-blue-500 hover:underline">View Guide</a>
                </div>
              </div>
              <Toggle enabled={allowRemote} onChange={() => setAllowRemote(!allowRemote)} />
            </div>
          </div>

          {/* Login Info card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Login Info</span>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Username:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800 dark:text-gray-100">{username}</span>
                <button onClick={() => copyToClipboard(username)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <Copy size={14} />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <Pencil size={14} />
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Initial Password:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800 dark:text-gray-100 font-mono">{password}</span>
                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <Pencil size={14} />
                </button>
              </div>
            </div>

            {/* QR Code Login — shown when WebUI enabled */}
            {enableWebUI && (
              <div className="px-5 py-5">
                <div className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">QR Code Login</div>
                <div className="mb-4 text-xs text-gray-400">Scan the QR code with your phone to log in automatically on mobile browser</div>
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-600 inline-block">
                    <QRCodeSVG value={loginURL} size={160} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400">
                  <span>Expires at {qrExpiry}</span>
                  <button onClick={() => copyToClipboard(loginURL)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <Copy size={13} />
                  </button>
                  <button onClick={refreshQR} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'channels' && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
          <span className="text-sm">No channels configured yet.</span>
        </div>
      )}
    </div>
  );
}
