import { Component, EventEmitter, Output, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AuthService, UserAccount } from '../../services/auth.service';
import { detectActiveBackend, getApiBase } from '../../services/api-config';

@Component({
  selector: 'app-auth-modal', standalone: true,
  templateUrl: './auth-modal.html', styleUrl: './auth-modal.css'
})
export class AuthModalComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  @Output() loginSuccess = new EventEmitter<UserAccount>();
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly ready = signal(false);
  private popup: Window | null = null;
  private poll?: ReturnType<typeof setInterval>;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private backendOrigin = '';
  private destroyed = false;

  async ngOnInit(): Promise<void> {
    window.addEventListener('message', this.onGoogleMessage);
    try {
      await detectActiveBackend();
      const res = await fetch(`${getApiBase()}/config/google-client-id`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error('Chưa thể kết nối máy chủ đăng nhập.');
      const config = await res.json();
      if (!config.configured) throw new Error('Đăng nhập Google chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
      this.backendOrigin = new URL(getApiBase(), window.location.origin).origin;
      this.ready.set(true);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Chưa thể khởi tạo đăng nhập Google.');
    } finally { this.loading.set(false); }
  }

  openGoogleLogin(): void {
    if (!this.ready() || this.busy()) return;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.busy.set(true);
    // Open during the click so browsers allow the popup.
    this.popup = window.open(
      `${getApiBase()}/auth/google/start?origin=${encodeURIComponent(window.location.origin)}`,
      'ISTimesGoogleSignIn', 'popup=yes,width=1000,height=740'
    );
    if (!this.popup) {
      this.busy.set(false);
      this.errorMessage.set('Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép cửa sổ bật lên và thử lại.');
      return;
    }
    this.poll = setInterval(() => {
      if (this.popup?.closed) {
        this.stopPolling();
        this.busy.set(false);
        this.errorMessage.set('Cửa sổ đăng nhập đã đóng. Bạn có thể thử lại.');
      }
    }, 500);
  }

  private readonly onGoogleMessage = async (event: MessageEvent): Promise<void> => {
    if (!this.popup || event.source !== this.popup || event.origin !== this.backendOrigin ||
        event.data?.type !== 'ISTIMES_GOOGLE_AUTH') return;
    this.stopPolling();
    this.popup.close();
    this.popup = null;
    try {
      if (event.data.error) throw new Error(event.data.error);
      if (typeof event.data.token !== 'string' || !/^[a-f0-9]{64}$/.test(event.data.token)) throw new Error('Phiên đăng nhập không hợp lệ.');
      const user = await this.auth.completeGoogleLogin(event.data.token);
      if (this.destroyed) return;
      this.successMessage.set(user.role === 'admin' ? 'Đăng nhập thành công với quyền quản trị viên.' : 'Đăng nhập Google thành công.');
      this.loginSuccess.emit(user);
      this.closeTimer = setTimeout(() => this.close.emit(), 600);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Đăng nhập không thành công.');
      this.busy.set(false);
    }
  };

  private stopPolling(): void { clearInterval(this.poll); }
  ngOnDestroy(): void {
    this.destroyed = true;
    window.removeEventListener('message', this.onGoogleMessage);
    this.stopPolling();
    clearTimeout(this.closeTimer);
    this.popup?.close();
  }
}
