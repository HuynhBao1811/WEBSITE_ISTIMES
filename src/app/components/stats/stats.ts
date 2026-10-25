import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from '../../services/delegate.service';
import { QrService } from '../../services/qr.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  Delegate,
  calculateAgeOnCongress,
  CONGRESS_DATE,
  EthnicityType,
  ReligionType,
  AcademicLevelType,
  PoliticalTheoryType
} from '../../models/delegate.model';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stats.html',
  styleUrl: './stats.css'
})
export class StatsComponent {
  protected readonly delegateService = inject(DelegateService);
  protected readonly qrService = inject(QrService);
  protected readonly feedback = inject(FeedbackService);

  protected readonly Math = Math;

  // Search & Filters
  readonly searchQuery = signal('');
  readonly selectedUnit = signal('ALL');
  readonly selectedStatus = signal<'ALL' | 'CHECKED' | 'ABSENT'>('ALL');
  readonly selectedParty = signal<'ALL' | 'PARTY' | 'DOAN'>('ALL');

  // Preview QR Modal
  readonly previewDelegate = signal<Delegate | null>(null);
  readonly previewQrUrl = signal<string | null>(null);

  // New Delegate Form Modal
  readonly showAddModal = signal(false);
  newMssv = '';
  newFullName = '';
  newUnit = 'Chi đoàn K22401';
  newDob = '2005-03-20';
  newGender: 'Nam' | 'Nữ' = 'Nam';
  newEthnicity: EthnicityType = 'Kinh';
  newReligion: ReligionType = 'Không';
  newIsPartyMember: 0 | 1 = 0;
  newAcademicLevel: AcademicLevelType = 'Đang học ĐH';
  newPoliticalTheory: PoliticalTheoryType = 'Hoàn thành các bài LLCT';
  newSeatNumber = 'Dãy E - Ghế 05';

  // Achievements flags (0/1) for new delegate
  newDoanVienTieuBieu = false;
  newCanBoTieuBieu = false;
  newThanhNienLamTheoLoiBac = false;
  newBtvThanhDoan = false;
  newBangKhenTWDoan = false;
  newNckhCapTruong = false;
  newDatGiaiHocThuat = false;
  newVanTheMy = false;
  newSv5TotCapTruong = false;
  newSv5TotCapDhqg = false;
  newSv5TotCapThanhPho = false;

  // Import Modal
  readonly showImportModal = signal(false);
  importRawText = '';

  // Filtered Delegates
  readonly filteredDelegates = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const unit = this.selectedUnit();
    const status = this.selectedStatus();
    const party = this.selectedParty();

    return this.delegateService.delegates().filter(d => {
      // Search match
      const matchSearch = !query ||
        d.fullName.toLowerCase().includes(query) ||
        d.mssv.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query) ||
        d.unit.toLowerCase().includes(query);

      // Unit match
      const matchUnit = unit === 'ALL' || d.unit === unit;

      // Status match
      const matchStatus = status === 'ALL' ||
        (status === 'CHECKED' && d.checkedIn) ||
        (status === 'ABSENT' && !d.checkedIn);

      // Party match
      const matchParty = party === 'ALL' ||
        (party === 'PARTY' && d.isPartyMember === 1) ||
        (party === 'DOAN' && d.isPartyMember === 0);

      return matchSearch && matchUnit && matchStatus && matchParty;
    });
  });

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

  onToggle(mssv: string): void {
    this.delegateService.toggleCheckIn(mssv);
    const updated = this.delegateService.getDelegateByMssv(mssv);
    if (updated?.checkedIn) {
      this.feedback.playSuccessSound();
      this.feedback.fireConfetti();
    }
  }

  async openQrModal(delegate: Delegate): Promise<void> {
    this.previewDelegate.set(delegate);
    const qrUrl = await this.qrService.generateQrDataUrl(delegate);
    this.previewQrUrl.set(qrUrl);
  }

  closeQrModal(): void {
    this.previewDelegate.set(null);
    this.previewQrUrl.set(null);
  }

  downloadQr(delegate: Delegate): void {
    if (this.previewQrUrl()) {
      this.qrService.downloadQrPng(this.previewQrUrl()!, `QR_${delegate.mssv}_${delegate.fullName}.png`);
    }
  }

  selectForVerification(delegate: Delegate): void {
    this.delegateService.setCurrentDelegate(delegate);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  submitAddDelegate(): void {
    if (!this.newFullName.trim() || !this.newMssv.trim()) return;

    this.delegateService.addDelegate({
      mssv: this.newMssv.trim().toUpperCase(),
      fullName: this.newFullName.trim(),
      unit: this.newUnit,
      dob: this.newDob,
      gender: this.newGender,
      ethnicity: this.newEthnicity,
      religion: this.newReligion,
      isPartyMember: this.newIsPartyMember,
      academicLevel: this.newAcademicLevel,
      politicalTheory: this.newPoliticalTheory,
      seatNumber: this.newSeatNumber,
      avatarUrl: this.newGender === 'Nam'
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      achievements: {
        isDoanVienTieuBieu: this.newDoanVienTieuBieu ? 1 : 0,
        isCanBoTieuBieu: this.newCanBoTieuBieu ? 1 : 0,
        isThanhNienLamTheoLoiBac: this.newThanhNienLamTheoLoiBac ? 1 : 0,
        isBtvThanhDoan: this.newBtvThanhDoan ? 1 : 0,
        isBangKhenTWDoan: this.newBangKhenTWDoan ? 1 : 0,
        isNckhCapTruong: this.newNckhCapTruong ? 1 : 0,
        isDatGiaiHocThuat: this.newDatGiaiHocThuat ? 1 : 0,
        isVanTheMy: this.newVanTheMy ? 1 : 0,
        isSv5TotCapTruong: this.newSv5TotCapTruong ? 1 : 0,
        isSv5TotCapDhqg: this.newSv5TotCapDhqg ? 1 : 0,
        isSv5TotCapThanhPho: this.newSv5TotCapThanhPho ? 1 : 0
      }
    });

    this.feedback.playSuccessSound();
    this.feedback.fireConfetti();
    this.closeAddModal();
    this.newFullName = '';
    this.newMssv = '';
  }

  resetAllCheckIns(): void {
    if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ điểm danh về trạng thái Chưa điểm danh?')) {
      this.delegateService.resetAllCheckIns();
    }
  }

  resetToDefaults(): void {
    if (confirm('Khôi phục danh sách chuẩn 100 đại biểu mẫu ban đầu?')) {
      this.delegateService.resetToDefaults();
      this.feedback.playSuccessSound();
      alert('Đã khôi phục thành công danh sách 100 đại biểu mẫu!');
    }
  }

  exportJson(): void {
    const list = this.delegateService.delegates();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(list, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `database_100_dai_bieu_${new Date().toISOString().slice(0, 10)}.json`);
    downloadAnchor.click();
  }

  onJsonFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.delegateService.importDelegates(parsed);
          this.feedback.playSuccessSound();
          alert(`Đã khôi phục thành công database với ${parsed.length} đại biểu!`);
        } else {
          alert('File JSON không hợp lệ hoặc danh sách rỗng.');
        }
      } catch {
        alert('Lỗi đọc file JSON: Định dạng không đúng cấu trúc database đại biểu.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  exportCsv(): void {
    const list = this.delegateService.delegates();
    const headers = [
      'STT',
      'MSSV',
      'Họ và Tên',
      'Chi đoàn',
      'Ngày sinh',
      'Tuổi (tại 17/01/2027)',
      'Giới tính',
      'Đảng viên (0/1)',
      'Dân tộc',
      'Tôn giáo',
      'Trình độ chuyên môn',
      'Lý luận chính trị',
      'Đoàn viên tiêu biểu (0/1)',
      'Cán bộ Đoàn - Hội tiêu biểu (0/1)',
      'Thanh niên KT-Luật làm theo lời Bác (0/1)',
      'BTV Thành Đoàn (0/1)',
      'Bằng khen TW Đoàn (0/1)',
      'NCKH cấp Trường (0/1)',
      'Đạt giải học thuật (0/1)',
      'Văn thể mỹ (0/1)',
      'SV5T cấp Trường (0/1)',
      'SV5T cấp ĐHQG (0/1)',
      'SV5T cấp Thành phố (0/1)',
      'Vị trí ghế',
      'Trạng thái điểm danh',
      'Thời gian điểm danh'
    ];

    const rows = list.map(d => [
      `"${d.id}"`,
      `"${d.mssv}"`,
      `"${d.fullName}"`,
      `"${d.unit}"`,
      `"${d.dob}"`,
      `"${calculateAgeOnCongress(d.dob, CONGRESS_DATE)}"`,
      `"${d.gender}"`,
      `"${d.isPartyMember}"`,
      `"${d.ethnicity}"`,
      `"${d.religion}"`,
      `"${d.academicLevel}"`,
      `"${d.politicalTheory}"`,
      `"${d.achievements?.isDoanVienTieuBieu || 0}"`,
      `"${d.achievements?.isCanBoTieuBieu || 0}"`,
      `"${d.achievements?.isThanhNienLamTheoLoiBac || 0}"`,
      `"${d.achievements?.isBtvThanhDoan || 0}"`,
      `"${d.achievements?.isBangKhenTWDoan || 0}"`,
      `"${d.achievements?.isNckhCapTruong || 0}"`,
      `"${d.achievements?.isDatGiaiHocThuat || 0}"`,
      `"${d.achievements?.isVanTheMy || 0}"`,
      `"${d.achievements?.isSv5TotCapTruong || 0}"`,
      `"${d.achievements?.isSv5TotCapDhqg || 0}"`,
      `"${d.achievements?.isSv5TotCapThanhPho || 0}"`,
      `"${d.seatNumber || ''}"`,
      `"${d.checkedIn ? 'Đã điểm danh' : 'Chưa đến'}"`,
      `"${d.checkInTime || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_100_dai_bieu_dai_hoi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }
}
