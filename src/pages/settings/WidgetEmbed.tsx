import React, { useMemo, useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { API_BASE } from '../../config/apiBase';
import { useCopy } from '../../hooks/useCopy';

function trimSlash(input: string): string {
  return input.trim().replace(/\/$/, '');
}

export default function WidgetEmbed() {
  const [botId, setBotId] = useState('11');
  const [publicBase, setPublicBase] = useState(trimSlash(API_BASE));
  const [width, setWidth] = useState('420');
  const [height, setHeight] = useState('700');
  const [copiedIframe, copyIframe] = useCopy();
  const [copiedScript, copyScript] = useCopy();

  const safeBotId = useMemo(() => {
    const raw = botId.trim();
    return /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : 'default';
  }, [botId]);

  const numericWidth = useMemo(() => {
    const parsed = Number.parseInt(width, 10);
    return Number.isFinite(parsed) && parsed > 200 ? parsed : 420;
  }, [width]);

  const numericHeight = useMemo(() => {
    const parsed = Number.parseInt(height, 10);
    return Number.isFinite(parsed) && parsed > 280 ? parsed : 700;
  }, [height]);

  const base = trimSlash(publicBase || API_BASE);
  const iframeSrc = `${base}/embed/widget/frame?botId=${encodeURIComponent(safeBotId)}`;
  const iframeCode = `<iframe src="${iframeSrc}" title="Namu Widget" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="width:${numericWidth}px;max-width:100%;height:${numericHeight}px;border:0;border-radius:14px;overflow:hidden"></iframe>`;
  const scriptCode = `<script async src="${base}/widget.js" data-bot-id="${safeBotId}"></script>`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Widget Embed</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate copy-paste iframe embed code for external websites.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Bot ID
          <input
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="11"
          />
        </label>
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Public Base URL
          <input
            value={publicBase}
            onChange={(e) => setPublicBase(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="https://your-domain.com"
          />
        </label>
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Width (px)
          <input
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Height (px)
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Iframe Embed (recommended)</h3>
          <button
            onClick={() => copyIframe(iframeCode)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {copiedIframe ? <Check size={14} /> : <Copy size={14} />}
            {copiedIframe ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="text-xs p-3 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto">{iframeCode}</pre>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Script Embed (wrapper)</h3>
          <button
            onClick={() => copyScript(scriptCode)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {copiedScript ? <Check size={14} /> : <Copy size={14} />}
            {copiedScript ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="text-xs p-3 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto">{scriptCode}</pre>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white/70 dark:bg-gray-900/40">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Live Preview</h3>
          <a
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            href={iframeSrc}
            target="_blank"
            rel="noreferrer"
          >
            Open frame <ExternalLink size={12} />
          </a>
        </div>
        <iframe
          src={iframeSrc}
          title="Widget preview"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{
            width: `${numericWidth}px`,
            maxWidth: '100%',
            height: `${Math.min(numericHeight, 560)}px`,
            border: 0,
            borderRadius: '12px',
          }}
        />
      </div>
    </div>
  );
}
