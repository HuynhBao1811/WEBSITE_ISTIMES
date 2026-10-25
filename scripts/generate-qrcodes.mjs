import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity-ide/brain/913e15e8-3e9a-4a2a-bd4d-63518e113e56';
const PUBLIC_QR_DIR = path.resolve('public/qrcodes');

if (!fs.existsSync(PUBLIC_QR_DIR)) {
  fs.mkdirSync(PUBLIC_QR_DIR, { recursive: true });
}

// Key delegates list
const delegates = [
  {
    mssv: 'K224111001',
    fullName: 'Nguyễn Văn Hùng',
    unit: 'Chi đoàn K22401',
    role: 'Đảng viên Đảng CSVN - Đại biểu lớn tuổi nhất',
    achieve: 'Cán bộ tiêu biểu • Thanh niên làm theo lời Bác'
  },
  {
    mssv: 'K214010002',
    fullName: 'Lê Thị Thu Thảo',
    unit: 'Chi đoàn K21402',
    role: 'BTV Thành Đoàn TP. Hồ Chí Minh',
    achieve: 'Sinh viên 5 tốt cấp Thành phố'
  },
  {
    mssv: 'K234111003',
    fullName: 'Hoàng Văn Lập',
    unit: 'Chi đoàn K23403',
    role: 'Đại biểu Dân tộc Tày',
    achieve: 'NCKH cấp Trường • Giải học thuật'
  },
  {
    mssv: 'K244118888',
    fullName: 'Trần Hữu Nghị',
    unit: 'Chi đoàn K24401',
    role: 'Đại biểu Khóa K24 - Văn thể mỹ',
    achieve: 'Sinh viên 5 tốt cấp ĐHQG-HCM'
  },
  {
    mssv: 'K244111100',
    fullName: 'Vũ Mai Vy',
    unit: 'Chi đoàn K24404',
    role: 'Đại biểu nhỏ tuổi nhất (Sinh ngày 25/11/2008 - 18 tuổi)',
    achieve: 'Đoàn viên tiêu biểu Khóa mới K24'
  },
  {
    mssv: 'K224111006',
    fullName: 'Hoàng Yến Hạnh',
    unit: 'Chi đoàn K22403',
    role: 'Đoàn viên Tiêu biểu',
    achieve: 'Bằng khen TW Đoàn TNCS Hồ Chí Minh'
  }
];

async function generateAll() {
  console.log('Generating QR Codes for delegates...');
  
  for (const d of delegates) {
    const publicPath = path.join(PUBLIC_QR_DIR, `${d.mssv}.png`);
    const artifactPath = path.join(ARTIFACT_DIR, `${d.mssv}.png`);

    // High resolution, crisp margins, Youth Union Navy color (#003b73)
    const options = {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 1.0,
      margin: 3,
      width: 480,
      color: {
        dark: '#003b73',
        light: '#ffffff'
      }
    };

    // The QR code contains directly the MSSV (primary key)
    await QRCode.toFile(publicPath, d.mssv, options);
    try {
      await QRCode.toFile(artifactPath, d.mssv, options);
    } catch (e) {
      console.warn('Could not save to artifact dir:', e);
    }

    console.log(`✓ Generated QR for ${d.mssv} (${d.fullName})`);
  }
  
  console.log('All QR codes generated successfully!');
}

generateAll().catch(err => {
  console.error('Error generating QR:', err);
  process.exit(1);
});
