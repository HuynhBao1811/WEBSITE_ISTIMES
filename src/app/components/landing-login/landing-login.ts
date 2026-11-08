import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, HARDCODED_ADMIN_EMAILS, ADMIN_DISPLAY_NAMES } from '../../services/auth.service';
import { detectActiveBackend, getApiBase } from '../../services/api-config';

@Component({
  selector: 'app-landing-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing-login.html',
  styleUrl: './landing-login.css'
})
export class LandingLoginComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);

  mode = signal<'login' | 'register'>('login');
  showPassword = signal(false);
  rememberMe = signal(true);

  // Form fields
  username = '';
  password = '';

  regFullName = '';
  regEmail = '';
  regMssv = '';
  regPassword = '';

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Google OAuth state
  googleLoading = signal(true);
  googleBusy = signal(false);
  googleReady = signal(false);
  showQuickAdmin = signal(false);

  private popup: Window | null = null;
  private poll?: ReturnType<typeof setInterval>;
  private backendOrigin = '';

  readonly adminList = HARDCODED_ADMIN_EMAILS.map(email => ({
    email,
    title: ADMIN_DISPLAY_NAMES[email] || 'BTV Đoàn Khoa'
  }));

  async ngOnInit(): Promise<void> {
    window.addEventListener('message', this.onGoogleMessage);
    try {
      await detectActiveBackend();
      const res = await fetch(`${getApiBase()}/config/google-client-id`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const config = await res.json();
        if (config.configured) {
          this.backendOrigin = new URL(getApiBase(), window.location.origin).origin;
          this.googleReady.set(true);
        }
      }
    } catch {
      // Backend not running locally; credential and quick admin login remain fully functional
    } finally {
      this.googleLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onGoogleMessage);
    if (this.poll) clearInterval(this.poll);
    if (this.popup && !this.popup.closed) this.popup.close();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onLogin(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const res = this.auth.loginWithCredentials(this.username, this.password);
    if (res.success) {
      this.successMessage.set(res.message);
    } else {
      this.errorMessage.set(res.message);
    }
  }

  onRegister(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const res = this.auth.register({
      fullName: this.regFullName,
      email: this.regEmail,
      mssv: this.regMssv,
      password: this.regPassword
    });

    if (res.success) {
      this.successMessage.set(res.message);
    } else {
      this.errorMessage.set(res.message);
    }
  }

  quickAdminLogin(email: string): void {
    this.auth.quickAdminLogin(email);
  }

  continueAsGuest(): void {
    this.auth.guestLogin();
  }

  openGoogleLogin(): void {
    if (!this.googleReady() || this.googleBusy()) {
      // If backend Google OAuth not yet configured, provide helpful hint
      if (!this.googleReady()) {
        alert('Máy chủ Google OAuth đang khởi động hoặc chưa cấu hình. Bạn có thể đăng nhập trực tiếp bằng MSSV / Email UEL ở khung bên trên!');
        return;
      }
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.googleBusy.set(true);

    this.popup = window.open(
      `${getApiBase()}/auth/google/start?origin=${encodeURIComponent(window.location.origin)}`,
      'ISTimesGoogleSignIn',
      'popup=yes,width=1000,height=740'
    );

    if (!this.popup) {
      this.googleBusy.set(false);
      this.errorMessage.set('Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép cửa sổ bật lên và thử lại.');
      return;
    }

    this.poll = setInterval(() => {
      if (this.popup?.closed) {
        clearInterval(this.poll);
        this.googleBusy.set(false);
      }
    }, 500);
  }

  private readonly onGoogleMessage = async (event: MessageEvent): Promise<void> => {
    if (!this.popup || event.source !== this.popup || event.origin !== this.backendOrigin ||
        event.data?.type !== 'ISTIMES_GOOGLE_AUTH') return;

    if (this.poll) clearInterval(this.poll);
    this.popup.close();
    this.popup = null;
    this.googleBusy.set(false);

    try {
      if (event.data.error) throw new Error(event.data.error);
      await this.auth.completeGoogleLogin(event.data.token);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.');
    }
  };
}
