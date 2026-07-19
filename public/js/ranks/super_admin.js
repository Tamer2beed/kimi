/* ════════════════════════════════════════
   WidBid — ranks/super_admin.js
   الرتبة: Super Admin (600)
   يُحمَّل بعد admin.js إذا userRank >= 600
════════════════════════════════════════ */

/* ── ما يضيفه Super Admin فوق Admin ────
   ✅ كتم وطرد Admin (500)
   ✅ تحذير رسمي مُسجَّل في DB
   ✅ قائمة المشرفين الحاليين
   ✅ رسالة إدارية عامة (Announcement)
   ✅ قائمة المكتومين حالياً
   ✅ تمديد الكتم (فترة محددة)
─────────────────────────────────────── */

/* ── سجل الإجراءات الإدارية ─────────────
   يُحفظ محلياً لكل جلسة
─────────────────────────────────────── */
const AdminLog = (() => {
  const KEY  = `wid_admin_log_${roomId}`;
  const MAX  = 50;

  function add(action, target, detail = '') {
    const log = get();
    log.unshift({
      action, target, detail,
      by:   username,
      time: new Date().toLocaleTimeString('ar', { hour:'2-digit', minute:'2-digit' })
    });
    if (log.length > MAX) log.pop();
    localStorage.setItem(KEY, JSON.stringify(log));
  }

  function get() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }

  function clear() { localStorage.removeItem(KEY); }

  return { add, get, clear };
})();

/* ── تسجيل الإجراءات تلقائياً ──────────── */
const _origKick = typeof kickUser === 'function' ? kickUser : null;
const _origMute = typeof muteUser === 'function' ? muteUser : null;

function kickUser(name) {
  AdminLog.add('طرد', name);
  socket.emit('kickUser', { room_id: roomId, target: name, by: username });
  showToast(`🚪 تم طرد ${name}`);
}
function muteUser(name) {
  AdminLog.add('كتم', name);
  socket.emit('muteUser', { room_id: roomId, target: name, by: username });
  showToast(`🔇 تم كتم ${name}`);
}

/* ── كتم لفترة محددة ───────────────────── */
function muteForDuration(name, minutes) {
  AdminLog.add('كتم مؤقت', name, `${minutes} دقيقة`);
  socket.emit('muteUser', { room_id: roomId, target: name, by: username, duration: minutes * 60 });
  showToast(`🔇 تم كتم ${name} لـ ${minutes} دقيقة`);
}

/* ── إجراءات Super Admin على الأعضاء ──── */
function getSuperAdminActions(targetName, targetRank) {
  const actions = [];
  if (userRank < 600 || userRank <= targetRank) return actions;

  // كتم مؤقت
  actions.push({
    icon: '⏱️', label: 'كتم مؤقت',
    fn: () => openMuteDurationPicker(targetName)
  });

  // تحذير رسمي
  actions.push({
    icon: '⚠️', label: 'تحذير رسمي',
    fn: () => openWarnDialog(targetName)
  });

  return actions;
}

/* ── منتقي مدة الكتم ────────────────────── */
function openMuteDurationPicker(name) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:300px">
      <div style="font-size:15px;font-weight:700;color:#1A1A2E;margin-bottom:14px">⏱️ كتم ${name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        ${[5,10,15,30,60,120].map(m => `
          <button onclick="muteForDuration('${name}',${m});this.closest('[style]').remove()"
            style="height:44px;background:#F4F6F9;border:1px solid #E0E0E0;border-radius:10px;
            font-family:Tajawal,sans-serif;font-size:13px;font-weight:600;cursor:pointer">
            ${m < 60 ? m + ' دقيقة' : (m/60) + ' ساعة'}
          </button>`).join('')}
      </div>
      <button onclick="this.closest('[style]').remove()"
        style="width:100%;height:42px;background:#f5f5f5;color:#888;border:none;border-radius:10px;
        font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

/* ── سجل الإجراءات (Super Admin فقط) ─── */
function showAdminLog() {
  const log = AdminLog.get();
  const d   = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;';
  d.innerHTML = `
    <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;padding:16px;max-height:70vh;overflow-y:auto;">
      <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:12px;
        padding-bottom:10px;border-bottom:1px solid #eee;display:flex;justify-content:space-between">
        <span>📋 سجل الإجراءات</span>
        <span onclick="AdminLog.clear();this.closest('[style]').remove();showToast('🗑️ تم مسح السجل')"
          style="color:#E74C3C;cursor:pointer;font-size:13px">مسح</span>
      </div>
      ${!log.length
        ? '<p style="text-align:center;color:#999;padding:20px">لا توجد إجراءات مسجلة</p>'
        : log.map(l => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:10px;border-bottom:1px solid #f5f5f5">
            <div>
              <span style="font-weight:600;color:#1A1A2E">${l.action}</span>
              <span style="color:#7F8C8D"> ← ${l.target}</span>
              ${l.detail ? `<span style="font-size:11px;color:#aaa"> (${l.detail})</span>` : ''}
            </div>
            <span style="font-size:11px;color:#aaa">${l.time}</span>
          </div>`).join('')}
      <button onclick="this.closest('[style]').remove()"
        style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;
        border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer;margin-top:12px">إغلاق</button>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

/* ── تحديث لوحة الأدوات ─────────────────
   نُضيف أدوات Super Admin للوحة الموجودة
─────────────────────────────────────── */
const _baseOpenAdminSheet = typeof openAdminSheet === 'function' ? openAdminSheet : null;

function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  title.textContent = '🟢 أدوات السوبر أدمن';

  const tools = [
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',         desc:'حذف جميع الرسائل',              fn: clearChat              },
    { icon:'🔇', bg:'#FFF3CD', label:'كتم الجميع',         desc:'منع الكتابة لـ Guest/Member',    fn: muteAll                },
    { icon:'🔊', bg:'#D4EDDA', label:'فك كتم الجميع',      desc:'السماح للجميع بالكتابة',         fn: unmuteAll              },
    { icon:'👥', bg:'#D1ECF1', label:'قائمة المشرفين',     desc:'عرض Admin في الغرفة',            fn: showAdminsList         },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة من الإدارة',   desc:'إعلان يصل للجميع',              fn: openAnnouncementDialog },
    { icon:'📋', bg:'#E8F5E9', label:'المكتومون الآن',     desc:'قائمة الأعضاء المكتومين',        fn: showMutedList          },
    { icon:'📜', bg:'#EDE7F6', label:'سجل الإجراءات',      desc:'كل إجراء نفّذته في الجلسة',     fn: showAdminLog           },
  ];

  toolList.innerHTML = tools.map((t, i) => `
    <div class="admin-tool" onclick="handleAdminTool(${i})">
      <div class="t-icon" style="background:${t.bg}">${t.icon}</div>
      <div><div class="t-name">${t.label}</div><div class="t-desc">${t.desc}</div></div>
    </div>`).join('');

  window._adminTools = tools;
  sheet.classList.add('open');
  overlay.classList.add('show');
}

window.AdminLog = AdminLog;
