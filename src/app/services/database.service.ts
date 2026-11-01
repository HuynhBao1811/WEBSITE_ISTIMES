import { Injectable, signal, computed } from '@angular/core';
import { Delegate } from '../models/delegate.model';
import { INITIAL_100_DELEGATES } from './initial-delegates';

const DB_STORAGE_KEY = 'DOAN_KHOA_HTTT_DATABASE_V1';

export interface DatabaseStats {
  totalRecords: number;
  lastUpdated: string;
  storageSizeBytes: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly delegatesState = signal<Delegate[]>(this.loadFromStorage());
  private readonly lastUpdatedState = signal<string>(new Date().toISOString());

  readonly delegates = this.delegatesState.asReadonly();
  readonly lastUpdated = this.lastUpdatedState.asReadonly();

  readonly stats = computed<DatabaseStats>(() => {
    const list = this.delegates();
    const str = JSON.stringify(list);
    return {
      totalRecords: list.length,
      lastUpdated: this.lastUpdated(),
      storageSizeBytes: new Blob([str]).size
    };
  });

  private loadFromStorage(): Delegate[] {
    try {
      const data = localStorage.getItem(DB_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc database từ localStorage:', err);
    }
    return INITIAL_100_DELEGATES;
  }

  private persist(list: Delegate[]): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(list));
      this.lastUpdatedState.set(new Date().toISOString());
    } catch (err) {
      console.error('Lỗi ghi database vào localStorage:', err);
    }
  }

  getAll(): Delegate[] {
    return this.delegates();
  }

  getByMssv(mssv: string): Delegate | undefined {
    const clean = mssv.trim().toUpperCase();
    return this.delegates().find(d =>
      d.mssv.toUpperCase() === clean ||
      d.id.toUpperCase() === clean
    );
  }

  insert(delegateData: Omit<Delegate, 'id' | 'checkedIn'>): Delegate {
    const list = this.delegates();
    const cleanMssv = delegateData.mssv.trim().toUpperCase();

    // Check if exists, update instead of duplicating
    const existingIndex = list.findIndex(d => d.mssv.toUpperCase() === cleanMssv);
    if (existingIndex >= 0) {
      const updated: Delegate = {
        ...list[existingIndex],
        ...delegateData,
        mssv: cleanMssv
      };
      const next = [...list];
      next[existingIndex] = updated;
      this.delegatesState.set(next);
      this.persist(next);
      return updated;
    }

    const nextIdNum = list.length + 1;
    const newId = `ĐB-${String(nextIdNum).padStart(3, '0')}`;
    const newRecord: Delegate = {
      ...delegateData,
      id: newId,
      mssv: cleanMssv,
      checkedIn: false
    };

    const next = [...list, newRecord];
    this.delegatesState.set(next);
    this.persist(next);
    return newRecord;
  }

  update(updated: Delegate): void {
    const list = this.delegates();
    const next = list.map(d =>
      d.mssv.toUpperCase() === updated.mssv.toUpperCase() || d.id.toUpperCase() === updated.id.toUpperCase()
        ? updated
        : d
    );
    this.delegatesState.set(next);
    this.persist(next);
  }

  delete(mssvOrId: string): boolean {
    const clean = mssvOrId.trim().toUpperCase();
    const list = this.delegates();
    const filtered = list.filter(d =>
      d.mssv.toUpperCase() !== clean && d.id.toUpperCase() !== clean
    );
    if (filtered.length !== list.length) {
      this.delegatesState.set(filtered);
      this.persist(filtered);
      return true;
    }
    return false;
  }

  toggleCheckIn(mssv: string): Delegate | undefined {
    const clean = mssv.trim().toUpperCase();
    let updatedTarget: Delegate | undefined;
    const next = this.delegates().map(d => {
      if (d.mssv.toUpperCase() === clean || d.id.toUpperCase() === clean) {
        const willCheckIn = !d.checkedIn;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - 17/01/2027`;
        updatedTarget = {
          ...d,
          checkedIn: willCheckIn,
          checkInTime: willCheckIn ? timeStr : undefined
        };
        return updatedTarget;
      }
      return d;
    });

    if (updatedTarget) {
      this.delegatesState.set(next);
      this.persist(next);
    }
    return updatedTarget;
  }

  resetAllAttendance(): void {
    const next = this.delegates().map(d => ({
      ...d,
      checkedIn: false,
      checkInTime: undefined
    }));
    this.delegatesState.set(next);
    this.persist(next);
  }

  resetToDefaultDatabase(): void {
    localStorage.removeItem(DB_STORAGE_KEY);
    this.delegatesState.set(INITIAL_100_DELEGATES);
    this.persist(INITIAL_100_DELEGATES);
  }

  exportJson(): string {
    return JSON.stringify(this.delegates(), null, 2);
  }

  importJson(jsonString: string): { success: boolean; count?: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].mssv) {
        this.delegatesState.set(parsed);
        this.persist(parsed);
        return { success: true, count: parsed.length };
      }
      return { success: false, error: 'Định dạng dữ liệu không hợp lệ. Phải là mảng danh sách đại biểu.' };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Lỗi đọc tệp JSON.' };
    }
  }

  exportCsv(): string {
    const list = this.delegates();
    const headers = ['Mã ĐB', 'MSSV', 'Họ và tên', 'Chi đoàn', 'Giới tính', 'Ngày sinh', 'Chính trị', 'Dân tộc', 'Tôn giáo', 'Trình độ', 'LLCT', 'Điểm danh', 'Thời gian'];
    const rows = list.map(d => [
      `"${d.id}"`,
      `"${d.mssv}"`,
      `"${d.fullName}"`,
      `"${d.unit}"`,
      `"${d.gender}"`,
      `"${d.dob}"`,
      `"${d.isPartyMember === 1 ? 'Đảng viên' : 'Đoàn viên'}"`,
      `"${d.ethnicity}"`,
      `"${d.religion}"`,
      `"${d.academicLevel}"`,
      `"${d.politicalTheory}"`,
      `"${d.checkedIn ? 'Đã có mặt' : 'Chưa có mặt'}"`,
      `"${d.checkInTime || ''}"`
    ]);
    return '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  }
}
