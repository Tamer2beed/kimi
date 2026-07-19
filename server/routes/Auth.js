/* ════════════════════════════════════════
   WidBid — routes/auth.js
   تسجيل الدخول والخروج والتسجيل
════════════════════════════════════════ */
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const { verifyToken } = require('../middleware');
const { addPoints, POINTS_PER_LOGIN } = require('./points');

if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET غير موجود في متغيرات البيئة (.env) — يجب ضبطه قبل تشغيل السيرفر');
}
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

/* ── POST /api/auth/register — تسجيل ── */
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'الاسم قصير جداً (3 أحرف على الأقل)' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'كلمة المرور قصيرة جداً (6 أحرف)' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username.trim(), email.trim()]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'الاسم أو البريد مستخدم مسبقاً' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, rank, points, is_active)
       VALUES (?, ?, ?, 100, 0, 1)`,
      [username.trim(), email.trim().toLowerCase(), hash]
    );

    await addPoints(result.insertId, 20, 'مكافأة التسجيل');

    res.status(201).json({
      success:  true,
      message:  'تم إنشاء الحساب بنجاح',
      user_id:  result.insertId,
    });
  } catch (err) {
    console.error('POST /auth/register:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'أدخل الإيميل أو اسم المستخدم وكلمة المرور' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, username, email, password_hash, rank,
              points, avatar, has_paid_profile, is_active, is_banned
       FROM users WHERE email = ? OR username = ?`,
      [email.trim().toLowerCase(), email.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'الإيميل أو اسم المستخدم غير موجود' });
    }

    const user = rows[0];

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'تم حظر هذا الحساب' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط' });
    }

    const passwordToCheck = req.body.hashed ? password : password;
    const valid = await bcrypt.compare(passwordToCheck, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const [[lastLogin]] = await db.query(
      'SELECT DATE(last_login) as login_date FROM users WHERE id = ?', [user.id]
    );
    const today = new Date().toISOString().split('T')[0];
    if (lastLogin?.login_date?.toISOString().split('T')[0] !== today) {
      await addPoints(user.id, POINTS_PER_LOGIN, 'نقاط تسجيل الدخول اليومي');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success:  true,
      token,
      user_id:  user.id,
      username: user.username,
      rank:     user.rank || 100,
      points:   user.points || 0,
      avatar:   user.avatar || '😀',
    });
  } catch (err) {
    console.error('POST /auth/login:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

router.post('/logout', verifyToken, async (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج' });
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, rank, avatar, is_active, is_banned FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length || !rows[0].is_active || rows[0].is_banned) {
      return res.status(401).json({ success: false });
    }
    res.json({ success: true, user: rows[0] });
  } catch {
    res.status(500).json({ success: false });
  }
});

router.get('/verify', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, rank, points, avatar, is_active, is_banned FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length || !rows[0].is_active || rows[0].is_banned) {
      return res.status(401).json({ success: false, message: 'الحساب غير صالح' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

router.post('/refresh', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, rank FROM users WHERE id = ? AND is_active = 1',
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }
    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

router.post('/guest', async (req, res) => {
  const { username, room_id } = req.body;

  if (!username || username.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'الاسم قصير جداً (2 أحرف على الأقل)' });
  }
  if (username.trim().length > 20) {
    return res.status(400).json({ success: false, message: 'الاسم طويل جداً (20 حرفاً كحد أقصى)' });
  }

  const cleanName = username.trim();

  try {
    const [existing] = await db.query(
      'SELECT id, rank FROM users WHERE username = ? AND password_hash IS NOT NULL',
      [cleanName]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '⛔ هذا الاسم محجوز — استخدم تبويب عضو وأدخل كلمة المرور',
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: 0, username: cleanName, rank: 100, isGuest: true },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: { id: 0, username: cleanName, rank: 100, avatar: 'av1.svg', isGuest: true },
    });

  } catch (err) {
    console.error('guest login:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});


/* ════════════════════════════════════════════
   POST /auth/room-entry
   تسجيل دخول العضو عبر البريد + رتبته الحقيقية
   — يُستخدم في تاب "عضو" فقط
   — كلمة مرور الغرفة تُفحص لاحقاً في joinRoom (Socket.io)
════════════════════════════════════════════ */
router.post('/room-entry', async (req, res) => {
  const { email, room_id, room_password } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
  }

  try {
    /* البحث عن المستخدم بالبريد */
    const [users] = await db.query(
      `SELECT id, username, rank, avatar, points
       FROM users WHERE email = ? AND is_active = 1 LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, message: '⛔ البريد غير مسجّل أو الحساب غير نشط' });
    }
    const user = users[0];

    /* إنشاء JWT */
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success:  true,
      token,
      user_id:  user.id,
      username: user.username,
      rank:     user.rank || 100,
      points:   user.points || 0,
      avatar:   user.avatar || 'av1.svg',
    });

  } catch (err) {
    console.error('POST /auth/room-entry:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
