import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, HARDCODED_ADMIN_EMAILS, ADMIN_DISPLAY_NAMES } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.css'
})
export class AuthModalComponent {
  protected readonly auth = inject(AuthService);

  @Output() close = new EventEmitter<void>();

  mode = signal<'login' | 'register'>('login');
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Form fields
  loginEmail = '';
  loginPassword = '';

  regFullName = '';
  regEmail = '';
  regMssv = '';
  regPassword = '';

  readonly adminList = HARDCODED_ADMIN_EMAILS.map(email => ({
    email,
    title: ADMIN_DISPLAY_NAMES[email] || 'BTV Đoàn Khoa'
  }));

  onLogin(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const res = this.auth.login(this.loginEmail, this.loginPassword);
    if (res.success) {
      this.successMessage.set(res.message);
      setTimeout(() => this.close.emit(), 600);
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
      setTimeout(() => this.close.emit(), 600);
    } else {
      this.errorMessage.set(res.message);
    }
  }

  quickAdminLogin(email: string): void {
    this.auth.quickAdminLogin(email);
    this.successMessage.set(`Đã đăng nhập thành công với vai trò ${ADMIN_DISPLAY_NAMES[email]}!`);
    setTimeout(() => this.close.emit(), 600);
  }
}
