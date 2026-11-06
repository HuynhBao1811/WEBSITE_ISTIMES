import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from '../../services/delegate.service';
import { DatabaseService } from '../../services/database.service';
import { QrService } from '../../services/qr.service';
import { FeedbackService } from '../../services/feedback.service';
import { AuthService, authHeaders } from '../../services/auth.service';
import { getApiBase } from '../../services/api-config';

interface AdminEntry {
  email: string;
  builtIn: boolean;
  grantedBy?: string;
}
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
  protected readonly auth = inject(AuthService);
  readonly deleteTarget = signal<Delegate | null>(null);
  readonly deleting = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly showAdmins = signal(false);
  readonly admins = signal<AdminEntry[]>([]);
  readonly loadingAdmins = signal(false);
  readonly grantingAdmin = signal(false);
  readonly adminError = signal<string | null>(null);
  readonly adminSuccess = signal<string | null>(null);
  newAdminEmail = '';

  requestDelete(delegate: Delegate): void {
    if (!this.auth.isAdmin() || this.deleting()) return;
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.deleteTarget.set(delegate);
  }

  cancelDelete(): void {
    if (!this.deleting()) this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target || !this.auth.isAdmin() || this.deleting()) return;
    this.deleting.set(true);
    this.actionError.set(null);
    try {
      await this.db.delete(target.mssv);
      if (this.previewDelegate()?.mssv === target.mssv) this.closePreview();
      if (this.delegateService.currentScannedDelegate()?.mssv === target.mssv) {
        this.delegateService.currentScannedDelegate.set(null);
      }
      this.deleteTarget.set(null);
      this.actionSuccess.set(`Đã xóa đại biểu ${target.fullName} (${target.mssv}).`);
      this.feedback.playSuccessSound();
    } catch (err) {
      this.actionError.set(err instanceof Error ? err.message : 'Không thể xóa đại biểu.');
    } finally { this.deleting.set(false); }
  }

  async openAdminManagement(): Promise<void> {
    if (!this.auth.isAdmin()) return;
    this.showAdmins.set(true);
    this.adminError.set(null);
    this.adminSuccess.set(null);
    await this.loadAdmins();
  }

  private async loadAdmins(): Promise<void> {
    this.loadingAdmins.set(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/admins`, { headers: authHeaders(), signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách quản trị viên.');
      this.admins.set(data.admins);
    } catch (err) {
      this.adminError.set(err instanceof Error ? err.message : 'Không thể tải danh sách quản trị viên.');
    } finally { this.loadingAdmins.set(false); }
  }

  async addAdmin(): Promise<void> {
    if (!this.auth.isAdmin() || this.grantingAdmin()) return;
    const email = this.newAdminEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      this.adminError.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    this.adminError.set(null);
    this.adminSuccess.set(null);
    this.grantingAdmin.set(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/admins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ email }), signal: AbortSignal.timeout(15000)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể cấp quyền quản trị viên.');
      this.adminSuccess.set(data.message);
      this.newAdminEmail = '';
      await this.loadAdmins();
    } catch (err) {
      this.adminError.set(err instanceof Error ? err.message : 'Không thể cấp quyền quản trị viên.');
    } finally { this.grantingAdmin.set(false); }
  }
  protected readonly delegateService = inject(DelegateService);
  protected readonly db = inject(DatabaseService);
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

  // Achievements flags for new delegate
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

  readonly filteredDelegates = computed(() => {
    const list = this.delegateService.delegates();
    const q = this.searchQuery().trim().toUpperCase();
    const unit = this.selectedUnit();
    const status = this.selectedStatus();
    const party = this.selectedParty();

    return list.filter(d => {
      // Search text (MSSV, name, id)
      if (q) {
        const matchMssv = d.mssv.toUpperCase().includes(q);
        const matchName = d.fullName.toUpperCase().includes(q);
        const matchId = d.id.toUpperCase().includes(q);
        if (!matchMssv && !matchName && !matchId) return false;
      }

      // Filter Unit
      if (unit !== 'ALL' && d.unit !== unit) return false;

      // Filter Check-in
      if (status === 'CHECKED' && !d.checkedIn) return false;
      if (status === 'ABSENT' && d.checkedIn) return false;

      // Filter Party
      if (party === 'PARTY' && d.isPartyMember !== 1) return false;
      if (party === 'DOAN' && d.isPartyMember === 1) return false;

      return true;
    });
  });

  readonly availableUnits = computed(() => {
    const set = new Set<string>();
    for (const d of this.delegateService.delegates()) {
      set.add(d.unit);
    }
    return Array.from(set).sort();
  });

  formatDob(dob: string): string {
    if (!dob) return '';
    const parts = dob.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dob;
  }

  getAge(dob: string): number {
    return calculateAgeOnCongress(dob, CONGRESS_DATE);
  }

  toggleCheckIn(delegate: Delegate): void {
    this.delegateService.toggleCheckIn(delegate.mssv);
    this.feedback.playBeepSound();
  }

  async selectForVerification(delegate: Delegate): Promise<void> {
    this.previewDelegate.set(delegate);
    const qrUrl = await this.qrService.generateQrDataUrl(delegate);
    this.previewQrUrl.set(qrUrl);
  }

  closePreview(): void {
    this.previewDelegate.set(null);
    this.previewQrUrl.set(null);
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  saveNewDelegate(): void {
    if (!this.newMssv.trim() || !this.newFullName.trim()) {
      alert('Vui lòng nhập đầy đủ MSSV và Họ tên!');
      return;
    }

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
    this.closeAddModal();
  }

  resetAllAttendance(): void {
    if (confirm('Đồng chí có chắc chắn muốn đặt lại toàn bộ trạng thái điểm danh về CHƯA ĐIỂM DANH không?')) {
      this.delegateService.resetAllCheckIns();
      this.feedback.playSuccessSound();
    }
  }

  resetToDefaultDatabase(): void {
    if (confirm('Đồng chí có chắc chắn muốn khôi phục CSDL về 100 đại biểu mặc định ban đầu không?')) {
      this.delegateService.resetToDefaults();
      this.feedback.playSuccessSound();
      alert('Đã khôi phục CSDL thành công!');
    }
  }

  exportJsonDatabase(): void {
    const json = this.db.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CSDL_DoanVien_HTTT_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  }

  onImportJsonFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await this.db.importJson(reader.result as string);
      if (res.success) {
        this.feedback.playSuccessSound();
        alert(`Nhập thành công ${res.count} đại biểu vào cơ sở dữ liệu!`);
      } else {
        alert(`Lỗi nhập CSDL: ${res.error}`);
      }
    };
    reader.readAsText(file);
  }

  exportJson(): void {
    this.exportJsonDatabase();
  }

  onJsonFileSelected(event: Event): void {
    this.onImportJsonFile(event);
  }

  resetToDefaults(): void {
    this.resetToDefaultDatabase();
  }

  resetAllCheckIns(): void {
    this.resetAllAttendance();
  }

  calculateAge(dob: string): number {
    return this.getAge(dob);
  }

  onToggle(mssv: string): void {
    this.delegateService.toggleCheckIn(mssv);
  }

  openQrModal(d: Delegate): void {
    this.selectForVerification(d);
  }

  closeQrModal(): void {
    this.closePreview();
  }

  async downloadQr(d: Delegate): Promise<void> {
    const url = await this.qrService.generateQrDataUrl(d);
    this.qrService.downloadQrPng(url, `QR_${d.mssv}.png`);
  }

  submitAddDelegate(): void {
    this.saveNewDelegate();
  }

  exportCsv(): void {
    const list = this.delegateService.delegates();
    const headers = [
      'Mã Đại Biểu',
      'MSSV',
      'Họ và Tên',
      'Chi đoàn',
      'Ngày sinh',
      'Tuổi (tại 17/01/2027)',
      'Giới tính',
      'Tư cách chính trị',
      'Dân tộc',
      'Tôn giáo',
      'Trình độ chuyên môn',
      'Lý luận chính trị',
      'Đoàn viên tiêu biểu',
      'Cán bộ Đoàn - Hội tiêu biểu',
      'Thanh niên làm theo lời Bác',
      'Cán bộ Thành Đoàn',
      'Bằng khen TW Đoàn',
      'NCKH cấp Trường',
      'Đạt giải học thuật',
      'Văn thể mỹ',
      'SV5T cấp Trường',
      'SV5T cấp ĐHQG',
      'SV5T cấp Thành phố',
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
      `"${d.isPartyMember === 1 ? 'Đảng viên' : 'Đoàn viên'}"`,
      `"${d.ethnicity}"`,
      `"${d.religion}"`,
      `"${d.academicLevel}"`,
      `"${d.politicalTheory}"`,
      `"${d.achievements?.isDoanVienTieuBieu ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isCanBoTieuBieu ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isThanhNienLamTheoLoiBac ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isBtvThanhDoan ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isBangKhenTWDoan ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isNckhCapTruong ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isDatGiaiHocThuat ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isVanTheMy ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isSv5TotCapTruong ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isSv5TotCapDhqg ? 'Đạt' : 'Không'}"`,
      `"${d.achievements?.isSv5TotCapThanhPho ? 'Đạt' : 'Không'}"`,
      `"${d.seatNumber || ''}"`,
      `"${d.checkedIn ? 'Đã điểm danh' : 'Chưa đến'}"`,
      `"${d.checkInTime || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_dai_bieu_HTTT_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }
}
