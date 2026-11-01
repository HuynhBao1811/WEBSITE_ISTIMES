import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from '../../services/delegate.service';
import { QrService } from '../../services/qr.service';
import { Delegate } from '../../models/delegate.model';

@Component({
  selector: 'app-delegate-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delegate-lookup.html',
  styleUrl: './delegate-lookup.css'
})
export class DelegateLookupComponent {
  protected readonly delegateService = inject(DelegateService);
  protected readonly qrService = inject(QrService);

  searchQuery = '';
  hasSearched = signal(false);
  foundDelegate = signal<Delegate | null>(null);
  qrUrl = signal<string | null>(null);

  constructor() {
    // Show a sample delegate by default so the page looks gorgeous and populated immediately
    const sample = this.delegateService.getDelegateByMssv('K244118888') || this.delegateService.delegates()[0];
    if (sample) {
      this.foundDelegate.set(sample);
      this.hasSearched.set(true);
      this.qrService.generateSimpleQr(sample.mssv).then((url: string) => this.qrUrl.set(url));
    }
  }

  async onSearch(): Promise<void> {
    const q = this.searchQuery.trim();
    this.hasSearched.set(true);

    if (!q) {
      this.foundDelegate.set(null);
      this.qrUrl.set(null);
      return;
    }

    const d = this.delegateService.getDelegateByMssv(q);
    if (d) {
      this.foundDelegate.set(d);
      const url = await this.qrService.generateSimpleQr(d.mssv);
      this.qrUrl.set(url);
    } else {
      this.foundDelegate.set(null);
      this.qrUrl.set(null);
    }
  }

  quickSearch(mssv: string): void {
    this.searchQuery = mssv;
    this.onSearch();
  }

  downloadQr(): void {
    const qr = this.qrUrl();
    const d = this.foundDelegate();
    if (!qr || !d) return;

    const a = document.createElement('a');
    a.href = qr;
    a.download = `QR_DaiBieu_${d.mssv}.png`;
    a.click();
  }
}
