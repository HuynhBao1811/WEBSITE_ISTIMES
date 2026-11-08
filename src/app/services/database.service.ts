import { Injectable, signal, computed } from '@angular/core';
import { authHeaders } from './auth.service';
import { Delegate } from '../models/delegate.model';
import { getApiBase, detectActiveBackend } from './api-config';
import { INITIAL_100_DELEGATES } from './initial-delegates';

export interface DatabaseStats {
  totalRecords: number;
  lastUpdated: string;
  storageSizeBytes: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private readonly delegatesState = signal<Delegate[]>(INITIAL_100_DELEGATES);
  private readonly lastUpdatedState = signal<string>(new Date().toISOString());
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

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

  constructor() {
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    await detectActiveBackend();
    await this.fetchFromMongoDB();
  }

  /**
   * Tải danh sách đại biểu thật từ MongoDB qua Backend API
   */
  async fetchFromMongoDB(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const api = getApiBase();
      const res = await fetch(`${api}/delegates`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.delegatesState.set(data);
          this.lastUpdatedState.set(new Date().toISOString());
        } else if (Array.isArray(data) && data.length === 0) {
          this.delegatesState.set(INITIAL_100_DELEGATES);
        }
      } else {
        console.warn('MongoDB delegates API trả về mã lỗi:', res.status);
      }
    } catch (err: unknown) {
      console.warn('Không thể kết nối đến Backend MongoDB:', err);
      this.errorMessage.set('Chưa kết nối được với MongoDB Backend server.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getAll(): Delegate[] {
    return this.delegates();
  }

  getByMssv(mssv: string): Delegate | undefined {
    if (!mssv) return undefined;
    const clean = mssv.trim().toUpperCase();
    return this.delegates().find(d =>
      d.mssv.toUpperCase() === clean ||
      d.id.toUpperCase() === clean
    );
  }

  /**
   * Thêm mới đại biểu vào MongoDB
   */
  insert(delegateData: Omit<Delegate, 'id' | 'checkedIn'>): Delegate {
    const list = this.delegates();
    const cleanMssv = delegateData.mssv.trim().toUpperCase();

    const nextIdNum = Math.max(0, ...list.map(d => Number(d.id.match(/^ĐB-(\d+)$/)?.[1] || 0))) + 1;
    const newId = `ĐB-${String(nextIdNum).padStart(3, '0')}`;
    const newRecord: Delegate = {
      ...delegateData,
      id: newId,
      mssv: cleanMssv,
      checkedIn: false
    };

    const next = [...list, newRecord];
    this.delegatesState.set(next);
    this.lastUpdatedState.set(new Date().toISOString());

    const api = getApiBase();
    fetch(`${api}/delegates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(newRecord)
    }).catch(err => console.error('Lỗi lưu đại biểu vào MongoDB:', err));

    return newRecord;
  }

  /**
   * Cập nhật thông tin đại biểu lên MongoDB
   */
  update(updated: Delegate): void {
    const list = this.delegates();
    const next = list.map(d =>
      d.mssv.toUpperCase() === updated.mssv.toUpperCase() || d.id.toUpperCase() === updated.id.toUpperCase()
        ? updated
        : d
    );
    this.delegatesState.set(next);
    this.lastUpdatedState.set(new Date().toISOString());

    const api = getApiBase();
    fetch(`${api}/delegates/${encodeURIComponent(updated.mssv)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(updated)
    }).catch(err => console.error('Lỗi cập nhật đại biểu vào MongoDB:', err));
  }

  /**
   * Xóa đại biểu khỏi MongoDB
   */
  async delete(mssvOrId: string): Promise<void> {
    const clean = mssvOrId.trim().toUpperCase();
    const res = await fetch(`${getApiBase()}/delegates/${encodeURIComponent(clean)}`, {
      method: 'DELETE', headers: authHeaders(), signal: AbortSignal.timeout(15000)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Không thể xóa đại biểu. Vui lòng thử lại.');
    // Update the screen only after the server confirms deletion.
    this.delegatesState.update(list => list.filter(d =>
      d.mssv.toUpperCase() !== clean && d.id.toUpperCase() !== clean
    ));
    this.lastUpdatedState.set(new Date().toISOString());
  }

  /**
   * Điểm danh đại biểu trên MongoDB
   */
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
      this.lastUpdatedState.set(new Date().toISOString());

      const api = getApiBase();
      fetch(`${api}/delegates/toggle-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ mssv: clean })
      }).catch(err => console.error('Lỗi cập nhật điểm danh vào MongoDB:', err));
    }
    return updatedTarget;
  }

  /**
   * Đặt lại trạng thái điểm danh cho tất cả đại biểu trên MongoDB
   */
  resetAllAttendance(): void {
    const next = this.delegates().map(d => ({
      ...d,
      checkedIn: false,
      checkInTime: undefined
    }));
    this.delegatesState.set(next);
    this.lastUpdatedState.set(new Date().toISOString());

    const api = getApiBase();
    fetch(`${api}/delegates/reset-attendance`, {
      method: 'POST', headers: authHeaders()
    }).catch(err => console.error('Lỗi reset điểm danh trên MongoDB:', err));
  }

  resetToDefaultDatabase(): void {
    this.fetchFromMongoDB();
  }

  exportJson(): string {
    return JSON.stringify(this.delegates(), null, 2);
  }

  /**
   * Nhập dữ liệu danh sách đại biểu vào MongoDB
   */
  async importJson(jsonString: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].mssv) {
        this.delegatesState.set(parsed);
        this.lastUpdatedState.set(new Date().toISOString());

        const api = getApiBase();
        const res = await fetch(`${api}/delegates/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ delegates: parsed })
        });
        if (res.ok) {
          const resData = await res.json();
          return { success: true, count: resData.count || parsed.length };
        }
        return { success: true, count: parsed.length };
      }
      return { success: false, error: 'Định dạng dữ liệu không hợp lệ. Phải là mảng danh sách đại biểu có trường MSSV.' };
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
