# 🏛️ HỆ THỐNG QUÉT QR TƯ CÁCH ĐẠI BIỂU ĐẠI HỘI ĐOÀN TNCS HỒ CHÍ MINH

Ứng dụng web Single-Page Application (Angular 22) phục vụ điểm danh, xác thực tư cách đại biểu, phân tích cơ cấu 100 đại biểu triệu tập (Độ tuổi tại ngày 17/01/2027, biến 0/1 tiêu chuẩn thành tích, Đảng viên, Dân tộc, Tôn giáo) và in thẻ đại biểu có mã QR cá nhân hóa.

---

## 🌟 Tính Năng Nổi Bật

1. **Quét Mã QR Siêu Nhạy (25 FPS)**:
   - Tích hợp Native C++ `BarcodeDetector` API tăng tốc phần cứng GPU.
   - Quét trực tiếp bằng Camera điện thoại hoặc Webcam máy tính (Hỗ trợ đổi camera Trước/Sau & Lật gương).
   - Tải ảnh mã QR từ máy hoặc nhập thủ công theo **MSSV** (Khóa chính).
2. **Thẻ Đại Biểu Điện Tử & Con Dấu Xác Thực**:
   - Hiển thị đầy đủ thông tin: Họ tên, Chi đoàn, MSSV, Giới tính, Đảng viên, Dân tộc, Tôn giáo, DOB.
   - Tự động tính tuổi chính xác tại ngày Đại hội: **17/01/2027**.
   - Con dấu mộc đỏ Đoàn khoa với hiệu ứng đóng dấu âm thanh + pháo hoa confetti khi điểm danh.
3. **Cơ Sở Dữ Liệu 100 Đại Biểu Triệu Tập**:
   - Lưu trữ an toàn trên LocalStorage trình duyệt.
   - Bảng tổng hợp các biến tiêu chuẩn **0/1**:
     - *Đảng viên Đảng CSVN (1 = Đảng viên & Đoàn viên, 0 = Đoàn viên)*
     - *Đoàn viên tiêu biểu, Cán bộ Đoàn - Hội tiêu biểu, Thanh niên KT-Luật làm theo lời Bác, BTV Thành Đoàn, Bằng khen TW Đoàn*
     - *NCKH cấp Trường, Đạt giải cuộc thi học thuật*
     - *Văn thể mỹ*
     - *Sinh viên 5 tốt (cấp Trường, cấp ĐHQG, cấp Thành phố)*
   - Tìm kiếm, lọc theo Chi đoàn, trạng thái có mặt/chưa đến, lọc Đảng viên.
   - **Sao lưu & Phục hồi**: Xuất/Nhập file **JSON Database**, xuất báo cáo **Excel CSV**.
4. **Mẫu Form Khảo Sát 100 Đại Biểu**:
   - Thu thập thông tin trực tiếp, tự động tạo mã QR tức thì theo MSSV sau khi nộp form.
5. **Mã QR & In Thẻ Đeo Hàng Loạt**:
   - Tạo ảnh thẻ đại biểu và mã QR độ phân giải cao sẵn sàng in ấn cho ban tổ chức.
6. **Màn Hình Máy Chiếu Lễ Tân (Kiosk Projector)**:
   - Dành riêng cho màn hình lớn sảnh đại hội chào mừng từng đại biểu bước vào khán phòng.
7. **Giao Diện Responsive Toàn Diện**:
   - Tương thích hoàn hảo mọi thiết bị di động (iPhone, Samsung Galaxy, Xiaomi...) và màn hình máy tính.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Yêu cầu môi trường
* **Node.js**: >= 20.x
* **NPM**: >= 10.x

### Các bước khởi chạy:
```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Khởi động server phát triển cục bộ
npm start
# hoặc
ng serve
```

Truy cập trình duyệt tại: `http://localhost:4200/`

---

## 📦 Hướng Dẫn Deploy (Vercel / Netlify / Render)

### 1. Build Production:
```bash
npm run build
```
Thư mục xuất file sản phẩm: `dist/delegate-qr/browser`

### 2. Cấu hình Deploy Vercel:
* **Framework Preset**: Angular
* **Build Command**: `npm run build`
* **Output Directory**: `dist/delegate-qr/browser`

---

## 🛠️ Công Nghệ Sử Dụng
* **Framework**: Angular 22 (Standalone Components, Signals, Computed state)
* **QR Engine**: `html5-qrcode`, `qrcode`
* **Hiệu ứng & Âm thanh**: `canvas-confetti`, Web Audio API Synth
* **Styling**: Vanilla CSS, Modern Responsive Grid, Glassmorphism & Youth Union Brand Aesthetics
