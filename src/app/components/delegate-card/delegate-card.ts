import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Delegate, CongressInfo, calculateAgeOnCongress, CONGRESS_DATE } from '../../models/delegate.model';

@Component({
  selector: 'app-delegate-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delegate-card.html',
  styleUrl: './delegate-card.css'
})
export class DelegateCardComponent {
  @Input({ required: true }) delegate!: Delegate;
  @Input() congressInfo!: CongressInfo;
  @Input() compact = false;

  @Output() toggleCheckIn = new EventEmitter<string>();
  @Output() printCard = new EventEmitter<Delegate>();
  @Output() scanNext = new EventEmitter<void>();

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

  onToggle(): void {
    this.toggleCheckIn.emit(this.delegate.mssv);
  }

  onPrint(): void {
    this.printCard.emit(this.delegate);
  }

  onScanNext(): void {
    this.scanNext.emit();
  }
}
