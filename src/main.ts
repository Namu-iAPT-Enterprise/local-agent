import { app, BrowserWindow, ipcMain, dialog, session, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

if (started) app.quit();

// ── Target URL ────────────────────────────────────────────────────────────────
//
// 기본: 로컬 React/Vite 렌더러 사용 (electron-forge plugin-vite 가
//   MAIN_WINDOW_VITE_DEV_SERVER_URL / MAIN_WINDOW_VITE_NAME 을 주입함)
//
// 외부 Next.js 서버를 사용하려면 APP_URL 환경변수를 명시적으로 지정:
//   APP_URL=http://localhost:3000 npm start
//   APP_URL=https://agent.internal NODE_ENV=production electron-forge start
//
// APP_URL 이 설정되어 있으면 Vite 개발 URL 보다 우선합니다.

// MAIN_WINDOW_VITE_DEV_SERVER_URL / MAIN_WINDOW_VITE_NAME 은 forge.env.d.ts 에서 글로벌로 선언됨.
// (개발 모드에서만 dev server URL 이 정의되고, 운영 모드에서는 undefined)

const APP_URL_OVERRIDE = process.env.APP_URL?.replace(/\/$/, '') || undefined;

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

  // 1) APP_URL override (외부 Next.js 등) 가 있으면 그것을 우선 사용
  // 2) 개발 모드: Vite plugin 이 주입한 dev server URL
  // 3) 운영 모드: 빌드된 index.html 파일을 로드
  if (APP_URL_OVERRIDE) {
    mainWindow.loadURL(APP_URL_OVERRIDE);
  } else if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else if (typeof MAIN_WINDOW_VITE_NAME !== 'undefined' && MAIN_WINDOW_VITE_NAME) {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  } else {
    // Fallback (구성이 누락된 경우)
    mainWindow.loadURL('http://localhost:5173');
  }

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
    // -3 (ABORTED) 는 정상적인 네비게이션 인터럽트 (devtools 등) — 재시도하지 않음
    if (errorCode === -3) return;
    console.error(`[Electron] 페이지 로드 실패: ${validatedURL} — ${errorCode} ${errorDescription}`);
    setTimeout(() => {
      if (mainWindow.isDestroyed()) return;
      const retryUrl =
        APP_URL_OVERRIDE ??
        (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? MAIN_WINDOW_VITE_DEV_SERVER_URL : undefined);
      if (retryUrl) mainWindow.loadURL(retryUrl);
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

/** Resolve paths where debug NDJSON can be appended (cwd is unreliable when launching from GUI). */
function getDebugSessionLogPaths(): string[] {
  const out: string[] = [];
  try {
    out.push(path.join(app.getPath('userData'), 'debug-acc65e.log'));
  } catch {
    // ignore
  }
  try {
    out.push(path.join(process.cwd(), '.cursor', 'debug-acc65e.log'));
  } catch {
    // ignore
  }
  try {
    let dir: string = __dirname;
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        out.push(path.join(dir, '.cursor', 'debug-acc65e.log'));
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // ignore
  }
  return [...new Set(out)];
}

/** Append one NDJSON line for debug sessions (renderer cannot write the workspace file directly). */
ipcMain.handle('debug-session-log', (_event, line: string) => {
  const lineOut = line.endsWith('\n') ? line : `${line}\n`;
  for (const logPath of getDebugSessionLogPaths()) {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, lineOut, 'utf8');
    } catch {
      // try next
    }
  }
});

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
