/* ════════════════════════════════════════
   WidBid — sounds.js
   نظام الصوتيات الكامل
   كل الأصوات تُولَّد بـ Web Audio API
   بدون ملفات صوت خارجية
════════════════════════════════════════ */

const SoundSystem = (() => {
  let ctx = null;
  const enabled = () => localStorage.getItem('notif_sound') !== 'off';

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // ── مولّد نبضة صوتية أساسية ──────────
  function beep({ freq = 440, duration = 0.15, volume = 0.08, type = 'sine', ramp = true }) {
    if (!enabled()) return;
    try {
      const c    = getCtx();
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, c.currentTime);
      if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start();
      osc.stop(c.currentTime + duration);
    } catch {}
  }

  // ── مولّد صوت متعدد النبضات ───────────
  function chord(notes = [], gap = 0.08) {
    if (!enabled()) return;
    notes.forEach((n, i) => setTimeout(() => beep(n), i * gap * 1000));
  }

  return {
    /* ── رسالة جديدة ─────────────────── */
    message() {
      beep({ freq: 880, duration: 0.18, volume: 0.07 });
    },

    /* ── رسالة خاصة ──────────────────── */
    privateMessage() {
      chord([
        { freq: 660, duration: 0.12, volume: 0.08 },
        { freq: 880, duration: 0.18, volume: 0.08 },
      ]);
    },

    /* ── دخول عضو ───────────────────── */
    userJoin() {
      chord([
        { freq: 440, duration: 0.1, volume: 0.06 },
        { freq: 550, duration: 0.15, volume: 0.06 },
      ]);
    },

    /* ── خروج عضو ───────────────────── */
    userLeave() {
      chord([
        { freq: 550, duration: 0.1, volume: 0.05 },
        { freq: 440, duration: 0.15, volume: 0.05 },
      ]);
    },

    /* ── تنبيه (ذكر الاسم) ───────────── */
    mention() {
      chord([
        { freq: 660, duration: 0.1,  volume: 0.09, type: 'square' },
        { freq: 880, duration: 0.1,  volume: 0.09, type: 'square' },
        { freq: 1100, duration: 0.2, volume: 0.07, type: 'sine'   },
      ], 0.06);
    },

    /* ── تحذير (كُتمت أو طُردت) ─────── */
    warning() {
      chord([
        { freq: 330, duration: 0.2, volume: 0.1, type: 'sawtooth' },
        { freq: 220, duration: 0.3, volume: 0.1, type: 'sawtooth' },
      ], 0.15);
    },

    /* ── نجاح إجراء ─────────────────── */
    success() {
      chord([
        { freq: 523, duration: 0.1, volume: 0.07 },
        { freq: 659, duration: 0.1, volume: 0.07 },
        { freq: 784, duration: 0.2, volume: 0.07 },
      ], 0.08);
    },

    /* ── إرسال رسالة ─────────────────── */
    send() {
      beep({ freq: 600, duration: 0.08, volume: 0.05, type: 'triangle' });
    },

    /* ── إعلان من الإدارة ────────────── */
    announcement() {
      chord([
        { freq: 440, duration: 0.15, volume: 0.08 },
        { freq: 554, duration: 0.15, volume: 0.08 },
        { freq: 659, duration: 0.15, volume: 0.08 },
        { freq: 880, duration: 0.3,  volume: 0.08 },
      ], 0.1);
    },

    /* ── مايك (تفعيل) ────────────────── */
    micOn() {
      beep({ freq: 700, duration: 0.1, volume: 0.06, type: 'triangle' });
    },

    /* ── مايك (إيقاف) ────────────────── */
    micOff() {
      beep({ freq: 400, duration: 0.1, volume: 0.05, type: 'triangle' });
    },

    /* ── تبديل الإعداد (enable/disable) ─ */
    toggle(on) {
      beep({ freq: on ? 660 : 440, duration: 0.12, volume: 0.06 });
    },
  };
})();

/* ── ربط الأصوات بالأحداث ─────────────── */
// رسالة جديدة
const _origNewMsg = socket.listeners('newMessage');
socket.on('newMessage', (d) => {
  if (d.username !== username) {
    const isMention = d.message?.toLowerCase().includes(username.toLowerCase());
    isMention ? SoundSystem.mention() : SoundSystem.message();
  } else {
    SoundSystem.send();
  }
});

// دخول / خروج
socket.on('userJoined', () => {
  if (localStorage.getItem('notif_join') !== 'off') SoundSystem.userJoin();
});
socket.on('userLeft', () => {
  if (localStorage.getItem('notif_join') !== 'off') SoundSystem.userLeave();
});

// أحداث إدارية
socket.on('youAreMuted',  () => SoundSystem.warning());
socket.on('youAreKicked', () => SoundSystem.warning());
socket.on('youAreWarned', () => SoundSystem.warning());
socket.on('announcement', () => SoundSystem.announcement());

// مايك
socket.on('micOn',  (d) => { if (d.username === username) SoundSystem.micOn();  });
socket.on('micOff', (d) => { if (d.username === username) SoundSystem.micOff(); });

/* ── تصدير للاستخدام من الملفات الأخرى ── */
window.SoundSystem = SoundSystem;
