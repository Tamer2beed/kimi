/* ════════════════════════════════════════
   WidBid — routes/roles.js
   إدارة الرتب
════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verifyToken, isMaster, isSuperOwner } = require('../middleware');

/* ── ألوان الرتب الثابتة (من الدستور) ── */
const RANK_COLORS = {
  100: '#888888', 200: '#FFB6C1', 300: '#E066FF',
  400: '#FFD700', 500: '#4A90D9', 600: '#27AE60',
  700: '#E74C3C', 800: '#C0392B', 900: '#F39C12',
  1000:'#E67E22', 1100:'#D4AF37', 1200:'#FFFFFF',
};
const RANK_NAMES = {
  100:'Guest',      200:'Member',     300:'Protected',
  400:'Royal',      500:'Admin',      600:'Super Admin',
  700:'Master',     800:'Super Master',900:'Root',
  1000:'Super Root',1100:'Owner',     1200:'Super Owner',
};

/* ── GET /api/roles — كل الرتب ──────── */
router.get('/', (req, res) => {
  const roles = Object.entries(RANK_NAMES).map(([level, name]) => ({
    level:  parseInt(level),
    name,
    color:  RANK_COLORS[level] || '#888888',
  }));
  res.json({ success: true, roles });
});

/* ── GET /api/roles/myRole — رتبتي ──── */
router.get('/myRole', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT rank FROM users WHERE id = ?', [req.user.id]
    );
    const rank  = rows[0]?.rank || 100;
    const name  = RANK_NAMES[rank]  || 'Guest';
    const color = RANK_COLORS[rank] || '#888888';
    res.json({ success: true, rank, name, color });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/roles/assign — تعيين رتبة */
router.post('/assign', verifyToken, isMaster, async (req, res) => {
  const { target_id, new_rank } = req.body;

  // التحقق من صحة الرتبة
  if (!RANK_NAMES[new_rank]) {
    return res.status(400).json({ success: false, message: 'رتبة غير صالحة' });
  }

  try {
    // الناظر لا يستطيع رفع رتبة أعلى من رتبته
    const [actor]  = await db.query('SELECT rank FROM users WHERE id = ?', [req.user.id]);
    const [target] = await db.query('SELECT rank FROM users WHERE id = ?', [target_id]);

    if (!actor.length || !target.length) {
      return res.status(404).json({ success: false, message: 'مستخدم غير موجود' });
    }
    if (new_rank >= actor[0].rank) {
      return res.status(403).json({ success: false, message: 'لا يمكنك رفع رتبة مساوية أو أعلى من رتبتك' });
    }
    if (target[0].rank >= actor[0].rank) {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعديل رتبة شخص بنفس رتبتك أو أعلى' });
    }

    await db.query('UPDATE users SET rank = ? WHERE id = ?', [new_rank, target_id]);
    await db.query(
      'INSERT INTO admin_actions_log (actor_id, actor_name, actor_rank, action, target_name, detail) VALUES (?,?,?,?,?,?)',
      [req.user.id, req.user.username, actor[0].rank, 'assign_role',
       target_id, `New rank: ${new_rank} (${RANK_NAMES[new_rank]})`]
    );
    res.json({ success: true, message: `تم تعيين الرتبة: ${RANK_NAMES[new_rank]}` });
  } catch (err) {
    console.error('POST /roles/assign:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/roles/user/:id — رتبة مستخدم */
router.get('/user/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, rank FROM users WHERE id = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'مستخدم غير موجود' });
    const { id, username, rank } = rows[0];
    res.json({
      success: true,
      user: { id, username, rank, name: RANK_NAMES[rank], color: RANK_COLORS[rank] }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
