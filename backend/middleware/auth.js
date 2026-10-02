const { admin, enabled } = require('../firebase');
const db = require('../db');

module.exports = async function auth(req, res, next) {
  try {
    // DEV mode (no Firebase key): trust the X-User-Id header, default user 1
    if (!enabled) {
      req.user = { id: Number(req.header('X-User-Id') || 1) };
      return next();
    }
    const token = (req.header('Authorization') || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const d = await admin.auth().verifyIdToken(token);
    const r = await db.query(
      `INSERT INTO users(firebase_uid, email) VALUES($1,$2)
       ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
      [d.uid, d.email || null]);
    const userId = r.rows[0].id;
    // every new user joins the default group (id 1)
    await db.query('INSERT INTO user_groups(user_id, group_id) VALUES($1,1) ON CONFLICT DO NOTHING', [userId]);
    req.user = { id: userId, uid: d.uid };
    next();
  } catch (e) {
    console.error('[auth middleware] Token verification failed:', e.message, e.code || '');
    res.status(401).json({ error: `Invalid token: ${e.message}` });
  }
};
