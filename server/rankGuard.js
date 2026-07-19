'use strict';
/* ════════════════════════════════════════════════════════════════
   WidBid — server/rankGuard.js   [S15 — نظام الصلاحيات]
   ════════════════════════════════════════════════════════════════
   حارس الصلاحيات المركزي لكل أحداث Socket.io

   يطبّق ما ورد في وثيقة S14 (المرحلة التالية — S15):
   1) JWT + rank قبل كل socket event
   2) Socket Event Validation  (توكن صالح؟ رتبة تكفي؟ الهدف أدنى؟)
   3) جدول الصلاحيات الكامل لـ 12 رتبة
   4) التحقق المزدوج (Server-side — النصف الثاني في public/js/guard.js)

   ومن الدستور (Qwen_markdown §19):
   - مصفوفة الطرد 19.3  (الحصانة الملكية + حصانة المحمي)
   - نظام الحصانة 19.4  (أوزان الرتب + حصانة خط النسب)
════════════════════════════════════════════════════════════════ */

const jwt = require('jsonwebtoken');
const db  = require('./db');

if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET غير موجود في متغيرات البيئة (.env)');
}
const JWT_SECRET = process.env.JWT_SECRET;

/* ════════════════════════════════════════════════
   1) الرتب الـ 12
════════════════════════════════════════════════ */
const RANKS = Object.freeze({
  GUEST       : 100,
  MEMBER      : 200,
  PROTECTED   : 300,
  ROYAL       : 400,
  ADMIN       : 500,
  SUPER_ADMIN : 600,
  MASTER      : 700,
  SUPER_MASTER: 800,
  ROOT        : 900,
  SUPER_ROOT  : 1000,
  OWNER       : 1100,
  SUPER_OWNER : 1200,
});

/* ════════════════════════════════════════════════
   2) جدول صلاحيات الأحداث الكامل
   ─────────────────────────────────────────────
   min      : أدنى رتبة مطلوبة
   joined   : يشترط أن يكون المستخدم داخل غرفة (userData)
   target   : اسم الحقل الذي يحمل اسم الهدف — يفعّل فحص
              (الفاعل > الهدف) + الحصانات
   action   : نوع الإجراء ضمن مصفوفة 19.3
              kick | mute | ban | role
   self     : حقل user_id — يمنع قراءة/تعديل بيانات الغير
   assignRank: رتبة ثابتة يمنحها الحدث (createRoot/createOwner)
   open     : حدث دخول — تُعالج مصادقته داخل الـ handler
════════════════════════════════════════════════ */
const EVENT_PERMISSIONS = Object.freeze({
  /* ── الدخول والدردشة الأساسية ── */
  joinRoom            : { open: true },
  sendMessage         : { min: 100, joined: true },
  sendImage           : { min: 200, joined: true },   /* عضو فأعلى — S14 */
  deleteMessage       : { min: 100, joined: true },   /* الملكية تُفحص في الـ handler */
  leaveRoom           : { min: 100, joined: true },
  setStatus           : { min: 100, joined: true },
  micOn               : { min: 100, joined: true },
  micOff              : { min: 100, joined: true },
  raiseHand           : { min: 200, joined: true },   /* عضو فأعلى — S14 */
  reportRoom          : { min: 100 },
  joinRoom_speakerSync: { min: 100 },

  /* ── الإشراف (500+ / 600+) ── */
  clearChat           : { min: 500 },
  clearRoomChat       : { min: 500 },
  muteUser            : { min: 500, target: 'target', action: 'mute' },
  unmuteUser          : { min: 500, target: 'target', action: 'mute' },
  kickUser            : { min: 500, target: 'target', action: 'kick' },
  muteAll             : { min: 500 },
  unmuteAll           : { min: 500 },
  freezeUser          : { min: 500, target: 'target', action: 'kick' },
  unfreezeUser        : { min: 500 },
  setBanner           : { min: 500 },
  warnUser            : { min: 600, target: 'target', action: 'mute' },
  announcement        : { min: 600 },
  systemMessage       : { min: 600 },   /* كان مفتوحاً للجميع — ثغرة! */
  getAdminsList       : { min: 600 },
  getMutedList        : { min: 600 },
  getRoomStats        : { min: 500 },

  /* ── ماستر / سوبر ماستر (700+ / 800+) ── */
  setWelcome          : { min: 700 },
  assignRole          : { min: 700, target: 'target', action: 'role' },
  banIP               : { min: 700, target: 'target', action: 'ban' },
  controlAllMics      : { min: 700 },
  getRoomReport       : { min: 700 },
  banDevice           : { min: 800, target: 'target', action: 'ban' },
  lockRoom            : { min: 800 },

  /* ── روت / سوبر روت (900+ / 1000+) ── */
  setTheme            : { min: 900 },
  registerDevice      : { min: 900 },
  getSuperRootRooms   : { min: 1000, self: 'user_id' },
  getSuperRootReport  : { min: 1000 },
  getMySuperRootRoots : { min: 1000, self: 'user_id' },
  superRootBroadcast  : { min: 1000 },
  transferMember      : { min: 1000, target: 'target', action: 'ban' },
  createRoot          : { min: 1000, target: 'target', action: 'role', assignRank: 900 },

  /* ── أونر (1100+) ── */
  getOwnerRooms       : { min: 1100, self: 'user_id' },
  freezeRoom          : { min: 1100 },
  unfreezeRoom        : { min: 1100 },
  deleteRoom          : { min: 1100 },

  /* ── سوبر أونر (1200) ── */
  getPlatformStats    : { min: 1200 },
  getAllOwners        : { min: 1200 },
  getPlatformTree     : { min: 1200 },
  createOwner         : { min: 1200, target: 'target', action: 'role', assignRank: 1100 },
  freezeOwner         : { min: 1200, target: 'target', action: 'ban' },
  unfreezeOwner       : { min: 1200, target: 'target' },
  updateOwnerQuota    : { min: 1200, target: 'target' },
  platformBroadcast   : { min: 1200 },
  emergencyFreeze     : { min: 1200, target: 'target', action: 'ban' },
  emergencyUnfreeze   : { min: 1200, target: 'target' },
  permanentBan        : { min: 1200, target: 'target', action: 'ban' },
  emergencyCloseRoom  : { min: 1200 },
  emergencyAlert      : { min: 1200 },

  /* ── السبيكر ── */
  speakerRequest      : { min: 100, joined: true },
  speakerDone         : { min: 100, joined: true },
  speakerLeaveQueue   : { min: 100, joined: true },
  speakerExtend       : { min: 500 },
  speakerRevoke       : { min: 500 },
  speakerSkip         : { min: 500 },
  speakerGiveTo       : { min: 500 },

  /* ── الألعاب ── */
  joinGame            : { min: 100, joined: true },
  gameMove            : { min: 100, joined: true },
  restartGame         : { min: 100, joined: true },

  /* ── البث المرئي P2P ── */
  startBroadcast      : { min: 100, joined: true },
  stopBroadcast       : { min: 100, joined: true },
  requestWatch        : { min: 100, joined: true },
  broadcastAnswer     : { min: 100, joined: true },
  'webrtc:answer'     : { min: 100, joined: true },
  'webrtc:ice'        : { min: 100, joined: true },

  /* ── الصوت SFU (Mediasoup) ── */
  'audio:getCapabilities'    : { min: 100, joined: true },
  'audio:createSendTransport': { min: 100, joined: true },
  'audio:createRecvTransport': { min: 100, joined: true },
  'audio:connectTransport'   : { min: 100, joined: true },
  'audio:produce'            : { min: 100, joined: true },
  'audio:consume'            : { min: 100, joined: true },

  /* ── الأجهزة والكوتة (بيانات شخصية) ── */
  getMyDevices        : { min: 100, self: 'user_id' },
  removeDevice        : { min: 100, self: 'user_id' },
  getQuota            : { min: 100 },
});

/* ════════════════════════════════════════════════
   3) مصفوفة الطرد والحصانة — الدستور §19.3 / §19.4
════════════════════════════════════════════════ */

/* سقف أعلى رتبة يمكن استهدافها لكل فاعل — مطابق حرفياً لمصفوفة 19.3
   (المصفوفة ليست "أكبر من" فقط: المشرف يطرد زائر/عضو فقط، والروت يقف عند ماستر) */
const ACTION_CEILING = [
  [RANKS.SUPER_OWNER, 1100],
  [RANKS.OWNER,       1000],
  [RANKS.SUPER_ROOT,   900],
  [RANKS.ROOT,         700],
  [RANKS.SUPER_MASTER, 700],
  [RANKS.MASTER,       500],
  [RANKS.SUPER_ADMIN,  400],
  [RANKS.ADMIN,        200],
];
function actionCeiling(actorRank) {
  for (const [min, ceil] of ACTION_CEILING) {
    if (actorRank >= min) return ceil;
  }
  return -1;
}

/**
 * هل يستطيع الفاعل تنفيذ action على الهدف؟ — الدستور §19.3 + §19.4
 *  1) الفاعل مشرف (500+) على الأقل
 *  2) رتبة الهدف ضمن سقف الفاعل (جدول 19.3 — ليست مجرد "أقل من الفاعل")
 *  3) المحمي (300) محصّن إلا من سوبر ماستر (800+)
 *  4) الحظر: 600+ كحد أدنى، والملكي (400+) لا يحظره إلا ماستر (700+)
 *     (سوبر أدمن يطرد الملكي لكن لا يحظره — حاشية 19.3)
 */
function canActOn(actorRank, targetRank, action = 'kick') {
  actorRank  = actorRank  || 0;
  targetRank = targetRank || 0;

  if (actorRank < RANKS.ADMIN) return false;              /* أقل من مشرف: لا إجراءات */
  if (actorRank <= targetRank) return false;              /* الهدف أعلى/مساوٍ: ممنوع */
  if (targetRank > actionCeiling(actorRank)) return false; /* فوق سقف الفاعل: ممنوع */

  /* حصانة الاسم المحمي (300) — لا يُطرد/يُكتم/يُحظر إلا من 800+ */
  if (targetRank === RANKS.PROTECTED && actorRank < RANKS.SUPER_MASTER) return false;

  if (action === 'ban') {
    if (actorRank < RANKS.SUPER_ADMIN) return false;
    /* الملكي فأعلى لا يحظرهم إلا ماستر فأعلى */
    if (targetRank >= RANKS.ROYAL && actorRank < RANKS.MASTER) return false;
  }
  return true;
}

/* سقوف الترقية حسب رتبة الفاعل — جدول S14:
   700→حتى 500 | 800→حتى 600 | 900→لا ترقية | 1000→حتى 800 | 1100→حتى 1000 | 1200→حتى 1100 */
const ASSIGN_CEILINGS = [
  [RANKS.SUPER_OWNER, 1100],
  [RANKS.OWNER,       1000],
  [RANKS.SUPER_ROOT,   800],
  [RANKS.ROOT,           0],   /* روت: تعديل إعدادات الغرفة فقط */
  [RANKS.SUPER_MASTER, 600],
  [RANKS.MASTER,       500],
];
function maxAssignableRank(actorRank) {
  for (const [min, ceil] of ASSIGN_CEILINGS) {
    if (actorRank >= min) return ceil;
  }
  return 0;
}

/* ════════════════════════════════════════════════
   4) حصانة خط النسب (Lineage Immunity — §19.4.2)
   يمنع "الابن" من معاقبة "الأب" الذي أنشأ حسابه
════════════════════════════════════════════════ */
async function isLineageParent(actorUserId, targetUsername) {
  if (!actorUserId || !targetUsername) return false;
  try {
    const [rows] = await db.query(
      `SELECT 1 FROM users a
       JOIN users t ON t.username = ?
       WHERE a.id = ? AND (t.id = a.owner_id OR t.id = a.super_root_id)
       LIMIT 1`,
      [targetUsername, actorUserId]
    );
    return rows.length > 0;
  } catch { return false; }
}

/* ════════════════════════════════════════════════
   5) مصادقة الدخول — JWT هو المصدر الوحيد للهوية
   (يُستدعى من handler الخاص بـ joinRoom)
════════════════════════════════════════════════ */
function authenticateJoin(socket, data) {
  const token = socket.handshake?.auth?.token || data?.token || '';
  const sanitize = (n) => String(n || 'زائر').trim().slice(0, 50) || 'زائر';

  if (token && !token.startsWith('guest_')) {
    try {
      const p = jwt.verify(token, JWT_SECRET);
      if (p.isGuest) {
        /* زائر موثّق بتوكن رسمي من /api/auth/guest */
        return { username: sanitize(p.username), user_id: null, rank: RANKS.GUEST, isGuest: true, authed: true };
      }
      /* عضو مسجّل — الرتبة تُجلب من DB في الـ handler (مصدر الحقيقة) */
      return { username: sanitize(p.username), user_id: p.id, rank: null, isGuest: false, authed: true };
    } catch { /* توكن فاسد/منتهٍ → نزّله لزائر */ }
  }
  /* بدون توكن صالح → زائر صرف، لا يُقبل user_id ولا rank من العميل أبداً */
  return { username: sanitize(data?.username), user_id: null, rank: RANKS.GUEST, isGuest: true, authed: false };
}

/* ════════════════════════════════════════════════
   6) فحص حدث واحد (قلب الحارس)
════════════════════════════════════════════════ */
const _warnedUnknown = new Set();

async function resolveTargetRank(io, socket, data, targetName) {
  /* أولاً: ابحث بين متصلي الغرفة (أسرع وأدق للحالة الحية) */
  const rid = String(data?.room_id || socket.userData?.room_id || '');
  if (rid) {
    try {
      const socks = await io.in(rid).fetchSockets();
      const ts = socks.find(s => s.userData?.username === targetName);
      if (ts) return ts.userData?.rank ?? RANKS.GUEST;
    } catch {}
  }
  /* ثانياً: من قاعدة البيانات (هدف غير متصل) */
  try {
    const [rows] = await db.query('SELECT rank FROM users WHERE username = ?', [targetName]);
    if (rows.length) return rows[0].rank ?? RANKS.GUEST;
  } catch {}
  return null; /* هدف مجهول (ربما بوت أو زائر) */
}

async function checkEvent(io, socket, event, data) {
  const perm = EVENT_PERMISSIONS[event];

  /* حدث غير معروف: نسمح مع تحذير للمطور (أول مرة فقط) —
     كل الأحداث الحالية مسجّلة في الجدول أعلاه */
  if (!perm) {
    if (!_warnedUnknown.has(event)) {
      _warnedUnknown.add(event);
      console.warn(`⚠️ [rankGuard] حدث غير مسجّل في جدول الصلاحيات: "${event}" — أضفه إلى EVENT_PERMISSIONS`);
    }
    return { ok: true };
  }
  if (perm.open) return { ok: true };

  const actorRank = socket.userData?.rank;

  /* قبل الدخول لغرفة: نسمح فقط بأحداث الزائر (min ≤ 100) */
  if (actorRank === undefined || actorRank === null) {
    if ((perm.min || 0) <= RANKS.GUEST && !perm.joined) return { ok: true };
    return { ok: false, message: '⛔ يجب دخول غرفة أولاً', code: 'NOT_JOINED' };
  }

  if (perm.joined && !socket.userData) {
    return { ok: false, message: '⛔ يجب دخول غرفة أولاً', code: 'NOT_JOINED' };
  }

  /* الحد الأدنى للرتبة */
  if (actorRank < perm.min) {
    return { ok: false, message: '⛔ صلاحية غير كافية لهذا الإجراء', code: 'LOW_RANK' };
  }

  /* نطاق "البيانات الشخصية": لا تقرأ/تعدّل بيانات غيرك (إلا سوبر أونر 1200) */
  if (perm.self && data && data[perm.self] && socket.userData?.user_id
      && Number(data[perm.self]) !== Number(socket.userData.user_id)
      && actorRank < RANKS.SUPER_OWNER) {
    return { ok: false, message: '⛔ لا يمكنك الوصول لبيانات مستخدم آخر', code: 'SCOPE' };
  }

  /* فحوصات الهدف */
  if (perm.target && data && data[perm.target]) {
    const targetName = String(data[perm.target]);

    if (targetName === socket.userData?.username) {
      return { ok: false, message: '⛔ لا يمكنك تنفيذ هذا الإجراء على نفسك', code: 'SELF' };
    }

    const targetRank = await resolveTargetRank(io, socket, data, targetName);

    if (targetRank !== null) {
      /* مصفوفة 19.3 + أوزان 19.4.1 */
      if (perm.action && perm.action !== 'role' && !canActOn(actorRank, targetRank, perm.action)) {
        return { ok: false, message: '⛔ لا يمكنك تنفيذ هذا الإجراء على رتبة أعلى أو مساوية (أو محصّنة)', code: 'IMMUNE' };
      }
      if ((!perm.action || perm.action === 'role') && actorRank <= targetRank) {
        return { ok: false, message: '⛔ لا يمكنك استهداف رتبة أعلى أو مساوية لك', code: 'IMMUNE' };
      }
      /* حصانة خط النسب 19.4.2 */
      if (perm.action && await isLineageParent(socket.userData?.user_id, targetName)) {
        return { ok: false, message: '⛔ حصانة النسب: لا يمكن معاقبة من أنشأ حسابك', code: 'LINEAGE' };
      }
    }

    /* سقف الترقية — إسناد رتبة متغيرة (assignRole) */
    if (perm.action === 'role' && data.new_rank !== undefined) {
      const newRank = Number(data.new_rank);
      const ceil = maxAssignableRank(actorRank);
      if (!Number.isFinite(newRank) || newRank < RANKS.GUEST) {
        return { ok: false, message: '⛔ رتبة غير صالحة', code: 'BAD_RANK' };
      }
      if (newRank > ceil) {
        return { ok: false, message: `⛔ أقصى رتبة يمكنك تعيينها: ${ceil}`, code: 'CEILING' };
      }
      if (newRank >= actorRank) {
        return { ok: false, message: '⛔ لا يمكنك تعيين رتبة أعلى أو مساوية لرتبتك', code: 'CEILING' };
      }
    }
  }

  return { ok: true };
}

/* ════════════════════════════════════════════════
   6ب) سجل التدقيق (Audit Trail — الدستور §15)
   كل محاولة مرفوضة لحدث إداري (500+) تُوثَّق في admin_actions_log
════════════════════════════════════════════════ */
function auditDeny(socket, event, verdict, perm) {
  if (!perm || (perm.min || 0) < RANKS.ADMIN) return;   /* أوثّق الأحداث الإدارية فقط */
  try {
    const u = socket.userData || {};
    db.query(
      `INSERT INTO admin_actions_log (room_id, actor_id, actor_name, actor_rank, action, target_name, detail)
       VALUES (?,?,?,?,?,?,?)`,
      [
        parseInt(u.room_id) || null,
        u.user_id || null,
        u.username || socket.id,
        u.rank || 0,
        'DENY:' + event,
        null,
        (verdict.code || 'DENIED') + ' — ' + (verdict.message || '').slice(0, 150),
      ]
    ).catch(() => {});
  } catch {}
}

/* ════════════════════════════════════════════════
   7) التثبيت — يُستدعى مرة واحدة من index.js
   io.use  : يفكّ توكن الـ handshake ويرفض الفاسد منها للأعضاء
   socket.use : يفحص كل حدث وارد قبل وصوله لأي handler
════════════════════════════════════════════════ */
function installSocketGuard(io) {
  io.use((socket, next) => {
    /* فك التوكن مبكراً — يستخدمه authenticateJoin لاحقاً */
    try {
      const token = socket.handshake?.auth?.token;
      if (token && !token.startsWith('guest_')) {
        socket.authPayload = jwt.verify(token, JWT_SECRET);
      }
    } catch { socket.authPayload = null; }

    /* حارس كل حدث وارد */
    socket.use((packet, nextPacket) => {
      const [event, data] = packet;
      checkEvent(io, socket, event, data)
        .then((verdict) => {
          if (verdict.ok) return nextPacket();
          const u = socket.userData?.username || socket.id;
          console.warn(`🛡️ [rankGuard] رُفض "${event}" من ${u} (rank:${socket.userData?.rank ?? '—'}) — ${verdict.code}`);
          auditDeny(socket, event, verdict, EVENT_PERMISSIONS[event]);
          socket.emit('error', verdict.message || '⛔ مرفوض');
        })
        .catch((err) => {
          /* فشل غير متوقع في الفحص → أغلق الطريق (fail-closed) */
          console.error(`🛡️ [rankGuard] خطأ أثناء فحص "${event}":`, err.message);
          socket.emit('error', '⛔ خطأ في التحقق من الصلاحية');
        });
    });

    next();
  });

  console.log('🛡️ rankGuard مفعّل — كل أحداث Socket خاضعة لجدول الصلاحيات');
}

module.exports = {
  RANKS,
  EVENT_PERMISSIONS,
  canActOn,
  maxAssignableRank,
  isLineageParent,
  authenticateJoin,
  installSocketGuard,
};
