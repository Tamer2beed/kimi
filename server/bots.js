'use strict';
/* ════════════════════════════════════════════════════════
   WidBid — server/bots.js
   محرك الأعضاء الوهميين — 13 بوت (بوت من كل رتبة)

   الميزات:
   ✅ دخول / خروج عشوائي على الغرف
   ✅ إرسال رسائل عربية طبيعية
   ✅ تشغيل / إيقاف المايك (isMicOn)
   ✅ رفع اليد (raiseHand)
   ✅ يظهر في قائمة الأعضاء عبر getBotUsers()
   ✅ لا يحتاج socket.io-client — يعمل داخل نفس العملية
════════════════════════════════════════════════════════ */

/* ══ سجل البوتات في الغرف ══
   roomId (String) → Map(username → botData)               */
const BOT_REGISTRY = new Map();

let _io         = null; // io instance من index.js
let _db         = null; // db pool من index.js
let _buildUsers = null; // buildOnlineUsers callback من index.js
let _roomIds    = [];   // قائمة معرفات الغرف النشطة

/* ══════════════════════════════════════════
   تعريف البوتات الـ 13 (بوت من كل رتبة)
══════════════════════════════════════════ */
const BOTS = [
  {
    username: 'زائر_ويدبد',
    rank: 100, avatar: 'av3.svg', country: 'العراق',
    behavior: 'lurker',   // يدخل ويخرج، لا يكتب كثيراً
  },
  {
    username: 'أحمد_المحمودي',
    rank: 200, avatar: 'av2.svg', country: 'السعودية',
    behavior: 'chatter',  // يكتب بانتظام
  },
  {
    username: 'نورا_الكندري',
    rank: 200, avatar: 'av6.svg', country: 'الكويت',
    behavior: 'chatter',
  },
  {
    username: 'ProtectedStar',
    rank: 300, avatar: 'av5.svg', country: 'الإمارات',
    behavior: 'chatter',
  },
  {
    username: 'RoyalMajesty',
    rank: 400, avatar: 'av7.svg', country: 'السعودية',
    behavior: 'active',   // يكتب + يطلب المايك أحياناً
  },
  {
    username: 'أبو_عمر_مشرف',
    rank: 500, avatar: 'av4.svg', country: 'العراق',
    behavior: 'active',
  },
  {
    username: 'سوبر_إدارة',
    rank: 600, avatar: 'av1.svg', country: 'مصر',
    behavior: 'active',
  },
  {
    username: 'ماستر_القمة',
    rank: 700, avatar: 'av8.svg', country: 'لبنان',
    behavior: 'speaker',  // يطلب المايك كثيراً
  },
  {
    username: 'SuperMaster_VIP',
    rank: 800, avatar: 'av2.svg', country: 'السعودية',
    behavior: 'speaker',
  },
  {
    username: 'Root_القائد',
    rank: 900, avatar: 'av3.svg', country: 'العراق',
    behavior: 'speaker',
  },
  {
    username: 'سوبر_روت_بوت',
    rank: 1000, avatar: 'av5.svg', country: 'العراق',
    behavior: 'vip',      // نشيط جداً، يتحدث بسلطة
  },
  {
    username: 'مالك_الغرفة',
    rank: 1100, avatar: 'av7.svg', country: 'العراق',
    behavior: 'vip',
  },
  {
    username: 'السوبر_المالك',
    rank: 1200, avatar: 'av8.svg', country: 'العراق',
    behavior: 'vip',
  },
];

/* ══════════════════════════════════════════
   قاموس الرسائل العربية
══════════════════════════════════════════ */
const MSG = {
  general: [
    'أهلاً وسهلاً بالجميع 👋',
    'السلام عليكم ورحمة الله وبركاته',
    'كيف حال الجميع اليوم؟ 😊',
    'الله يحيّيكم يا أهل الغرفة',
    'غرفة رائعة ومميزة 🌟',
    'يسعد مساكم يا ناس',
    'تحياتي للجميع ❤️',
    'نورتوا الغرفة بوجودكم',
    'أجواء حلوة هنا 🌹',
    'ماشالله ع الغرفة',
    'شباب كيف عساكم؟',
    'الله يبارك فيكم يا أهل الخير',
    'وحشتكم والله 💙',
    'الجو حلو هنا ما شاء الله',
    'أتمنى للجميع يوم سعيد ومبارك',
    'ربي يوفق الجميع ويسعدكم',
    'يلا نحكي شوي، إيه الأخبار؟',
    'الله يعطيكم العافية جميعاً',
    'شكراً على الاستقبال الحلو 💫',
    'مبسوط بينكم والله 😍',
    'هالغرفة دايماً نشطة 🔥',
    'شو عندكم اليوم يا جماعة؟',
    'والله أحلى ناس هنا ❤️',
    'ربي لا يحرمنا منكم',
    'بيّض الله وجوهكم يا أهل الخير',
    'هي أجمل غرفة بالمنصة 🎊',
    'تسلم يدك يا صاحبي',
    'كلامكم حلو وروحكم أحلى',
    'ولا يهمكم كلنا إخوان هنا',
    'الله الله ع هالأجواء 🌙',
    'الحمد لله على كل شيء',
    'يا رب تكون بخير يا جماعة',
    'وش الجديد عندكم اليوم؟',
    'خير إن شاء الله على الجميع',
    'مش قادر أقاوم هالغرفة 😁',
    'روحكم حلوة والله',
    'الله يسعدكم كلكم 💛',
    'أكرمكم الله ووسّع عليكم',
    'يلا نضحك شوي، هيّا 😂',
    'الوقت يمشي بسرعة هنا',
  ],
  join: [
    'وصلت يا شباب، كيف الجميع؟ 👋',
    'السلام عليكم، أنا هنا معكم',
    'أهلاً بالجميع، سعيد بوجودي بينكم 😊',
    'حياكم الله، وصلت بخير',
    'مرحبا مرحبا، شو الأخبار؟',
    'أهلين، كيفكم يا ناس؟',
    'السلام عليكم ورحمة الله',
  ],
  mic: [
    'يلا آخذ الميك وأحكيكم شي 🎤',
    'لو سمحتم بدي أقول كلمة',
    'معكم لحظة بسيطة أسمعوني',
    'شكراً على الميك، بحكيكم بسرعة',
    'والله يسعدكم، كلمة وأنهي 🙏',
    'أخذت الميك وأبدأ بسم الله',
    'بدي أشارككم رأيي لو تكرمتم',
  ],
};

/* ══════════════════════════════════════════
   دوال مساعدة
══════════════════════════════════════════ */
const rnd   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const delay = ms => new Promise(r => setTimeout(r, ms));

/* ── تحديث الغرف من DB ── */
async function refreshRooms() {
  try {
    const [rows] = await _db.query('SELECT id FROM rooms WHERE is_active = 1 LIMIT 100');
    _roomIds = rows.map(r => String(r.id));
  } catch (_) {}
}

/* ── تحديث onlineUsers في الغرفة ── */
async function _pushOnlineList(roomId) {
  if (!_buildUsers) return;
  try {
    const users = await _buildUsers(String(roomId));
    _io.to(String(roomId)).emit('onlineUsers', users);
  } catch (_) {}
}

/* ══════════════════════════════════════════
   API عام: getBotUsers (يُستدعى من index.js)
   يُضاف إلى نتيجة buildOnlineUsers
══════════════════════════════════════════ */
function getBotUsers(roomId) {
  const reg = BOT_REGISTRY.get(String(roomId));
  if (!reg || reg.size === 0) return [];
  return Array.from(reg.values()).map(b => ({
    username: b.username,
    rank:     b.rank,
    status:   'available',
    isMuted:  false,
    isBot:    true,
  }));
}

/* ══════════════════════════════════════════
   أحداث الغرفة
══════════════════════════════════════════ */

function botJoin(bot, roomId) {
  roomId = String(roomId);
  if (!BOT_REGISTRY.has(roomId)) BOT_REGISTRY.set(roomId, new Map());
  BOT_REGISTRY.get(roomId).set(bot.username, {
    username: bot.username,
    rank:     bot.rank,
    avatar:   bot.avatar,
  });
  _io.to(roomId).emit('userJoined', { username: bot.username, rank: bot.rank });
  _pushOnlineList(roomId);
  console.log(`🤖 [Bot+] ${bot.username} (${bot.rank}) → غرفة ${roomId}`);
}

function botLeave(bot, roomId) {
  roomId = String(roomId);
  const reg = BOT_REGISTRY.get(roomId);
  if (reg) {
    reg.delete(bot.username);
    if (reg.size === 0) BOT_REGISTRY.delete(roomId);
  }
  _io.to(roomId).emit('userLeft', { username: bot.username });
  _pushOnlineList(roomId);
  console.log(`🤖 [Bot-] ${bot.username} ← غرفة ${roomId}`);
}

function botSendMessage(bot, roomId, msgPool) {
  const msg = pick(msgPool || MSG.general);
  _io.to(String(roomId)).emit('newMessage', {
    id:      null,
    username: bot.username,
    message:  msg,
    rank:     bot.rank,
    avatar:   bot.avatar || 'av1.svg',
    room_id:  String(roomId),
    time:     new Date().toISOString(),
    isBot:    true,
  });
}

function botActivateMic(bot, roomId, state) {
  roomId = String(roomId);
  if (state.isMicOn || !state.active) return;

  // رسالة قبل طلب الميك
  botSendMessage(bot, roomId, MSG.mic);

  // تأخير صغير ثم تشغيل المايك
  const t1 = setTimeout(() => {
    if (!state.active) return;
    state.isMicOn = true;
    _io.to(roomId).emit('micOn', { username: bot.username });

    // مدة الكلام: 10 - 35 ثانية
    const talkMs = rnd(10000, 35000);
    const t2 = setTimeout(() => {
      if (!state.isMicOn) return;
      state.isMicOn = false;
      _io.to(roomId).emit('micOff', { username: bot.username });
    }, talkMs);
    state.timers.push(t2);
  }, rnd(2000, 7000));
  state.timers.push(t1);
}

function botRaiseHand(bot, roomId) {
  _io.to(String(roomId)).emit('raiseHand', { username: bot.username });
}

/* ══════════════════════════════════════════
   دورة حياة بوت واحد (حلقة لا نهائية)
══════════════════════════════════════════ */
async function runBot(bot) {
  // تأخير أولي عشوائي (يمنع الدخول الجماعي)
  await delay(rnd(3000, 25000));

  while (true) {
    // تأكد من وجود غرف
    if (_roomIds.length === 0) {
      await refreshRooms();
      if (_roomIds.length === 0) { await delay(5000); continue; }
    }

    const roomId = '102';
    const state  = { active: true, isMicOn: false, timers: [] };

    // ── دخول الغرفة ──
    botJoin(bot, roomId);

    // رسالة ترحيبية بعد الدخول (للبوتات غير الصامتة)
    if (bot.behavior !== 'lurker') {
      const tw = setTimeout(() => {
        if (state.active) botSendMessage(bot, roomId, MSG.join);
      }, rnd(1500, 5000));
      state.timers.push(tw);
    }

    // مدة البقاء: lurker = 1-4 دق، غيره = 3-12 دق
    const stayMs  = bot.behavior === 'lurker'
      ? rnd(60000,  240000)
      : rnd(180000, 720000);
    const stayEnd = Date.now() + stayMs;

    /* ── جدولة الرسائل ── */
    const schedMsg = () => {
      // frekans حسب السلوك
      const minWait = bot.behavior === 'vip'     ? 15000 :
                      bot.behavior === 'speaker'  ? 20000 : 25000;
      const maxWait = bot.behavior === 'lurker'  ? 120000 :
                      bot.behavior === 'chatter'  ?  55000 : 75000;
      const wait = rnd(minWait, maxWait);
      if (Date.now() + wait >= stayEnd) return;
      const t = setTimeout(() => {
        if (state.active && Date.now() < stayEnd) {
          botSendMessage(bot, roomId);
          schedMsg();
        }
      }, wait);
      state.timers.push(t);
    };

    /* ── جدولة المايك ── */
    const schedMic = () => {
      if (!['active', 'speaker', 'vip'].includes(bot.behavior)) return;
      const wait = bot.behavior === 'vip'
        ? rnd(30000,  90000)
        : rnd(50000, 150000);
      if (Date.now() + wait >= stayEnd) return;
      const t = setTimeout(() => {
        if (state.active && Date.now() < stayEnd) {
          botActivateMic(bot, roomId, state);
          schedMic();
        }
      }, wait);
      state.timers.push(t);
    };

    /* ── جدولة رفع اليد ── */
    const schedHand = () => {
      if (bot.behavior === 'lurker') return;
      const wait = rnd(90000, 300000);
      if (Date.now() + wait >= stayEnd) return;
      const t = setTimeout(() => {
        if (state.active && Date.now() < stayEnd) {
          botRaiseHand(bot, roomId);
          schedHand();
        }
      }, wait);
      state.timers.push(t);
    };

    // تشغيل الجداول
    if (bot.behavior !== 'lurker') schedMsg();
    schedMic();
    if (rnd(0, 2) > 0) schedHand(); // 66% احتمال

    // ── انتظار مدة البقاء ──
    await delay(stayMs);

    // ── تنظيف ──
    state.active = false;
    state.timers.forEach(clearTimeout);
    state.timers = [];

    if (state.isMicOn) {
      state.isMicOn = false;
      _io.to(String(roomId)).emit('micOff', { username: bot.username });
    }

    botLeave(bot, roomId);

    // استراحة قبل الدخول من جديد (30 ثانية - 4 دقائق)
    await delay(rnd(30000, 240000));
  }
}

/* ══════════════════════════════════════════
   التهيئة الرئيسية — تُستدعى من index.js
══════════════════════════════════════════ */
function initBots(io, db, buildOnlineUsers) {
  _io         = io;
  _db         = db;
  _buildUsers = buildOnlineUsers;

  refreshRooms().then(() => {
    console.log(`\n🤖 تشغيل ${BOTS.length} بوت وهمي على ${_roomIds.length} غرفة نشطة`);
    BOTS.forEach(bot => {
      runBot(bot).catch(err =>
        console.error(`[Bot] خطأ في "${bot.username}":`, err.message)
      );
    });
  });

  // تحديث قائمة الغرف كل 5 دقائق
  setInterval(refreshRooms, 5 * 60 * 1000);
}

module.exports = { initBots, getBotUsers };
