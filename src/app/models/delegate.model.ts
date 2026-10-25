export interface DelegateAchievements {
  // Thành tích công tác Đoàn - Hội (0/1)
  isDoanVienTieuBieu: number; // Đoàn viên tiêu biểu
  isCanBoTieuBieu: number; // Cán bộ đoàn hội tiêu biểu
  isThanhNienLamTheoLoiBac: number; // Thanh niên Kinh tế - Luật làm theo lời Bác
  isBtvThanhDoan: number; // BTV Thành Đoàn TP. Hồ Chí Minh
  isBangKhenTWDoan: number; // Bằng khen từ TW Đoàn

  // Học tập & Nghiên cứu khoa học (0/1)
  isNckhCapTruong: number; // Tham gia nghiên cứu khoa học cấp trường
  isDatGiaiHocThuat: number; // Đạt giải cuộc thi học thuật

  // Văn thể mỹ (0/1)
  isVanTheMy: number; // Hoạt động văn thể mỹ

  // Sinh viên 5 tốt (0/1)
  isSv5TotCapTruong: number; // Sinh viên 5 tốt cấp trường
  isSv5TotCapDhqg: number; // Sinh viên 5 tốt cấp Đại học Quốc gia
  isSv5TotCapThanhPho: number; // Sinh viên 5 tốt cấp Thành phố
}

export type EthnicityType = 'Kinh' | 'Hoa' | 'Chăm' | 'Khác';
export type ReligionType = 'Không' | 'Phật giáo' | 'Công giáo' | 'Tin lành' | 'Hòa Hảo' | 'Khác';
export type AcademicLevelType = 'Tiến sĩ' | 'Thạc sĩ' | 'Đang học ĐH';
export type PoliticalTheoryType = 'Cao cấp' | 'Trung cấp' | 'Sơ cấp' | 'Hoàn thành các bài LLCT';

export interface Delegate {
  id: string; // Số thứ tự / Mã số đại biểu (ví dụ: 'ĐB-001', 'ĐB-002'...)
  mssv: string; // MÃ SỐ SINH VIÊN (Trường khóa chính để tạo QR & quét QR)
  fullName: string;
  unit: string; // Chi đoàn (ví dụ: K21401, K22402, K23403...)
  gender: 'Nam' | 'Nữ';
  isPartyMember: number; // 0/1: Đảng viên (1 = Đảng viên & Đoàn viên; 0 = Đoàn viên)
  ethnicity: EthnicityType;
  religion: ReligionType;
  dob: string; // Ngày sinh (YYYY-MM-DD hoặc DD/MM/YYYY)
  academicLevel: AcademicLevelType;
  politicalTheory: PoliticalTheoryType;
  achievements: DelegateAchievements;

  // Metadata phục vụ đại hội
  seatNumber?: string;
  avatarUrl?: string;
  checkedIn: boolean;
  checkInTime?: string;
  notes?: string;
}

export interface CheckInResult {
  success: boolean;
  delegate?: Delegate;
  message: string;
  alreadyCheckedIn?: boolean;
}

export interface CongressInfo {
  title: string;
  subTitle: string;
  term: string; // Nhiệm kỳ 2024 - 2027
  organization: string; // ĐOÀN TNCS HỒ CHÍ MINH
  unitName: string; // TRƯỜNG ĐẠI HỌC KINH TẾ - LUẬT / ĐOÀN KHOA...
  location: string;
  date: string; // Ngày tổ chức: 17/01/2027
  targetDate: string; // 2027-01-17 ISO format
}

export const CONGRESS_DATE_STR = '2027-01-17';
export const CONGRESS_DATE = new Date(2027, 0, 17); // 17 tháng 1 năm 2027

export function calculateAgeOnCongress(dobStr: string, congressDate: Date = CONGRESS_DATE): number {
  if (!dobStr) return 0;
  let birthDate: Date;
  if (dobStr.includes('/')) {
    const parts = dobStr.split('/');
    birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  } else {
    const parts = dobStr.split('-');
    birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  if (isNaN(birthDate.getTime())) return 0;

  let age = congressDate.getFullYear() - birthDate.getFullYear();
  const m = congressDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && congressDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
