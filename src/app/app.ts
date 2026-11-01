import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from './services/delegate.service';
import { FeedbackService } from './services/feedback.service';
import { AuthService } from './services/auth.service';
import { DelegateLookupComponent } from './components/delegate-lookup/delegate-lookup';
import { SurveyFormComponent } from './components/survey-form/survey-form';
import { BadgeGeneratorComponent } from './components/badge-generator/badge-generator';
import { StatsComponent } from './components/stats/stats';
import { ScannerComponent } from './components/scanner/scanner';
import { KioskScreenComponent } from './components/kiosk-screen/kiosk-screen';
import { AuthModalComponent } from './components/auth-modal/auth-modal';

export type ActiveTab = 'lookup' | 'survey' | 'badges' | 'stats' | 'scanner' | 'kiosk';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DelegateLookupComponent,
    SurveyFormComponent,
    BadgeGeneratorComponent,
    StatsComponent,
    ScannerComponent,
    KioskScreenComponent,
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
  readonly showConfigModal = signal(false);
  readonly showAuthModal = signal(false);

  // Edit Congress info fields
  editTitle = '';
  editSubTitle = '';
  editUnitName = '';
  editTerm = '';
  editLocation = '';

  setTab(tab: ActiveTab): void {
    // Check permission for admin-only tabs
    const adminOnlyTabs: ActiveTab[] = ['stats', 'scanner', 'kiosk'];
    if (adminOnlyTabs.includes(tab) && !this.auth.isAdmin()) {
      this.showAuthModal.set(true);
      return;
    }
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openAuthModal(): void {
    this.showAuthModal.set(true);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
  }

  logout(): void {
    this.auth.logout();
    if (['stats', 'scanner', 'kiosk'].includes(this.activeTab())) {
      this.activeTab.set('lookup');
    }
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
      term: this.editTerm,
      location: this.editLocation
    });
    this.feedback.playSuccessSound();
    this.closeConfig();
  }
}
