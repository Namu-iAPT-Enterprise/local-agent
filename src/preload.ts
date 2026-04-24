import { contextBridge, ipcRenderer } from 'electron';

// ── Context Bridge ────────────────────────────────────────────────────────────
//
// contextIsolation: true 환경에서 Next.js 렌더러가 Node/Electron API에 직접
// 접근하지 못하도록 격리를 유지하면서, 허용된 IPC 채널만 window.electronAPI 로 노출.
//
// Next.js 프로젝트(namu-localAgent)의 types/electron.d.ts 에 아래 타입을 선언하세요.

contextBridge.exposeInMainWorld('electronAPI', {
<<<<<<< Updated upstream
  /** 로컬 LAN IPv4 주소 반환 */
  getLocalIP: (): Promise<string> =>
    ipcRenderer.invoke('get-local-ip'),

  /** OS 파일 선택 다이얼로그 */
  openFileDialog: (options?: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: string[];
  }): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke('open-file-dialog', options),

  /** UTF-8 텍스트 파일 읽기 */
  readFile: (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('read-file', filePath),

  /** 바이너리 파일을 Base64로 읽기 (PDF, 이미지 등) */
  readFileBase64: (filePath: string): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> =>
    ipcRenderer.invoke('read-file-base64', filePath),

  /** Electron 앱 버전 */
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-app-version'),
=======
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  debugSessionLog: (line: string) => ipcRenderer.invoke('debug-session-log', line),
>>>>>>> Stashed changes
});
