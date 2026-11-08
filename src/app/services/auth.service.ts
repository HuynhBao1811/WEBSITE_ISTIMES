import { Injectable, signal, computed } from '@angular/core';
import { getApiBase, detectActiveBackend } from './api-config';

export interface UserAccount {
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  mssv?: string;
  avatarUrl?: string;
  provider?: 'google' | 'password' | 'guest';
  id?: string;
}

export const HARDCODED_ADMIN_EMAILS: readonly string[] = [
  'khoihak25416@st.uel.edu.vn',
  'vyvhpk25411e@st.uel.edu.vn',
  'anhnnk25406@st.uel.edu.vn',
  'baohgk24411e@st.uel.edu.vn',
  'ducnh23411e@st.uel.edu.vn'
];

export const ADMIN_DISPLAY_NAMES: Record<string, string> = {
  'khoihak25416@st.uel.edu.vn': 'Đ/c Hà Khôi - BTV Đoàn Khoa',
  'vyvhpk25411e@st.uel.edu.vn': 'Đ/c Huỳnh Phương Vy - BTV Đoàn Khoa',
  'anhnnk25406@st.uel.edu.vn': 'Đ/c Nguyễn Ngọc Anh - BTV Đoàn Khoa',
  'baohgk24411e@st.uel.edu.vn': 'Đ/c Huỳnh Gia Bảo - Bí thư Đoàn Khoa',
  'ducnh23411e@st.uel.edu.vn': 'Đ/c Nguyễn Hữu Đức - Phó Bí thư Đoàn Khoa'
};

const SESSION_KEY = 'ISTIMES_SESSION_V2';
const USER_KEY = 'ISTIMES_USER_DATA_V2';

export function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(SESSION_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserState = signal<UserAccount | null>(this.loadInitialUser());
  readonly currentUser = this.currentUserState.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => {
    const u = this.currentUser();
    if (!u) return false;
    return u.role === 'admin' || this.isEmailAdmin(u.email);
  });

  readonly adminList = HARDCODED_ADMIN_EMAILS.map(email => ({
    email,
    name: ADMIN_DISPLAY_NAMES[email] || 'BTV Đoàn Khoa HTTT'
  }));

  constructor() {
    void this.restoreBackendSession();
  }

  isEmailAdmin(email: string): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return HARDCODED_ADMIN_EMAILS.some(a => a.toLowerCase() === clean);
  }

  private loadInitialUser(): UserAccount | null {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const u = JSON.parse(stored);
        if (u && (u.email || u.fullName)) {
          if (this.isEmailAdmin(u.email)) u.role = 'admin';
          return u;
        }
      }
    } catch { /* storage unavailable */ }
    return null;
  }

  private async restoreBackendSession(): Promise<void> {
    const headers = authHeaders();
    if (!headers['Authorization']) return;
    try {
      await detectActiveBackend();
      const res = await fetch(`${getApiBase()}/auth/me`, { headers });
      if (!res.ok) throw new Error('Invalid session');
      const data = await res.json();
      if (authHeaders()['Authorization'] === headers['Authorization']) {
        const user = data.user;
        if (this.isEmailAdmin(user.email)) user.role = 'admin';
        this.saveUser(user);
      }
    } catch {
      // If backend is offline, preserve local user if present
    }
  }

  loginWithCredentials(identifier: string, _password?: string): { success: boolean; message: string; user?: UserAccount } {
    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      return { success: false, message: 'Vui lòng nhập MSSV hoặc Email của bạn.' };
    }

    // Check if hardcoded admin email or mssv
    const isAdmin = this.isEmailAdmin(clean) ||
      clean === 'k244118888' || clean === 'k234111003' || clean === 'k254160001' || clean === 'k254110002' || clean === 'k254060003';

    let email = clean.includes('@') ? clean : `${clean}@st.uel.edu.vn`;
    let fullName = clean.toUpperCase();

    if (this.isEmailAdmin(clean)) {
      fullName = ADMIN_DISPLAY_NAMES[clean] || 'Quản trị viên Đoàn Khoa';
    } else if (clean === 'k244118888') {
      email = 'baohgk24411e@st.uel.edu.vn';
      fullName = 'Huỳnh Gia Bảo (Bí thư)';
    } else if (clean === 'k234111003') {
      email = 'ducnh23411e@st.uel.edu.vn';
      fullName = 'Nguyễn Hữu Đức (Phó BT)';
    } else if (clean === 'k254160001') {
      email = 'khoihak25416@st.uel.edu.vn';
      fullName = 'Hà Khôi (BTV)';
    }

    const user: UserAccount = {
      email,
      fullName,
      role: isAdmin ? 'admin' : 'user',
      mssv: clean.includes('@') ? undefined : clean.toUpperCase(),
      provider: 'password'
    };

    this.saveUser(user);
    const fakeToken = `local_jwt_${Date.now()}_${clean}`;
    try { localStorage.setItem(SESSION_KEY, fakeToken); } catch { /* ignore */ }

    return {
      success: true,
      message: isAdmin ? 'Đăng nhập Quản trị viên thành công!' : 'Đăng nhập thành công!',
      user
    };
  }

  async completeGoogleLogin(token: string): Promise<UserAccount> {
    const res = await fetch(`${getApiBase()}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok || !data.user) throw new Error(data.message || 'Không thể xác thực phiên đăng nhập.');
    
    const user: UserAccount = data.user;
    if (this.isEmailAdmin(user.email)) {
      user.role = 'admin';
    }
    try { localStorage.setItem(SESSION_KEY, token); } catch { /* ignore */ }
    this.saveUser(user);
    return user;
  }

  quickAdminLogin(email: string): void {
    const clean = email.trim().toLowerCase();
    const user: UserAccount = {
      email: clean,
      fullName: ADMIN_DISPLAY_NAMES[clean] || 'Quản trị viên Đoàn Khoa',
      role: 'admin',
      provider: 'password'
    };
    try { localStorage.setItem(SESSION_KEY, `quick_admin_${Date.now()}`); } catch { /* ignore */ }
    this.saveUser(user);
  }

  guestLogin(): void {
    const user: UserAccount = {
      email: 'khach@st.uel.edu.vn',
      fullName: 'Đại biểu / Sinh viên Khách',
      role: 'user',
      provider: 'guest'
    };
    try { localStorage.setItem(SESSION_KEY, `guest_${Date.now()}`); } catch { /* ignore */ }
    this.saveUser(user);
  }

  register(data: { email: string; fullName: string; mssv?: string; password?: string }): { success: boolean; message: string; user?: UserAccount } {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !data.fullName.trim()) {
      return { success: false, message: 'Vui lòng điền đầy đủ Email và Họ tên.' };
    }

    const isAdmin = this.isEmailAdmin(cleanEmail);
    const user: UserAccount = {
      email: cleanEmail,
      fullName: data.fullName.trim(),
      role: isAdmin ? 'admin' : 'user',
      mssv: data.mssv?.trim()?.toUpperCase(),
      provider: 'password'
    };

    try { localStorage.setItem(SESSION_KEY, `reg_${Date.now()}`); } catch { /* ignore */ }
    this.saveUser(user);

    return {
      success: true,
      message: isAdmin ? 'Đăng ký thành công tài khoản Quản trị viên!' : 'Đăng ký tài khoản thành công!',
      user
    };
  }

  logout(): void {
    const headers = authHeaders();
    this.clearSession();
    if (headers['Authorization']) {
      void fetch(`${getApiBase()}/auth/logout`, { method: 'POST', headers }).catch(() => {});
    }
  }

  private saveUser(user: UserAccount): void {
    this.currentUserState.set(user);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* storage unavailable */ }
  }

  private clearSession(): void {
    this.currentUserState.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* storage unavailable */ }
  }
}
