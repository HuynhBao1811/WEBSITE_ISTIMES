const express = require('express');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const ADMIN_EMAILS = [
  'khoihak25416@st.uel.edu.vn',
  'vyvhpk25411e@st.uel.edu.vn',
  'anhnnk25406@st.uel.edu.vn',
  'baohgk24411e@st.uel.edu.vn',
  'ducnh23411e@st.uel.edu.vn'
];
const roleForEmail = email => ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'admin' : 'user';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const publicUser = (user, role) => ({
  id: String(user._id), email: user.email, fullName: user.fullName,
  role, avatarUrl: user.avatarUrl, provider: 'google'
});

function createAuth({ User, Session, AdminGrant, config, googleClient }) {
  const router = express.Router();
  const attempts = new Map();
  const effectiveRole = async email => roleForEmail(email) === 'admin' ||
    (AdminGrant && await AdminGrant.findOne({ email: email.trim().toLowerCase() })) ? 'admin' : 'user';
  const configured = () => Boolean(config.clientId && config.clientSecret && config.redirectUri);
  const client = googleClient || new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  const cookieName = 'istimes_oauth_state';
  const cookieOptions = {
    httpOnly: true, secure: config.redirectUri?.startsWith('https://'),
    sameSite: 'lax', path: '/api/auth/google', maxAge: 10 * 60 * 1000
  };

  router.get('/config/google-client-id', (_req, res) => {
    res.json({ clientId: config.clientId || '', configured: configured() });
  });

  router.get('/auth/google/start', async (req, res) => {
    const origin = req.query.origin;
    if (!config.origins.includes(origin)) return res.status(400).send('Địa chỉ website chưa được cho phép đăng nhập.');
    if (!configured()) return res.status(503).send('Website chưa cấu hình Google OAuth.');
    const now = Date.now();
    for (const [key, value] of attempts) if (value.expiresAt < now) attempts.delete(key);
    if (attempts.size >= 1000) return res.status(429).send('Vui lòng thử lại sau.');
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(32).toString('hex');
      const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
      attempts.set(state, { origin, nonce, codeVerifier, expiresAt: now + 10 * 60 * 1000 });
      res.cookie(cookieName, state, cookieOptions);
      res.set('Cache-Control', 'no-store');
      res.redirect(client.generateAuthUrl({
        scope: ['openid', 'email', 'profile'], prompt: 'select_account', state, nonce,
        code_challenge: codeChallenge, code_challenge_method: 'S256'
      }));
    } catch {
      res.status(503).send('Chưa thể kết nối Google. Vui lòng thử lại.');
    }
  });

  router.get('/auth/google/callback', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`));
    const attempt = attempts.get(state);
    if (!attempt || attempt.expiresAt < Date.now() || cookie !== `${cookieName}=${state}`) {
      return res.status(400).send('Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng mở lại từ website.');
    }
    attempts.delete(state);
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(cookieName, clearOptions);
    const complete = message => {
      const nonce = crypto.randomBytes(16).toString('hex');
      res.set('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`);
      const data = JSON.stringify(message).replace(/</g, '\\u003c');
      res.type('html').send(`<!doctype html><html lang="vi"><meta charset="utf-8"><title>Đăng nhập IS Times</title><p>Đã xử lý đăng nhập. Bạn có thể đóng cửa sổ này và quay lại website.</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${data},${JSON.stringify(attempt.origin)});window.close();}</script></html>`);
    };
    if (req.query.error) return complete({ type: 'ISTIMES_GOOGLE_AUTH', error: 'Bạn đã hủy hoặc từ chối đăng nhập Google.' });
    if (typeof req.query.code !== 'string') return complete({ type: 'ISTIMES_GOOGLE_AUTH', error: 'Google chưa trả về mã xác thực.' });
    try {
      const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: attempt.codeVerifier });
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const profile = ticket.getPayload();
      if (!profile?.sub || !profile.email || profile.email_verified !== true || profile.nonce !== attempt.nonce) {
        throw new Error('Invalid Google identity');
      }
      const email = profile.email.trim().toLowerCase();
      const role = await effectiveRole(email);
      const user = await User.findOneAndUpdate({ email }, { $set: {
        email, fullName: profile.name || email.split('@')[0], avatarUrl: profile.picture || '',
        googleId: profile.sub, provider: 'google', role, lastLogin: new Date()
      } }, { upsert: true, new: true, runValidators: true });
      const token = crypto.randomBytes(32).toString('hex');
      await Session.create({ tokenHash: hash(token), userId: user._id, expiresAt: new Date(Date.now() + 7 * 86400000) });
      complete({ type: 'ISTIMES_GOOGLE_AUTH', token });
    } catch (err) {
      console.error('Google login failed:', err.name);
      complete({ type: 'ISTIMES_GOOGLE_AUTH', error: 'Không thể xác thực tài khoản Google hoặc lưu phiên đăng nhập. Vui lòng thử lại.' });
    }
  });

  async function requireUser(req, res, next) {
    const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập bằng Google.' });
    try {
      const session = await Session.findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } });
      const user = session && await User.findById(session.userId);
      if (!user) return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn.' });
      req.authUser = publicUser(user, await effectiveRole(user.email));
      req.authTokenHash = hash(token);
      next();
    } catch {
      res.status(503).json({ message: 'Chưa thể kiểm tra phiên đăng nhập.' });
    }
  }
  const requireAdmin = [requireUser, (req, res, next) => {
    if (req.authUser.role !== 'admin') return res.status(403).json({ message: 'Chỉ quản trị viên được thực hiện thao tác này.' });
    next();
  }];
  router.get('/auth/admins', requireAdmin, async (_req, res) => {
    try {
      const grants = await AdminGrant.find().sort({ createdAt: -1 }).lean();
      res.set('Cache-Control', 'no-store');
      res.json({ admins: [
        ...ADMIN_EMAILS.map(email => ({ email, builtIn: true })),
        ...grants.filter(g => !ADMIN_EMAILS.includes(g.email)).map(g => ({
          email: g.email, grantedBy: g.grantedBy, createdAt: g.createdAt, builtIn: false
        }))
      ] });
    } catch { res.status(503).json({ message: 'Chưa thể tải danh sách quản trị viên.' }); }
  });
  router.post('/auth/admins', requireAdmin, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
    }
    if (ADMIN_EMAILS.includes(email)) return res.json({ success: true, message: 'Email này đã là quản trị viên.' });
    try {
      await AdminGrant.findOneAndUpdate({ email }, { $setOnInsert: {
        email, grantedBy: req.authUser.email, createdAt: new Date()
      } }, { upsert: true, new: true, runValidators: true });
      res.json({ success: true, message: `Đã cấp quyền quản trị viên cho ${email}.` });
    } catch { res.status(503).json({ message: 'Chưa thể cấp quyền quản trị viên. Vui lòng thử lại.' }); }
  });
  router.get('/auth/me', requireUser, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ user: req.authUser });
  });
  router.post('/auth/logout', requireUser, async (req, res) => {
    try {
      await Session.deleteOne({ tokenHash: req.authTokenHash });
      res.json({ success: true });
    } catch {
      res.status(503).json({ message: 'Chưa thể kết thúc phiên đăng nhập.' });
    }
  });
  // Never accept an email/profile supplied by the browser as proof of identity.
  router.post('/auth/google', (_req, res) => res.status(401).json({ message: 'Vui lòng sử dụng đăng nhập Google chính thức.' }));
  return { router, requireUser, requireAdmin };
}

module.exports = { createAuth, roleForEmail, ADMIN_EMAILS };
