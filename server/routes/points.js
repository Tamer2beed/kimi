/* ════════════════════════════════════════
   WidBid — routes/points.js
   نظام النقاط والمتجر
════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verifyToken, isSuperOwner } = require('../middleware');

/* ── ثوابت النقاط ───────────────────── */
const POINTS_PER_MESSAGE  = 1;
const POINTS_PER_LOGIN    = 5;
const POINTS_DAILY_BONUS  = 10;
const POINTS_PER_HOUR     = 2;

/* ── دالة إضافة نقاط ──────────────────
   تُستخدَم من index.js عبر require
─────────────────────────────────────── */
async function addPoints(userId, amount, reason = '') {
  if (!userId || userId === 0) return;
  try {
    await db.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [amount, userId]
    );
    await db.query(
      'INSERT INTO points_history (user_id, amount, reason) VALUES (?,?,?)',
      [userId, amount, reason]
    );
  } catch (err) {
    console.error('addPoints error:', err.message);
  }
}

/* ── دالة خصم نقاط ──────────────────── */
async function deductPoints(userId, amount, reason = '') {
  try {
    const [rows] = await db.query('SELECT points FROM users WHERE id = ?', [userId]);
    if (!rows.length || rows[0].points < amount) return false;
    await db.query('UPDATE users SET points = points - ? WHERE id = ?', [amount, userId]);
    await db.query(
      'INSERT INTO points_history (user_id, amount, reason) VALUES (?,?,?)',
      [userId, -amount, reason]
    );
    return true;
  } catch { return false; }
}

/* ── GET /api/points/balance — رصيدي ── */
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT points FROM users WHERE id = ?', [req.user.id]
    );
    res.json({ success: true, balance: rows[0]?.points || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/points/history — سجل النقاط */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT amount, reason, created_at
       FROM points_history
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/points/daily — المكافأة اليومية */
router.post('/daily', verifyToken, async (req, res) => {
  try {
    // فحص آخر تسجيل دخول
    const [rows] = await db.query(
      'SELECT last_login FROM users WHERE id = ?', [req.user.id]
    );
    const lastLogin = rows[0]?.last_login;
    const today     = new Date().toDateString();

    if (lastLogin && new Date(lastLogin).toDateString() === today) {
      return res.json({ success: false, message: 'حصلت على مكافأة اليوم مسبقاً' });
    }

    await addPoints(req.user.id, POINTS_DAILY_BONUS, 'مكافأة يومية');
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [req.user.id]);

    res.json({ success: true, points_added: POINTS_DAILY_BONUS, message: `🎁 حصلت على ${POINTS_DAILY_BONUS} نقطة` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/points/leaderboard — المتصدرون */
router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, rank, points, avatar
       FROM users
       WHERE is_active = 1 AND is_banned = 0
       ORDER BY points DESC LIMIT 20`
    );
    res.json({ success: true, leaderboard: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/points/store — المتجر ─── */
router.get('/store', async (req, res) => {
  const items = [
    { id: 1, name: 'تمييز الاسم 7 أيام',   cost: 100, icon: '✨', type: 'vip'    },
    { id: 2, name: 'ثيم غرفة خاص 30 يوم', cost: 200, icon: '🎨', type: 'theme'  },
    { id: 3, name: 'شارة مميزة دائمة',     cost: 500, icon: '🏅', type: 'badge'  },
    { id: 4, name: 'كتم صوت الإشعارات',   cost: 50,  icon: '🔕', type: 'setting' },
    { id: 5, name: 'أفاتار VIP',           cost: 150, icon: '👑', type: 'avatar' },
  ];
  res.json({ success: true, items });
});

/* ── POST /api/points/buy — شراء من المتجر */
router.post('/buy', verifyToken, async (req, res) => {
  const { item_id } = req.body;
  const ITEM_COSTS  = { 1: 100, 2: 200, 3: 500, 4: 50, 5: 150 };
  const cost        = ITEM_COSTS[item_id];

  if (!cost) return res.status(400).json({ success: false, message: 'عنصر غير موجود' });

  const ok = await deductPoints(req.user.id, cost, `شراء عنصر #${item_id}`);
  if (!ok)  return res.status(400).json({ success: false, message: 'رصيد النقاط غير كافٍ' });

  res.json({ success: true, message: `تم الشراء بنجاح (${cost} نقطة)` });
});

/* ── POST /api/points/admin/add — إضافة نقاط (Super Owner) */
router.post('/admin/add', verifyToken, isSuperOwner, async (req, res) => {
  const { target_id, amount, reason } = req.body;
  if (!target_id || !amount) {
    return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
  }
  await addPoints(target_id, parseInt(amount), reason || `إضافة من ${req.user.username}`);
  res.json({ success: true, message: `تم إضافة ${amount} نقطة` });
});

module.exports = { router, addPoints, deductPoints, POINTS_PER_MESSAGE, POINTS_PER_LOGIN };
