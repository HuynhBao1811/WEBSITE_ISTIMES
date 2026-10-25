import { Injectable, signal, computed } from '@angular/core';
import {
  Delegate,
  CongressInfo,
  CheckInResult,
  calculateAgeOnCongress,
  CONGRESS_DATE,
  CONGRESS_DATE_STR
} from '../models/delegate.model';
import { INITIAL_100_DELEGATES } from './initial-delegates';

const STORAGE_KEY = 'DOAN_KHOA_DELEGATES_V3_MSSV';

@Injectable({
  providedIn: 'root'
})
export class DelegateService {
  private readonly delegatesState = signal<Delegate[]>(this.loadInitialDelegates());

  readonly congressInfo = signal<CongressInfo>({
    title: 'ĐẠI HỘI ĐẠI BIỂU ĐOÀN TNCS HỒ CHÍ MINH',
    subTitle: 'PHIÊN TRỌNG THỂ - NHIỆM KỲ 2024 - 2027',
    term: 'Nhiệm kỳ 2024 - 2027',
    organization: 'ĐOÀN TNCS HỒ CHÍ MINH TRƯỜNG ĐẠI HỌC KINH TẾ - LUẬT',
    unitName: 'ĐOÀN KHOA KINH TẾ - LUẬT',
    location: 'Hội trường Lớn - A1 Trường ĐH Kinh tế - Luật ĐHQG-HCM',
    date: '17/01/2027',
    targetDate: CONGRESS_DATE_STR
  });

  // Public readonly signals
  readonly delegates = this.delegatesState.asReadonly();
  readonly currentScannedDelegate = signal<Delegate | null>(null);

  // General Attendance Statistics
  readonly totalDelegates = computed(() => this.delegates().length);
  readonly checkedInCount = computed(() => this.delegates().filter(d => d.checkedIn).length);
  readonly absentCount = computed(() => this.totalDelegates() - this.checkedInCount());
  readonly attendancePercentage = computed(() => {
    const total = this.totalDelegates();
    return total > 0 ? Math.round((this.checkedInCount() / total) * 100) : 0;
  });

  // Gender
  readonly maleCount = computed(() => this.delegates().filter(d => d.gender === 'Nam').length);
  readonly femaleCount = computed(() => this.delegates().filter(d => d.gender === 'Nữ').length);

  // Age Statistics computed on Congress Date: 17/01/2027
  readonly ageStats = computed(() => {
    const list = this.delegates();
    if (list.length === 0) {
      return { averageAge: 0, minAge: 0, maxAge: 0, youngest: null, oldest: null };
    }

    let minAge = 999;
    let maxAge = -1;
    let youngest: Delegate | null = null;
    let oldest: Delegate | null = null;
    let totalAge = 0;

    for (const d of list) {
      const age = calculateAgeOnCongress(d.dob, CONGRESS_DATE);
      totalAge += age;

      if (age < minAge) {
        minAge = age;
        youngest = d;
      }
      if (age > maxAge) {
        maxAge = age;
        oldest = d;
      }
    }

    const averageAge = Number((totalAge / list.length).toFixed(1));
    return { averageAge, minAge, maxAge, youngest, oldest };
  });

  // Party members vs Youth Union members
  // "nếu là Đảng viên (1) thì sẽ là Đoàn viên luôn, còn nếu ko phải Đảng viên (0) thì vẫn là Đoàn viên"
  readonly partyMembersCount = computed(() =>
    this.delegates().filter(d => d.isPartyMember === 1).length
  );
  readonly totalYouthUnionCount = computed(() => this.delegates().length); // 100% là Đoàn viên

  // Ethnicity distribution
  readonly ethnicityStats = computed(() => {
    const list = this.delegates();
    return {
      kinh: list.filter(d => d.ethnicity === 'Kinh').length,
      hoa: list.filter(d => d.ethnicity === 'Hoa').length,
      cham: list.filter(d => d.ethnicity === 'Chăm').length,
      khac: list.filter(d => d.ethnicity === 'Khác').length,
    };
  });

  // Religion distribution
  readonly religionStats = computed(() => {
    const list = this.delegates();
    return {
      khong: list.filter(d => d.religion === 'Không').length,
      phatGiao: list.filter(d => d.religion === 'Phật giáo').length,
      congGiao: list.filter(d => d.religion === 'Công giáo').length,
      tinLanh: list.filter(d => d.religion === 'Tin lành').length,
      hoaHao: list.filter(d => d.religion === 'Hòa Hảo').length,
      khac: list.filter(d => d.religion === 'Khác').length,
    };
  });

  // Academic level
  readonly academicStats = computed(() => {
    const list = this.delegates();
    return {
      tienSi: list.filter(d => d.academicLevel === 'Tiến sĩ').length,
      thacSi: list.filter(d => d.academicLevel === 'Thạc sĩ').length,
      dangHocDh: list.filter(d => d.academicLevel === 'Đang học ĐH').length,
    };
  });

  // Political Theory
  readonly politicalTheoryStats = computed(() => {
    const list = this.delegates();
    return {
      caoCap: list.filter(d => d.politicalTheory === 'Cao cấp').length,
      trungCap: list.filter(d => d.politicalTheory === 'Trung cấp').length,
      soCap: list.filter(d => d.politicalTheory === 'Sơ cấp').length,
      hoanThanhLlct: list.filter(d => d.politicalTheory === 'Hoàn thành các bài LLCT').length,
    };
  });

  // Achievements: Sum up each 0/1 field
  readonly achievementsStats = computed(() => {
    const list = this.delegates();
    return {
      // Công tác Đoàn - Hội
      doanVienTieuBieu: list.reduce((acc, d) => acc + (d.achievements?.isDoanVienTieuBieu || 0), 0),
      canBoTieuBieu: list.reduce((acc, d) => acc + (d.achievements?.isCanBoTieuBieu || 0), 0),
      thanhNienLamTheoLoiBac: list.reduce((acc, d) => acc + (d.achievements?.isThanhNienLamTheoLoiBac || 0), 0),
      btvThanhDoan: list.reduce((acc, d) => acc + (d.achievements?.isBtvThanhDoan || 0), 0),
      bangKhenTWDoan: list.reduce((acc, d) => acc + (d.achievements?.isBangKhenTWDoan || 0), 0),

      // Học tập & NCKH
      nckhCapTruong: list.reduce((acc, d) => acc + (d.achievements?.isNckhCapTruong || 0), 0),
      datGiaiHocThuat: list.reduce((acc, d) => acc + (d.achievements?.isDatGiaiHocThuat || 0), 0),

      // Văn thể mỹ
      vanTheMy: list.reduce((acc, d) => acc + (d.achievements?.isVanTheMy || 0), 0),

      // Sinh viên 5 tốt
      sv5TotCapTruong: list.reduce((acc, d) => acc + (d.achievements?.isSv5TotCapTruong || 0), 0),
      sv5TotCapDhqg: list.reduce((acc, d) => acc + (d.achievements?.isSv5TotCapDhqg || 0), 0),
      sv5TotCapThanhPho: list.reduce((acc, d) => acc + (d.achievements?.isSv5TotCapThanhPho || 0), 0),
    };
  });

  // Chi đoàn units
  readonly unitsList = computed(() => {
    const units = new Set<string>();
    this.delegates().forEach(d => units.add(d.unit));
    return Array.from(units).sort();
  });

  private loadInitialDelegates(): Delegate[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_100_DELEGATES;
  }

  private saveToStorage(list: Delegate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // storage unavailable
    }
  }

  // Lookup primarily by MSSV or secondarily by ID / Name
  getDelegateByMssv(mssv: string): Delegate | undefined {
    const clean = mssv.trim().toUpperCase();
    return this.delegates().find(d =>
      d.mssv.toUpperCase() === clean ||
      d.id.toUpperCase() === clean
    );
  }

  getDelegateById(id: string): Delegate | undefined {
    return this.getDelegateByMssv(id);
  }

  // Parses raw QR code string scanned from delegate's card.
  // Supports:
  // 1. Direct MSSV: 'K224111001'
  // 2. Prefixed MSSV: 'MSSV:K224111001'
  // 3. JSON: '{"mssv":"K224111001", ...}'
  // 4. URL format: 'https://.../?mssv=K224111001'
  // 5. Delegate ID: 'ĐB-001'
  parseQrCode(rawCode: string): CheckInResult {
    if (!rawCode || !rawCode.trim()) {
      return { success: false, message: 'Mã QR rỗng hoặc không quét được dữ liệu.' };
    }

    const trimmed = rawCode.trim();
    let queryMssv = '';

    // Check JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        queryMssv = obj.mssv || obj.MSSV || obj.id || obj.code || '';
      } catch {
        // invalid json
      }
    }

    if (!queryMssv) {
      if (trimmed.toUpperCase().startsWith('MSSV:')) {
        queryMssv = trimmed.substring(5).trim();
      } else if (trimmed.includes('mssv=')) {
        const match = trimmed.match(/[?&]mssv=([^&#]+)/i);
        if (match) queryMssv = decodeURIComponent(match[1]);
      } else if (trimmed.includes('id=')) {
        const match = trimmed.match(/[?&]id=([^&#]+)/i);
        if (match) queryMssv = decodeURIComponent(match[1]);
      } else {
        queryMssv = trimmed;
      }
    }

    const delegate = this.getDelegateByMssv(queryMssv);
    if (!delegate) {
      return {
        success: false,
        message: `Không tìm thấy đại biểu có MSSV/Mã "${queryMssv}" trong danh sách triệu tập 100 đại biểu của Đại hội!`
      };
    }

    const alreadyChecked = delegate.checkedIn;
    const updated = this.checkInDelegate(delegate.mssv);
    this.currentScannedDelegate.set(updated);

    return {
      success: true,
      delegate: updated,
      alreadyCheckedIn: alreadyChecked,
      message: alreadyChecked
        ? `ĐỒNG CHÍ ĐÃ ĐIỂM DANH: ${updated.fullName} (MSSV: ${updated.mssv}) lúc ${updated.checkInTime}.`
        : `XÁC THỰC THÀNH CÔNG! Chào mừng đồng chí ${updated.fullName} - MSSV: ${updated.mssv}.`
    };
  }

  checkInDelegate(mssvOrId: string): Delegate {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - 17/01/2027`;

    let updatedDelegate: Delegate | null = null;
    this.delegatesState.update(list => {
      const next = list.map(d => {
        if (d.mssv.toUpperCase() === mssvOrId.toUpperCase() || d.id.toUpperCase() === mssvOrId.toUpperCase()) {
          updatedDelegate = {
            ...d,
            checkedIn: true,
            checkInTime: d.checkInTime || timeStr
          };
          return updatedDelegate;
        }
        return d;
      });
      this.saveToStorage(next);
      return next;
    });

    return updatedDelegate || this.getDelegateByMssv(mssvOrId)!;
  }

  toggleCheckIn(mssvOrId: string): void {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - 17/01/2027`;

    this.delegatesState.update(list => {
      const next = list.map(d => {
        if (d.mssv.toUpperCase() === mssvOrId.toUpperCase() || d.id.toUpperCase() === mssvOrId.toUpperCase()) {
          const newChecked = !d.checkedIn;
          const updated = {
            ...d,
            checkedIn: newChecked,
            checkInTime: newChecked ? timeStr : undefined
          };
          if (this.currentScannedDelegate()?.mssv === d.mssv) {
            this.currentScannedDelegate.set(updated);
          }
          return updated;
        }
        return d;
      });
      this.saveToStorage(next);
      return next;
    });
  }

  setCurrentDelegate(delegate: Delegate | null): void {
    this.currentScannedDelegate.set(delegate);
  }

  addDelegate(newDelegate: Omit<Delegate, 'id' | 'checkedIn'>): Delegate {
    const nextNum = this.delegates().length + 1;
    const id = `ĐB-${String(nextNum).padStart(3, '0')}`;
    const fullDelegate: Delegate = {
      ...newDelegate,
      id,
      checkedIn: false
    };

    this.delegatesState.update(list => {
      const next = [...list, fullDelegate];
      this.saveToStorage(next);
      return next;
    });

    return fullDelegate;
  }

  updateDelegate(updated: Delegate): void {
    this.delegatesState.update(list => {
      const next = list.map(d => (d.mssv.toUpperCase() === updated.mssv.toUpperCase() || d.id === updated.id) ? updated : d);
      this.saveToStorage(next);
      return next;
    });
    if (this.currentScannedDelegate()?.mssv === updated.mssv) {
      this.currentScannedDelegate.set(updated);
    }
  }

  importDelegates(importedList: Delegate[]): void {
    this.delegatesState.set(importedList);
    this.saveToStorage(importedList);
    this.currentScannedDelegate.set(null);
  }

  resetAllCheckIns(): void {
    this.delegatesState.update(list => {
      const next = list.map(d => ({ ...d, checkedIn: false, checkInTime: undefined }));
      this.saveToStorage(next);
      return next;
    });
    if (this.currentScannedDelegate()) {
      const curr = this.currentScannedDelegate();
      if (curr) {
        this.currentScannedDelegate.set({ ...curr, checkedIn: false, checkInTime: undefined });
      }
    }
  }

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.delegatesState.set(INITIAL_100_DELEGATES);
    this.currentScannedDelegate.set(null);
  }

  updateCongressInfo(info: Partial<CongressInfo>): void {
    this.congressInfo.update(curr => ({ ...curr, ...info }));
  }
}
