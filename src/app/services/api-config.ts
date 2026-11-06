// Cấu hình URL kết nối MongoDB Backend API
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_URLS = isLocal ? [
  'http://localhost:5001/api',
  'http://localhost:5000/api',
  '/api'
] : ['/api'];

let activeApiBase = API_URLS[0];

export function getApiBase(): string {
  return activeApiBase;
}

export function setApiBase(url: string): void {
  activeApiBase = url;
}

/**
 * Tự động tìm API Backend đang chạy
 */
export async function detectActiveBackend(): Promise<string> {
  for (const base of API_URLS) {
    try {
      const res = await fetch(`${base.replace('/api', '')}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok && (await res.json()).status === 'OK') {
        activeApiBase = base;
        return base;
      }
    } catch {
      // Thử URL tiếp theo
    }
  }
  return activeApiBase;
}
