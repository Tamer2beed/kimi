/* ════════════════════════════════════════
   WidBid — speaker.js
   نظام طابور السبيكر الكامل
   - وقت افتراضي: 120 ثانية (قابل للضبط)
   - المشرف: تمديد / سحب / تخطي
   - المستخدم: طلب + تنازل
════════════════════════════════════════ */

const SpeakerSystem = (() => {

  /* ══ الحالة ══ */
  const state = {
    current:     null,
    queue:       [],
    defaultTime: 120,
    timer:       null,
    isSpeaking:  false,
    inQueue:     false,
    myPos:       -1,
    clockOffset: 0,    /* فارق التوقيت بين السيرفر والعميل */
  };

  /* ══ CSS ══ */
  const style = document.createElement('style');
  style.textContent = `
  /* ── شريط الطابور (أسفل الهيدر) ── */
  .speaker-bar {
    background: rgba(0,0,0,0.55);
    padding: 6px 12px;
    display: flex; align-items: center; gap: 8px;
    flex-shrink: 0;
    min-height: 40px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .speaker-bar.hidden { display: none; }

  .spk-current {
    display: flex; align-items: center; gap: 6px;
    background: rgba(39,174,96,0.25);
    border: 1px solid rgba(39,174,96,0.5);
    border-radius: 20px;
    padding: 3px 10px;
    flex-shrink: 0;
  }
  .spk-mic-anim {
    font-size: 14px;
    animation: micPulse 1s infinite;
  }
  @keyframes micPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.4; transform:scale(.85); }
  }
  .spk-name { font-size: 12px; font-weight: 700; color: #fff; max-width: 90px;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .spk-timer {
    font-size: 13px; font-weight: 900; color: #2ECC71;
    font-variant-numeric: tabular-nums; min-width: 38px;
    flex-shrink: 0;
  }
  .spk-timer.warn  { color: #F39C12; }
  .spk-timer.urgent{ color: #E74C3C; animation: timerBlink .5s infinite; }
  @keyframes timerBlink { 0%,100%{opacity:1} 50%{opacity:.3} }

  .spk-queue-pills {
    display: flex; gap: 4px; flex: 1; overflow-x: auto;
    scrollbar-width: none;
  }
  .spk-queue-pills::-webkit-scrollbar { display:none; }
  .spk-pill {
    display: flex; align-items: center; gap: 4px;
    background: rgba(255,255,255,0.12);
    border-radius: 14px; padding: 2px 8px;
    font-size: 11px; color: rgba(255,255,255,.8);
    white-space: nowrap; flex-shrink: 0;
  }
  .spk-pill.mine {
    background: rgba(240,165,0,0.35);
    border: 1px solid rgba(240,165,0,0.6);
    color: #F0A500; font-weight: 700;
  }
  .spk-pill-pos {
    font-size: 10px; opacity: .6;
  }

  /* ── زر الطلب / التنازل ── */
  .spk-action-btn {
    flex-shrink: 0; height: 30px; border: none; border-radius: 15px;
    font-family: 'Tajawal', sans-serif; font-size: 12px; font-weight: 700;
    cursor: pointer; padding: 0 12px; transition: all .15s;
  }
  .spk-action-btn:active { transform: scale(.93); }
  .spk-btn-request  { background: #27AE60; color: #fff; }
  .spk-btn-done     { background: #E74C3C; color: #fff; }
  .spk-btn-queue    { background: rgba(255,255,255,.15); color: #fff; }
  .spk-btn-leave    { background: rgba(231,76,60,.5); color: #fff; }

  /* ── لوحة تحكم المشرف ── */
  .spk-admin-panel {
    position: fixed;
    bottom: calc(var(--toolbar1-h) + var(--toolbar2-h) + 8px);
    left: 50%; transform: translateX(-50%);
    z-index: 160;
    background: #1a1a2e; border-radius: 16px;
    padding: 14px 16px; min-width: 280px;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
    display: none; flex-direction: column; gap: 10px;
    border: 1px solid rgba(255,255,255,.08);
  }
  .spk-admin-panel.show { display: flex; }
  .spk-admin-title {
    font-size: 13px; font-weight: 700; color: rgba(255,255,255,.7);
    text-align: center; padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,.08);
  }
  .spk-admin-row {
    display: flex; gap: 8px; align-items: center;
  }
  .spk-admin-label {
    font-size: 12px; color: rgba(255,255,255,.6); flex: 1;
  }
  .spk-admin-btn {
    height: 34px; border: none; border-radius: 10px;
    font-family: 'Tajawal', sans-serif; font-size: 12px; font-weight: 700;
    cursor: pointer; padding: 0 12px; transition: all .15s;
  }
  .spk-admin-btn:active { transform: scale(.93); }
  .btn-extend  { background: #27AE60; color: #fff; }
  .btn-revoke  { background: #E74C3C; color: #fff; }
  .btn-skip    { background: #E67E22; color: #fff; }
  .btn-give    { background: #3498DB; color: #fff; }

  .spk-time-input {
    width: 60px; height: 30px; background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.2); border-radius: 8px;
    color: #fff; text-align: center; font-size: 13px; font-weight: 700;
    outline: none;
  }

  .spk-queue-list {
    display: flex; flex-direction: column; gap: 4px; max-height: 120px;
    overflow-y: auto;
  }
  .spk-queue-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: 8px;
    background: rgba(255,255,255,.05);
    font-size: 12px; color: #fff;
  }
  .spk-queue-item:hover { background: rgba(255,255,255,.1); }
  .spk-q-pos { font-size: 10px; color: rgba(255,255,255,.4); width: 16px; }
  .spk-q-name { flex: 1; }
  .spk-q-give {
    font-size: 11px; background: #3498DB; color: #fff;
    border: none; border-radius: 6px; padding: 2px 8px;
    cursor: pointer; font-family: 'Tajawal', sans-serif;
  }

  /* ── empty state ── */
  .spk-free-label {
    font-size: 12px; color: rgba(255,255,255,.45);
    flex: 1; text-align: center;
  }
  `;
  document.head.appendChild(style);

  /* ══ بناء UI ══ */
  function buildUI() {
    /* نملأ header-speaker الموجود في chat.html */
    const speakerRow = document.getElementById('speakerHeaderRow');
    if (!speakerRow) return;

    speakerRow.innerHTML = `
      <div class="spk-current" id="spkCurrent" style="display:none">
        <span class="spk-mic-anim">🎙️</span>
        <span class="spk-name" id="spkCurrentName">—</span>
      </div>
      <div class="spk-timer" id="spkTimer" style="display:none">02:00</div>
      <div class="spk-queue-pills" id="spkQueuePills"></div>
    `;

    /* لوحة المشرف */
    const adminPanel = document.createElement('div');
    adminPanel.id = 'spkAdminPanel';
    adminPanel.className = 'spk-admin-panel';
    adminPanel.innerHTML = `
      <div class="spk-admin-title">⚙️ إدارة السبيكر</div>
      <div class="spk-admin-row">
        <span class="spk-admin-label">تمديد الوقت (ثانية)</span>
        <input class="spk-time-input" id="spkExtendVal" type="number" value="60" min="10" max="300">
        <button class="spk-admin-btn btn-extend" onclick="SpeakerSystem.adminExtend()">+ تمديد</button>
      </div>
      <div class="spk-admin-row">
        <span class="spk-admin-label">سحب السبيكر الآن</span>
        <button class="spk-admin-btn btn-revoke" onclick="SpeakerSystem.adminRevoke()">✂️ سحب</button>
      </div>
      <div class="spk-admin-row">
        <span class="spk-admin-label">تخطي الأول في الطابور</span>
        <button class="spk-admin-btn btn-skip" onclick="SpeakerSystem.adminSkip()">⏭️ تخطي</button>
      </div>
      <div class="spk-queue-list" id="spkAdminQueueList"></div>
      <div class="spk-admin-row" style="justify-content:center">
        <span style="font-size:11px;color:rgba(255,255,255,.3)">
          الوقت الافتراضي:
          <input class="spk-time-input" id="spkDefaultTime" type="number" value="120" min="30" max="600" style="width:50px">
          ثانية
        </span>
      </div>
      <button onclick="SpeakerSystem.closeAdminPanel()"
        style="border:none;background:rgba(255,255,255,.08);color:rgba(255,255,255,.5);
               border-radius:8px;padding:6px;font-family:'Tajawal',sans-serif;
               font-size:12px;cursor:pointer;">إغلاق</button>
    `;
    document.body.appendChild(adminPanel);
  }

  /* ══ تحديث الواجهة ══ */
  function render() {
    const current     = document.getElementById('spkCurrent');
    const currentName = document.getElementById('spkCurrentName');
    const timerEl     = document.getElementById('spkTimer');
    const pillsEl     = document.getElementById('spkQueuePills');
    const micTbBtn    = document.getElementById('micTbBtn');
    const speakerRow  = document.getElementById('speakerHeaderRow');

    /* ── أخفِ الصف كاملاً إذا لا يوجد نشاط ── */
    const hasActivity = !!state.current || state.queue.length > 0;
    if (speakerRow) {
      speakerRow.style.display = hasActivity ? 'flex' : 'none';
      /* اضبط ارتفاع الهيدر الموحد */
      const header = document.getElementById('roomHeader');
      if (header) header.style.height = hasActivity ? 'var(--room-header-h)' : '54px';
      /* اضبط top للـ main */
      const main = document.querySelector('.main');
      if (main) main.style.top = hasActivity ? 'var(--room-header-h)' : '54px';
    }

    /* ── الحالي ── */
    if (state.current) {
      if (current)     current.style.display  = 'flex';
      if (timerEl)     timerEl.style.display   = 'block';
      if (currentName) currentName.textContent = state.current.username;
    } else {
      if (current)  current.style.display = 'none';
      if (timerEl)  timerEl.style.display  = 'none';
    }

    /* ── الطابور ── */
    if (pillsEl) {
      pillsEl.innerHTML = state.queue.map((u, i) => `
        <div class="spk-pill ${u.username === username ? 'mine' : ''}">
          <span class="spk-pill-pos">#${i + 1}</span>
          <span>${u.username === username ? 'أنت' : u.username}</span>
        </div>`).join('');
    }

    /* ── زر المايك الأسفل ── */
    if (micTbBtn) {
      if (state.isSpeaking) {
        /* أنا أتحدث حالياً — زر أحمر "انتهيت" */
        micTbBtn.textContent  = '🛑';
        micTbBtn.style.background = '#E74C3C';
        micTbBtn.onclick = () => SpeakerSystem.doneSpeaking();
      } else if (state.inQueue) {
        /* أنا في الطابور — زر برتقالي رقم موقعي */
        micTbBtn.textContent  = `#${state.myPos + 1}`;
        micTbBtn.style.background = '#E67E22';
        micTbBtn.onclick = () => SpeakerSystem.leaveQueue();
      } else {
        /* السبيكر متاح أو مشغول — زر أخضر "تحدث" */
        micTbBtn.textContent  = '🎤';
        micTbBtn.style.background = '';
        micTbBtn.onclick = () => SpeakerSystem.requestSpeaker();
      }
    }

    /* ── لوحة المشرف ── */
    const adminList = document.getElementById('spkAdminQueueList');
    if (adminList) {
      adminList.innerHTML = state.queue.length
        ? state.queue.map((u, i) => `
            <div class="spk-queue-item">
              <span class="spk-q-pos">#${i + 1}</span>
              <span class="spk-q-name">${u.username}</span>
              <button class="spk-q-give" onclick="SpeakerSystem.adminGiveTo('${u.username}')">إعطاء</button>
            </div>`).join('')
        : '<div style="font-size:12px;color:rgba(255,255,255,.3);text-align:center">الطابور فارغ</div>';
    }
  }

  /* ══ تحديث هيدر الغرفة (مثل WEVO) ══ */
  function updateHeader() {
    const micIcon   = document.getElementById('micIcon');
    const micStatus = document.getElementById('micStatus');
    const micTime   = document.getElementById('micTime');
    if (!micStatus) return;

    if (state.current) {
      if (micIcon)   micIcon.textContent   = '🎙️';
      micStatus.textContent = state.current.username;
      micStatus.style.color = '#27AE60';
      if (micTime) micTime.style.display = 'block';
    } else {
      if (micIcon)   micIcon.textContent   = '🔊';
      micStatus.textContent = 'Mic Free';
      micStatus.style.color = '';
      if (micTime) { micTime.textContent = '--:--'; micTime.style.display = 'block'; }
    }
  }

  /* ══ العداد التنازلي ══ */
  function startTimer(endsAt) {
    clearInterval(state.timer);
    const timerEl  = document.getElementById('spkTimer');
    const micTime  = document.getElementById('micTime');

    state.timer = setInterval(() => {
      /* استخدم Date.now() الخاص بالعميل مع الـ endsAt القادم من السيرفر
         + فارق التوقيت المحسوب لحظة استلام الحالة */
      const rem = Math.max(0, Math.round((endsAt - Date.now() + state.clockOffset) / 1000));
      const m   = String(Math.floor(rem / 60)).padStart(2, '0');
      const s   = String(rem % 60).padStart(2, '0');
      const txt = `${m}:${s}`;

      /* شريط الطابور */
      if (timerEl) {
        timerEl.textContent = txt;
        timerEl.className   = 'spk-timer' +
          (rem <= 10 ? ' urgent' : rem <= 30 ? ' warn' : '');
      }
      /* هيدر الغرفة */
      if (micTime) micTime.textContent = txt;

      if (rem <= 0) {
        clearInterval(state.timer);
        if (timerEl) timerEl.textContent = '00:00';
        if (micTime) micTime.textContent  = '00:00';
      }
    }, 500);
  }

  function requestSpeaker() {
    socket.emit('speakerRequest', { room_id: roomId, username, rank: userRank });
    /* [FIX] لا نُظهر علامة اليد هنا فورياً — ننتظر speakerState الحقيقي من السيرفر
       لمعرفة هل دخلنا فعلاً طابور انتظار، أم أصبحنا المتحدث مباشرة (بدون انتظار).
       العلامة الآن تُدار بالكامل من ui.js بناءً على queue الحقيقية لكل المستخدمين. */
    // [SKILL-AUDIO] جهّز الجهاز الصوتي لحظة الطلب (لا يفتح المايك بعد)
    if (typeof AudioSystem !== 'undefined') {
      AudioSystem.initDevice(roomId).catch(e => console.warn('AudioSystem init:', e.message));
    }
  }

  function doneSpeaking() {
    socket.emit('speakerDone', { room_id: roomId, username });
    // [SKILL-AUDIO] أوقف البث الصوتي
    if (typeof AudioSystem !== 'undefined') AudioSystem.stopSpeaking();
  }

  function leaveQueue() {
    socket.emit('speakerLeaveQueue', { room_id: roomId, username });
  }

  /* ══ إجراءات المشرف ══ */
  function adminExtend() {
    const secs = parseInt(document.getElementById('spkExtendVal')?.value) || 60;
    socket.emit('speakerExtend', { room_id: roomId, seconds: secs });
  }

  function adminRevoke() {
    if (!confirm('سحب السبيكر من الحالي؟')) return;
    socket.emit('speakerRevoke', { room_id: roomId });
  }

  function adminSkip() {
    socket.emit('speakerSkip', { room_id: roomId });
  }

  function adminGiveTo(targetUsername) {
    socket.emit('speakerGiveTo', { room_id: roomId, target: targetUsername });
    closeAdminPanel();
  }

  function openAdminPanel() {
    /* فقط للمشرف Admin (500+) */
    if ((userRank || 0) < 500) {
      showToast('⛔ هذه الخاصية للمشرفين فقط');
      return;
    }
    document.getElementById('spkAdminPanel')?.classList.toggle('show');
  }

  function closeAdminPanel() {
    document.getElementById('spkAdminPanel')?.classList.remove('show');
  }

  /* ══ Socket Events ══ */
  function bindSocketEvents() {
    if (typeof socket === 'undefined') return;

    /* حالة الطابور الكاملة (عند الدخول أو أي تغيير) */
    socket.on('speakerState', (data) => {
      /* احسب فارق التوقيت: serverNow - clientNow */
      state.clockOffset = (data.serverNow || Date.now()) - Date.now();

      const wasSpeaking  = state.isSpeaking;
      state.current     = data.current || null;
      state.queue       = data.queue   || [];
      state.isSpeaking  = state.current?.username === username;
      state.inQueue     = state.queue.some(u => u.username === username);
      state.myPos       = state.queue.findIndex(u => u.username === username);
      state.defaultTime = data.defaultTime || 120;

      if (state.current?.endsAt) {
        startTimer(state.current.endsAt);
      } else {
        clearInterval(state.timer);
      }

      updateHeader();
      render();

      /* إشعار صوتي عند دورك */
      if (state.isSpeaking && !wasSpeaking) {
        showToast('🎙️ دورك الآن! تحدث');
        // [SKILL-AUDIO] فعّل البث الصوتي تلقائياً عند الحصول على السبيكر
        if (typeof AudioSystem !== 'undefined') {
          AudioSystem.startSpeaking().catch(e => console.warn('AudioSystem start:', e.message));
        }
      } else if (!state.isSpeaking && wasSpeaking) {
        // [SKILL-AUDIO] أوقف البث عند انتهاء السبيكر
        if (typeof AudioSystem !== 'undefined') AudioSystem.stopSpeaking();
      }
    });

    /* تحذير اقتراب انتهاء الوقت */
    socket.on('speakerWarning', (data) => {
      if (data.username === username) {
        showToast('⚠️ باقي 5 ثوانٍ على وقتك!');
      }
      /* تحديث لون العداد للأحمر */
      const timerEl = document.getElementById('spkTimer');
      const micTime = document.getElementById('micTime');
      if (timerEl) timerEl.className = 'spk-timer urgent';
      if (micTime) micTime.style.color = '#E74C3C';
    });

    /* تجديد تلقائي */
    socket.on('speakerRenewed', (data) => {
      if (data.username === username) {
        showToast(`🔄 تم تجديد وقتك +${data.seconds} ثانية (الطابور فارغ)`);
      }
    });

    /* وقت ممدد */
    socket.on('speakerTimeUpdated', (data) => {
      if (state.current) {
        state.current.endsAt = data.endsAt;
        startTimer(data.endsAt);
      }
    });
  }

  /* ══ INIT ══ */
  document.addEventListener('DOMContentLoaded', buildUI);
  document.addEventListener('socketReady',      bindSocketEvents);

  /* ══ تصدير ══ */
  return {
    requestSpeaker, doneSpeaking, leaveQueue,
    adminExtend, adminRevoke, adminSkip, adminGiveTo,
    openAdminPanel, closeAdminPanel,
    getState: () => ({ ...state }),
  };

})();

window.SpeakerSystem = SpeakerSystem;
