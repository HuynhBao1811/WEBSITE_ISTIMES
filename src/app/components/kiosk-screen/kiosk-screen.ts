import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DelegateService } from '../../services/delegate.service';
import { FeedbackService } from '../../services/feedback.service';
import { calculateAgeOnCongress, CONGRESS_DATE } from '../../models/delegate.model';

@Component({
  selector: 'app-kiosk-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kiosk-screen.html',
  styleUrl: './kiosk-screen.css'
})
export class KioskScreenComponent {
  protected readonly delegateService = inject(DelegateService);
  protected readonly feedback = inject(FeedbackService);

  calculateAge(dob: string): number {
    return calculateAgeOnCongress(dob, CONGRESS_DATE);
  }

  formatDob(dob: string): string {
    if (!dob) return '';
    if (dob.includes('-')) {
      const parts = dob.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dob;
  }

  triggerCelebration(): void {
    this.feedback.playSuccessSound();
    this.feedback.fireGrandConfetti();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
}
