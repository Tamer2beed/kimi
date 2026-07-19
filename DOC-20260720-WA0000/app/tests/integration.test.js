'use strict';
/* ════════════════════════════════════════════════════════════════
   WidBid — tests/integration.test.js   [S15]
   اختبار تكامل حقيقي: خادم فعلي + عملاء Socket.io فعليون
   يحاكي هجمات حقيقية: انتحال هوية، تصعيد صلاحيات، أحداث مزوّرة
   التشغيل: node tests/integration.test.js
════════════════════════════════════════════════════════════════ */
process.env.JWT_SECRET = 'integration-test-secret';
process.env.PORT       = '3999';
process.env.DB_HOST    = '127.0.0.1';

/* ── حقن DB وهمية في require cache قبل تحميل الخادم ── */
const dbPath = require.resolve('../server/db.js');
const users = [
  { id: 1, username: 'superowner', rank: 1200, is_banned: 0, is_active: 1, avatar: 'av1.svg' },
  { id: 2, username: 'admin1',     rank: 500,  is_banned: 0, is_active: 1, avatar: 'av2.svg' },
  { id: 3, username: 'member1',    rank: 200,  is_banned: 0, is_active: 1, avatar: 'av3.svg' },
];
const fakePool = {
  query: async (sql, params = []) => {
    if (/SELECT rank FROM users WHERE id/.test(sql)) {
      const u = users.find(x => x.id === Number(params[0]));
      return [u ? [{ rank: u.rank }] : []];
    }
    if (/SELECT .* FROM rooms WHERE id/.test(sql)) return [[]];
    if (/FROM messages m/.test(sql)) return [[]];
    if (/SELECT rank FROM users WHERE username/.test(sql)) {
      const u = users.find(x => x.username === params[0]);
      return [u ? [{ rank: u.rank }] : []];
    }
    if (/FROM users a/.test(sql)) return [[]];   /* no lineage */
    return [{ insertId: 1, affectedRows: 1 }];
  },
  getConnection: async () => ({ release() {} }),
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };

/* ── تعطيل البوتات والميدياسوب حتى لا تشوّش الاختبار ── */
const botsPath = require.resolve('../server/bots.js');
require.cache[botsPath] = { id: botsPath, filename: botsPath, loaded: true,
  exports: { initBots: () => {}, getBotUsers: () => [] } };
const msPath = require.resolve('../server/mediasoup.js');
require.cache[msPath] = { id: msPath, filename: msPath, loaded: true,
  exports: { initWorker: async () => {}, getOrCreateRoom: async () => { throw new Error('off'); },
             createTransport: async () => {}, sfuRooms: new Map(), cleanupRoom: () => {} } };

require('../server/index.js');

const jwt  = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');

const URL = 'http://127.0.0.1:3999';
const tok = (payload) => jwt.sign(payload, process.env.JWT_SECRET);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else      { fail++; console.error(`  ❌ ${name}`); }
};

function connect(token) {
  return new Promise((resolve, reject) => {
    const s = ioClient(URL, { auth: { token }, transports: ['websocket'], reconnection: false });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('timeout')), 4000);
  });
}
const join = (s, extra = {}) =>
  s.emit('joinRoom', { room_id: '1', username: 'x', ...extra });

async function run() {
  console.log('\n⑤ اختبار التكامل — هجمات حقيقية على خادم حي');
  await sleep(800); /* انتظر إقلاع الخادم */

  /* ── هجوم 1: انتحال هوية سوبر أونر (إرسال user_id + rank مزيفين بلا توكن) ── */
  {
    const s = await connect(null);
    const errs = [];
    s.on('error', (m) => errs.push(m));
    let myRank = null;
    s.on('userJoined', (d) => { if (d.username === 'المخترق') myRank = d.rank; });
    join(s, { username: 'المخترق', user_id: 1, rank: 1200 });   /* محاولة انتحال */
    await sleep(400);
    t('انتحال user_id بلا توكن → rank=100 وليس 1200', myRank === 100);

    /* محاولة استخدام صلاحيات 1200 بعد "الانتحال" */
    s.emit('platformBroadcast', { text: 'pwned', by: 'المخترق' });
    s.emit('emergencyFreeze', { target: 'member1', by: 'المخترق' });
    await sleep(300);
    t('platformBroadcast بعد الانتحال → مرفوض', errs.length >= 1);
    s.close();
  }

  /* ── هجوم 2: عضو حقيقي يحاول التصعيد لـ 1200 عبر assignRole ── */
  {
    const s = await connect(tok({ id: 3, username: 'member1' }));
    const errs = [];
    s.on('error', (m) => errs.push(m));
    join(s, { username: 'member1', rank: 1200 });   /* rank في الباكيت — يجب تجاهله */
    await sleep(400);
    s.emit('assignRole', { room_id: '1', target: 'member1', new_rank: 1200, by: 'member1' });
    s.emit('permanentBan', { target: 'superowner', by: 'member1' });
    await sleep(300);
    t('عضو يعيّن نفسه سوبر أونر → مرفوض', errs.length >= 1);
    t('عضو يحظر سوبر أونر → مرفوض', errs.length >= 2);
    s.close();
  }

  /* ── هجوم 3: زائر بتوكن زائر رسمي يحاول كتم الآخرين ── */
  {
    const s = await connect(tok({ id: 0, username: 'زائر_شرير', rank: 100, isGuest: true }));
    const errs = [];
    s.on('error', (m) => errs.push(m));
    join(s, { username: 'زائر_شرير', rank: 1200, user_id: 2 });
    await sleep(400);
    s.emit('muteUser', { room_id: '1', target: 'member1', by: 'زائر_شرير' });
    s.emit('clearRoomChat', { room_id: '1' });
    await sleep(300);
    t('زائر يكتم عضواً → مرفوض', errs.length >= 1);
    t('زائر يمسح شات الغرفة → مرفوض', errs.length >= 2);
    s.close();
  }

  /* ── المسار السليم: سوبر أونر حقيقي (توكن صحيح) يعمل بحرية ── */
  {
    const s = await connect(tok({ id: 1, username: 'superowner' }));
    const errs = [];
    s.on('error', (m) => errs.push(m));
    let gotStats = false;
    s.on('platformStats', () => { gotStats = true; });
    join(s, { username: 'superowner' });
    await sleep(400);
    s.emit('platformBroadcast', { text: 'إعلان رسمي', by: 'superowner' });
    s.emit('getPlatformStats', {});
    await sleep(300);
    t('سوبر أونر حقيقي: platformBroadcast ✓', errs.length === 0);
    t('سوبر أونر حقيقي: platformStats ✓', gotStats === true);
    s.close();
  }

  /* ── هجوم 4: توكن مزوّر بتوقيع خاطئ ── */
  {
    const fakeTok = jwt.sign({ id: 1, username: 'superowner' }, 'wrong-secret');
    const s = await connect(fakeTok);
    let myRank = null;
    s.on('userJoined', (d) => { if (d.username === 'دخيل') myRank = d.rank; });
    join(s, { username: 'دخيل' });
    await sleep(400);
    t('توكن بتوقيع خاطئ → زائر rank=100', myRank === 100);
    s.close();
  }

  /* ── هجوم 5: رسالة باسم مستخدم آخر (انتحال اسم في sendMessage) ── */
  {
    const s = await connect(tok({ id: 3, username: 'member1' }));
    join(s, { username: 'member1' });
    await sleep(400);
    const seen = [];
    s.on('newMessage', (m) => seen.push(m));
    s.emit('sendMessage', { room_id: '1', message: 'أنا سوبر أونر!', username: 'superowner', rank: 1200, user_id: 1 });
    await sleep(300);
    const mine = seen.find(m => m.message === 'أنا سوبر أونر!');
    t('انتحال اسم في الرسائل → الاسم الحقيقي من الجلسة', mine && mine.username === 'member1' && mine.rank === 200);
    s.close();
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`التكامل: ${pass} ناجح / ${fail} فاشل`);
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error('💥', e.message); process.exit(1); });
