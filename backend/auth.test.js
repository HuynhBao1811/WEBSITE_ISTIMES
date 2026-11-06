const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const crypto = require('crypto');
const { createAuth, roleForEmail } = require('./auth');
const { deleteDelegate } = require('./delegate-actions');

async function fixture(t, email = 'student@gmail.com', options = {}) {
  const users = new Map();
  const sessions = new Map();
  const grants = new Map();
  const delegates = new Map([['K123', { mssv: 'K123', id: 'DB-001' }]]);
  let nonce;
  let verified = 0;
  const client = {
    generateCodeVerifierAsync: async () => ({ codeVerifier: 'verifier', codeChallenge: 'challenge' }),
    generateAuthUrl: params => { nonce = params.nonce; return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(params)}`; },
    getToken: async params => { assert.equal(params.codeVerifier, 'verifier'); return { tokens: { id_token: 'signed-token' } }; },
    verifyIdToken: async params => {
      verified++;
      assert.equal(params.audience, 'test-client');
      if (options.invalidSignature) throw new Error('Invalid signature');
      return { getPayload: () => ({ sub: 'google-sub', email, email_verified: !options.unverified, nonce: options.wrongNonce ? 'wrong' : nonce, name: 'Test' }) };
    }
  };
  const User = {
    findOneAndUpdate: async (_query, update) => {
      if (options.databaseFailure) throw new Error('Database offline');
      const user = { _id: update.$set.email, ...update.$set }; users.set(user._id, user); return user;
    },
    findById: async id => users.get(id)
  };
  const Session = {
    create: async s => sessions.set(s.tokenHash, s),
    findOne: async query => {
      const s = sessions.get(query.tokenHash);
      return s && s.expiresAt > query.expiresAt.$gt ? s : null;
    },
    deleteOne: async query => sessions.delete(query.tokenHash)
  };
  const app = express(); app.use(express.json());
  const AdminGrant = {
    findOne: async query => grants.get(query.email),
    find: () => ({ sort: () => ({ lean: async () => [...grants.values()] }) }),
    findOneAndUpdate: async (query, update) => {
      if (!grants.has(query.email)) grants.set(query.email, update.$setOnInsert);
      return grants.get(query.email);
    }
  };
  const auth = createAuth({ User, Session, AdminGrant, googleClient: client, config: {
    clientId: 'test-client', clientSecret: 'test-secret', redirectUri: 'http://localhost/callback', origins: ['http://localhost:4200']
  } });
  app.use('/api', auth.router);
  app.post('/admin', auth.requireAdmin, (_req, res) => res.json({ success: true }));
  app.delete('/api/delegates/:mssv', auth.requireAdmin, deleteDelegate({
    findOneAndDelete: async query => {
      if (options.deleteFailure) throw new Error('DB offline');
      const key = [...delegates.keys()].find(k => k === query.$or[0].mssv || delegates.get(k).id === query.$or[1].id);
      const found = delegates.get(key);
      delegates.delete(key);
      return found;
    }
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, init) => fetch(base + route, init);
  const start = async () => {
    const res = await request('/api/auth/google/start?origin=http%3A%2F%2Flocalhost%3A4200', { redirect: 'manual' });
    assert.equal(res.status, 302);
    const url = new URL(res.headers.get('location'));
    assert.equal(url.hostname, 'accounts.google.com');
    assert.equal(url.searchParams.get('prompt'), 'select_account');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    return { state: url.searchParams.get('state'), cookie: res.headers.get('set-cookie').split(';')[0] };
  };
  const callback = async attempt => {
    const res = await request(`/api/auth/google/callback?state=${attempt.state}&code=valid-code`, { headers: { Cookie: attempt.cookie } });
    const html = await res.text();
    const token = html.match(/"token":"([a-f0-9]{64})"/)?.[1];
    return { res, html, token };
  };
  return { request, start, callback, sessions, users, grants, delegates, setEmail: value => { email = value; }, verified: () => verified };
}

test('only the exact two configured emails are admins', () => {
  assert.equal(roleForEmail('DUCNH234112E@ST.UEL.EDU.VN '), 'admin');
  assert.equal(roleForEmail('baohgk24411e@st.uel.edu.vn'), 'admin');
  assert.equal(roleForEmail('ducnh23411e@st.uel.edu.vn'), 'user');
  assert.equal(roleForEmail('student@gmail.com'), 'user');
});

for (const [email, status] of [['ducnh234112e@st.uel.edu.vn', 200], ['baohgk24411e@st.uel.edu.vn', 200], ['student@gmail.com', 403], ['ducnh23411e@st.uel.edu.vn', 403]]) {
  test(`Google callback, session and permission: ${email}`, async t => {
    const f = await fixture(t, email);
    const attempt = await f.start();
    const { token, html } = await f.callback(attempt);
    assert.ok(token);
    assert.match(html, /http:\/\/localhost:4200/);
    assert.equal(f.verified(), 1);
    assert.ok(f.sessions.has(crypto.createHash('sha256').update(token).digest('hex')));
    const headers = { Authorization: `Bearer ${token}` };
    const me = await f.request('/api/auth/me', { headers });
    assert.equal((await me.json()).user.role, status === 200 ? 'admin' : 'user');
    assert.equal((await f.request('/admin', { method: 'POST', headers })).status, status);
    assert.equal((await f.callback(attempt)).res.status, 400);
    await f.request('/api/auth/logout', { method: 'POST', headers });
    assert.equal((await f.request('/api/auth/me', { headers })).status, 401);
  });
}

test('forged profiles, missing sessions, wrong origins and wrong state cookies are rejected', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ducnh234112e@st.uel.edu.vn' }) })).status, 401);
  assert.equal((await f.request('/admin', { method: 'POST' })).status, 401);
  assert.equal((await f.request('/api/auth/google/start?origin=https://attacker.test', { redirect: 'manual' })).status, 400);
  const attempt = await f.start();
  assert.equal((await f.request(`/api/auth/google/callback?state=${attempt.state}&code=valid`)).status, 400);
  assert.equal(f.verified(), 0);
});

for (const option of ['invalidSignature', 'unverified', 'wrongNonce', 'databaseFailure']) {
  test(`no login session on ${option}`, async t => {
    const f = await fixture(t, 'ducnh234112e@st.uel.edu.vn', { [option]: true });
    const result = await f.callback(await f.start());
    assert.equal(result.token, undefined);
    assert.match(result.html, /"error":/);
    assert.equal(f.sessions.size, 0);
  });
}

test('expired sessions cannot authorize admin requests', async t => {
  const f = await fixture(t, 'ducnh234112e@st.uel.edu.vn');
  const { token } = await f.callback(await f.start());
  for (const session of f.sessions.values()) session.expiresAt = new Date(0);
  assert.equal((await f.request('/admin', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).status, 401);
});

test('admin grants persist through Google login and new admins can grant others', async t => {
  const f = await fixture(t, 'ducnh234112e@st.uel.edu.vn');
  const initial = await f.callback(await f.start());
  const headers = { Authorization: `Bearer ${initial.token}`, 'Content-Type': 'application/json' };
  const grant = await f.request('/api/auth/admins', { method: 'POST', headers, body: JSON.stringify({ email: ' New.Admin@Gmail.com ' }) });
  assert.equal(grant.status, 200);
  assert.equal(f.grants.get('new.admin@gmail.com').grantedBy, 'ducnh234112e@st.uel.edu.vn');
  await f.request('/api/auth/admins', { method: 'POST', headers, body: JSON.stringify({ email: 'new.admin@gmail.com' }) });
  assert.equal(f.grants.size, 1);
  assert.equal((await f.request('/api/auth/admins', { method: 'POST', headers, body: JSON.stringify({ email: { $ne: '' } }) })).status, 400);
  f.setEmail('new.admin@gmail.com');
  const added = await f.callback(await f.start());
  const addedHeaders = { Authorization: `Bearer ${added.token}`, 'Content-Type': 'application/json' };
  assert.equal((await (await f.request('/api/auth/me', { headers: addedHeaders })).json()).user.role, 'admin');
  assert.equal((await f.request('/api/auth/admins', { method: 'POST', headers: addedHeaders, body: JSON.stringify({ email: 'third@gmail.com' }) })).status, 200);
  const list = await (await f.request('/api/auth/admins', { headers: addedHeaders })).json();
  assert.equal(list.admins.length, 4);
  const again = await f.callback(await f.start());
  assert.equal((await f.request('/admin', { method: 'POST', headers: { Authorization: `Bearer ${again.token}` } })).status, 200);
});

test('ordinary users cannot list or grant admins, forge roles, or delete delegates', async t => {
  const f = await fixture(t);
  const { token } = await f.callback(await f.start());
  f.users.get('student@gmail.com').role = 'admin';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  assert.equal((await f.request('/api/auth/admins', { headers })).status, 403);
  assert.equal((await f.request('/api/auth/admins', { method: 'POST', headers, body: JSON.stringify({ email: 'student@gmail.com' }) })).status, 403);
  assert.equal((await f.request('/api/delegates/K123', { method: 'DELETE', headers })).status, 403);
  assert.equal(f.grants.size, 0);
  assert.equal(f.delegates.size, 1);
});

test('admin deletion removes the selected delegate and reports missing records', async t => {
  const f = await fixture(t, 'baohgk24411e@st.uel.edu.vn');
  assert.equal((await f.request('/api/delegates/K123', { method: 'DELETE' })).status, 401);
  const { token } = await f.callback(await f.start());
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal((await f.request('/api/delegates/k123', { method: 'DELETE', headers })).status, 200);
  assert.equal(f.delegates.size, 0);
  assert.equal((await f.request('/api/delegates/K123', { method: 'DELETE', headers })).status, 404);
});

test('failed deletion preserves delegate data', async t => {
  const f = await fixture(t, 'baohgk24411e@st.uel.edu.vn', { deleteFailure: true });
  const { token } = await f.callback(await f.start());
  assert.equal((await f.request('/api/delegates/K123', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 500);
  assert.equal(f.delegates.size, 1);
});
