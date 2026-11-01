import { Injectable, signal, computed } from '@angular/core';

export interface UserAccount {
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  mssv?: string;
  avatarUrl?: string;
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

const STORAGE_AUTH_KEY = 'ISTIMES_AUTH_USER_V1';
const STORAGE_ACCOUNTS_KEY = 'ISTIMES_REGISTERED_ACCOUNTS_V1';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserState = signal<UserAccount | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'admin' || this.isEmailAdmin(user.email);
  });

  readonly adminList = HARDCODED_ADMIN_EMAILS.map(email => ({
    email,
    name: ADMIN_DISPLAY_NAMES[email] || 'Quản trị viên Đoàn Khoa'
  }));

  isEmailAdmin(email: string): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return HARDCODED_ADMIN_EMAILS.some(adm => adm.toLowerCase() === clean);
  }

  private loadStoredUser(): UserAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_AUTH_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // storage unavailable
    }
    return null;
  }

  login(email: string, _password?: string): { success: boolean; message: string; user?: UserAccount } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' };
    }

    // Check if hardcoded admin
    if (this.isEmailAdmin(cleanEmail)) {
      const user: UserAccount = {
        email: cleanEmail,
        fullName: ADMIN_DISPLAY_NAMES[cleanEmail] || 'Quản trị viên BCH Đoàn Khoa',
        role: 'admin'
      };
      this.setUser(user);
      return { success: true, message: 'Đăng nhập Quản trị viên thành công!', user };
    }

    // Check registered accounts
    const accounts = this.getRegisteredAccounts();
    const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      this.setUser(existing);
      return { success: true, message: `Chào mừng ${existing.fullName}! Đăng nhập thành công.`, user: existing };
    }

    // For convenience of delegate testing, allow instant login with any valid ST UEL email as regular user
    const autoUser: UserAccount = {
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0],
      role: 'user'
    };
    this.setUser(autoUser);
    return { success: true, message: 'Đăng nhập thành công với vai trò Đại biểu / Sinh viên.', user: autoUser };
  }

  register(data: { email: string; fullName: string; mssv?: string; password?: string }): { success: boolean; message: string; user?: UserAccount } {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !data.fullName.trim()) {
      return { success: false, message: 'Vui lòng điền đầy đủ Email và Họ tên.' };
    }

    const isAdmin = this.isEmailAdmin(cleanEmail);
    const newUser: UserAccount = {
      email: cleanEmail,
      fullName: data.fullName.trim(),
      role: isAdmin ? 'admin' : 'user',
      mssv: data.mssv?.trim()
    };

    const accounts = this.getRegisteredAccounts().filter(a => a.email.toLowerCase() !== cleanEmail);
    accounts.push(newUser);
    try {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // ignore
    }

    this.setUser(newUser);
    return {
      success: true,
      message: isAdmin ? 'Đăng ký thành công tài khoản Quản trị viên!' : 'Đăng ký tài khoản thành công!',
      user: newUser
    };
  }

  quickAdminLogin(email: string): void {
    const cleanEmail = email.trim().toLowerCase();
    const user: UserAccount = {
      email: cleanEmail,
      fullName: ADMIN_DISPLAY_NAMES[cleanEmail] || 'Quản trị viên Đoàn Khoa',
      role: 'admin'
    };
    this.setUser(user);
  }

  logout(): void {
    this.currentUserState.set(null);
    try {
      localStorage.removeItem(STORAGE_AUTH_KEY);
    } catch {
      // ignore
    }
  }

  private setUser(user: UserAccount): void {
    this.currentUserState.set(user);
    try {
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  private getRegisteredAccounts(): UserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return [];
  }
}
