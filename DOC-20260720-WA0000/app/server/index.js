const express  = require('express');
const http     = require('http');
const socketio = require('socket.io');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
require('dotenv').config();

// [SKILL-AUDIO][server/index.js:~9] — استيراد SFU
// تاريخ: 2026-06-25
const { initWorker, getOrCreateRoom, createTransport, sfuRooms, cleanupRoom } = require('./mediasoup');
const { initBots, getBotUsers } = require('./bots');

/* [S15] حارس الصلاحيات المركزي — وثيقة S14 (المرحلة التالية) */
const { installSocketGuard, authenticateJoin } = require('./rankGuard');

/* نظام التجميد — مستوى الـ module */
const frozenUsers = new Map();

const db          = require('./db');
const authRoutes  = require('./routes/Auth');
const roomRoutes  = require('./routes/rooms');
const roleRoutes  = require('./routes/roles');
const ownerRoutes = require('./routes/owner');
const usersRoutes = require('./routes/users');
const { router: pointsRouter, addPoints, POINTS_PER_MESSAGE } = require('./routes/points');

const app    = express();
const server = http.createServer(app);
const io     = socketio(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 5 * 1024 * 1024,   /* 5MB — لدعم صور البانر */
});

app.use(cors());
app.use(express.json());
app.use('/api/auth',   authRoutes);
app.use('/api/rooms',  roomRoutes);
app.use('/api/roles',  roleRoutes);
app.use('/api/owner',  ownerRoutes);
app.use('/api/users',  usersRoutes);
app.use('/api/points', pointsRouter);
app.use(express.static('public'));

app.get('/', (req, res) => res.send('WidBid Server Running ✅'));

/* [S15] تفعيل حارس الصلاحيات على كل أحداث Socket.io */
installSocketGuard(io);

/* ════════════════════════════════════════════════
   أدوات مساعدة
════════════════════════════════════════════════ */

// قراءة رتبة المستخدم من DB
async function getUserRank(userId) {
  if (!userId) return 100;
  try {
    const [rows] = await db.query(
      'SELECT rank FROM users WHERE id = ?', [userId]
    );
    return rows.length ? (rows[0].rank || 100) : 100;
  } catch { return 100; }
}

// قراءة إعدادات الغرفة (بانر + ثيم)
async function getRoomInfo(roomId) {
  try {
    const [rows] = await db.query(
      'SELECT welcome_message, theme, banner_mobile, banner_desktop FROM rooms WHERE id = ?', [roomId]
    );
    return rows.length ? rows[0] : { welcome_message: 'مرحباً بكم', theme: 'candy' };
  } catch { return { welcome_message: 'مرحباً بكم', theme: 'candy' }; }
}

// بناء قائمة المتواجدين مع الرتبة والحالة
async function buildOnlineUsers(roomId) {
  const sockets = await io.in(roomId).fetchSockets();
  const realUsers = sockets.map(s => ({
    username: s.userData?.username || s.username || '?',
    rank:     s.userData?.rank     || 100,
    status:   s.userData?.status   || 'available',
    isMuted:  s.userData?.isMuted  || false,
  })).filter(u => u.username !== '?');

  /* ── إضافة الأعضاء الوهميين (البوتات) ── */
  const botUsers = getBotUsers(String(roomId));
  return [...realUsers, ...botUsers];
}

// التحقق من صلاحية تنفيذ إجراء على هدف
function canActOn(actorRank, targetRank, minActorRank = 500) {
  return actorRank >= minActorRank && actorRank > targetRank;
}

/* ════════════════════════════════════════════════
   الألعاب
════════════════════════════════════════════════ */
const games = {};

/* ════════════════════════════════════════════════
   نظام الغرف في الذاكرة (طابور السبيكر)
════════════════════════════════════════════════ */
const rooms = {}; /* rooms[room_id] = { current, queue, defaultTime, timer } */

function _giveSpeaker(rid, user) {
  const R = rooms[rid];
  if (!R) return;
  clearTimeout(R.timer);
  clearTimeout(R.warnTimer);

  const duration = R.defaultTime || 120;
  const endsAt   = Date.now() + duration * 1000;
  R.current = { ...user, endsAt };
  R.queue   = R.queue.filter(u => u.username !== user.username);

  /* تحذير عند 5 ثوانٍ قبل الانتهاء */
  R.warnTimer = setTimeout(() => {
    if (!rooms[rid]?.current) return;
    if (rooms[rid].queue.length === 0) {
      /* الطابور فارغ → جدّد تلقائياً 60 ثانية */
      _autoRenew(rid);
    } else {
      /* يوجد طابور → أشعر المتحدث بأن وقته ينتهي */
      io.to(rid).emit('speakerWarning', {
        username : rooms[rid].current.username,
        remaining: 5,
      });
    }
  }, Math.max(0, (duration - 5) * 1000));

  /* انتهاء الوقت */
  R.timer = setTimeout(() => _nextSpeaker(rid), duration * 1000);

  _broadcastState(rid);
}

function _autoRenew(rid) {
  const R = rooms[rid];
  if (!R?.current) return;
  clearTimeout(R.timer);
  clearTimeout(R.warnTimer);

  const RENEW_SECS = 60;
  R.current.endsAt = Date.now() + RENEW_SECS * 1000;

  /* إشعار التجديد */
  io.to(rid).emit('speakerRenewed', {
    username : R.current.username,
    seconds  : RENEW_SECS,
  });
  _broadcastState(rid);

  /* تحذير عند 5 ثوانٍ من الوقت الجديد */
  R.warnTimer = setTimeout(() => {
    if (!rooms[rid]?.current) return;
    if (rooms[rid].queue.length === 0) {
      _autoRenew(rid);   /* جدّد مرة أخرى */
    } else {
      io.to(rid).emit('speakerWarning', {
        username : rooms[rid].current.username,
        remaining: 5,
      });
    }
  }, (RENEW_SECS - 5) * 1000);

  /* انتهاء الوقت الجديد */
  R.timer = setTimeout(() => _nextSpeaker(rid), RENEW_SECS * 1000);
}

function _nextSpeaker(rid) {
  const R = rooms[rid];
  if (!R) return;
  clearTimeout(R.timer);
  clearTimeout(R.warnTimer);
  R.current = null;
  if (R.queue.length) {
    _giveSpeaker(rid, R.queue[0]);
  } else {
    _broadcastState(rid);
  }
}

function _broadcastState(rid) {
  const R = rooms[rid];
  if (!R) return;
  const roomSize = io.sockets.adapter.rooms.get(rid)?.size || 0;
  console.log(`🔍 [DEBUG] _broadcastState لـ room=${rid} → current=${R.current?.username || 'فارغ'} | عدد المتصلين في هذه الغرفة فعلياً: ${roomSize}`);
  io.to(rid).emit('speakerState', {
    current:     R.current || null,
    queue:       R.queue   || [],
    defaultTime: R.defaultTime || 120,
    serverNow:   Date.now(),
  });
}

function _sendStateTo(sock, rid) {
  const R = rooms[rid];
  if (!R) return;
  sock.emit('speakerState', {
    current:     R.current || null,
    queue:       R.queue   || [],
    defaultTime: R.defaultTime || 120,
    serverNow:   Date.now(),
  });
}

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

/* ════════════════════════════════════════════════
   Socket.io
════════════════════════════════════════════════ */
io.on('connection', (socket) => {
  console.log(`🔌 connected: ${socket.id}`);

  /* ─── دخول الغرفة ─────────────────────────── */
  socket.on('joinRoom', async (data) => {
    /* [S15] الهوية تُشتق من JWT فقط — لا يُقبل username/user_id/rank من العميل
       (قبل هذا الإصلاح كان أي زائر يستطيع إرسال أي user_id فينتحل حساباً برتبته) */
    const identity = authenticateJoin(socket, data);
    const username = identity.username;
    const user_id  = identity.user_id;

    /* تحقق من التجميد */
    if (username && frozenUsers.has(username)) {
      const info = frozenUsers.get(username);
      socket.emit('error', `🧊 حسابك مجمّد بواسطة ${info.by} — تواصل مع إدارة الغرفة`);
      return;
    }
    const { room_id } = data;
    if (!room_id || !username) return;

    socket.join(room_id);

    // الرتبة: من DB للعضو الموثّق، أو 100 للزائر — لا تُقرأ من العميل أبداً
    const dbRank = user_id ? await getUserRank(user_id) : 100;

    // تخزين بيانات المستخدم على الـ socket
    socket.userData = {
      username,
      user_id: user_id || null,
      rank:    dbRank,
      room_id,
      status:  'available',
      isMuted: false,
      isMicOn: false,
    };
    socket.username = username;
    socket.room_id  = room_id;

    // إرسال إعدادات الغرفة (بانر + ثيم)
    const roomInfo = await getRoomInfo(room_id);
    socket.emit('roomInfo', roomInfo);

    /* إرسال البانر للداخل */
    if (roomInfo.banner_mobile || roomInfo.banner_desktop) {
      socket.emit('roomBanner', {
        mobile : roomInfo.banner_mobile  || null,
        desktop: roomInfo.banner_desktop || null,
      });
    }

    // سجل الرسائل (آخر 50 رسالة مع الرتبة)
    const [messages] = await db.query(`
      SELECT m.id, m.content, m.created_at, u.username, u.rank
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC LIMIT 50
    `, [room_id]);
    socket.emit('messageHistory', messages.reverse());

    // إبلاغ الجميع بالدخول
    io.to(room_id).emit('userJoined', { username, rank: dbRank });

    // تحديث قائمة المتواجدين
    const users = await buildOnlineUsers(room_id);
    io.to(room_id).emit('onlineUsers', users);

    // تهيئة غرفة السبيكر إن لم تكن موجودة + إرسال الحالة للداخل
    if (!rooms[room_id]) rooms[room_id] = { current: null, queue: [], defaultTime: 120, timer: null, warnTimer: null };
    _sendStateTo(socket, room_id);

    console.log(`👤 ${username} (rank:${dbRank}) joined room ${room_id}`);
  });

  /* ─── إرسال رسالة ─────────────────────────── */
  socket.on('sendMessage', async (data) => {
    const { room_id, message } = data;
    if (!message?.trim() || !room_id) return;

    // فحص الكتم
    if (socket.userData?.isMuted) {
      socket.emit('error', 'أنت مكتوم ولا يمكنك الكتابة');
      return;
    }

    /* [S15] الهوية من socket.userData فقط (مصدرها JWT/DB) */
    const user_id    = socket.userData?.user_id || null;
    const username   = socket.userData?.username;
    const senderRank = socket.userData?.rank || 100;

    try {
      let msgId = null;
      if (user_id) {
        const [res] = await db.query(
          'INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?)',
          [room_id, user_id, message]
        );
        msgId = res.insertId;
        await addPoints(user_id, POINTS_PER_MESSAGE, 'Message sent');
      }

      io.to(room_id).emit('newMessage', {
        id       : msgId,
        username,
        message,
        rank     : senderRank,
        avatar   : socket.userData?.avatar || 'av1.svg',
        room_id,
        time     : new Date().toISOString(),
      });
    } catch (err) {
      console.error('❌ sendMessage:', err.message);
    }
  });

  /* ── مسح شات الغرفة كاملاً (المشرف 500+) ── */
  /* ── مسح رسالة واحدة (صاحبها فقط أو مشرف) ── */
  socket.on('deleteMessage', async ({ room_id, msg_id }) => {
    const senderRank = socket.userData?.rank || 0;
    const myUserId   = socket.userData?.user_id;
    try {
      if (msg_id) {
        /* [S15] الملكية تُثبَت من DB لا من حقل "by" القادم من العميل
           (كان by قابلاً للتزوير — أي شخص يمرر اسم صاحب الرسالة) */
        if (senderRank < 500) {
          if (!myUserId) return;
          const [own] = await db.query(
            'SELECT 1 FROM messages WHERE id = ? AND room_id = ? AND sender_id = ? LIMIT 1',
            [msg_id, room_id, myUserId]
          );
          if (!own.length) return;
        }
        await db.query('DELETE FROM messages WHERE id = ? AND room_id = ?', [msg_id, room_id]);
      }
      io.to(String(room_id)).emit('messageDeleted', { msg_id });
    } catch (err) {
      console.error('deleteMessage:', err.message);
    }
  });

  socket.on('clearRoomChat', async (data) => {
    if ((socket.userData?.rank || 0) < 500) return;
    const { room_id } = data;
    try {
      await db.query('DELETE FROM messages WHERE room_id = ?', [room_id]);
      io.to(String(room_id)).emit('chatCleared', { by: socket.userData?.username });
    } catch (e) { console.error('clearRoomChat:', e.message); }
  });

  /* ─── مغادرة الغرفة ───────────────────────── */
  socket.on('leaveRoom', async (data) => {
    const { room_id, username } = data;
    socket.leave(room_id);
    io.to(room_id).emit('userLeft', { username });
    const users = await buildOnlineUsers(room_id);
    io.to(room_id).emit('onlineUsers', users);
  });

  /* ─── تغيير الحالة ────────────────────────── */
  socket.on('setStatus', async (data) => {
    const { room_id, username, status } = data;
    if (!socket.userData) return;
    socket.userData.status = status;
    io.to(room_id).emit('statusChanged', { username, status });
  });

  /* ─── المايك ──────────────────────────────── */
  socket.on('micOn', async (data) => {
    if (!socket.userData) return;
    socket.userData.isMicOn = true;
    io.to(data.room_id).emit('micOn', { username: data.username });
  });

  socket.on('micOff', async (data) => {
    if (!socket.userData) return;
    socket.userData.isMicOn = false;
    io.to(data.room_id).emit('micOff', { username: data.username });
  });

  /* ─── رفع اليد ────────────────────────────── */
  socket.on('raiseHand', (data) => {
    const { room_id, username } = data;
    // إبلاغ المشرفين فقط (Admin 500+)
    io.to(room_id).emit('raiseHand', { username });
  });

  /* ════════════════════════════════════════════
     نظام طابور السبيكر
  ════════════════════════════════════════════ */

  socket.on('muteUser', async (data) => {
    const { room_id, target, by } = data;
    const actorRank = socket.userData?.rank || 100;

    // تحقق من الصلاحية
    if (actorRank < 500) {
      socket.emit('error', 'ليس لديك صلاحية الكتم');
      return;
    }

    // إيجاد socket الهدف
    const roomSockets = await io.in(room_id).fetchSockets();
    const targetSocket = roomSockets.find(s => s.userData?.username === target);

    if (!targetSocket) { socket.emit('error', 'المستخدم غير موجود'); return; }

    const targetRank = targetSocket.userData?.rank || 100;
    if (!canActOn(actorRank, targetRank)) {
      socket.emit('error', 'لا يمكنك كتم شخص برتبة أعلى أو مساوية لك');
      return;
    }

    targetSocket.userData.isMuted = true;
    targetSocket.emit('youAreMuted', { by });
    io.to(room_id).emit('userMuted', { username: target, by });
    console.log(`🔇 ${by} muted ${target} in room ${room_id}`);
  });

  /* ─── فك الكتم ────────────────────────────── */
  socket.on('unmuteUser', async (data) => {
    const { room_id, target, by } = data;
    const actorRank = socket.userData?.rank || 100;
    if (actorRank < 500) { socket.emit('error', 'ليس لديك صلاحية'); return; }

    const roomSockets = await io.in(room_id).fetchSockets();
    const targetSocket = roomSockets.find(s => s.userData?.username === target);
    if (!targetSocket) return;

    targetSocket.userData.isMuted = false;
    targetSocket.emit('youAreUnmuted', { by });
    io.to(room_id).emit('userUnmuted', { username: target, by });
  });

  /* ─── طرد مستخدم ──────────────────────────── */
  socket.on('kickUser', async (data) => {
    const { room_id, target, by } = data;
    const actorRank = socket.userData?.rank || 100;

    if (actorRank < 500) {
      socket.emit('error', 'ليس لديك صلاحية الطرد');
      return;
    }

    const roomSockets = await io.in(room_id).fetchSockets();
    const targetSocket = roomSockets.find(s => s.userData?.username === target);
    if (!targetSocket) { socket.emit('error', 'المستخدم غير موجود'); return; }

    const targetRank = targetSocket.userData?.rank || 100;
    if (!canActOn(actorRank, targetRank)) {
      socket.emit('error', 'لا يمكنك طرد شخص برتبة أعلى أو مساوية لك');
      return;
    }

    targetSocket.emit('youAreKicked', { by });
    targetSocket.leave(room_id);
    io.to(room_id).emit('userKicked', { username: target, by });

    const users = await buildOnlineUsers(room_id);
    io.to(room_id).emit('onlineUsers', users);
    console.log(`🚪 ${by} kicked ${target} from room ${room_id}`);
  });

  /* ─── مسح الشات ───────────────────────────── */
  socket.on('clearChat', (data) => {
    const { room_id, by } = data;
    const actorRank = socket.userData?.rank || 100;
    if (actorRank < 500) { socket.emit('error', 'ليس لديك صلاحية مسح الشات'); return; }
    io.to(room_id).emit('chatCleared', { by });
    console.log(`🗑️ ${by} cleared chat in room ${room_id}`);
  });

  /* ─── تغيير ثيم الغرفة (Root 900+) ────────── */
  socket.on('setTheme', async (data) => {
    const { room_id, theme, by } = data;
    const actorRank = socket.userData?.rank || 100;
    if (actorRank < 900) { socket.emit('error', 'ليس لديك صلاحية تغيير الثيم'); return; }

    const validThemes = ['candy','ocean','flower','night','neutral'];
    if (!validThemes.includes(theme)) { socket.emit('error', 'ثيم غير صحيح'); return; }

    try {
      await db.query('UPDATE rooms SET theme = ? WHERE id = ?', [theme, room_id]);
      io.to(room_id).emit('themeChanged', { theme, by });
    } catch (err) { console.error('setTheme:', err.message); }
  });

  /* ─── تغيير بانر الترحيب (Master 700+) ────── */
  socket.on('setWelcome', async (data) => {
    const { room_id, message, by } = data;
    const actorRank = socket.userData?.rank || 100;
    if (actorRank < 700) { socket.emit('error', 'ليس لديك صلاحية تغيير البانر'); return; }

    try {
      await db.query(
        'UPDATE rooms SET welcome_message = ? WHERE id = ?',
        [message, room_id]
      );
      io.to(room_id).emit('welcomeUpdated', { message, by });
    } catch (err) { console.error('setWelcome:', err.message); }
  });

  /* ─── تبليغ عن الغرفة ─────────────────────── */
  socket.on('reportRoom', async (data) => {
    const { room_id, by } = data;
    try {
      await db.query(
        'INSERT INTO reports (room_id, reported_by, reason) VALUES (?, ?, ?)',
        [room_id, socket.userData?.user_id || null, 'User report']
      );
      socket.emit('reportSent', { ok: true });
      console.log(`🚨 Room ${room_id} reported by ${by}`);
    } catch (err) {
      // جدول التبليغات قد لا يكون موجوداً بعد — نسجل فقط
      console.log(`🚨 Report (no table yet): room ${room_id} by ${by}`);
      socket.emit('reportSent', { ok: true });
    }
  });

  /* ─── الألعاب (بدون تغيير) ────────────────── */
  socket.on('joinGame', async (data) => {
    const gameRoom = `game_${data.room_id}_${data.game}`;
    socket.join(gameRoom);
    socket.gameRoom = gameRoom;
    socket.gameUsername = data.username;

    if (!games[gameRoom]) {
      games[gameRoom] = { players:[], board:Array(9).fill(''), active:false, turn:'X' };
    }
    const game = games[gameRoom];
    if (game.players.length < 2 && !game.players.includes(data.username)) {
      game.players.push(data.username);
    }
    if (game.players.length === 2 && !game.active) {
      game.active = true;
      game.board  = Array(9).fill('');
      game.turn   = 'X';
      const sockets = await io.in(gameRoom).fetchSockets();
      sockets.forEach(s => {
        const isFirst = s.gameUsername === game.players[0];
        s.emit('gameStart', {
          playerX: game.players[0],
          playerO: game.players[1],
          symbol:  isFirst ? 'X' : 'O',
        });
      });
    }
  });

  socket.on('gameMove', (data) => {
    const gameRoom = `game_${data.room_id}_${data.game}`;
    const game = games[gameRoom];
    if (!game || !game.active || game.board[data.index] !== '' || data.symbol !== game.turn) return;

    game.board[data.index] = data.symbol;
    const nextTurn = data.symbol === 'X' ? 'O' : 'X';
    game.turn = nextTurn;
    io.to(gameRoom).emit('gameMove', { index:data.index, symbol:data.symbol, nextTurn });

    const winner = checkWinner(game.board);
    if (winner) {
      io.to(gameRoom).emit('gameOver', { winner });
      game.active = false;
    } else if (!game.board.includes('')) {
      io.to(gameRoom).emit('gameOver', { winner:'draw' });
      game.active = false;
    }
  });

  socket.on('restartGame', (data) => {
    const gameRoom = `game_${data.room_id}_${data.game}`;
    if (!games[gameRoom]) return;
    games[gameRoom].board  = Array(9).fill('');
    games[gameRoom].active = true;
    games[gameRoom].turn   = 'X';
    io.to(gameRoom).emit('gameStart', {
      playerX: games[gameRoom].players[0],
      playerO: games[gameRoom].players[1],
      symbol:  'X',
    });
  });

  /* ─── قائمة المشرفين (Super Admin 600+) ────── */
  socket.on('getAdminsList', async (data) => {
    if ((socket.userData?.rank || 0) < 600) return;
    const roomSockets = await io.in(data.room_id).fetchSockets();
    const admins = roomSockets
      .filter(s => s.userData?.rank >= 500 && s.userData?.rank < 700)
      .map(s => ({ username: s.userData.username, rank: s.userData.rank }));
    socket.emit('adminsList', admins);
  });

  /* ─── قائمة المكتومين (Super Admin 600+) ───── */
  socket.on('getMutedList', async (data) => {
    if ((socket.userData?.rank || 0) < 600) return;
    const roomSockets = await io.in(data.room_id).fetchSockets();
    const muted = roomSockets
      .filter(s => s.userData?.isMuted)
      .map(s => ({ username: s.userData.username }));
    socket.emit('mutedList', muted);
  });

  /* ─── إعلان عام (Super Admin 600+) ─────────── */
  socket.on('announcement', (data) => {
    if ((socket.userData?.rank || 0) < 600) return;
    const { room_id, text, by } = data;
    io.to(room_id).emit('announcement', { text, by });
  });

  /* ─── كتم الجميع ──────────────────────────── */
  socket.on('muteAll', async (data) => {
    const { room_id, by } = data;
    if ((socket.userData?.rank || 0) < 500) return;
    const roomSockets = await io.in(room_id).fetchSockets();
    roomSockets.forEach(s => {
      if (s.userData && s.userData.rank < 500 && s.userData.username !== by) {
        s.userData.isMuted = true;
        s.emit('youAreMuted', { by });
      }
    });
    io.to(room_id).emit('systemMessage', `🔇 ${by} أوقف الكتابة للجميع`);
  });

  /* ─── فك كتم الجميع ───────────────────────── */
  socket.on('unmuteAll', async (data) => {
    const { room_id, by } = data;
    if ((socket.userData?.rank || 0) < 500) return;
    const roomSockets = await io.in(room_id).fetchSockets();
    roomSockets.forEach(s => {
      if (s.userData) {
        s.userData.isMuted = false;
        s.emit('youAreUnmuted', { by });
      }
    });
    io.to(room_id).emit('systemMessage', `🔊 ${by} فتح الكتابة للجميع`);
  });

  /* ─── تحذير رسمي (Super Admin 600+) ────────── */
  socket.on('warnUser', async (data) => {
    const { room_id, target, reason, by } = data;
    if ((socket.userData?.rank || 0) < 600) return;
    const roomSockets = await io.in(room_id).fetchSockets();
    const targetSocket = roomSockets.find(s => s.userData?.username === target);
    if (targetSocket) {
      targetSocket.emit('youAreWarned', { by, reason });
    }
    io.to(room_id).emit('userWarned', { username: target, by });
    // حفظ التحذير في DB اختياري
    try {
      await db.query(
        'INSERT INTO warnings (room_id, target_username, reason, warned_by) VALUES (?,?,?,?)',
        [room_id, target, reason, by]
      );
    } catch {}
  });

  /* ─── رسالة نظام عامة ─────────────────────── */
  socket.on('systemMessage', (data) => {
    io.to(data.room_id).emit('systemMessage', data.text);
  });

  /* ─── قطع الاتصال ─────────────────────────── */
  socket.on('disconnect', async () => {
    console.log(`❌ disconnected: ${socket.id}`);

    const room_id = socket.userData?.room_id || socket.room_id;
    const username = socket.userData?.username || socket.username;

    if (room_id && username) {
      io.to(room_id).emit('userLeft', { username });
      const users = await buildOnlineUsers(room_id);
      io.to(room_id).emit('onlineUsers', users);
    }

    /* [FIX] تنظيف طابور السبيكر — لو هذا المستخدم كان المتحدث الحالي ولم يضغط
       "إنهاء التحدث" قبل قطع الاتصال (إغلاق التبويب/تحديث الصفحة)، يبقى السيرفر
       "يعتقد" أنه لا يزال يتحدث حتى ينتهي المؤقت تلقائياً — هذا يمنع أي شخص آخر
       من الحصول على المايك مباشرة رغم عدم وجود متحدث فعلي */
    if (room_id && username) {
      const rid = String(room_id);
      const R   = rooms[rid];
      if (R) {
        if (R.current?.username === username) {
          _nextSpeaker(rid);
        } else if (R.queue.some(u => u.username === username)) {
          R.queue = R.queue.filter(u => u.username !== username);
          _broadcastState(rid);
        }
      }
    }

    if (socket.gameRoom) {
      io.to(socket.gameRoom).emit('playerLeft');
      delete games[socket.gameRoom];
    }

    // [VIDEO-WEBRTC] تنظيف البث عند قطع الاتصال
    if (socket.userData?.isBroadcasting && room_id) {
      const rid = String(room_id);
      if (global.broadcasters?.[rid]) delete global.broadcasters[rid][username];
      io.to(rid).emit('broadcastStopped', { username });
    }

    // [SKILL-AUDIO] تنظيف SFU عند قطع الاتصال
    if (room_id) {
      const sfuRoom = sfuRooms.get(String(room_id));
      if (sfuRoom) {
        /* أغلق producers هذا المستخدم */
        for (const [pid, { producer, username: pUser }] of sfuRoom.producers) {
          if (pUser === username) {
            producer.close();
            sfuRoom.producers.delete(pid);
            socket.to(String(room_id)).emit('audio:producerClosed', { producerId: pid });
          }
        }
        /* [FIX] أغلق واحذف transports هذا المستخدم — كانت تبقى للأبد في الذاكرة بدون هذا */
        if (socket.audioSendTransport) {
          sfuRoom.sendTransports.delete(socket.audioSendTransport.id);
          socket.audioSendTransport.close();
          socket.audioSendTransport = null;
        }
        if (socket.audioRecvTransport) {
          sfuRoom.recvTransports.delete(socket.audioRecvTransport.id);
          socket.audioRecvTransport.close();
          socket.audioRecvTransport = null;
        }
        cleanupRoom(String(room_id));
      }
    }
  });

  /* ── بانر الغرفة ──────────────────────── */
  socket.on('setBanner', async (data) => {
    if ((socket.userData?.rank || 0) < 500) {
      console.log('setBanner: rejected — rank too low');
      return;
    }
    const { room_id, mobile, desktop } = data;
    console.log(`setBanner: room=${room_id} mobile=${mobile?.length||0}chars desktop=${desktop?.length||0}chars`);
    try {
      const [result] = await db.query(
        `UPDATE rooms SET banner_mobile = ?, banner_desktop = ? WHERE id = ?`,
        [mobile || null, desktop || null, room_id]
      );
      console.log(`setBanner: updated ${result.affectedRows} rows`);
      io.to(String(room_id)).emit('bannerUpdated', { mobile, desktop });
    } catch (e) {
      console.error('setBanner ERROR:', e.message);
      socket.emit('bannerError', { message: e.message });
    }
  });

  /* ── إرسال صورة ─────────────────────── */
  socket.on('sendImage', async (data) => {
    const { room_id, image, caption } = data;
    if (!image || !room_id) return;
    /* [S15] الهوية من socket.userData فقط — لا تُقبل من العميل */
    io.to(String(room_id)).emit('newImage', {
      username: socket.userData?.username || 'مجهول',
      rank:     socket.userData?.rank     || 100,
      image,
      caption:  caption  || '',
      time:     new Date().toISOString(),
    });
  });

  /* ════════════════════════════════════════════════
     نظام طابور السبيكر — Speaker Queue System
  ════════════════════════════════════════════════ */

  socket.on('speakerRequest', (data) => {
    /* [S15] الهوية والرتبة من socket.userData فقط — لا تُقبل من العميل
       (كان أي مستخدم يستطيع إرسال rank مزيّف ليتقدم في الطابور).
       ملاحظة: rankGuard يفرض joined:true لهذا الحدث فـ userData موجود دائماً */
    const room_id  = data.room_id;
    const username = socket.userData.username;
    const rank     = socket.userData.rank;
    const rid = String(room_id);
    console.log(`🔍 [DEBUG] speakerRequest وصل: room=${rid} user=${username} rank=${rank}`);

    if (!rooms[rid]) rooms[rid] = { current: null, queue: [], defaultTime: 120, timer: null };
    const R = rooms[rid];
    console.log(`🔍 [DEBUG] حالة الغرفة قبل المعالجة: current=${R.current?.username || 'فارغ'} queue=${R.queue.length}`);

    /* إذا السبيكر فارغ → أعطه فوراً */
    if (!R.current) {
      console.log(`🔍 [DEBUG] السبيكر فارغ → استدعاء _giveSpeaker لـ ${username}`);
      _giveSpeaker(rid, { username, rank });
    } else if (R.current.username === username) {
      console.log(`🔍 [DEBUG] ${username} هو المتحدث الحالي بالفعل — لا شيء`);
    } else if (!R.queue.find(u => u.username === username)) {
      console.log(`🔍 [DEBUG] السبيكر مشغول بـ ${R.current.username} → إضافة ${username} للطابور`);
      R.queue.push({ username, rank });
      _broadcastState(rid);
    }
  });

  socket.on('speakerDone', (data) => {
    const rid = String(data.room_id);
    const R   = rooms[rid];
    if (!R || R.current?.username !== data.username) return;
    _nextSpeaker(rid);
  });

  socket.on('speakerLeaveQueue', (data) => {
    const rid = String(data.room_id);
    const R   = rooms[rid];
    if (!R) return;
    R.queue = R.queue.filter(u => u.username !== data.username);
    _broadcastState(rid);
  });

  socket.on('speakerExtend', (data) => {
    if ((socket.userData?.rank || 0) < 500) return;
    const rid = String(data.room_id);
    const R   = rooms[rid];
    if (!R?.current) return;
    const secs = Math.min(300, Math.max(10, parseInt(data.seconds) || 60));
    R.current.endsAt += secs * 1000;
    clearTimeout(R.timer);
    R.timer = setTimeout(() => _nextSpeaker(rid), R.current.endsAt - Date.now());
    io.to(rid).emit('speakerTimeUpdated', { endsAt: R.current.endsAt });
    _broadcastState(rid);
  });

  socket.on('speakerRevoke', (data) => {
    if ((socket.userData?.rank || 0) < 500) return;
    const rid = String(data.room_id);
    _nextSpeaker(rid);
  });

  socket.on('speakerSkip', (data) => {
    if ((socket.userData?.rank || 0) < 500) return;
    const rid = String(data.room_id);
    const R   = rooms[rid];
    if (!R || !R.queue.length) return;
    R.queue.shift(); /* احذف الأول من الطابور */
    _broadcastState(rid);
  });

  socket.on('speakerGiveTo', (data) => {
    if ((socket.userData?.rank || 0) < 500) return;
    const rid    = String(data.room_id);
    const R      = rooms[rid];
    if (!R) return;
    const target = R.queue.find(u => u.username === data.target);
    if (!target) return;
    /* انقل المستهدف لأول الطابور */
    R.queue = [target, ...R.queue.filter(u => u.username !== data.target)];
    _nextSpeaker(rid);
  });

  /* ══ عند دخول الغرفة — أرسل الحالة الحالية ══ */
  const _origJoin = socket.listeners?.('joinRoom');
  socket.on('joinRoom_speakerSync', (data) => {
    const rid = String(data.room_id);
    if (rooms[rid]) _sendStateTo(socket, rid);
  });

  /* ════════════════════════════════════════════════
     أحداث البث المباشر — Video Broadcast
     (UI فقط الآن — Phase 21: يُضاف WebRTC/Mediasoup)
  ════════════════════════════════════════════════ */

  /* ════════════════════════════════════════════════
     [VIDEO-WEBRTC] أحداث البث المباشر — WebRTC P2P
     الحد الأقصى: 20 مشاهد لكل مُذيع
     السيرفر = Signaling فقط (لا يمر الفيديو منه)
     تاريخ: 2026-06-25
  ════════════════════════════════════════════════ */

  const VIDEO_MAX_VIEWERS = 20;

  /* يتتبع المُذيعين وعدد مشاهديهم في الذاكرة */
  /* broadcasters[room_id][username] = viewerCount  */
  if (!global.broadcasters) global.broadcasters = {};

  socket.on('startBroadcast', (data) => {
    const uname   = socket.userData?.username || data.username;
    const room_id = String(data.room_id);
    if (!global.broadcasters[room_id]) global.broadcasters[room_id] = {};
    global.broadcasters[room_id][uname] = 0;
    socket.userData.isBroadcasting = true;
    socket.to(room_id).emit('broadcastStarted', { username: uname });
    console.log(`📹 ${uname} بدأ البث في ${room_id}`);
  });

  socket.on('stopBroadcast', (data) => {
    const uname   = socket.userData?.username || '';
    const room_id = String(data.room_id);
    if (global.broadcasters[room_id]) delete global.broadcasters[room_id][uname];
    socket.userData.isBroadcasting = false;
    socket.to(room_id).emit('broadcastStopped', { username: uname });
    console.log(`📹 ${uname} أوقف البث في ${room_id}`);
  });

  /* المشاهد → طلب مشاهدة → نُمرره للمُذيع */
  socket.on('requestWatch', ({ room_id, broadcaster, viewer }) => {
    const rid = String(room_id);
    /* فحص الحد الأقصى */
    const count = global.broadcasters[rid]?.[broadcaster] ?? 0;
    if (count >= VIDEO_MAX_VIEWERS) {
      socket.emit('watchRejected', { reason: 'full' });
      return;
    }
    /* أرسل الطلب للمُذيع فقط */
    const roomSockets = io.sockets.adapter.rooms.get(rid);
    if (!roomSockets) { socket.emit('watchRejected', { reason: 'offline' }); return; }
    for (const sid of roomSockets) {
      const s = io.sockets.sockets.get(sid);
      if (s?.userData?.username === broadcaster) {
        s.emit('watchRequest', { viewer, room_id: rid });
        break;
      }
    }
  });

  /* المُذيع → يرد (قبول + Offer WebRTC / رفض) → للمشاهد */
  socket.on('broadcastAnswer', ({ room_id, viewer, accepted, offer, reason }) => {
    const rid     = String(room_id);
    const bname   = socket.userData?.username;
    const roomSockets = io.sockets.adapter.rooms.get(rid);
    if (!roomSockets) return;
    for (const sid of roomSockets) {
      const s = io.sockets.sockets.get(sid);
      if (s?.userData?.username === viewer) {
        if (accepted) {
          /* زِد عداد المشاهدين */
          if (global.broadcasters[rid]?.[bname] !== undefined) {
            global.broadcasters[rid][bname]++;
            io.to(rid).emit('viewerCount', {
              username: bname,
              count   : global.broadcasters[rid][bname],
            });
          }
          s.emit('watchAccepted', { broadcaster: bname, offer });
        } else {
          s.emit('watchRejected', { reason: reason || 'rejected' });
        }
        break;
      }
    }
  });

  /* [VIDEO-WEBRTC] Answer من المشاهد → للمُذيع */
  socket.on('webrtc:answer', ({ room_id, broadcaster, viewer, answer }) => {
    const rid = String(room_id);
    const roomSockets = io.sockets.adapter.rooms.get(rid);
    if (!roomSockets) return;
    for (const sid of roomSockets) {
      const s = io.sockets.sockets.get(sid);
      if (s?.userData?.username === broadcaster) {
        s.emit('webrtc:answer', { viewer, answer });
        break;
      }
    }
  });

  /* [VIDEO-WEBRTC] ICE candidate — مُمرَّر بين الطرفين */
  socket.on('webrtc:ice', ({ room_id, to, from, candidate }) => {
    const rid = String(room_id);
    const roomSockets = io.sockets.adapter.rooms.get(rid);
    if (!roomSockets) return;
    for (const sid of roomSockets) {
      const s = io.sockets.sockets.get(sid);
      if (s?.userData?.username === to) {
        s.emit('webrtc:ice', { from, candidate });
        break;
      }
    }
  });

  /* [VIDEO-WEBRTC] تنظيف عند قطع الاتصال — في disconnect handler أدناه */

  /* ════════════════════════════════════════════════
     أحداث الرتب المتقدمة — Master → Super Owner
     (تم نقلها داخل connection بعد إصلاح خلل البنية —
      كانت معرّفة خارج نطاق socket فتسبب ReferenceError)
  ════════════════════════════════════════════════ */

  // ── تعيين رتبة (Master 700+) ─────────────────
  socket.on('assignRole', async (data) => {
    const { room_id, target, new_rank, by } = data;
    const actorRank = socket.userData?.rank || 0;
    if (actorRank < 700) { socket.emit('error', 'ليس لديك صلاحية تعيين الرتب'); return; }

    try {
      await db.query('UPDATE users SET rank = ? WHERE username = ?', [new_rank, target]);
      // تحديث socket الهدف إذا كان متصلاً
      const roomSockets = await io.in(room_id).fetchSockets();
      const ts = roomSockets.find(s => s.userData?.username === target);
      if (ts) ts.userData.rank = new_rank;
      io.to(room_id).emit('roleAssigned', { target, new_rank, by });
    } catch (e) { console.error('assignRole:', e.message); }
  });

  // ── حظر IP (Master 700+) ─────────────────────
  socket.on('banIP', async (data) => {
    const { room_id, target, by } = data;
    if ((socket.userData?.rank||0) < 700) return;
    try {
      const roomSockets = await io.in(room_id).fetchSockets();
      const ts = roomSockets.find(s => s.userData?.username === target);
      if (ts) {
        await db.query(
          'INSERT INTO ip_bans (room_id, ip_address, banned_by, expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 24 HOUR))',
          [room_id, ts.handshake?.address || '0.0.0.0', by]
        );
        ts.emit('youAreKicked', { by, reason: 'IP Ban' });
        ts.leave(room_id);
      }
      io.to(room_id).emit('ipBanned', { target, by });
    } catch (e) { console.error('banIP:', e.message); }
  });

  // ── حظر الجهاز (Super Master 800+) ──────────
  socket.on('banDevice', async (data) => {
    const { room_id, target, by } = data;
    if ((socket.userData?.rank||0) < 800) return;
    try {
      await db.query(
        'INSERT INTO device_bans (username, banned_by, created_at) VALUES (?,?,NOW())',
        [target, by]
      );
      const roomSockets = await io.in(room_id).fetchSockets();
      const ts = roomSockets.find(s => s.userData?.username === target);
      if (ts) { ts.emit('youAreKicked', { by, reason: 'Device Ban' }); ts.leave(room_id); }
      io.to(room_id).emit('deviceBanned', { target, by });
    } catch (e) { console.error('banDevice:', e.message); }
  });

  // ── قفل الغرفة (Super Master 800+) ──────────
  socket.on('lockRoom', async (data) => {
    const { room_id, locked, by } = data;
    if ((socket.userData?.rank||0) < 800) return;
    try {
      await db.query('UPDATE rooms SET is_locked = ? WHERE id = ?', [locked ? 1 : 0, room_id]);
      io.to(room_id).emit('roomLocked', { locked, by });
    } catch (e) { console.error('lockRoom:', e.message); }
  });

  // ── التحكم بكل الميكات (Master 700+) ─────────
  socket.on('controlAllMics', async (data) => {
    const { room_id, action, by } = data;
    if ((socket.userData?.rank||0) < 700) return;
    const roomSockets = await io.in(room_id).fetchSockets();
    roomSockets.forEach(s => {
      if (s.userData && s.userData.rank < 700) {
        s.userData.isMicOn = action === 'enable';
        s.emit(action === 'enable' ? 'micEnabled' : 'micDisabled', { by });
      }
    });
    io.to(room_id).emit('allMicsControlled', { action, by });
  });

  // ── الكوتة (Super Master 800+) ───────────────
  socket.on('getQuota', async (data) => {
    const { room_id, user_id } = data;
    try {
      const [rows] = await db.query(
        'SELECT quota_total, quota_used FROM user_quotas WHERE user_id = ? AND room_id = ?',
        [user_id, room_id]
      );
      socket.emit('quotaInfo', rows[0] || { total: 5, used: 0 });
    } catch { socket.emit('quotaInfo', { total: 5, used: 0 }); }
  });

  // ── تسجيل الجهاز (Root 900+) ─────────────────
  socket.on('registerDevice', async (data) => {
    const { user_id, device_id, device_name } = data;
    if ((socket.userData?.rank||0) < 900) return;
    try {
      await db.query(
        `INSERT INTO user_devices (user_id, device_id, device_name, registered_at)
         VALUES (?,?,?,NOW()) ON DUPLICATE KEY UPDATE device_name=?, last_used=NOW()`,
        [user_id, device_id, device_name, device_name]
      );
      socket.emit('deviceRegistered', { ok: true });
    } catch (e) { console.error('registerDevice:', e.message); }
  });

  socket.on('getMyDevices', async (data) => {
    /* [S15] user_id من الجلسة الموثّقة فقط — لا يُقبل من العميل */
    const user_id = socket.userData?.user_id;
    if (!user_id) return socket.emit('myDevices', []);
    try {
      const [rows] = await db.query(
        'SELECT device_id, device_name, registered_at FROM user_devices WHERE user_id = ?',
        [user_id]
      );
      socket.emit('myDevices', rows);
    } catch { socket.emit('myDevices', []); }
  });

  socket.on('removeDevice', async (data) => {
    const user_id = socket.userData?.user_id;
    if (!user_id) return;
    const { device_id } = data;
    try {
      await db.query('DELETE FROM user_devices WHERE user_id=? AND device_id=?', [user_id, device_id]);
    } catch {}
  });

  // ── تقرير الغرفة ─────────────────────────────
  socket.on('getRoomStats', async (data) => {
    const { room_id } = data;
    try {
      const sockets = await io.in(room_id).fetchSockets();
      socket.emit('roomStats', {
        online:   sockets.length,
        messages: 0, // من DB
        uptime:   0,
      });
    } catch { socket.emit('roomStats', { online:0, messages:0, uptime:0 }); }
  });

  socket.on('getRoomReport', async (data) => {
    const { room_id } = data;
    try {
      const sockets = await io.in(room_id).fetchSockets();
      const [msgRows] = await db.query(
        'SELECT COUNT(*) as cnt FROM messages WHERE room_id=? AND DATE(created_at)=CURDATE()',
        [room_id]
      );
      socket.emit('roomReport', {
        online:          sockets.length,
        messages_today:  msgRows[0]?.cnt || 0,
        joins_today:     0,
        admin_actions:   0,
        uptime_hours:    0,
        activity_score:  'جيد',
      });
    } catch { socket.emit('roomReport', {}); }
  });

  // ── Super Root ────────────────────────────────
  socket.on('getSuperRootRooms', async (data) => {
    const { user_id } = data;
    try {
      const [rows] = await db.query(
        `SELECT r.*, u.username as master_name
         FROM rooms r
         LEFT JOIN room_masters rm ON rm.room_id = r.id
         LEFT JOIN users u ON u.id = rm.user_id
         WHERE r.super_root_id = ?`,
        [user_id]
      );
      socket.emit('superRootRooms', rows);
    } catch { socket.emit('superRootRooms', []); }
  });

  socket.on('getSuperRootReport', async (data) => {
    socket.emit('superRootReport', {
      messages_today: 0, joins_today: 0,
      admin_actions: 0, avg_uptime: 0, top_rooms: []
    });
  });

  socket.on('getMySuperRootRoots', async (data) => {
    const { user_id } = data;
    try {
      const [rows] = await db.query(
        'SELECT username, active_rooms FROM users WHERE super_root_id=? AND rank=900', [user_id]
      );
      socket.emit('mySuperRootRoots', rows);
    } catch { socket.emit('mySuperRootRoots', []); }
  });

  socket.on('superRootBroadcast', async (data) => {
    if ((socket.userData?.rank||0) < 1000) return;
    const { text, by, user_id } = data;
    try {
      const [rooms] = await db.query(
        'SELECT id FROM rooms WHERE super_root_id=?', [user_id]
      );
      rooms.forEach(r => io.to(String(r.id)).emit('superRootBroadcast', { text, by }));
    } catch {}
  });

  socket.on('transferMember', async (data) => {
    if ((socket.userData?.rank||0) < 1000) return;
    const { from_room, to_room, target, by } = data;
    const allSockets = await io.fetchSockets();
    const ts = allSockets.find(s => s.userData?.username === target);
    if (!ts) { socket.emit('error', 'المستخدم غير متصل'); return; }
    try {
      const [rows] = await db.query('SELECT name FROM rooms WHERE id=?', [to_room]);
      const toRoomName = rows[0]?.name || to_room;
      ts.leave(String(from_room));
      ts.join(String(to_room));
      ts.userData.room_id = to_room;
      ts.emit('transferredToRoom', { room_id: to_room, room_name: toRoomName });
      io.to(String(from_room)).emit('memberTransferred', { target, to_room_name: toRoomName, by });
    } catch (e) { console.error('transferMember:', e.message); }
  });

  socket.on('createRoot', async (data) => {
    if ((socket.userData?.rank||0) < 1000) return;
    const { target, super_root_id, by } = data;
    try {
      await db.query('UPDATE users SET rank=900, super_root_id=? WHERE username=?', [super_root_id, target]);
      io.emit('systemMessage', `✅ ${target} أصبح Root`);
    } catch (e) { console.error('createRoot:', e.message); }
  });

  // ── Owner ─────────────────────────────────────
  socket.on('getOwnerRooms', async (data) => {
    const { user_id } = data;
    try {
      const [rows] = await db.query(
        `SELECT r.*, u.username as master_name
         FROM rooms r
         LEFT JOIN room_masters rm ON rm.room_id=r.id
         LEFT JOIN users u ON u.id=rm.user_id
         WHERE r.owner_id=?`, [user_id]
      );
      socket.emit('ownerRooms', rows);
    } catch { socket.emit('ownerRooms', []); }
  });

  socket.on('freezeRoom', async (data) => {
    if ((socket.userData?.rank||0) < 1100) return;
    const { room_id, by } = data;
    try {
      await db.query('UPDATE rooms SET is_frozen=1 WHERE id=?', [room_id]);
      io.to(String(room_id)).emit('roomFrozen', { room_id, by });
    } catch {}
  });

  socket.on('unfreezeRoom', async (data) => {
    if ((socket.userData?.rank||0) < 1100) return;
    const { room_id, by } = data;
    try {
      await db.query('UPDATE rooms SET is_frozen=0 WHERE id=?', [room_id]);
      io.to(String(room_id)).emit('roomUnfrozen', { room_id, by });
    } catch {}
  });

  socket.on('deleteRoom', async (data) => {
    if ((socket.userData?.rank||0) < 1100) return;
    const { room_id, by } = data;
    try {
      io.to(String(room_id)).emit('roomDeleted', { room_id, by });
      await db.query('DELETE FROM rooms WHERE id=?', [room_id]);
    } catch {}
  });

  // ── Super Owner ───────────────────────────────
  socket.on('getPlatformStats', async (data) => {
    if ((socket.userData?.rank||0) < 1200) return;
    try {
      const [[users]]  = await db.query('SELECT COUNT(*) as c FROM users');
      const [[rooms]]  = await db.query('SELECT COUNT(*) as c FROM rooms');
      const [[active]] = await db.query('SELECT COUNT(*) as c FROM rooms WHERE is_active=1');
      const [[owners]] = await db.query('SELECT COUNT(*) as c FROM users WHERE rank=1100');
      const [[sroots]] = await db.query('SELECT COUNT(*) as c FROM users WHERE rank=1000');
      const [[msgs]]   = await db.query('SELECT COUNT(*) as c FROM messages WHERE DATE(created_at)=CURDATE()');
      socket.emit('platformStats', {
        total_users:       users.c,
        total_rooms:       rooms.c,
        active_rooms:      active.c,
        total_owners:      owners.c,
        total_sroots:      sroots.c,
        messages_today:    msgs.c,
        top_rooms:         [],
        joins_last_hour:   0,
        messages_last_hour:0,
        actions_last_hour: 0,
      });
    } catch { socket.emit('platformStats', {}); }
  });

  socket.on('getAllOwners', async (data) => {
    if ((socket.userData?.rank||0) < 1200) return;
    try {
      const [rows] = await db.query(
        `SELECT u.username, u.is_active,
          (SELECT COUNT(*) FROM rooms WHERE owner_id=u.id) as room_count,
          (SELECT COUNT(*) FROM users WHERE super_root_id=u.id) as sroot_count,
          20 as max_rooms
         FROM users u WHERE u.rank=1100`
      );
      socket.emit('allOwners', rows);
    } catch { socket.emit('allOwners', []); }
  });

  socket.on('getPlatformTree', async (data) => {
    if ((socket.userData?.rank||0) < 1200) return;
    try {
      const [sroots] = await db.query('SELECT id, username FROM users WHERE rank=1000');
      const tree = await Promise.all(sroots.map(async sr => {
        const [roots] = await db.query('SELECT id, username FROM users WHERE rank=900 AND super_root_id=?', [sr.id]);
        const rootsWithRooms = await Promise.all(roots.map(async r => {
          const [rooms] = await db.query('SELECT id, name, member_count, is_active FROM rooms WHERE root_id=?', [r.id]);
          return { ...r, rooms, room_count: rooms.length };
        }));
        return { ...sr, roots: rootsWithRooms, quota_used: rootsWithRooms.length, quota_total: 10 };
      }));
      socket.emit('platformTree', tree);
    } catch { socket.emit('platformTree', []); }
  });

  socket.on('createOwner', async (data) => {
    if ((socket.userData?.rank||0) < 1200) return;
    const { target, max_rooms, by } = data;
    try {
      await db.query('UPDATE users SET rank=1100 WHERE username=?', [target]);
      io.emit('ownerCreated', { target, by });
    } catch {}
  });

  socket.on('freezeOwner',   async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    await db.query('UPDATE users SET is_active=0 WHERE username=?', [d.target]);
    io.emit('ownerFrozen', { target: d.target, by: d.by });
  });

  socket.on('unfreezeOwner', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    await db.query('UPDATE users SET is_active=1 WHERE username=?', [d.target]);
    io.emit('ownerUnfrozen', { target: d.target, by: d.by });
  });

  socket.on('updateOwnerQuota', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    await db.query('UPDATE users SET max_rooms=? WHERE username=?', [d.max_rooms, d.target]);
  });

  socket.on('platformBroadcast', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    io.emit('platformBroadcast', { text: d.text, by: d.by });
  });

  socket.on('emergencyFreeze', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    try {
      await db.query('UPDATE users SET is_active=0 WHERE username=?', [d.target]);
      const allSockets = await io.fetchSockets();
      allSockets.forEach(s => {
        if (s.userData?.username === d.target) {
          s.emit('youAreKicked', { by: d.by, reason: 'Emergency Freeze' });
          s.disconnect(true);
        }
      });
      io.emit('accountFrozen', { target: d.target, by: d.by });
    } catch {}
  });

  socket.on('emergencyUnfreeze', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    await db.query('UPDATE users SET is_active=1 WHERE username=?', [d.target]);
  });

  socket.on('permanentBan', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    try {
      await db.query('UPDATE users SET is_banned=1, is_active=0 WHERE username=?', [d.target]);
      const allSockets = await io.fetchSockets();
      allSockets.forEach(s => {
        if (s.userData?.username === d.target) {
          s.emit('youAreKicked', { by: d.by, reason: 'Permanent Ban' });
          s.disconnect(true);
        }
      });
      io.emit('permanentBanned', { target: d.target, by: d.by });
    } catch {}
  });

  socket.on('emergencyCloseRoom', async (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    io.to(String(d.room_id)).emit('roomDeleted', { room_id: d.room_id, by: d.by });
    await io.in(String(d.room_id)).disconnectSockets(true);
  });

  socket.on('emergencyAlert', (d) => {
    if ((socket.userData?.rank||0) < 1200) return;
    io.emit('emergencyAlert', { message: d.message, by: d.by });
  });


  /* ════════════════════════════════════════════════
     [SKILL-AUDIO] أحداث Mediasoup SFU — الصوت
     تاريخ: 2026-06-25
  ════════════════════════════════════════════════ */

  /* ── RTP Capabilities ─────────────────────────── */
  socket.on('audio:getCapabilities', async ({ room_id }) => {
    try {
      const room = await getOrCreateRoom(String(room_id));
      socket.emit('audio:capabilities', room.router.rtpCapabilities);
    } catch (err) {
      console.error('audio:getCapabilities:', err.message);
      socket.emit('audio:error', { message: err.message });
    }
  });

  /* ── إنشاء Send Transport (للمتحدث) ──────────── */
  socket.on('audio:createSendTransport', async ({ room_id }) => {
    try {
      const room      = await getOrCreateRoom(String(room_id));
      const transport = await createTransport(room.router);
      room.sendTransports.set(transport.id, transport);
      socket.audioSendTransport = transport; // [FIX] ربط الـ transport بصاحبه (هذا الـ socket)
      socket.emit('audio:sendTransportCreated', {
        id             : transport.id,
        iceParameters  : transport.iceParameters,
        iceCandidates  : transport.iceCandidates,
        dtlsParameters : transport.dtlsParameters,
      });
    } catch (err) {
      console.error('audio:createSendTransport:', err.message);
      socket.emit('audio:error', { message: err.message });
    }
  });

  /* ── إنشاء Recv Transport (للمستمع) ──────────── */
  socket.on('audio:createRecvTransport', async ({ room_id }) => {
    try {
      const room      = await getOrCreateRoom(String(room_id));
      const transport = await createTransport(room.router);
      room.recvTransports.set(transport.id, transport);
      socket.audioRecvTransport = transport; // [FIX] ربط الـ transport بصاحبه (هذا الـ socket)
      socket.emit('audio:recvTransportCreated', {
        id             : transport.id,
        iceParameters  : transport.iceParameters,
        iceCandidates  : transport.iceCandidates,
        dtlsParameters : transport.dtlsParameters,
      });
    } catch (err) {
      console.error('audio:createRecvTransport:', err.message);
      socket.emit('audio:error', { message: err.message });
    }
  });

  /* ── Connect Transport ────────────────────────── */
  socket.on('audio:connectTransport', async ({ transportId, dtlsParameters }) => {
    try {
      const room = sfuRooms.get(String(socket.userData?.room_id));
      if (!room) return;
      const transport =
        room.sendTransports.get(transportId) ||
        room.recvTransports.get(transportId);
      if (!transport) return;
      await transport.connect({ dtlsParameters });
      socket.emit('audio:transportConnected');
    } catch (err) {
      console.error('audio:connectTransport:', err.message);
    }
  });

  /* ── Produce — بدء البث من المتحدث ───────────── */
  socket.on('audio:produce', async ({ transportId, kind, rtpParameters, room_id }) => {
    try {
      const rid  = String(room_id || socket.userData?.room_id);
      const room = sfuRooms.get(rid);
      if (!room) return;
      const transport = room.sendTransports.get(transportId);
      if (!transport) return;

      const producer = await transport.produce({ kind, rtpParameters });
      const uname    = socket.userData?.username || 'unknown';

      room.producers.set(producer.id, { producer, username: uname });

      producer.on('transportclose', () => {
        room.producers.delete(producer.id);
        socket.to(rid).emit('audio:producerClosed', { producerId: producer.id });
      });

      socket.emit('audio:produced', { producerId: producer.id });

      /* أبلغ بقية الغرفة بالمنتج الجديد */
      socket.to(rid).emit('audio:newProducer', {
        producerId : producer.id,
        username   : uname,
      });

      console.log(`🎙️ [SFU] ${uname} بدأ البث في ${rid}`);
    } catch (err) {
      console.error('audio:produce:', err.message);
    }
  });

  /* ── Consume — استقبال بث متحدث آخر ─────────── */
  socket.on('audio:consume', async ({ room_id, producerId, rtpCapabilities }) => {
    try {
      const rid  = String(room_id || socket.userData?.room_id);
      const room = sfuRooms.get(rid);
      if (!room) { socket.emit('audio:consumed', { error: 'الغرفة غير موجودة' }); return; }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        socket.emit('audio:consumed', { error: 'لا يمكن الاستقبال' });
        return;
      }

      /* [FIX] استخدم Recv Transport الخاص بهذا المستخدم تحديداً (لا تأخذ أي transport عشوائي من الغرفة) */
      const transport = socket.audioRecvTransport;
      if (!transport) { socket.emit('audio:consumed', { error: 'لا يوجد Recv Transport' }); return; }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });

      socket.emit('audio:consumed', {
        id            : consumer.id,
        producerId,
        kind          : consumer.kind,
        rtpParameters : consumer.rtpParameters,
      });
    } catch (err) {
      console.error('audio:consume:', err.message);
      socket.emit('audio:consumed', { error: err.message });
    }
  });

  /* ── تنظيف عند قطع الاتصال ──────────────────── */
  // (يُنفَّذ داخل disconnect handler الموجود — انظر أدناه)

/* ════ نهاية أحداث [SKILL-AUDIO] ════ */


  /* ══ تجميد / فك تجميد الحسابات ══ */
  socket.on('freezeUser', async ({ target, room_id, by }) => {
    const actorRank  = socket.userData?.rank || 0;
    const socks      = await io.in(room_id).fetchSockets();
    const targetSock = socks.find(s => s.userData?.username === target);
    const targetRank = targetSock?.userData?.rank || 0;
    if (actorRank <= targetRank)
      return socket.emit('error', '⛔ لا تملك صلاحية تجميد هذا المستخدم');
    frozenUsers.set(target, { by, at: Date.now() });
    io.to(room_id).emit('systemMessage', `🧊 تم تجميد ${target} بواسطة ${by}`);
    if (targetSock) {
      targetSock.emit('youAreKicked', { by, reason: 'تم تجميد حسابك مؤقتاً' });
      targetSock.leave(room_id);
    }
    const users = await buildOnlineUsers(room_id);
    io.to(room_id).emit('onlineUsers', users);
  });

  socket.on('unfreezeUser', ({ target, room_id, by }) => {
    frozenUsers.delete(target);
    io.to(room_id).emit('systemMessage', `✅ تم فك تجميد ${target} بواسطة ${by}`);
  });

/* ════════ نهاية أحداث الرتب المتقدمة ════════ */
});


/* ════════════════════════════════════════════════
   تشغيل السيرفر
════════════════════════════════════════════════ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`\n🚀 WidBid Server on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🗄️  Database: ${process.env.DB_NAME}`);
  // [SKILL-AUDIO][server/index.js] — تشغيل Mediasoup Worker عند بدء السيرفر
  try {
    await initWorker();
    console.log('🎙️ Mediasoup SFU جاهز');
  } catch (err) {
    console.error('❌ فشل تشغيل Mediasoup:', err.message);
    console.warn('⚠️ الخادم يعمل بدون SFU — نفّذ: npm install mediasoup');
  }

  /* ── تشغيل الأعضاء الوهميين بعد ثانيتين من بدء الخادم ── */
  setTimeout(() => initBots(io, db, buildOnlineUsers), 2000);
});
