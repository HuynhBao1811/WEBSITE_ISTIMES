// backend/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createAuth } = require('./auth');
const { deleteDelegate } = require('./delegate-actions');
const frontendOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:4200,http://127.0.0.1:4200').split(',').map(s => s.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: frontendOrigins }));
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas (WebsiteISTimes)'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ==================== SCHEMAS ====================

// 1. User Schema (Collection 'user')
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  avatarUrl: String,
  googleId: String,
  provider: { type: String, default: 'google' },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'user' });

const User = mongoose.model('User', userSchema);

// 2. Delegate Schema (Collection 'delegate') - Dữ liệu đại biểu thật từ MongoDB
const delegateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  mssv: { type: String, required: true, unique: true, uppercase: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  unit: { type: String, default: 'Đoàn Khoa HTTT' },
  gender: { type: String, enum: ['Nam', 'Nữ'], default: 'Nam' },
  isPartyMember: { type: Number, default: 0 },
  ethnicity: { type: String, default: 'Kinh' },
  religion: { type: String, default: 'Không' },
  dob: { type: String, default: '2004-01-01' },
  academicLevel: { type: String, default: 'Đang học ĐH' },
  politicalTheory: { type: String, default: 'Hoàn thành các bài LLCT' },
  achievements: {
    isDoanVienTieuBieu: { type: Number, default: 0 },
    isCanBoTieuBieu: { type: Number, default: 0 },
    isThanhNienLamTheoLoiBac: { type: Number, default: 0 },
    isBtvThanhDoan: { type: Number, default: 0 },
    isBangKhenTWDoan: { type: Number, default: 0 },
    isNckhCapTruong: { type: Number, default: 0 },
    isDatGiaiHocThuat: { type: Number, default: 0 },
    isVanTheMy: { type: Number, default: 0 },
    isSv5TotCapTruong: { type: Number, default: 0 },
    isSv5TotCapDhqg: { type: Number, default: 0 },
    isSv5TotCapThanhPho: { type: Number, default: 0 }
  },
  seatNumber: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  checkedIn: { type: Boolean, default: false },
  checkInTime: { type: String, default: '' },
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'delegate' });

const Delegate = mongoose.model('Delegate', delegateSchema);

// 3. News Schema
const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  author: String,
  publishedAt: { type: Date, default: Date.now },
}, { collection: 'news' });

const News = mongoose.model('News', newsSchema);

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { collection: 'auth_sessions' });
const Session = mongoose.model('AuthSession', sessionSchema);
const AdminGrant = mongoose.model('AdminGrant', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  grantedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'admin_grants' }));
const { router: authRouter, requireUser, requireAdmin } = createAuth({
  User, Session, AdminGrant, config: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    origins: frontendOrigins
  }
});
app.use('/api', authRouter);
app.get('/api/users', requireAdmin, async (_req, res) => {
  try { res.json(await User.find().sort({ lastLogin: -1 })); }
  catch { res.status(500).json({ message: 'Lỗi tải danh sách người dùng.' }); }
});

// ==================== DELEGATE API (MONGODB REAL DATA) ====================

// GET /api/delegates - Lấy toàn bộ danh sách đại biểu từ MongoDB
app.get('/api/delegates', async (req, res) => {
  try {
    const delegates = await Delegate.find().sort({ id: 1 });
    res.json(delegates);
  } catch (err) {
    console.error('Lỗi lấy danh sách đại biểu:', err);
    res.status(500).json({ message: 'Lỗi tải danh sách đại biểu từ MongoDB', error: err.message });
  }
});

// GET /api/delegates/:mssv - Lấy chi tiết 1 đại biểu
app.get('/api/delegates/:mssv', async (req, res) => {
  try {
    const query = req.params.mssv.trim().toUpperCase();
    const delegate = await Delegate.findOne({
      $or: [{ mssv: query }, { id: query }]
    });
    if (!delegate) {
      return res.status(404).json({ message: 'Không tìm thấy đại biểu.' });
    }
    res.json(delegate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delegates - Thêm mới đại biểu vào MongoDB
app.post('/api/delegates', requireUser, async (req, res) => {
  try {
    const body = req.body;
    const cleanMssv = body.mssv.trim().toUpperCase();

    let existing = await Delegate.findOne({ mssv: cleanMssv });
    if (existing) {
      Object.assign(existing, body, { mssv: cleanMssv, updatedAt: new Date() });
      await existing.save();
      return res.json(existing);
    }

    if (!body.id) {
      const count = await Delegate.countDocuments();
      body.id = `ĐB-${String(count + 1).padStart(3, '0')}`;
    }

    const newDelegate = new Delegate({
      ...body,
      mssv: cleanMssv,
      checkedIn: false
    });
    await newDelegate.save();
    res.status(201).json(newDelegate);
  } catch (err) {
    console.error('Lỗi tạo đại biểu:', err);
    res.status(500).json({ message: 'Lỗi lưu đại biểu vào MongoDB', error: err.message });
  }
});

// PUT /api/delegates/:mssv - Cập nhật đại biểu
app.put('/api/delegates/:mssv', requireUser, async (req, res) => {
  try {
    const query = req.params.mssv.trim().toUpperCase();
    const updated = await Delegate.findOneAndUpdate(
      { $or: [{ mssv: query }, { id: query }] },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy đại biểu để cập nhật.' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/delegates/:mssv - Xóa đại biểu khỏi MongoDB
app.delete('/api/delegates/:mssv', requireAdmin, deleteDelegate(Delegate));

// POST /api/delegates/toggle-checkin - Điểm danh đại biểu trên MongoDB
app.post('/api/delegates/toggle-checkin', requireAdmin, async (req, res) => {
  try {
    const { mssv } = req.body;
    if (!mssv) return res.status(400).json({ message: 'MSSV không hợp lệ' });

    const query = mssv.trim().toUpperCase();
    const delegate = await Delegate.findOne({ $or: [{ mssv: query }, { id: query }] });
    if (!delegate) {
      return res.status(404).json({ message: 'Không tìm thấy đại biểu trong cơ sở dữ liệu.' });
    }

    delegate.checkedIn = !delegate.checkedIn;
    if (delegate.checkedIn) {
      const now = new Date();
      delegate.checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - 17/01/2027`;
    } else {
      delegate.checkInTime = '';
    }
    delegate.updatedAt = new Date();
    await delegate.save();

    res.json({ success: true, delegate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delegates/reset-attendance - Đặt lại trạng thái điểm danh
app.post('/api/delegates/reset-attendance', requireAdmin, async (req, res) => {
  try {
    await Delegate.updateMany({}, { checkedIn: false, checkInTime: '' });
    res.json({ success: true, message: 'Đã đặt lại trạng thái điểm danh cho tất cả đại biểu.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delegates/import - Nạp danh sách đại biểu vào MongoDB
app.post('/api/delegates/import', requireAdmin, async (req, res) => {
  try {
    const { delegates } = req.body;
    if (!Array.isArray(delegates) || delegates.length === 0) {
      return res.status(400).json({ message: 'Dữ liệu đại biểu không hợp lệ.' });
    }

    let inserted = 0;
    for (const d of delegates) {
      if (!d.mssv) continue;
      const cleanMssv = d.mssv.trim().toUpperCase();
      await Delegate.findOneAndUpdate(
        { mssv: cleanMssv },
        { ...d, mssv: cleanMssv, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      inserted++;
    }

    res.json({ success: true, count: inserted, message: `Đã nạp thành công ${inserted} đại biểu vào MongoDB.` });
  } catch (err) {
    console.error('Lỗi nạp đại biểu:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', database: 'MongoDB Atlas (WebsiteISTimes)', time: new Date() }));

// Keep the OAuth callback port stable; never silently switch ports.
const port = parseInt(process.env.PORT, 10) || 5001;
const server = app.listen(port, () => console.log('Server listening on http://localhost:' + port));
server.on('error', err => {
  console.error('Cannot start backend:', err.code);
  process.exit(1);
});
