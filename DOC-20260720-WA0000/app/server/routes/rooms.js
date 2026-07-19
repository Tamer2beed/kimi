/* ════════════════════════════════════════
   WidBid — routes/rooms.js
   إدارة الغرف (REST API)
════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verifyToken, isRoomAdmin, isOwner } = require('../middleware');

/* ── GET /api/rooms — قائمة كل الغرف ── */
router.get('/', async (req, res) => {
  try {
    const [rooms] = await db.query(`
      SELECT
        r.id, r.name, r.type, r.theme,
        r.is_active, r.is_frozen, r.is_locked,
        r.max_capacity, r.expires_at, r.created_at,
        COUNT(DISTINCT rm.user_id) AS member_count,
        u.username AS master_name
      FROM rooms r
      LEFT JOIN room_masters rm ON rm.room_id = r.id
      LEFT JOIN users u ON u.id = (
        SELECT user_id FROM room_masters
        WHERE room_id = r.id LIMIT 1
      )
      WHERE r.is_active = 1 AND r.is_frozen = 0
      GROUP BY r.id
      ORDER BY member_count DESC
    `);
    res.json({ success: true, rooms });
  } catch (err) {
    console.error('GET /rooms:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/rooms/:id — تفاصيل غرفة ─ */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.username AS owner_name
       FROM rooms r
       LEFT JOIN users u ON u.id = r.owner_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
    res.json({ success: true, room: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/rooms/create — إنشاء غرفة */
router.post('/create', verifyToken, async (req, res) => {
  const { name, type, owner_id, category_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'اسم الغرفة مطلوب' });
  if (req.user.rank < 1100) return res.status(403).json({ success: false, message: 'يحتاج صلاحية Owner' });

  try {
    const [result] = await db.query(
      `INSERT INTO rooms (name, type, owner_id, category_id, welcome_message, theme, is_active)
       VALUES (?, ?, ?, ?, 'مرحباً بكم', 'candy', 1)`,
      [name.trim(), type || 'public', owner_id || req.user.id, category_id || null]
    );
    // تسجيل الإجراء
    await db.query(
      'INSERT INTO admin_actions_log (actor_id, actor_name, action, detail) VALUES (?,?,?,?)',
      [req.user.id, req.user.username, 'create_room', `Room: ${name}`]
    );
    res.json({ success: true, room_id: result.insertId, message: 'تم إنشاء الغرفة' });
  } catch (err) {
    console.error('POST /rooms/create:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/rooms/update — تحديث غرفة */
router.post('/update', verifyToken, isRoomAdmin, async (req, res) => {
  const { room_id, name, welcome_message, theme, max_capacity } = req.body;
  try {
    await db.query(
      `UPDATE rooms SET
        name            = COALESCE(?, name),
        welcome_message = COALESCE(?, welcome_message),
        theme           = COALESCE(?, theme),
        max_capacity    = COALESCE(?, max_capacity)
       WHERE id = ?`,
      [name, welcome_message, theme, max_capacity, room_id]
    );
    res.json({ success: true, message: 'تم التحديث' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/rooms/freeze — تجميد غرفة */
router.post('/freeze', verifyToken, isOwner, async (req, res) => {
  const { room_id } = req.body;
  try {
    await db.query('UPDATE rooms SET is_frozen = 1 WHERE id = ?', [room_id]);
    res.json({ success: true, message: 'تم تجميد الغرفة' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── POST /api/rooms/unfreeze — رفع التجميد */
router.post('/unfreeze', verifyToken, isOwner, async (req, res) => {
  const { room_id } = req.body;
  try {
    await db.query('UPDATE rooms SET is_frozen = 0 WHERE id = ?', [room_id]);
    res.json({ success: true, message: 'تم تفعيل الغرفة' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── DELETE /api/rooms/:id — حذف غرفة ─ */
router.delete('/:id', verifyToken, isOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM messages WHERE room_id = ?', [req.params.id]);
    await db.query('DELETE FROM room_masters WHERE room_id = ?', [req.params.id]);
    res.json({ success: true, message: 'تم حذف الغرفة' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/rooms/owner/:user_id — غرف Owner */
router.get('/owner/:user_id', verifyToken, async (req, res) => {
  try {
    const [rooms] = await db.query(
      `SELECT r.*,
        (SELECT username FROM users WHERE id = (
          SELECT user_id FROM room_masters WHERE room_id = r.id LIMIT 1
        )) AS master_name,
        (SELECT COUNT(*) FROM messages WHERE room_id = r.id AND DATE(created_at) = CURDATE()) AS messages_today
       FROM rooms r WHERE r.owner_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.user_id]
    );
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/rooms/categories — كل التصنيفات مع إحصائياتها */
router.get('/categories/all', async (req, res) => {
  try {
    const [cats] = await db.query(`
      SELECT
        c.id, c.name, c.icon, c.sort_order,
        COUNT(DISTINCT r.id)          AS room_count,
        COALESCE(SUM(r.member_count), 0) AS user_count
      FROM categories c
      LEFT JOIN rooms r ON r.category_id = c.id
                       AND r.is_active = 1
                       AND r.is_frozen = 0
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `);
    res.json({ success: true, categories: cats });
  } catch (err) {
    console.error('GET /rooms/categories/all:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/rooms/by-category/:cat_id — غرف تصنيف معين */
router.get('/by-category/:cat_id', async (req, res) => {
  try {
    const [rooms] = await db.query(`
      SELECT
        r.id, r.name, r.type, r.theme, r.member_count,
        r.max_capacity, r.is_locked, r.category_id,
        c.name AS category_name, c.icon AS category_icon
      FROM rooms r
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.category_id = ?
        AND r.is_active = 1
        AND r.is_frozen = 0
      ORDER BY r.member_count DESC
    `, [req.params.cat_id]);
    res.json({ success: true, rooms });
  } catch (err) {
    console.error('GET /rooms/by-category:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/* ── GET /api/rooms/members/:room_id — أعضاء غرفة */
router.get('/members/:room_id', verifyToken, async (req, res) => {
  try {
    const [members] = await db.query(
      `SELECT u.id, u.username, u.rank, u.avatar
       FROM room_masters rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = ?`,
      [req.params.room_id]
    );
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
