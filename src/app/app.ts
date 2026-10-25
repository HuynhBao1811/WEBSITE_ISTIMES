import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from './services/delegate.service';
import { FeedbackService } from './services/feedback.service';
import { ScannerComponent } from './components/scanner/scanner';
import { StatsComponent } from './components/stats/stats';
import { BadgeGeneratorComponent } from './components/badge-generator/badge-generator';
import { SurveyFormComponent } from './components/survey-form/survey-form';
import { KioskScreenComponent } from './components/kiosk-screen/kiosk-screen';

type ActiveTab = 'scanner' | 'stats' | 'badges' | 'survey' | 'kiosk';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScannerComponent,
    StatsComponent,
    BadgeGeneratorComponent,
    SurveyFormComponent,
    KioskScreenComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly delegateService = inject(DelegateService);
  protected readonly feedback = inject(FeedbackService);

  readonly activeTab = signal<ActiveTab>('scanner');
  readonly showConfigModal = signal(false);

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
