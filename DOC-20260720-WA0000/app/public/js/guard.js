'use strict';
/* ════════════════════════════════════════════════════════════════
   WidBid — public/js/guard.js   [S15 — Client-side Guard]
   ════════════════════════════════════════════════════════════════
   التحقق المزدوج — نصفه الثاني (الأول: server/rankGuard.js)

   المهام (وثيقة S14 — البند 3):
   1) إخفاء/تعطيل كل زر أو ميزة رتبتها أعلى من رتبة المستخدم
      عبر السمة:  data-min-rank="500"
   2) intercept لـ socket.emit — حتى لو أُرسل request يدوياً من
      الكونسول، يُحذَر المستخدم (والخادم يرفضه على أي حال)
   3) تصدير Guard API عام: Guard.can() / Guard.rank / Guard.RANKS
════════════════════════════════════════════════════════════════ */

(function () {
  /* ── الرتب الـ 12 ── */
  const RANKS = Object.freeze({
    GUEST: 100, MEMBER: 200, PROTECTED: 300, ROYAL: 400,
    ADMIN: 500, SUPER_ADMIN: 600, MASTER: 700, SUPER_MASTER: 800,
    ROOT: 900, SUPER_ROOT: 1000, OWNER: 1100, SUPER_OWNER: 1200,
  });

  /* ── الحد الأدنى للرتبة لكل حدث صادر (مرآة لجدول الخادم) ── */
  const EMIT_MIN_RANK = Object.freeze({
    sendImage: 200, raiseHand: 200,
    clearChat: 500, clearRoomChat: 500, muteUser: 500, unmuteUser: 500,
    kickUser: 500, muteAll: 500, unmuteAll: 500, freezeUser: 500,
    unfreezeUser: 500, setBanner: 500, speakerExtend: 500,
    speakerRevoke: 500, speakerSkip: 500, speakerGiveTo: 500,
    warnUser: 600, announcement: 600, systemMessage: 600,
    getAdminsList: 600, getMutedList: 600,
    setWelcome: 700, assignRole: 700, banIP: 700, controlAllMics: 700,
    getRoomReport: 700,
    banDevice: 800, lockRoom: 800,
    setTheme: 900, registerDevice: 900,
    getSuperRootRooms: 1000, getSuperRootReport: 1000,
    getMySuperRootRoots: 1000, superRootBroadcast: 1000,
    transferMember: 1000, createRoot: 1000,
    getOwnerRooms: 1100, freezeRoom: 1100, unfreezeRoom: 1100, deleteRoom: 1100,
    getPlatformStats: 1200, getAllOwners: 1200, getPlatformTree: 1200,
    createOwner: 1200, freezeOwner: 1200, unfreezeOwner: 1200,
    updateOwnerQuota: 1200, platformBroadcast: 1200, emergencyFreeze: 1200,
    emergencyUnfreeze: 1200, permanentBan: 1200, emergencyCloseRoom: 1200,
    emergencyAlert: 1200,
  });

  /* ── رتبة المستخدم الحالية (من الـ JWT إن أمكن، وإلا localStorage) ── */
  function _rankFromJWT() {
    try {
      const t = localStorage.getItem('token') || '';
      if (!t || t.startsWith('guest_')) return null;
      const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.rank || null;   /* توكن الزائر يحمل rank:100 — العضو يعتمد على localStorage */
    } catch { return null; }
  }

  const Guard = {
    RANKS,
    get rank() {
      return _rankFromJWT() ?? (parseInt(localStorage.getItem('rank')) || 100);
    },
    can(minRank) { return Guard.rank >= minRank; },

    /* ── تطبيق الإخفاء على كل العناصر الموسومة data-min-rank ── */
    apply(root = document) {
      const r = Guard.rank;
      root.querySelectorAll('[data-min-rank]').forEach((el) => {
        const need = parseInt(el.dataset.minRank) || 100;
        const ok = r >= need;
        el.classList.toggle('guard-hidden', !ok);
        el.style.display = ok ? '' : 'none';
        el.setAttribute('aria-hidden', ok ? 'false' : 'true');
      });
    },

    /* ── مراقبة تغيّر الرتبة (ترقية أثناء الجلسة) وإعادة التطبيق ── */
    watch() {
      let last = Guard.rank;
      setInterval(() => {
        const now = Guard.rank;
        if (now !== last) { last = now; Guard.apply(); }
      }, 2000);
    },

    /* ── اعتراض socket.emit — التحقق المزدوج قبل الإرسال ── */
    wrapSocket(socket) {
      if (!socket || socket._guardWrapped) return socket;
      const orig = socket.emit.bind(socket);
      socket.emit = function (event, ...args) {
        const need = EMIT_MIN_RANK[event];
        if (need && Guard.rank < need) {
          console.warn(`🛡️ [Guard] مُنع إرسال "${event}" — يتطلب رتبة ${need}+ وأنت ${Guard.rank}`);
          orig('error', '⛔ صلاحية غير كافية لهذا الإجراء');
          return socket;
        }
        return orig(event, ...args);
      };
      socket._guardWrapped = true;
      return socket;
    },
  };

  /* ── حقن CSS صغير للإخفاء ── */
  const style = document.createElement('style');
  style.textContent = '.guard-hidden{display:none!important}';
  document.head.appendChild(style);

  /* ── تطبيق تلقائي عند جاهزية DOM + مراقبة العناصر الجديدة ── */
  const boot = () => {
    Guard.apply();
    Guard.watch();
    /* عناصر تُبنى ديناميكياً (مودالات/قوائم) → أعد التطبيق عند ظهورها */
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.addedNodes.length) { Guard.apply(); break; }
      }
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.Guard = Guard;
})();
