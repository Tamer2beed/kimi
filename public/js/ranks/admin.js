/* ════════════════════════════════════════
   WidBid — ranks/admin.js
   الرتب: Admin(500) / Super Admin(600)
   يُحمَّل فقط إذا userRank >= 500
════════════════════════════════════════ */

/* ── ما يضيفه Admin فوق Guest ───────────
   ✅ كتم Guest / Member
   ✅ طرد Guest / Member
   ✅ مسح الشات
   ✅ كتم الجميع / فك الكتم
   ✅ إحصائيات الغرفة
── Super Admin (600) يضيف ──────────────
   ✅ كتم/طرد Admin
   ✅ تحذير رسمي مُسجَّل
   ✅ قائمة المشرفين
   ✅ رسالة عامة من الإدارة
   ✅ قائمة المكتومين
─────────────────────────────────────── */

/* ── تفعيل عناصر UI الخاصة بالأدمن ────── */
(function initAdmin() {
  // شريط الإحصائيات
  document.getElementById('statsBar')?.classList.add('visible');
  document.getElementById('mainArea')?.classList.add('with-stats');

  // شارة الرتبة في الهيدر
  const wrap = document.getElementById('statRankWrap');
  const name = document.getElementById('statRankName');
  if (wrap) wrap.style.display = 'flex';
  if (name) name.textContent = getRankName(userRank);

  // زر الأدوات في الهيدر
  const toolBtn = document.getElementById('adminToolBtn');
  if (toolBtn) toolBtn.style.display = 'block';

  // زر مسح الشات في القائمة الجانبية
  const clearBtn = document.getElementById('clearTextBtn');
  if (clearBtn) clearBtn.style.display = 'flex';
})();

/* ── الإجراءات المتاحة على الأعضاء ───────
   تُستدعى من guest.js عبر getAdminActions()
─────────────────────────────────────── */
function getAdminActions(targetName, targetRank) {
  const actions = [];
  if (userRank < 500) return actions;
  if (userRank <= targetRank) return actions; // لا صلاحية على رتبة مساوية أو أعلى

  actions.push({ icon:'🔇', label:'كتم المايك',    fn:() => muteUser(targetName)   });
  actions.push({ icon:'🔊', label:'فك الكتم',      fn:() => unmuteUser(targetName) });
  actions.push({ icon:'🚪', label:'طرد من الغرفة', fn:() => kickUser(targetName), danger:true });

  if (userRank >= 600) {
    actions.push({ icon:'⚠️', label:'تحذير رسمي', fn:() => openWarnDialog(targetName) });
  }

  return actions;
}

/* ── أدوات Admin (Socket) ────────────── */
function muteUser(name) {
  socket.emit('muteUser', { room_id: roomId, target: name, by: username });
  showToast(`🔇 تم كتم ${name}`);
}
function unmuteUser(name) {
  socket.emit('unmuteUser', { room_id: roomId, target: name, by: username });
  showToast(`🔊 تم فك كتم ${name}`);
}
function kickUser(name) {
  socket.emit('kickUser', { room_id: roomId, target: name, by: username });
  showToast(`🚪 تم طرد ${name}`);
}
function clearChat() {
  socket.emit('clearChat', { room_id: roomId, by: username });
  closeAll();
}
function muteAll() {
  socket.emit('muteAll', { room_id: roomId, by: username });
  showToast('🔇 تم كتم الجميع');
}
function unmuteAll() {
  socket.emit('unmuteAll', { room_id: roomId, by: username });
  showToast('🔊 تم فك كتم الجميع');
}

/* ── لوحة أدوات المشرف ───────────────── */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  const isSA = userRank >= 600;
  title.textContent = isSA ? '🟢 أدوات السوبر أدمن' : '🔵 أدوات الأدمن';

  const tools = [
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',         desc:'حذف جميع الرسائل',                    fn:clearChat,              show:true },
    { icon:'🔇', bg:'#FFF3CD', label:'كتم الجميع',         desc:'منع Guest و Member من الكتابة',        fn:muteAll,                show:true },
    { icon:'🔊', bg:'#D4EDDA', label:'فك كتم الجميع',      desc:'السماح للجميع بالكتابة',               fn:unmuteAll,              show:true },
    { icon:'📊', bg:'#E2D9F3', label:'إحصائيات الغرفة',    desc:`${document.getElementById('statOnline')?.textContent||0} متواجد`, fn:showRoomStats, show:true },
    { icon:'👥', bg:'#D1ECF1', label:'قائمة المشرفين',      desc:'Admin و Super Admin في الغرفة',        fn:showAdminsList,         show:isSA },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة من الإدارة',   desc:'إعلان يصل للجميع',                    fn:openAnnouncementDialog, show:isSA },
    { icon:'📋', bg:'#E8F5E9', label:'المكتومون الآن',     desc:'قائمة الأعضاء المكتومين',              fn:showMutedList,          show:isSA },
  ];

  const visible = tools.filter(t => t.show);
  toolList.innerHTML = visible.map((t, i) => `
    <div class="admin-tool" onclick="handleAdminTool(${i})">
      <div class="t-icon" style="background:${t.bg}">${t.icon}</div>
      <div>
        <div class="t-name">${t.label}</div>
        <div class="t-desc">${t.desc}</div>
      </div>
    </div>
  `).join('');

  window._adminTools = visible;
  sheet.classList.add('open');
  overlay.classList.add('show');
}

function handleAdminTool(i) {
  closeAdminSheet();
  window._adminTools[i].fn();
}
function closeAdminSheet() {
  document.getElementById('adminSheet')?.classList.remove('open');
  document.getElementById('adminOverlay')?.classList.remove('show');
}
function showRoomStats() {
  const online = document.getElementById('statOnline')?.textContent || 0;
  const msgs   = document.getElementById('statMsgs')?.textContent   || 0;
  showToast(`👥 ${online} متواجد | 💬 ${msgs} رسالة`);
}

/* ── Super Admin فقط ─────────────────── */
function showAdminsList() {
  socket.emit('getAdminsList', { room_id: roomId });
  socket.once('adminsList', (admins) => {
    const sheet = document.createElement('div');
    sheet.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;';
    const inner = `
      <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;padding:16px;max-height:70vh;overflow-y:auto;">
        <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #eee">
          👥 المشرفون في الغرفة
        </div>
        ${!admins.length ? '<p style="text-align:center;color:#999;padding:20px">لا يوجد مشرفون حالياً</p>' :
          admins.map(a => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #f5f5f5;">
              <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2C3E7A,#4A90D9);
                display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;
                border:2px solid ${getRankColor(a.rank)}">${getInitial(a.username)}</div>
              <div style="flex:1">
                <div style="font-weight:600;color:${getRankColor(a.rank)}">${a.username}</div>
                <div style="font-size:11px;color:#999">${getRankName(a.rank)}</div>
              </div>
              ${userRank > a.rank ? `<div onclick="kickUser('${a.username}')" style="padding:5px 10px;background:#FFE0E0;color:#E74C3C;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">طرد</div>` : ''}
            </div>`).join('')}
        <button onclick="this.closest('[style]').remove()" style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer;margin-top:12px">إغلاق</button>
      </div>
    `;
    sheet.innerHTML = inner;
    sheet.onclick = (e) => { if(e.target === sheet) sheet.remove(); };
    document.body.appendChild(sheet);
  });
}

function openAnnouncementDialog() {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:12px">📢 رسالة من الإدارة</div>
      <textarea id="announceTxt" placeholder="اكتب رسالتك..." style="width:100%;height:90px;border:1.5px solid #E0E0E0;border-radius:10px;padding:10px;resize:none;outline:none;font-family:Tajawal,sans-serif;font-size:13px;direction:rtl"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="sendAnnouncement(this)" style="flex:1;height:44px;background:#2C3E7A;color:#fff;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;cursor:pointer">إرسال</button>
        <button onclick="this.closest('[style]').remove()" style="flex:1;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
      </div>
    </div>`;
  d.onclick = (e) => { if(e.target === d) d.remove(); };
  document.body.appendChild(d);
}

function sendAnnouncement(btn) {
  const txt = document.getElementById('announceTxt').value.trim();
  if (!txt) { showToast('⚠️ اكتب الرسالة أولاً'); return; }
  socket.emit('announcement', { room_id: roomId, text: txt, by: username });
  btn.closest('[style]').remove();
  showToast('📢 تم إرسال الإعلان');
}

function showMutedList() {
  socket.emit('getMutedList', { room_id: roomId });
  socket.once('mutedList', (list) => {
    if (!list.length) { showToast('✅ لا يوجد أحد مكتوم'); return; }
    showToast(`🔇 مكتومون: ${list.map(u => u.username).join('، ')}`);
  });
}

/* ── نافذة التحذير الرسمي ─────────────── */
let warnTargetName = '';
function openWarnDialog(name) {
  warnTargetName = name;
  document.getElementById('warnTarget').textContent = name;
  document.getElementById('warnText').value = '';
  document.getElementById('warnDialog').classList.add('show');
}
function closeWarnDialog() {
  document.getElementById('warnDialog').classList.remove('show');
}
function sendWarn() {
  const reason = document.getElementById('warnText').value.trim();
  if (!reason) { showToast('⚠️ اكتب سبب التحذير'); return; }
  socket.emit('warnUser', { room_id: roomId, target: warnTargetName, reason, by: username });
  closeWarnDialog();
  showToast(`⚠️ تم إرسال تحذير لـ ${warnTargetName}`);
}

/* ── تحذير مُستلَم ──────────────────────── */
socket.on('youAreWarned', (d) => {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:50%;right:50%;transform:translate(50%,-50%);z-index:500;background:#fff;border-radius:16px;padding:20px;width:85%;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.25);text-align:center;font-family:Tajawal,sans-serif;';
  box.innerHTML = `
    <div style="font-size:40px;margin-bottom:8px">⚠️</div>
    <div style="font-size:15px;font-weight:700;color:#F39C12;margin-bottom:8px">تحذير رسمي</div>
    <div style="font-size:13px;color:#555;margin-bottom:4px">من: <strong>${d.by}</strong></div>
    <div style="font-size:13px;color:#333;margin:10px 0;padding:10px;background:#FFF3CD;border-radius:8px">${d.reason}</div>
    <button onclick="this.parentElement.remove()" style="width:100%;height:42px;background:#2C3E7A;color:#fff;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;cursor:pointer;">موافق</button>
  `;
  document.body.appendChild(box);
});
