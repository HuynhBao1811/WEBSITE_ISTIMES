import { Injectable, signal, computed } from '@angular/core';
import { getApiBase, detectActiveBackend } from './api-config';

export interface UserAccount {
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  mssv?: string;
  avatarUrl?: string;
  provider?: 'google' | 'password';
  id?: string;
}

const SESSION_KEY = 'ISTIMES_SESSION_V2';
export function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(SESSION_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserState = signal<UserAccount | null>(null);
  readonly currentUser = this.currentUserState.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    // Old profile-only logins cannot establish identity or grant a role.
    try { localStorage.removeItem('ISTIMES_AUTH_USER_V1'); } catch { /* storage unavailable */ }
    void this.restoreSession();
  }

  private async restoreSession(): Promise<void> {
    const headers = authHeaders();
    if (!headers['Authorization']) return;
    try {
      await detectActiveBackend();
      const res = await fetch(`${getApiBase()}/auth/me`, { headers });
      if (!res.ok) throw new Error('Invalid session');
      const data = await res.json();
      if (authHeaders()['Authorization'] === headers['Authorization']) this.currentUserState.set(data.user);
    } catch {
      if (authHeaders()['Authorization'] === headers['Authorization']) this.clearSession();
    }
  }

  async completeGoogleLogin(token: string): Promise<UserAccount> {
    const res = await fetch(`${getApiBase()}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok || !data.user) throw new Error(data.message || 'Không thể xác thực phiên đăng nhập.');
    localStorage.setItem(SESSION_KEY, token);
    this.currentUserState.set(data.user);
    return data.user;
  }

  logout(): void {
    const headers = authHeaders();
    this.clearSession();
    if (headers['Authorization']) {
      void fetch(`${getApiBase()}/auth/logout`, { method: 'POST', headers }).catch(() => {});
    }
  }

  private clearSession(): void {
    this.currentUserState.set(null);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
  }
}
