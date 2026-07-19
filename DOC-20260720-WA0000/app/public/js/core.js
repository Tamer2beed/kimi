/* ════════════════════════════════════════
   WidBid — core.js
   Socket.io + الرسائل + الأدوات المشتركة
════════════════════════════════════════ */

/* ── بيانات الجلسة ─────────────────────── */
const token    = localStorage.getItem('token');
const userId   = parseInt(localStorage.getItem('user_id')) || 0;
const username = localStorage.getItem('username') || 'زائر';
const userRank = parseInt(localStorage.getItem('rank')) || 100;
const roomId   = localStorage.getItem('room_id');
const roomName = localStorage.getItem('room_name') || 'الغرفة';

if (!token) window.location.href = '/';

/* ── ألوان وأسماء الرتب ─────────────────── */
const RANK_COLORS = {
  100:'#888888', 200:'#FFB6C1', 300:'#E066FF',
  400:'#FFD700', 500:'#4A90D9', 600:'#27AE60',
  700:'#E74C3C', 800:'#C0392B', 900:'#F39C12',
  1000:'#E67E22', 1100:'#D4AF37', 1200:'#FFFFFF'
};
const RANK_NAMES = {
  100:'Guest',  200:'Member',   300:'Protected', 400:'Royal',
  500:'Admin',  600:'S.Admin',  700:'Master',    800:'S.Master',
  900:'Root',   1000:'S.Root',  1100:'Owner',    1200:'S.Owner'
};

function getRankColor(rank) {
  const keys = Object.keys(RANK_COLORS).map(Number).sort((a,b) => b - a);
  for (const k of keys) { if (rank >= k) return RANK_COLORS[k]; }
  return '#888888';
}
function getRankName(rank) {
  const keys = Object.keys(RANK_NAMES).map(Number).sort((a,b) => b - a);
  for (const k of keys) { if (rank >= k) return RANK_NAMES[k]; }
  return 'Guest';
}

function getInitial(name) { return name ? name.charAt(0).toUpperCase() : '?'; }
function formatTime(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString('ar', { hour:'2-digit', minute:'2-digit', hour12:true });
}

/* ── Socket.io ─────────────────────────── */
const socket = io({ auth: { token } });

/* [S15] التحقق المزدوج — اعتراض الأحداث فوق رتبة المستخدم قبل إرسالها */
if (window.Guard) Guard.wrapSocket(socket);

socket.on('connect', () => {
  socket.emit('joinRoom', {
    room_id: roomId, username, user_id: userId, rank: userRank
  });
  /* أعلم بقية الملفات أن socket جاهز */
  document.dispatchEvent(new Event('socketReady'));

  /* إظهار أزرار المشرفين — [S15] عبر Guard (data-min-rank) + فحص التوكن */
  if (window.Guard) {
    Guard.apply();
  } else if (userRank >= 500) {
    const adminSection = document.getElementById('adminMenuSection');
    if (adminSection) adminSection.style.display = 'block';
  }

  /* جلب بيانات المستخدم (avatar, has_paid_profile) */
  fetch('/api/users/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(d => {
    if (d.success && d.user) {
      window._myAvatar           = d.user.avatar || 'av1.svg';
      window._userHasPaidProfile = d.user.has_paid_profile || 0;
      /* حدّث صورة المستخدم في قائمة الأعضاء عند أول render */
      const uploadBtn = document.getElementById('avatarUploadBtn');
      if (uploadBtn) uploadBtn.style.display = window._userHasPaidProfile ? 'block' : 'none';
    }
  })
  .catch(() => {});
});

socket.on('roomInfo', (data) => {
  if (data.welcome_message) {
    document.getElementById('welcomeBanner').innerHTML = data.welcome_message;
  }
  if (data.theme) applyTheme(data.theme);
});

socket.on('messageHistory', (msgs) => {
  const container = document.getElementById('messages');
  if (container) {
    const banner = document.getElementById('welcomeBanner');
    container.innerHTML = '';
    if (banner) container.appendChild(banner);
  }
  msgs.forEach(m => addMessage(m.username, m.content, m.username === username, m.rank || 100, m.created_at, m.id));
});

socket.on('newMessage', (d) => {
  /* كشف إذا كنت مذكوراً في الرسالة */
  const isMention = d.message && username &&
    d.message.includes('@' + username) &&
    d.username !== username;

  addMessage(d.username, d.message, d.username === username,
             d.rank || 100, null, d.id, d.avatar, isMention);
  if (d.username !== username) playNotif();
  msgCount++;
  const el = document.getElementById('statMsgs');
  if (el) el.textContent = msgCount;
});

/* مسح الشات للجميع (من المشرف) */
socket.on('chatCleared', (data) => {
  const container = document.getElementById('messages');
  if (container) {
    const banner = document.getElementById('welcomeBanner');
    container.innerHTML = '';
    if (banner) container.appendChild(banner);
  }
  addSystem(`🗑️ تم مسح الشات بواسطة ${data?.by || 'المشرف'}`);
});

socket.on('userJoined', (d) => {
  if (d.username !== username) addSystem(`${d.username} انضم للغرفة`);
});
socket.on('userLeft',   (d) => addSystem(`${d.username} غادر الغرفة`));
socket.on('error',      (msg) => showToast('⚠️ ' + msg));

socket.on('systemMessage', (text) => {
  addSystem(typeof text === 'string' ? text : (text.text || ''));
});

socket.on('themeChanged',   (d) => { applyTheme(d.theme); addSystem(`🎨 تم تغيير الثيم بواسطة ${d.by}`); });
socket.on('welcomeUpdated', (d) => {
  const b = document.getElementById('welcomeBanner');
  if (b) b.innerHTML = d.message;
});

/* ── الرسائل ────────────────────────────── */
let msgCount = 0;

function addMessage(user, text, isMe, rank = 100, time = null, msgId = null, avatar = null, isMention = false) {
  const color   = getRankColor(rank);
  const timeStr = formatTime(time);

  const wrap = document.createElement('div');
  wrap.className = `msg-row ${isMe ? 'self' : 'other'}`;
  if (msgId)  wrap.dataset.msgId  = msgId;
  if (user)   wrap.dataset.sender = user;

  /* ── أفاتار SVG مربع بإطار لون الرتبة ── */
  const av = document.createElement('div');
  av.className = 'msg-avatar-sm';
  av.style.borderColor = typeof getRankBorder === 'function'
    ? getRankBorder(rank) : getRankColor(rank);

  /* اختر الأفاتار: من الرسالة أو من localStorage (للمستخدم الحالي) */
  const avSrc = avatar
    ? (avatar.startsWith('data:image') ? avatar : '/avatars/' + avatar)
    : '/avatars/' + (localStorage.getItem('avatar') || 'av1.svg');

  const avImg = document.createElement('img');
  avImg.src     = avSrc;
  avImg.alt     = user;
  avImg.onerror = () => { avImg.src = '/avatars/av1.svg'; };
  av.appendChild(avImg);

  /* ── فقاعة الرسالة ── */
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (!isMe) {
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.style.color = color;
    sender.textContent = user;
    bubble.appendChild(sender);
  }

  const msgText = document.createElement('div');
  msgText.className = 'msg-text';
  /* تمييز @mentions في النص */
  if (text.includes('@')) {
    const parts = text.split(/(@\w+)/g);
    parts.forEach(p => {
      if (p.startsWith('@')) {
        const span = document.createElement('span');
        span.textContent = p;
        span.style.cssText = 'color:#6C63FF;font-weight:700;';
        if (p === '@' + username) {
          span.style.background = 'rgba(108,99,255,.15)';
          span.style.borderRadius = '4px';
          span.style.padding = '0 3px';
        }
        msgText.appendChild(span);
      } else {
        msgText.appendChild(document.createTextNode(p));
      }
    });
  } else {
    msgText.textContent = text;
  }
  bubble.appendChild(msgText);

  const msgTime = document.createElement('div');
  msgTime.className = 'msg-time';
  msgTime.textContent = timeStr;
  bubble.appendChild(msgTime);

  wrap.appendChild(av);
  wrap.appendChild(bubble);

  const container = document.getElementById('messages');
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function addSystem(text) {
  const div = document.createElement('div');
  div.className = 'msg-system';
  div.textContent = text;
  document.getElementById('messages').appendChild(div);
}

/* ── إرسال رسالة ────────────────────────── */
function sendMessage() {
  const input = document.getElementById('msgInput');
  const msg   = input.value.trim();
  if (!msg) return;
  socket.emit('sendMessage', {
    room_id: roomId, user_id: userId,
    username, message: msg, rank: userRank
  });
  input.value = '';
  closeEmoji();
}

document.getElementById('msgInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

/* ── الثيمات ────────────────────────────── */
const THEMES = {
  candy:   { bg:'#7C4DBC', dark:'#5E35A0' },
  ocean:   { bg:'#1565C0', dark:'#0D47A1' },
  flower:  { bg:'#AD1457', dark:'#880E4F' },
  night:   { bg:'#1A1A2E', dark:'#12122A' },
  neutral: { bg:'#455A64', dark:'#37474F' },
};
function applyTheme(name) {
  const t = THEMES[name] || THEMES.candy;
  document.documentElement.style.setProperty('--theme-bg',   t.bg);
  document.documentElement.style.setProperty('--theme-dark', t.dark);
}

/* ── إشعار صوتي ─────────────────────────── */
function playNotif() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

/* ── Toast ──────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── إعداد الصفحة ───────────────────────── */
document.getElementById('roomTitle').textContent = roomName;


/* ══ إشعار @mention — badge ينتقل إلى الرسالة ══ */
function _showMentionBadge(targetWrap) {
  /* أزل badge قديم */
  document.getElementById('mentionBadge')?.remove();

  const badge = document.createElement('div');
  badge.id = 'mentionBadge';
  badge.style.cssText = `
    position:fixed; left:12px; bottom:100px; z-index:200;
    background:#6C63FF; color:#fff;
    border-radius:20px; padding:6px 14px;
    font-size:13px; font-weight:700;
    box-shadow:0 4px 12px rgba(108,99,255,.4);
    cursor:pointer; animation:mentionPulse 2s ease-in-out infinite;
    display:flex; align-items:center; gap:6px;
  `;
  badge.innerHTML = '<span>@</span><span>تم ذكرك</span>';

  /* عند الضغط — انتقل للرسالة */
  badge.onclick = () => {
    targetWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetWrap.style.transition = 'background .3s';
    targetWrap.style.background = 'rgba(108,99,255,.2)';
    setTimeout(() => {
      targetWrap.style.background = 'rgba(108,99,255,.07)';
    }, 800);
    badge.remove();
  };

  document.body.appendChild(badge);

  /* يختفي بعد 5 ثوان */
  setTimeout(() => badge.remove(), 5000);
}

/* CSS لـ animation */
(function addMentionCSS() {
  if (document.getElementById('mentionStyle')) return;
  const s = document.createElement('style');
  s.id = 'mentionStyle';
  s.textContent = `
    @keyframes mentionPulse {
      0%,100% { transform:scale(1);    box-shadow:0 4px 12px rgba(108,99,255,.4); }
      50%      { transform:scale(1.05); box-shadow:0 6px 20px rgba(108,99,255,.6); }
    }
  `;
  document.head.appendChild(s);
})();


socket.on('messageDeleted', ({ msg_id }) => {
  const row = document.querySelector(`.msg-row[data-msg-id="${msg_id}"]`);
  if (!row) return;
  const textEl = row.querySelector('.msg-text');
  if (textEl) {
    textEl.textContent = '🗑️ تم مسح هذه الرسالة';
    textEl.style.color = '#aaa';
    textEl.style.fontStyle = 'italic';
  }
});