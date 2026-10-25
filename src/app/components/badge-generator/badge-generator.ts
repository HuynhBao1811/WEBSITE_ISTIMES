import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from '../../services/delegate.service';
import { QrService } from '../../services/qr.service';
import { Delegate, calculateAgeOnCongress, CONGRESS_DATE } from '../../models/delegate.model';

@Component({
  selector: 'app-badge-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './badge-generator.html',
  styleUrl: './badge-generator.css'
})
export class BadgeGeneratorComponent implements OnInit {
  protected readonly delegateService = inject(DelegateService);
  protected readonly qrService = inject(QrService);

  readonly selectedMssv = signal<string>('');
  readonly currentQrUrl = signal<string>('');
  readonly printAllMode = signal<boolean>(false);
  readonly allBadges = signal<Array<{ delegate: Delegate; qrUrl: string }>>([]);

  ngOnInit(): void {
    const list = this.delegateService.delegates();
    if (list.length > 0) {
      this.selectedMssv.set(list[0].mssv);
      this.loadBadgeQr();
    }
  }

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

  async onSelectDelegate(mssv: string): Promise<void> {
    this.selectedMssv.set(mssv);
    await this.loadBadgeQr();
  }

  async loadBadgeQr(): Promise<void> {
    const delegate = this.delegateService.getDelegateByMssv(this.selectedMssv());
    if (delegate) {
      const url = await this.qrService.generateQrDataUrl(delegate);
      this.currentQrUrl.set(url);
    }
  }

  async prepareAllBadges(): Promise<void> {
    const list = this.delegateService.delegates();
    const badges: Array<{ delegate: Delegate; qrUrl: string }> = [];

    for (const d of list) {
      const qrUrl = await this.qrService.generateQrDataUrl(d);
      badges.push({ delegate: d, qrUrl });
    }

    this.allBadges.set(badges);
    this.printAllMode.set(true);
  }

  getSelectedDelegate(): Delegate | undefined {
    return this.delegateService.getDelegateByMssv(this.selectedMssv());
  }

  downloadCurrentQr(): void {
    const delegate = this.getSelectedDelegate();
    if (delegate && this.currentQrUrl()) {
      this.qrService.downloadQrPng(this.currentQrUrl(), `QR_${delegate.mssv}_${delegate.fullName}.png`);
    }
  }

  printBadge(): void {
    window.print();
  }
}
