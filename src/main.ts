import { app, BrowserWindow, ipcMain, dialog, session, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

if (started) app.quit();

// ── Target URL ────────────────────────────────────────────────────────────────
//
// 개발: APP_URL=http://localhost:3000  (Next.js dev server)
// 운영: APP_URL=https://agent.internal (배포된 Next.js 서버, 내부망 HTTPS)
//
// .env 또는 shell 환경변수로 주입. electron-forge start 시 process.env로 읽힘.
//
// [리팩토링 메모]
// 이 프로젝트는 기존 React/Vite 렌더러를 제거하고 Electron 셸 전용으로 전환되었습니다.
// UI(React 컴포넌트)는 namu-localAgent (Next.js) 프로젝트로 이전하세요.
// Electron은 해당 Next.js 서버 URL을 BrowserWindow로 로드하는 역할만 수행합니다.

const APP_URL = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ── SSL ───────────────────────────────────────────────────────────────────────
const TRUST_SELF_SIGNED = process.env.TRUST_SELF_SIGNED === 'true';

function isTrustedHost(hostname: string): boolean {
  if (TRUST_SELF_SIGNED) return true;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.intranet')
  );
}

app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  try {
    const { hostname } = new URL(url);
    if (isTrustedHost(hostname)) {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch { /* URL 파싱 실패 → 기본 거부 */ }
  callback(false);
});

// ── Window ────────────────────────────────────────────────────────────────────
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Namu Local Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // BFF 세션 쿠키(HttpOnly, Secure)가 영속적으로 유지되도록 파티션 고정
      partition: 'persist:namu-agent',
      webSecurity: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // _blank 링크 중 외부 URL은 OS 기본 브라우저로 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { hostname } = new URL(url);
      if (!isTrustedHost(hostname)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch { /* ignore */ }
    return { action: 'allow' };
  });

  // 로드 실패 시 3초 뒤 자동 재시도 (서버 기동 타이밍 대응)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] 페이지 로드 실패: ${validatedURL} — ${errorCode} ${errorDescription}`);
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) mainWindow.loadURL(APP_URL);
    }, 3000);
  });
};

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.on('ready', () => {
  session.fromPartition('persist:namu-agent');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC: OS 수준 기능 브릿지 ──────────────────────────────────────────────────

/** 로컬 LAN IPv4 주소 반환 */
ipcMain.handle('get-local-ip', () => {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
});

/** OS 파일 선택 다이얼로그 */
ipcMain.handle('open-file-dialog', async (_event, options?: Electron.OpenDialogOptions) => {
  return dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '문서', extensions: ['txt', 'md', 'json', 'csv', 'log', 'pdf', 'docx', 'pptx', 'xlsx', 'hwpx'] },
      { name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { name: '모든 파일', extensions: ['*'] },
    ],
    ...options,
  });
});

/** UTF-8 텍스트 파일 읽기 */
ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/** 바이너리 파일을 Base64로 읽기 (PDF, 이미지 등) */
ipcMain.handle('read-file-base64', async (_event, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { success: true, data: buffer.toString('base64'), mimeType: guessMimeType(filePath) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/** Electron 앱 버전 */
ipcMain.handle('get-app-version', () => app.getVersion());

// ── Helpers ───────────────────────────────────────────────────────────────────
function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf', '.png': 'image/png',
    '.jpg': 'image/jpeg',     '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',      '.webp': 'image/webp',
    '.svg': 'image/svg+xml',  '.txt': 'text/plain',
    '.md': 'text/markdown',   '.json': 'application/json',
    '.csv': 'text/csv',
  };
  return map[ext] ?? 'application/octet-stream';
}
