import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from '../../services/delegate.service';
import { AuthService } from '../../services/auth.service';
import { FeedbackService } from '../../services/feedback.service';
import { QrService } from '../../services/qr.service';
import { Delegate } from '../../models/delegate.model';
import { StatsComponent } from '../stats/stats';
import { ScannerComponent } from '../scanner/scanner';
import { SurveyFormComponent } from '../survey-form/survey-form';
import { BadgeGeneratorComponent } from '../badge-generator/badge-generator';
import { KioskScreenComponent } from '../kiosk-screen/kiosk-screen';

export type AdminWorkspaceTab =
  | 'overview'
  | 'delegates'
  | 'criteria'
  | 'scanner'
  | 'survey'
  | 'badges'
  | 'kiosk';

export interface OverviewDelegateItem {
  delegate: Delegate;
  code: string;
  fullName: string;
  unit: string;
  status: 'Đủ điều kiện' | 'Chờ đối chiếu' | 'Cần bổ sung';
  statusClass: 'status-qualified' | 'status-pending' | 'status-update';
}

@Component({
  selector: 'app-admin-console',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatsComponent,
    ScannerComponent,
    SurveyFormComponent,
    BadgeGeneratorComponent,
    KioskScreenComponent
  ],
  templateUrl: './admin-console.html',
  styleUrl: './admin-console.css'
})
export class AdminConsoleComponent {
  protected readonly delegateService = inject(DelegateService);
  protected readonly auth = inject(AuthService);
  protected readonly feedback = inject(FeedbackService);
  protected readonly qrService = inject(QrService);

  // Events emitted to parent App component
  readonly switchToPortal = output<void>();
  readonly openConfig = output<void>();
  readonly logoutRequested = output<void>();

  // Active Admin Workspace Tab
  readonly activeTab = signal<AdminWorkspaceTab>('overview');

  // Academic Year / Term selector
  readonly selectedYear = signal('NĂM HỌC 2026-2027');

  // Overview Table Search & Filter
  readonly overviewSearch = signal('');
  readonly overviewStatusFilter = signal<'ALL' | 'QUALIFIED' | 'PENDING' | 'NEED_UPDATE'>('ALL');

  // Selected Delegate Modal
  readonly selectedDelegate = signal<Delegate | null>(null);
  readonly selectedQrDataUrl = signal<string | null>(null);

  // Computed statistics from real database
  readonly totalRecords = computed(() => this.delegateService.totalDelegates());

  readonly qualifiedCount = computed(() => this.delegateService.checkedInCount());

  readonly needUpdateCount = computed(() => {
    const list = this.delegateService.delegates();
    return list.filter(d => !d.dob || !d.unit || !d.achievements).length;
  });

  readonly pendingCount = computed(() => {
    const total = this.totalRecords();
    const qualified = this.qualifiedCount();
    const needUpdate = this.needUpdateCount();
    const p = total - qualified - needUpdate;
    return Math.max(0, p);
  });

  // Overview Delegate List for Table
  readonly overviewDelegates = computed<OverviewDelegateItem[]>(() => {
    const list = this.delegateService.delegates();
    const query = this.overviewSearch().trim().toLowerCase();
    const filter = this.overviewStatusFilter();

    const items: OverviewDelegateItem[] = list.map((d, index) => {
      let status: 'Đủ điều kiện' | 'Chờ đối chiếu' | 'Cần bổ sung' = 'Chờ đối chiếu';
      let statusClass: 'status-qualified' | 'status-pending' | 'status-update' = 'status-pending';

      if (d.checkedIn) {
        status = 'Đủ điều kiện';
        statusClass = 'status-qualified';
      } else if (!d.dob || !d.unit) {
        status = 'Cần bổ sung';
        statusClass = 'status-update';
      } else {
        status = 'Chờ đối chiếu';
        statusClass = 'status-pending';
      }

      const formattedCode = `SV2026${String(index + 1).padStart(3, '0')}`;

      return {
        delegate: d,
        code: formattedCode,
        fullName: d.fullName,
        unit: d.unit || 'Chi đoàn HTTT',
        status,
        statusClass
      };
    });

    return items.filter(item => {
      // Status filter
      if (filter === 'QUALIFIED' && item.status !== 'Đủ điều kiện') return false;
      if (filter === 'PENDING' && item.status !== 'Chờ đối chiếu') return false;
      if (filter === 'NEED_UPDATE' && item.status !== 'Cần bổ sung') return false;

      // Search filter
      if (!query) return true;
      return (
        item.fullName.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.delegate.mssv.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query)
      );
    });
  });

  // Switch workspace tab
  setTab(tab: AdminWorkspaceTab): void {
    this.activeTab.set(tab);
    this.feedback.playBeepSound();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Open modal detail for a delegate
  async viewDelegateDetail(d: Delegate): Promise<void> {
    this.selectedDelegate.set(d);
    try {
      const qr = await this.qrService.generateQrDataUrl(d);
      this.selectedQrDataUrl.set(qr);
    } catch {
      this.selectedQrDataUrl.set(null);
    }
  }

  closeDelegateDetail(): void {
    this.selectedDelegate.set(null);
    this.selectedQrDataUrl.set(null);
  }

  // Toggle CheckIn from Modal
  async toggleAttendance(d: Delegate): Promise<void> {
    await this.delegateService.toggleCheckIn(d.mssv);
    this.feedback.playSuccessSound();
  }

  // Export CSV sample / data
  exportCsvData(): void {
    const list = this.delegateService.delegates();
    const rows = [
      ['STT', 'MSSV', 'HoVaTen', 'ChiDoan', 'NgaySinh', 'GioiTinh', 'DangVien', 'TrangThaiDiemDanh']
    ];

    list.forEach((d, i) => {
      rows.push([
        String(i + 1),
        d.mssv,
        `"${d.fullName}"`,
        `"${d.unit}"`,
        d.dob || '',
        d.gender || '',
        d.isPartyMember ? '1' : '0',
        d.checkedIn ? 'Đã điểm danh' : 'Chưa điểm danh'
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_dai_bieu_istimes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.feedback.playSuccessSound();
  }
}
