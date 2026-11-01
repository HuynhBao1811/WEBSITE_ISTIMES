import { Delegate } from '../models/delegate.model';

const HO_LIST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM_NAM = ['Văn', 'Thành', 'Quốc', 'Đức', 'Minh', 'Hữu', 'Tuấn', 'Công', 'Gia', 'Nhật', 'Bảo', 'Hoàng'];
const DEM_NU = ['Thị', 'Mai', 'Ngọc', 'Thu', 'Thanh', 'Phương', 'Bích', 'Diễm', 'Kim', 'Yến', 'Ánh', 'Mỹ'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Hùng', 'Huy', 'Khoa', 'Long', 'Nam', 'Nghĩa', 'Phúc', 'Quân', 'Sơn', 'Tài', 'Thắng', 'Thịnh', 'Trung', 'Tuấn', 'Tùng', 'Việt'];
const TEN_NU = ['Anh', 'Chi', 'Dung', 'Hà', 'Hằng', 'Hạnh', 'Hoa', 'Hương', 'Lan', 'Linh', 'Mai', 'My', 'Nga', 'Ngân', 'Nhi', 'Như', 'Nhung', 'Oanh', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Trinh', 'Uyên', 'Vân', 'Vy'];

const CHI_DOAN_LIST = [
  'Chi đoàn K21401', 'Chi đoàn K21402', 'Chi đoàn K21403', 'Chi đoàn K21404',
  'Chi đoàn K22401', 'Chi đoàn K22402', 'Chi đoàn K22403', 'Chi đoàn K22404', 'Chi đoàn K22405',
  'Chi đoàn K23401', 'Chi đoàn K23402', 'Chi đoàn K23403', 'Chi đoàn K23404', 'Chi đoàn K23405',
  'Chi đoàn K24401', 'Chi đoàn K24402', 'Chi đoàn K24403', 'Chi đoàn K24404'
];

function generate100Delegates(): Delegate[] {
  const delegates: Delegate[] = [];

  // Seeded deterministic generation for stable data
  for (let i = 1; i <= 100; i++) {
    const unit = CHI_DOAN_LIST[i % CHI_DOAN_LIST.length];
    const cohortPrefix = unit.match(/K\d{2}/)?.[0] || 'K22';
    const mssvNum = String(1000 + i).slice(-4);
    let mssv = `${cohortPrefix}411${mssvNum}`;

    let isMale = (i % 5 !== 1 && i % 5 !== 3); // realistic ratio ~60% Nam / 40% Nữ
    let gender: 'Nam' | 'Nữ' = isMale ? 'Nam' : 'Nữ';
    
    let ho = HO_LIST[(i * 3 + 2) % HO_LIST.length];
    let dem = isMale ? DEM_NAM[(i * 7 + 1) % DEM_NAM.length] : DEM_NU[(i * 5 + 3) % DEM_NU.length];
    let ten = isMale ? TEN_NAM[(i * 11 + 4) % TEN_NAM.length] : TEN_NU[(i * 13 + 5) % TEN_NU.length];
    let fullName = `${ho} ${dem} ${ten}`;

    let year = 2003 + (i % 4);
    let month = ((i * 3) % 12) + 1;
    let day = ((i * 7) % 28) + 1;

    // Specific key delegates including Admin Committee & edge cases (Min/Max age)
    if (i === 1) {
      fullName = 'Huỳnh Gia Bảo';
      mssv = 'K244118888';
      gender = 'Nam';
      isMale = true;
      year = 2004; month = 11; day = 18;
    } else if (i === 2) {
      fullName = 'Nguyễn Hữu Đức';
      mssv = 'K234111003';
      gender = 'Nam';
      isMale = true;
      year = 2004; month = 5; day = 22;
    } else if (i === 3) {
      fullName = 'Hà Khôi';
      mssv = 'K254160001';
      gender = 'Nam';
      isMale = true;
      year = 2005; month = 8; day = 15;
    } else if (i === 4) {
      fullName = 'Huỳnh Phương Vy';
      mssv = 'K254110002';
      gender = 'Nữ';
      isMale = false;
      year = 2005; month = 3; day = 20;
    } else if (i === 5) {
      fullName = 'Nguyễn Ngọc Anh';
      mssv = 'K254060003';
      gender = 'Nữ';
      isMale = false;
      year = 2005; month = 9; day = 10;
    } else if (i === 6) {
      fullName = 'Nguyễn Văn Hùng';
      mssv = 'K224111001';
      gender = 'Nam';
      isMale = true;
      year = 1999; month = 3; day = 15; // Lớn tuổi nhất
    } else if (i === 7) {
      fullName = 'Lê Thị Thu Thảo';
      mssv = 'K214010002';
      gender = 'Nữ';
      isMale = false;
      year = 2003; month = 5; day = 19;
    } else if (i === 100) {
      fullName = 'Vũ Mai Vy';
      mssv = 'K244111100';
      gender = 'Nữ';
      isMale = false;
      year = 2008; month = 11; day = 25; // Nhỏ tuổi nhất (Tân sinh viên vừa vào trường)
    } else if (i === 15) {
      year = 2000; month = 8; day = 12; // Thạc sĩ
    }

    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dob = `${year}-${monthStr}-${dayStr}`;

    // Dân tộc: Kinh (85%), Hoa (7%), Chăm (5%), Khác (3%)
    let ethnicity: 'Kinh' | 'Hoa' | 'Chăm' | 'Khác' = 'Kinh';
    if (i === 3) ethnicity = 'Khác'; // Tày
    else if (i % 15 === 0) ethnicity = 'Hoa';
    else if (i % 20 === 0) ethnicity = 'Chăm';
    else if (i % 35 === 0) ethnicity = 'Khác';

    // Tôn giáo
    let religion: 'Không' | 'Phật giáo' | 'Công giáo' | 'Tin lành' | 'Hòa Hảo' | 'Khác' = 'Không';
    if (i % 7 === 0) religion = 'Phật giáo';
    else if (i % 11 === 0) religion = 'Công giáo';
    else if (i % 25 === 0) religion = 'Tin lành';
    else if (i % 40 === 0) religion = 'Hòa Hảo';

    // Đảng viên (0/1): ~16% là Đảng viên
    const isPartyMember = (i % 6 === 0) ? 1 : 0;

    // Trình độ chuyên môn: Đang học ĐH (~92%), Thạc sĩ (6%), Tiến sĩ (2%)
    let academicLevel: 'Tiến sĩ' | 'Thạc sĩ' | 'Đang học ĐH' = 'Đang học ĐH';
    if (i === 1) academicLevel = 'Tiến sĩ';
    else if (i === 15 || i === 25 || i === 45) academicLevel = 'Thạc sĩ';

    // Lý luận chính trị
    let politicalTheory: 'Cao cấp' | 'Trung cấp' | 'Sơ cấp' | 'Hoàn thành các bài LLCT' = 'Hoàn thành các bài LLCT';
    if (isPartyMember && (i === 1 || i === 12)) politicalTheory = 'Cao cấp';
    else if (isPartyMember && (i % 12 === 0)) politicalTheory = 'Trung cấp';
    else if (isPartyMember || (i % 8 === 0)) politicalTheory = 'Sơ cấp';

    // Thành tích 0/1
    const isDoanVienTieuBieu = (i % 3 === 0 || i % 7 === 0) ? 1 : 0;
    const isCanBoTieuBieu = (i % 4 === 0) ? 1 : 0;
    const isThanhNienLamTheoLoiBac = (i % 5 === 0) ? 1 : 0;
    const isBtvThanhDoan = (i === 2 || i === 18) ? 1 : 0;
    const isBangKhenTWDoan = (i % 14 === 0) ? 1 : 0;

    const isNckhCapTruong = (i % 4 === 0 || i % 9 === 0) ? 1 : 0;
    const isDatGiaiHocThuat = (i % 6 === 0) ? 1 : 0;

    const isVanTheMy = (i % 3 === 1) ? 1 : 0;

    const isSv5TotCapTruong = (i % 4 === 2) ? 1 : 0;
    const isSv5TotCapDhqg = (isSv5TotCapTruong && i % 8 === 2) ? 1 : 0;
    const isSv5TotCapThanhPho = (isSv5TotCapDhqg && (i === 10 || i === 34 || i === 58 || i === 82)) ? 1 : 0;

    // Seat in congress hall (10 rows of 10 seats)
    const rowChar = String.fromCharCode(65 + Math.floor((i - 1) / 10)); // Dãy A -> J
    const seatNum = String(((i - 1) % 10) + 1).padStart(2, '0');
    const seatNumber = `Dãy ${rowChar} - Ghế ${seatNum}`;

    // Sample checked in (first 28 delegates pre-checked for realism)
    const checkedIn = i <= 28;
    const checkInTime = checkedIn ? `07:${String(10 + (i % 45)).padStart(2, '0')} - 17/01/2027` : undefined;

    delegates.push({
      id: `ĐB-${String(i).padStart(3, '0')}`,
      mssv,
      fullName,
      unit,
      gender,
      isPartyMember,
      ethnicity,
      religion,
      dob,
      academicLevel,
      politicalTheory,
      seatNumber,
      avatarUrl: isMale
        ? `https://images.unsplash.com/photo-${1500000000000 + (i * 1234567) % 90000000}?w=200&auto=format&fit=crop&q=80`
        : `https://images.unsplash.com/photo-${1510000000000 + (i * 7654321) % 90000000}?w=200&auto=format&fit=crop&q=80`,
      checkedIn,
      checkInTime,
      achievements: {
        isDoanVienTieuBieu,
        isCanBoTieuBieu,
        isThanhNienLamTheoLoiBac,
        isBtvThanhDoan,
        isBangKhenTWDoan,
        isNckhCapTruong,
        isDatGiaiHocThuat,
        isVanTheMy,
        isSv5TotCapTruong,
        isSv5TotCapDhqg,
        isSv5TotCapThanhPho
      }
    });
  }

  return delegates;
}

export const INITIAL_100_DELEGATES: Delegate[] = generate100Delegates();
