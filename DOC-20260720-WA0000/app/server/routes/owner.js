/* ════════════════════════════════════════
   WidBid — routes/owner.js
   لوحة تحكم Owner و Super Owner
════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verifyToken, isOwner, isSuperOwner } = require('../middleware');

/* ════════════════════════════════════════
   Owner (1100) — إدارة غرفه
════════════════════════════════════════ */

/* ── GET /api/owner/rooms — كل غرف Owner */
router.get('/rooms', verifyToken, isOwner, async (req, res) => {
  try {
    const [rooms] = await db.query(
      `SELECT
         r.id, r.name, r.type, r.theme,
         r.is_active, r.is_frozen, r.is_locked,
         r.max_capacity, r.expires_at, r.created_at,
         r.welcome_message,
         (SELECT COUNT(*) FROM room_masters rm WHERE rm.room_id = r.id) AS master_count,
         (SELECT username FROM users WHERE id = (
           SELECT user_id FROM room_masters WHERE room_id = r.id LIMIT 1
         )) AS master_name,
         (SELECT COUNT(*) FROM messages m
          WHERE m.room_id = r.id AND DATE(m.created_at) = CURDATE()) AS messages_today
       FROM rooms r
       WHERE r.owner_id = ?
       ORDER BY r.is_active DESC, r.created_at DESC`,
      [req.user.id]
    );
    const summary = {
      total:   rooms.length,
      active:  rooms.filter(r => r.is_active && !r.is_frozen).length,
      frozen:  rooms.filter(r => r.is_frozen).length,
      expiring: rooms.filter(r => {
        if (!r.expires_at) return false;
        const days = (new Date(r.expires_at) - new Date()) / 86400000;
        return days < 7 && days > 0;
      }).length,
    };
    res.json({ success: true, rooms, summary });
  } catch (err) {
    console.error('GET /owner/rooms:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/owner/stats — إحصائيات Owner */
router.get('/stats', verifyToken, isOwner, async (req, res) => {
  try {
    const [[rooms]]   = await db.query(
      'SELECT COUNT(*) as c FROM rooms WHERE owner_id = ?', [req.user.id]
    );
    const [[active]]  = await db.query(
      'SELECT COUNT(*) as c FROM rooms WHERE owner_id = ? AND is_active = 1', [req.user.id]
    );
    const [[msgs]]    = await db.query(
      `SELECT COUNT(*) as c FROM messages m
       JOIN rooms r ON r.id = m.room_id
       WHERE r.owner_id = ? AND DATE(m.created_at) = CURDATE()`,
      [req.user.id]
    );
    const [[sroots]]  = await db.query(
      'SELECT COUNT(*) as c FROM users WHERE owner_id = ? AND rank = 1000', [req.user.id]
    );
    res.json({
      success: true,
      stats: {
        total_rooms:     rooms.c,
        active_rooms:    active.c,
        messages_today:  msgs.c,
        super_roots:     sroots.c,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/owner/assign-superroot — تعيين Super Root */
router.post('/assign-superroot', verifyToken, isOwner, async (req, res) => {
  const { target_id, quota } = req.body;
  if (!target_id) return res.status(400).json({ success: false, message: 'target_id مطلوب' });
  try {
    await db.query(
      'UPDATE users SET rank = 1000, owner_id = ? WHERE id = ?',
      [req.user.id, target_id]
    );
    // إعداد الكوتة
    await db.query(
      `INSERT INTO user_quotas (user_id, quota_total, quota_used)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE quota_total = ?`,
      [target_id, quota || 10, quota || 10]
    );
    await db.query(
      'INSERT INTO admin_actions_log (actor_id, actor_name, action, target_name, detail) VALUES (?,?,?,?,?)',
      [req.user.id, req.user.username, 'assign_superroot', target_id, `Quota: ${quota||10}`]
    );
    res.json({ success: true, message: 'تم تعيين Super Root' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/owner/super-roots — قائمة Super Roots */
router.get('/super-roots', verifyToken, isOwner, async (req, res) => {
  try {
    const [sroots] = await db.query(
      `SELECT u.id, u.username, u.is_active,
              q.quota_total, q.quota_used,
              (SELECT COUNT(*) FROM rooms WHERE super_root_id = u.id AND is_active=1) AS active_rooms
       FROM users u
       LEFT JOIN user_quotas q ON q.user_id = u.id
       WHERE u.owner_id = ? AND u.rank = 1000
       ORDER BY u.username`,
      [req.user.id]
    );
    res.json({ success: true, super_roots: sroots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── PUT /api/owner/update-quota — تعديل كوتة */
router.put('/update-quota', verifyToken, isOwner, async (req, res) => {
  const { target_id, quota } = req.body;
  try {
    await db.query(
      `INSERT INTO user_quotas (user_id, quota_total, quota_used)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE quota_total = ?`,
      [target_id, quota, quota]
    );
    res.json({ success: true, message: `تم تحديث الكوتة إلى ${quota}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ════════════════════════════════════════
   Super Owner (1200) — إدارة المنصة
════════════════════════════════════════ */

/* ── GET /api/owner/platform/stats — إحصائيات المنصة */
router.get('/platform/stats', verifyToken, isSuperOwner, async (req, res) => {
  try {
    const [[users]]   = await db.query('SELECT COUNT(*) as c FROM users WHERE is_active = 1');
    const [[rooms]]   = await db.query('SELECT COUNT(*) as c FROM rooms');
    const [[active]]  = await db.query('SELECT COUNT(*) as c FROM rooms WHERE is_active = 1');
    const [[owners]]  = await db.query('SELECT COUNT(*) as c FROM users WHERE rank = 1100');
    const [[sroots]]  = await db.query('SELECT COUNT(*) as c FROM users WHERE rank = 1000');
    const [[msgs]]    = await db.query(
      'SELECT COUNT(*) as c FROM messages WHERE DATE(created_at) = CURDATE()'
    );
    const [topRooms]  = await db.query(
      `SELECT r.id, r.name,
              COUNT(m.id) AS message_count,
              r.member_count
       FROM rooms r
       LEFT JOIN messages m ON m.room_id = r.id
         AND DATE(m.created_at) = CURDATE()
       WHERE r.is_active = 1
       GROUP BY r.id
       ORDER BY message_count DESC LIMIT 5`
    );
    res.json({
      success: true,
      stats: {
        total_users:        users.c,
        total_rooms:        rooms.c,
        active_rooms:       active.c,
        total_owners:       owners.c,
        total_sroots:       sroots.c,
        messages_today:     msgs.c,
        joins_last_hour:    0,
        messages_last_hour: 0,
        actions_last_hour:  0,
        top_rooms:          topRooms,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/owner/platform/owners — كل Owners */
router.get('/platform/owners', verifyToken, isSuperOwner, async (req, res) => {
  try {
    const [owners] = await db.query(
      `SELECT u.id, u.username, u.email, u.is_active, u.max_rooms, u.created_at,
              (SELECT COUNT(*) FROM rooms WHERE owner_id = u.id)               AS room_count,
              (SELECT COUNT(*) FROM users WHERE owner_id = u.id AND rank=1000) AS sroot_count
       FROM users u
       WHERE u.rank = 1100
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, owners });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/owner/platform/tree — شجرة الهرم */
router.get('/platform/tree', verifyToken, isSuperOwner, async (req, res) => {
  try {
    const [sroots] = await db.query(
      'SELECT id, username, is_active FROM users WHERE rank = 1000'
    );
    const tree = await Promise.all(sroots.map(async sr => {
      const [roots] = await db.query(
        'SELECT id, username FROM users WHERE rank = 900 AND super_root_id = ?', [sr.id]
      );
      const rootsWithRooms = await Promise.all(roots.map(async r => {
        const [rooms] = await db.query(
          'SELECT id, name, member_count, is_active FROM rooms WHERE root_id = ?', [r.id]
        );
        return { ...r, rooms, room_count: rooms.length };
      }));
      const [quota] = await db.query(
        'SELECT quota_total, quota_used FROM user_quotas WHERE user_id = ?', [sr.id]
      );
      return {
        ...sr,
        roots:       rootsWithRooms,
        quota_total: quota[0]?.quota_total || 10,
        quota_used:  rootsWithRooms.length,
      };
    }));
    res.json({ success: true, tree });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/owner/platform/create-owner — إنشاء Owner */
router.post('/platform/create-owner', verifyToken, isSuperOwner, async (req, res) => {
  const { target_id, max_rooms } = req.body;
  try {
    await db.query(
      'UPDATE users SET rank = 1100, max_rooms = ? WHERE id = ?',
      [max_rooms || 20, target_id]
    );
    await db.query(
      'INSERT INTO admin_actions_log (actor_id, actor_name, action, target_name, detail) VALUES (?,?,?,?,?)',
      [req.user.id, req.user.username, 'create_owner', target_id, `max_rooms: ${max_rooms||20}`]
    );
    res.json({ success: true, message: 'تم إنشاء Owner' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/owner/platform/freeze-owner — تجميد Owner */
router.post('/platform/freeze-owner', verifyToken, isSuperOwner, async (req, res) => {
  const { target_id } = req.body;
  try {
    await db.query('UPDATE users SET is_active = 0 WHERE id = ?', [target_id]);
    res.json({ success: true, message: 'تم تجميد Owner' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/owner/platform/unfreeze-owner — رفع تجميد */
router.post('/platform/unfreeze-owner', verifyToken, isSuperOwner, async (req, res) => {
  const { target_id } = req.body;
  try {
    await db.query('UPDATE users SET is_active = 1 WHERE id = ?', [target_id]);
    res.json({ success: true, message: 'تم تفعيل Owner' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/owner/admin-log — سجل الإجراءات */
router.get('/admin-log', verifyToken, isOwner, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT actor_name, actor_rank, action, target_name, detail, created_at
       FROM admin_actions_log
       ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ success: true, log: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
