/* ════════════════════════════════════════
   WidBid — middleware.js
   JWT التحقق + فحص الصلاحيات
════════════════════════════════════════ */
const jwt = require('jsonwebtoken');
const db  = require('./db');

/* [FIX] أمان حرج: يجب أن يكون JWT_SECRET موجوداً في .env ولا يجوز أبداً ترك قيمة افتراضية في الكود
   (المستودع عام على GitHub — أي قيمة افتراضية هنا تصبح معروفة للجميع) */
if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET غير موجود في متغيرات البيئة (.env) — يجب ضبطه قبل تشغيل السيرفر');
}
const JWT_SECRET = process.env.JWT_SECRET;

/* ── التحقق من JWT ──────────────────── */
const verifyToken = (req, res, next) => {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;

  if (!token || token.startsWith('guest_')) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token منتهي أو غير صالح' });
  }
};

/* ── فحص الرتبة الدنيا ──────────────── */
const requireRank = (minRank) => async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT rank FROM users WHERE id = ?', [req.user.id]
    );
    if (!rows.length || rows[0].rank < minRank) {
      return res.status(403).json({ success: false, message: 'صلاحية غير كافية' });
    }
    req.userRank = rows[0].rank;
    next();
  } catch {
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

/* ── اختصارات الرتب ─────────────────── */
const isAdmin      = requireRank(500);
const isSuperAdmin = requireRank(600);
const isMaster     = requireRank(700);
const isSuperMaster= requireRank(800);
const isRoot       = requireRank(900);
const isSuperRoot  = requireRank(1000);
const isOwner      = requireRank(1100);
const isSuperOwner = requireRank(1200);

/* ── Admin الغرفة (يدير الغرفة) ─────── */
const isRoomAdmin = async (req, res, next) => {
  try {
    const room_id = req.body.room_id || req.params.room_id;
    const [rows]  = await db.query(
      'SELECT rank FROM users WHERE id = ?', [req.user.id]
    );
    if (!rows.length || rows[0].rank < 500) {
      return res.status(403).json({ success: false, message: 'يجب أن تكون Admin أو أعلى' });
    }
    req.userRank = rows[0].rank;
    next();
  } catch {
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
};

/* ── فحص الحظر ──────────────────────── */
const checkBanned = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT is_banned, is_active FROM users WHERE id = ?', [req.user.id]
    );
    if (rows[0]?.is_banned)  return res.status(403).json({ success: false, message: 'تم حظر حسابك' });
    if (!rows[0]?.is_active) return res.status(403).json({ success: false, message: 'حسابك غير نشط' });
    next();
  } catch {
    next();
  }
};

module.exports = {
  verifyToken, requireRank, checkBanned, isRoomAdmin,
  isAdmin, isSuperAdmin, isMaster, isSuperMaster,
  isRoot, isSuperRoot, isOwner, isSuperOwner,
};
