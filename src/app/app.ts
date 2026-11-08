import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from './services/delegate.service';
import { FeedbackService } from './services/feedback.service';
import { AuthService, UserAccount } from './services/auth.service';
import { DelegateLookupComponent } from './components/delegate-lookup/delegate-lookup';
import { SurveyFormComponent } from './components/survey-form/survey-form';
import { BadgeGeneratorComponent } from './components/badge-generator/badge-generator';
import { AuthModalComponent } from './components/auth-modal/auth-modal';
import { LandingLoginComponent } from './components/landing-login/landing-login';
import { AdminConsoleComponent } from './components/admin-console/admin-console';

export type ActiveTab = 'lookup' | 'survey' | 'badges';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LandingLoginComponent,
    AdminConsoleComponent,
    DelegateLookupComponent,
    SurveyFormComponent,
    BadgeGeneratorComponent,
    AuthModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly delegateService = inject(DelegateService);
  protected readonly feedback = inject(FeedbackService);
  protected readonly auth = inject(AuthService);

  readonly activeTab = signal<ActiveTab>('lookup');
  readonly viewMode = signal<'admin' | 'portal'>('admin');
  readonly showConfigModal = signal(false);
  readonly showAuthModal = signal(false);

  // Edit Congress info fields
  editTitle = '';
  editSubTitle = '';
  editUnitName = '';
  editTerm = '';
  editLocation = '';

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openAuthModal(): void {
    this.showAuthModal.set(true);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  onLoginSuccess(user: UserAccount): void {
    if (user.role === 'admin') {
      this.viewMode.set('admin');
      this.feedback.playSuccessSound();
    } else {
      this.viewMode.set('portal');
      this.activeTab.set('lookup');
    }
  }

  logout(): void {
    this.auth.logout();
    this.viewMode.set('admin');
    this.activeTab.set('lookup');
  }

  switchToAdmin(): void {
    this.viewMode.set('admin');
    this.feedback.playBeepSound();
  }

  switchToPortal(): void {
    this.viewMode.set('portal');
    if (!['lookup', 'survey', 'badges'].includes(this.activeTab())) {
      this.activeTab.set('lookup');
    }
    this.feedback.playBeepSound();
  }

  openConfig(): void {
    const current = this.delegateService.congressInfo();
    this.editTitle = current.title;
    this.editSubTitle = current.subTitle;
    this.editUnitName = current.unitName;
    this.editTerm = current.term;
    this.editLocation = current.location;
    this.showConfigModal.set(true);
  }

  closeConfig(): void {
    this.showConfigModal.set(false);
  }

  saveConfig(): void {
    this.delegateService.updateCongressInfo({
      title: this.editTitle,
      subTitle: this.editSubTitle,
      unitName: this.editUnitName,
      term: this.editLocation
    });
    this.feedback.playSuccessSound();
    this.closeConfig();
  }
}
