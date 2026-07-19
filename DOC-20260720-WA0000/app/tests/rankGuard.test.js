'use strict';
/* ════════════════════════════════════════════════════════════════
   WidBid — tests/rankGuard.test.js   [S15]
   اختبارات وحدة لحارس الصلاحيات — بدون قاعدة بيانات (mock)
   التشغيل: node tests/rankGuard.test.js
════════════════════════════════════════════════════════════════ */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-s15';

/* ── Mock قاعدة البيانات قبل تحميل rankGuard ── */
const dbPath = require.resolve('../server/db');
require(dbPath);
const realQuery = require(dbPath).query;
let mockUsers = [];   /* [{id, username, rank, owner_id, super_root_id}] */
require(dbPath).query = async (sql, params) => {
  if (/SELECT rank FROM users WHERE username/.test(sql)) {
    const u = mockUsers.find(x => x.username === params[0]);
    return [u ? [{ rank: u.rank }] : []];
  }
  if (/FROM users a/.test(sql)) {   /* lineage */
    const [targetName, actorId] = params;
    const t = mockUsers.find(x => x.username === targetName);
    const a = mockUsers.find(x => x.id === actorId);
    const isParent = a && t && (a.owner_id === t.id || a.super_root_id === t.id);
    return [isParent ? [{ 1: 1 }] : []];
  }
  if (/INSERT INTO admin_actions_log/.test(sql)) return [{ insertId: 1 }];
  return [[]];
};

const jwt = require('jsonwebtoken');
const G   = require('../server/rankGuard');
const { RANKS, canActOn, maxAssignableRank, authenticateJoin } = G;

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else      { fail++; console.error(`  ❌ ${name}`); }
}
const mkSocket = (userData, token) => ({
  userData,
  handshake: { auth: { token } },
  emitted: [],
  emit(ev, msg) { this.emitted.push([ev, msg]); },
});
const memberToken = (id, username) => jwt.sign({ id, username }, process.env.JWT_SECRET);
const guestToken  = (username) => jwt.sign({ id: 0, username, rank: 100, isGuest: true }, process.env.JWT_SECRET);

/* ════════════ 1) canActOn — مصفوفة الدستور 19.3 ════════════ */
console.log('\n① canActOn — مصفوفة الطرد والحظر');
t('مشرف(500) يطرد زائر(100)',            canActOn(500, 100, 'kick') === true);
t('مشرف(500) يطرد عضو(200)',             canActOn(500, 200, 'kick') === true);
t('مشرف(500) ✗ محمي(300) محصّن',         canActOn(500, 300, 'kick') === false);
t('مشرف(500) ✗ ملكي(400)',               canActOn(500, 400, 'kick') === false);
t('سوبر أدمن(600) يطرد ملكي(400)',        canActOn(600, 400, 'kick') === true);
t('سوبر أدمن(600) ✗ حظر ملكي(400)',      canActOn(600, 400, 'ban')  === false);
t('ماستر(700) يحظر ملكي(400)',            canActOn(700, 400, 'ban')  === true);
t('ماستر(700) يطرد مشرف(500)',            canActOn(700, 500, 'kick') === true);
t('ماستر(700) ✗ محمي(300) محصّن',         canActOn(700, 300, 'kick') === false);
t('سوبر ماستر(800) يطرد محمي(300)',       canActOn(800, 300, 'kick') === true);
t('سوبر ماستر(800) يطرد سوبر أدمن(600)',  canActOn(800, 600, 'kick') === true);
t('سوبر ماستر(800) ✗ ماستر=مساوٍ… لا',    canActOn(800, 800, 'kick') === false);
t('لا أحد يطرد نفس رتبته (700↔700)',      canActOn(700, 700, 'kick') === false);
t('الأدنى ✗ الأعلى (500↔1200)',           canActOn(500, 1200, 'kick') === false);
t('زائر(100) لا إجراءات إدارية',          canActOn(100, 100, 'kick') === false);
t('عضو(200) لا يطرد زائراً حتى',          canActOn(200, 100, 'kick') === false);
t('سوبر أونر يطرد أونر(1100)',            canActOn(1200, 1100, 'kick') === true);
t('أونر(1100) ✗ سوبر أونر',              canActOn(1100, 1200, 'kick') === false);

/* ════════════ 2) maxAssignableRank — سقوف S14 ════════════ */
console.log('\n② maxAssignableRank — سقوف الترقية');
t('ماستر(700) → حتى 500',        maxAssignableRank(700)  === 500);
t('سوبر ماستر(800) → حتى 600',   maxAssignableRank(800)  === 600);
t('روت(900) → لا ترقية (0)',     maxAssignableRank(900)  === 0);
t('سوبر روت(1000) → حتى 800',    maxAssignableRank(1000) === 800);
t('أونر(1100) → حتى 1000',       maxAssignableRank(1100) === 1000);
t('سوبر أونر(1200) → حتى 1100',  maxAssignableRank(1200) === 1100);
t('مشرف(500) → لا شيء (0)',      maxAssignableRank(500)  === 0);

/* ════════════ 3) authenticateJoin — JWT هو الهوية ════════════ */
console.log('\n③ authenticateJoin — المصادقة');
{
  const tok = memberToken(42, 'Tamer');
  const id1 = authenticateJoin(mkSocket(null, tok), { username: 'مزيف', user_id: 999, rank: 1200 });
  t('عضو: user_id من التوكن لا من العميل',   id1.user_id === 42);
  t('عضو: username من التوكن لا من العميل',  id1.username === 'Tamer');
  t('عضو: rank=null (تُجلب من DB)',          id1.rank === null && id1.authed === true);

  const id2 = authenticateJoin(mkSocket(null, guestToken('ضيف_1')), { rank: 1200 });
  t('زائر بتوكن رسمي: rank=100 حتماً',  id2.rank === 100 && id2.isGuest === true);
  t('زائر بتوكن رسمي: user_id=null',    id2.user_id === null);

  const id3 = authenticateJoin(mkSocket(null, 'توكن_فاسد'), { username: 'محتال', user_id: 1, rank: 1200 });
  t('توكن فاسد → زائر صرف',             id3.rank === 100 && id3.user_id === null);
  t('توكن فاسد → لا ثقة بـ user_id',    id3.authed === false);

  const id4 = authenticateJoin(mkSocket(null, null), { username: 'مجهول' });
  t('بدون توكن → زائر باسم معقّم',      id4.rank === 100 && id4.username === 'مجهول');

  const id5 = authenticateJoin(mkSocket(null, null), { username: '  '.repeat(10) });
  t('اسم فارغ → "زائر"',                id5.username === 'زائر');
}

/* ════════════ 4) checkEvent — عبر installSocketGuard ════════════ */
console.log('\n④ checkEvent — فحص الأحداث الكامل (mock io)');
const { EventEmitter } = require('events');
function mkIo() {
  const io = new EventEmitter();
  io.use = (fn) => { io._mw = fn; };
  io.in  = () => ({ fetchSockets: async () => io._roomSockets || [] });
  io._roomSockets = [];
  G.installSocketGuard(io);
  return io;
}
function connectSocket(io, userData, token) {
  const handlers = [];
  const sock = {
    userData, handshake: { auth: { token } }, id: 'sock-' + Math.random().toString(36).slice(2),
    emitted: [], emit(ev, m) { this.emitted.push([ev, m]); },
    use(fn) { handlers.push(fn); },
  };
  io._mw(sock, () => {});
  sock._fire = async (event, data) => {
    let allowed = false;
    for (const h of handlers) {
      /* الرفض في socket.io = عدم استدعاء next إطلاقاً (الحزمة تُسقَط).
         ننتظر next أو مهلة قصيرة — أيهما أولاً */
      await new Promise((res) => {
        const timer = setTimeout(res, 25);
        h([event, data], () => { allowed = true; clearTimeout(timer); res(); });
      });
      if (!allowed) break;
    }
    return allowed;
  };
  return sock;
}
const run = async () => {
  const io = mkIo();

  /* زائر */
  const guest = connectSocket(io, { username: 'زائر', user_id: null, rank: 100, room_id: '1' });
  t('زائر يرسل رسالة',                await guest._fire('sendMessage', { room_id: 1, message: 'hi' }) === true);
  t('زائر ✗ يرسل صورة (200+)',        await guest._fire('sendImage',   { room_id: 1, image: 'x' }) === false);
  t('زائر ✗ يرفع يد (200+)',          await guest._fire('raiseHand',   { room_id: 1 }) === false);
  t('زائر ✗ يطرد (500+)',             await guest._fire('kickUser',    { room_id: 1, target: 'x' }) === false);
  t('زائر ✗ systemMessage (600+)',    await guest._fire('systemMessage', { room_id: 1, text: 'x' }) === false);
  t('زائر ✗ platformBroadcast',       await guest._fire('platformBroadcast', { text: 'x' }) === false);
  t('زائر joinRoom مفتوح',            await guest._fire('joinRoom',    { room_id: 1 }) === true);

  /* عضو (200) */
  const member = connectSocket(io, { username: 'عضو', user_id: 5, rank: 200, room_id: '1' });
  t('عضو يرفع يد',                    await member._fire('raiseHand',  { room_id: 1 }) === true);
  t('عضو يرسل صورة',                  await member._fire('sendImage',  { room_id: 1, image: 'x' }) === true);
  t('عضو ✗ يعيّن رتبة (700+)',        await member._fire('assignRole', { room_id: 1, target: 'a', new_rank: 200 }) === false);

  /* مشرف (500) */
  const admin = connectSocket(io, { username: 'مشرف', user_id: 10, rank: 500, room_id: '1' });
  io._roomSockets = [
    { userData: { username: 'هدف_زائر', rank: 100 } },
    { userData: { username: 'هدف_محمي', rank: 300 } },
    { userData: { username: 'هدف_سوبر', rank: 600 } },
  ];
  t('مشرف يكتم زائراً',               await admin._fire('muteUser', { room_id: 1, target: 'هدف_زائر' }) === true);
  t('مشرف ✗ يطرد محمياً (حصانة)',     await admin._fire('kickUser', { room_id: 1, target: 'هدف_محمي' }) === false);
  t('مشرف ✗ يكتم سوبر أدمن (أعلى)',    await admin._fire('muteUser', { room_id: 1, target: 'هدف_سوبر' }) === false);
  t('مشرف ✗ يكتم نفسه',               await admin._fire('muteUser', { room_id: 1, target: 'مشرف' }) === false);
  t('مشرف ✗ systemMessage (600+)',    await admin._fire('systemMessage', { room_id: 1, text: 'x' }) === false);
  t('مشرف يدير السبيكر',              await admin._fire('speakerExtend', { room_id: 1, seconds: 60 }) === true);

  /* سوبر ماستر (800) — سقف الترقية 600 */
  const sm = connectSocket(io, { username: 'SM', user_id: 20, rank: 800, room_id: '1' });
  mockUsers = [{ id: 50, username: 'عضو_بعيد', rank: 200 }];
  t('SM يرقّي عضواً لـ500 ✓',          await sm._fire('assignRole', { room_id: 1, target: 'عضو_بعيد', new_rank: 500 }) === true);
  t('SM يرقّي لـ600 ✓ (السقف)',        await sm._fire('assignRole', { room_id: 1, target: 'عضو_بعيد', new_rank: 600 }) === true);
  t('SM ✗ يرقّي لـ700 (فوق السقف)',    await sm._fire('assignRole', { room_id: 1, target: 'عضو_بعيد', new_rank: 700 }) === false);
  t('SM ✗ يرقّي لـ800 (= رتبته)',      await sm._fire('assignRole', { room_id: 1, target: 'عضو_بعيد', new_rank: 800 }) === false);

  /* روت (900) — لا ترقية إطلاقاً */
  const root = connectSocket(io, { username: 'Root', user_id: 30, rank: 900, room_id: '1' });
  t('روت ✗ يرقّي (سقفه 0)',           await root._fire('assignRole', { room_id: 1, target: 'عضو_بعيد', new_rank: 200 }) === false);
  t('روت يغيّر الثيم (900+)',          await root._fire('setTheme', { room_id: 1, theme: 'night' }) === true);

  /* حصانة النسب: سوبر روت أنشأ حساب ماستر — الماستر لا يعاقبه
     (الأب هنا أعلى رتبة — يُرفض بالرتبة أولاً) */
  mockUsers = [
    { id: 30, username: 'Root',  rank: 900,  super_root_id: 40 },
    { id: 40, username: 'أبي_الSR', rank: 1000 },
  ];
  const rootChild = connectSocket(io, { username: 'Root', user_id: 30, rank: 900, room_id: '1' });
  t('حصانة النسب: ✗ معاقبة الأب الأعلى', await rootChild._fire('banIP', { room_id: 1, target: 'أبي_الSR' }) === false);

  /* المسار الحقيقي لحصانة النسب: الأب أدنى رتبة حالياً (خُفّض بعد الإنشاء)
     — فحص الرتبة يسمح، لكن حصانة النسب تمنع */
  mockUsers = [
    { id: 30, username: 'Root',   rank: 900, super_root_id: 40 },
    { id: 40, username: 'أبي_المنخفض', rank: 500 },
  ];
  io._roomSockets = [{ userData: { username: 'أبي_المنخفض', rank: 500 } }];
  t('حصانة النسب: ✗ ولو كان الأب أدنى رتبة', await rootChild._fire('banIP', { room_id: 1, target: 'أبي_المنخفض' }) === false);
  /* والعكس: مستخدم عادي بنفس الرتبة → يسمح (ليس أباً) */
  mockUsers = [{ id: 41, username: 'مشرف_عادي', rank: 500 }];
  io._roomSockets = [{ userData: { username: 'مشرف_عادي', rank: 500 } }];
  t('بدون نسب: ✓ يسمح بالإجراء',          await rootChild._fire('banIP', { room_id: 1, target: 'مشرف_عادي' }) === true);

  /* سوبر أونر (1200) — كل شيء مفتوح */
  mockUsers = [{ id: 60, username: 'أونر_هدف', rank: 1100 }];
  const so = connectSocket(io, { username: 'SO', user_id: 1, rank: 1200, room_id: '1' });
  t('سوبر أونر يجمّد أونر',            await so._fire('emergencyFreeze', { target: 'أونر_هدف' }) === true);
  t('سوبر أونر platformBroadcast',     await so._fire('platformBroadcast', { text: 'x' }) === true);
  t('سوبر أونر ✗ يستهدف نفسه',         await so._fire('permanentBan', { target: 'SO' }) === false);

  /* نطاق البيانات الشخصية */
  const m2 = connectSocket(io, { username: 'عضو2', user_id: 77, rank: 200, room_id: '1' });
  t('عضو يقرأ أجهزته هو',              await m2._fire('getMyDevices', { user_id: 77 }) === true);
  t('عضو ✗ يقرأ أجهزة غيره',           await m2._fire('getMyDevices', { user_id: 78 }) === false);
  t('سوبر أونر ✓ يقرأ أجهزة أي أحد',   await so._fire('getMyDevices', { user_id: 78 }) === true);

  /* قبل الدخول (بدون userData) */
  const preJoin = connectSocket(io, null, null);
  t('قبل الدخول: ✗ sendMessage',       await preJoin._fire('sendMessage', { room_id: 1, message: 'x' }) === false);
  t('قبل الدخول: ✓ joinRoom',          await preJoin._fire('joinRoom', { room_id: 1 }) === true);

  /* حدث غير مسجّل → يسمح مع تحذير */
  t('حدث غير معروف يمرّ (مع تحذير)',   await guest._fire('futureEvent', {}) === true);

  /* رُفض → وصلت رسالة error للمخالف */
  const denied = guest.emitted.filter(([ev]) => ev === 'error').length;
  t('رسائل error وصلت للمخالف',        denied >= 5);
};

run().then(() => {
  console.log(`\n═══════════════════════════════`);
  console.log(`النتيجة: ${pass} ناجح / ${fail} فاشل`);
  require(require.resolve('../server/db')).query = realQuery;
  process.exit(fail ? 1 : 0);
}).catch((e) => { console.error('💥', e); process.exit(1); });
