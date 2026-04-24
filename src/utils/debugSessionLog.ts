/** Session `acc65e` — NDJSON to `.cursor/debug-acc65e.log` via Electron main, plus optional HTTP ingest. */
const SESSION_ID = 'acc65e';
const INGEST = 'http://127.0.0.1:7751/ingest/3cf09162-d6c1-4e5b-b2e9-60fafa2fd584';

export function debugSessionLog(location: string, message: string, data: Record<string, unknown>): void {
  const payload = {
    sessionId: SESSION_ID,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  const line = JSON.stringify(payload);
  if (typeof window !== 'undefined' && window.electronAPI?.debugSessionLog) {
    void window.electronAPI.debugSessionLog(line);
  }
  fetch(INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: line,
  }).catch(() => {});
}
