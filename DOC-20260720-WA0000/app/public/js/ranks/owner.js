/* ════════════════════════════════════════
   WidBid — ranks/owner.js
   الرتب: Owner(1100) / Super Owner(1200)
   يُحمَّل إذا userRank >= 1100
════════════════════════════════════════ */

/* ── ما يضيفه Owner فوق Super Root ──────
   ✅ لوحة تحكم الغرف (بطاقات)
   ✅ تعيين Super Root وتحديد كوتتهم
   ✅ تجميد/تفعيل الغرف
   ✅ إحصائيات جميع غرفه
   ✅ إدارة اشتراكات الغرف
── Super Owner (1200) يضيف ──────────────
   ✅ إدارة جميع Owners
   ✅ شجرة كاملة: SuperRoot→Root→Rooms
   ✅ إحصائيات المنصة الكاملة
   ✅ صلاحيات الطوارئ (تجميد أي حساب)
   ✅ إدارة الاشتراكات والباقات
─────────────────────────────────────── */

/* ══ CSS خاص بلوحات Owner ══════════════ */
const ownerStyle = document.createElement('style');
ownerStyle.textContent = `
.owner-panel {
  position:fixed; inset:0; z-index:300;
  background:var(--bg-light);
  display:none; flex-direction:column;
}
.owner-panel.show { display:flex; }
.owner-panel-header {
  background:var(--primary); color:#fff;
  padding:0 16px; height:56px;
  display:flex; align-items:center; justify-content:space-between;
}
.owner-panel-title { font-size:16px; font-weight:700; }
.owner-panel-close { font-size:24px; cursor:pointer; opacity:.8; }
.owner-panel-body  { flex:1; overflow-y:auto; padding:12px; }

/* بطاقة الغرفة */
.room-card {
  background:#fff; border-radius:14px;
  padding:14px; margin-bottom:10px;
  box-shadow:0 2px 8px rgba(0,0,0,.08);
}
.room-card-top {
  display:flex; justify-content:space-between;
  align-items:flex-start; margin-bottom:10px;
}
.room-card-name { font-size:15px; font-weight:700; color:#1A1A2E; }
.room-card-id   { font-size:11px; color:#4A90D9; font-weight:600; }
.room-card-status {
  font-size:11px; font-weight:700; padding:3px 8px;
  border-radius:10px;
}
.status-active  { background:#D4EDDA; color:#27AE60; }
.status-frozen  { background:#D1ECF1; color:#1565C0; }
.status-expired { background:#FFE0E0; color:#E74C3C; }
.room-card-mid  { font-size:13px; color:#7F8C8D; margin-bottom:8px; }
.room-card-bar  {
  height:5px; background:#E0E0E0;
  border-radius:3px; overflow:hidden; margin-bottom:8px;
}
.room-card-fill { height:100%; border-radius:3px; }
.room-card-actions { display:flex; gap:8px; flex-wrap:wrap; }
.room-action-btn {
  flex:1; min-width:70px; height:34px;
  border:none; border-radius:8px; cursor:pointer;
  font-family:'Tajawal',sans-serif; font-size:12px; font-weight:600;
}
.btn-freeze  { background:#D1ECF1; color:#1565C0; }
.btn-unfreeze{ background:#D4EDDA; color:#27AE60; }
.btn-delete  { background:#FFE0E0; color:#E74C3C; }
.btn-settings{ background:#F4F6F9; color:#555; }
.btn-enter   { background:#2C3E7A; color:#fff; }

/* بطاقة Super Root في لوحة Super Owner */
.sroot-card {
  background:#fff; border-radius:14px;
  padding:14px; margin-bottom:10px;
  box-shadow:0 2px 8px rgba(0,0,0,.08);
  border-right:4px solid var(--rank-1000);
}
.sroot-name   { font-size:15px; font-weight:700; color:var(--rank-1000); }
.sroot-quota  { font-size:12px; color:#7F8C8D; margin:4px 0; }
.quota-bar    { height:4px; background:#E0E0E0; border-radius:2px; overflow:hidden; }
.quota-fill   { height:100%; background:var(--rank-1000); border-radius:2px; }

/* شجرة الهرم (Super Owner) */
.tree-node { padding-right:20px; border-right:2px dashed #E0E0E0; margin-right:8px; }
`;
document.head.appendChild(ownerStyle);

/* ══ لوحة Owner ════════════════════════ */
function openOwnerPanel() {
  let panel = document.getElementById('ownerPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ownerPanel';
    panel.className = 'owner-panel';
    panel.innerHTML = `
      <div class="owner-panel-header">
        <span class="owner-panel-title">👑 لوحة الأونر</span>
        <span class="owner-panel-close" onclick="closeOwnerPanel()">✕</span>
      </div>
      <div class="owner-panel-body" id="ownerPanelBody">
        <div style="text-align:center;padding:40px;color:#999">جاري التحميل...</div>
      </div>`;
    document.body.appendChild(panel);
  }
  panel.classList.add('show');
  loadOwnerRooms();
}

function closeOwnerPanel() {
  document.getElementById('ownerPanel')?.classList.remove('show');
}

function loadOwnerRooms() {
  socket.emit('getOwnerRooms', { user_id: userId });
  socket.once('ownerRooms', (rooms) => {
    const body = document.getElementById('ownerPanelBody');
    if (!rooms.length) {
      body.innerHTML = `<div style="text-align:center;padding:40px;color:#999">
        <div style="font-size:48px">🏠</div>
        <p>لا توجد غرف مُنشأة بعد</p></div>`;
      return;
    }
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;
        margin-bottom:12px;padding:12px;background:#fff;border-radius:12px;">
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:700;color:#2C3E7A">${rooms.length}</div>
          <div style="font-size:11px;color:#999">إجمالي الغرف</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:700;color:#27AE60">
            ${rooms.filter(r => r.is_active).length}
          </div>
          <div style="font-size:11px;color:#999">غرف نشطة</div>
        </div>
      </div>
      ${rooms.map(r => buildRoomCard(r)).join('')}`;
  });
}

function buildRoomCard(room) {
  const pct    = Math.min(100, Math.round(((room.member_count||0) / (room.max_capacity||200)) * 100));
  const barClr = pct < 70 ? '#27AE60' : pct < 90 ? '#F39C12' : '#E74C3C';
  const status = room.is_frozen ? 'frozen' : room.is_active ? 'active' : 'expired';
  const stLabel = { active:'🟢 نشطة', frozen:'🔵 مجمّدة', expired:'🔴 منتهية' };
  const stClass = { active:'status-active', frozen:'status-frozen', expired:'status-expired' };

  return `
    <div class="room-card">
      <div class="room-card-top">
        <div>
          <div class="room-card-name">${room.name}</div>
          <div class="room-card-id">#${room.id}</div>
        </div>
        <span class="room-card-status ${stClass[status]}">${stLabel[status]}</span>
      </div>
      <div class="room-card-mid">
        👤 المسؤول: ${room.master_name || 'غير محدد'} &nbsp;|&nbsp;
        👥 ${room.member_count||0}/${room.max_capacity||200}
      </div>
      <div class="room-card-bar">
        <div class="room-card-fill" style="width:${pct}%;background:${barClr}"></div>
      </div>
      <div style="font-size:11px;color:#999;margin-bottom:8px">
        📅 ينتهي: ${room.expires_at ? new Date(room.expires_at).toLocaleDateString('ar') : 'غير محدد'}
      </div>
      <div class="room-card-actions">
        <button class="room-action-btn btn-enter"
          onclick="enterRoomFromPanel(${room.id},'${room.name}')">دخول</button>
        <button class="room-action-btn btn-settings"
          onclick="openRoomSettings(${room.id})">⚙️</button>
        ${room.is_frozen
          ? `<button class="room-action-btn btn-unfreeze" onclick="unfreezeRoom(${room.id})">تفعيل</button>`
          : `<button class="room-action-btn btn-freeze"   onclick="freezeRoom(${room.id})">تجميد</button>`}
        <button class="room-action-btn btn-delete"
          onclick="deleteRoom(${room.id},'${room.name}')">حذف</button>
      </div>
    </div>`;
}

/* ── إجراءات Owner على الغرف ─────────── */
function freezeRoom(roomId) {
  if (!confirm('تجميد الغرفة؟ لن يتمكن أحد من الدخول.')) return;
  socket.emit('freezeRoom', { room_id: roomId, by: username });
  showToast('🔵 تم تجميد الغرفة'); loadOwnerRooms();
}
function unfreezeRoom(roomId) {
  socket.emit('unfreezeRoom', { room_id: roomId, by: username });
  showToast('🟢 تم تفعيل الغرفة'); loadOwnerRooms();
}
function deleteRoom(id, name) {
  if (!confirm(`⚠️ حذف غرفة "${name}" نهائياً؟`)) return;
  if (!confirm('هذا لا يمكن التراجع عنه. متأكد؟')) return;
  socket.emit('deleteRoom', { room_id: id, by: username });
  showToast('🗑️ تم حذف الغرفة'); loadOwnerRooms();
}
function openRoomSettings(id) { showToast(`⚙️ إعدادات الغرفة #${id} — قريباً`); }

/* ══ لوحة Super Owner ══════════════════ */
function openSuperOwnerPanel() {
  let panel = document.getElementById('superOwnerPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'superOwnerPanel';
    panel.className = 'owner-panel';
    panel.innerHTML = `
      <div class="owner-panel-header" style="background:#1a1a2e">
        <span class="owner-panel-title">👑 لوحة السوبر أونر</span>
        <span class="owner-panel-close" onclick="closeSuperOwnerPanel()">✕</span>
      </div>
      <div class="owner-panel-body" id="soPanelBody">
        <div style="text-align:center;padding:40px;color:#999">جاري التحميل...</div>
      </div>`;
    document.body.appendChild(panel);
  }
  panel.classList.add('show');
  loadSuperOwnerData();
}
function closeSuperOwnerPanel() {
  document.getElementById('superOwnerPanel')?.classList.remove('show');
}

function loadSuperOwnerData() {
  socket.emit('getSuperOwnerData', { user_id: userId });
  socket.once('superOwnerData', (data) => {
    const body = document.getElementById('soPanelBody');

    // بطاقات الإحصائيات
    const stats = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        ${[
          ['👥', data.total_users||0,   'مستخدم'],
          ['🏠', data.total_rooms||0,   'غرفة'],
          ['🌿', data.total_sroots||0,  'سوبر روت'],
        ].map(([ic,val,lab]) => `
          <div style="background:#fff;border-radius:12px;padding:12px;text-align:center;
            box-shadow:0 2px 6px rgba(0,0,0,.06)">
            <div style="font-size:22px">${ic}</div>
            <div style="font-size:18px;font-weight:700;color:#2C3E7A">${val}</div>
            <div style="font-size:10px;color:#999">${lab}</div>
          </div>`).join('')}
      </div>`;

    // شجرة السوبر روت
    const tree = (data.super_roots || []).map(sr => `
      <div class="sroot-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span class="sroot-name">🌿 ${sr.username}</span>
          <span style="font-size:11px;background:${sr.is_active?'#D4EDDA':'#FFE0E0'};
            color:${sr.is_active?'#27AE60':'#E74C3C'};padding:2px 8px;border-radius:8px">
            ${sr.is_active ? 'نشط' : 'مجمّد'}
          </span>
        </div>
        <div class="sroot-quota">الكوتة: ${sr.quota_used||0} / ${sr.quota_total||0} غرفة</div>
        <div class="quota-bar">
          <div class="quota-fill" style="width:${Math.min(100,Math.round(((sr.quota_used||0)/(sr.quota_total||1))*100))}%"></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button onclick="manageSuperRoot('${sr.username}',${sr.is_active})"
            style="flex:1;height:32px;background:${sr.is_active?'#FFE0E0':'#D4EDDA'};
            color:${sr.is_active?'#E74C3C':'#27AE60'};border:none;border-radius:8px;
            font-family:Tajawal,sans-serif;font-size:12px;font-weight:600;cursor:pointer">
            ${sr.is_active ? 'تجميد' : 'تفعيل'}
          </button>
          <button onclick="editSuperRootQuota('${sr.username}',${sr.quota_total||10})"
            style="flex:1;height:32px;background:#E8F4FD;color:#1565C0;border:none;
            border-radius:8px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:600;cursor:pointer">
            تعديل الكوتة
          </button>
        </div>
      </div>`).join('') || '<p style="text-align:center;color:#999;padding:20px">لا يوجد سوبر روت</p>';

    body.innerHTML = stats + `
      <div style="font-size:13px;font-weight:700;color:#7F8C8D;margin-bottom:8px">🌿 سوبر روت المنصة</div>
      ${tree}
      <button onclick="openAssignSuperRoot()"
        style="width:100%;height:46px;background:#2C3E7A;color:#fff;border:none;
        border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;
        font-weight:600;cursor:pointer;margin-top:8px">+ إضافة سوبر روت جديد</button>`;
  });
}

/* ── إدارة Super Root ────────────────── */
function manageSuperRoot(name, isActive) {
  const action = isActive ? 'freezeSuperRoot' : 'unfreezeSuperRoot';
  socket.emit(action, { target: name, by: username });
  showToast(isActive ? `🔵 تم تجميد ${name}` : `🟢 تم تفعيل ${name}`);
  setTimeout(loadSuperOwnerData, 800);
}

function editSuperRootQuota(name, currentQuota) {
  const newQ = prompt(`كوتة ${name} الحالية: ${currentQuota}\nالكوتة الجديدة:`, currentQuota);
  if (!newQ || isNaN(newQ)) return;
  socket.emit('updateQuota', { target: name, quota: parseInt(newQ), by: username });
  showToast(`✅ تم تحديث كوتة ${name} إلى ${newQ}`);
  setTimeout(loadSuperOwnerData, 800);
}

function openAssignSuperRoot() {
  const name = prompt('اسم المستخدم الذي تريد ترقيته لـ Super Root:');
  if (!name?.trim()) return;
  const quota = prompt('الكوتة (عدد الغرف المسموحة):', '10');
  if (!quota || isNaN(quota)) return;
  socket.emit('assignSuperRoot', { target: name.trim(), quota: parseInt(quota), by: username });
  showToast(`✅ تم ترقية ${name} لـ Super Root بكوتة ${quota}`);
  setTimeout(loadSuperOwnerData, 1000);
}

/* ── لوحة الأدوات الموحّدة ───────────── */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');
  const isSO     = userRank >= 1200;

  title.textContent = isSO ? '👑 أدوات السوبر أونر' : '👑 أدوات الأونر';

  const tools = [
    { icon:'🏠', bg:'#E8F4FD', label:'لوحة الغرف',          desc:'إدارة جميع غرفك',               fn: openOwnerPanel        },
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',           desc:'حذف الرسائل',                    fn: clearChat             },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة الإدارة',        desc:'إعلان للجميع',                   fn: openAnnouncementDialog},
    { icon:'🎨', bg:'#F3E5F5', label:'تغيير الثيم',          desc:'اختر من 5 ثيمات',               fn: openThemeSelector     },
    { icon:'📊', bg:'#E3F2FD', label:'إحصائيات شاملة',      desc:'نشاط كامل',                     fn: showRoomReport        },
    { icon:'💾', bg:'#E8F5E9', label:'Backup الغرفة',        desc:'حفظ الإعدادات',                 fn: fullBackup            },
    // Super Owner فقط
    { icon:'👑', bg:'#FFF8E1', label:'لوحة السوبر أونر',    desc:'شجرة كاملة للمنصة',             fn: openSuperOwnerPanel, show: isSO },
    { icon:'⚡', bg:'#FCE4EC', label:'صلاحيات الطوارئ',      desc:'تجميد أي حساب فوراً',           fn: openEmergencyPanel,  show: isSO },
  ];

  const visible = tools.filter(t => t.show !== false);
  toolList.innerHTML = visible.map((t, i) => `
    <div class="admin-tool" onclick="handleAdminTool(${i})">
      <div class="t-icon" style="background:${t.bg}">${t.icon}</div>
      <div><div class="t-name">${t.label}</div><div class="t-desc">${t.desc}</div></div>
    </div>`).join('');

  window._adminTools = visible;
  sheet.classList.add('open');
  overlay.classList.add('show');
}

/* ── لوحة الطوارئ (Super Owner فقط) ─── */
function openEmergencyPanel() {
  const name = prompt('⚠️ اسم الحساب الذي تريد تجميده فوراً:');
  if (!name?.trim()) return;
  if (!confirm(`تجميد حساب "${name}" فوراً على مستوى المنصة كاملة؟`)) return;
  socket.emit('emergencyFreeze', { target: name.trim(), by: username });
  showToast(`⚡ تم تجميد ${name} على مستوى المنصة`);
  SoundSystem?.warning();
}

/* ── أحداث Socket خاصة بـ Owner ─────── */
socket.on('roomFrozen',   (d) => { if(d.room_id == roomId) addSystem(`🔵 ${d.by} جمّد الغرفة`); });
socket.on('roomUnfrozen', (d) => { if(d.room_id == roomId) addSystem(`🟢 ${d.by} فعّل الغرفة`); });
socket.on('roomDeleted',  (d) => {
  if (d.room_id == roomId) {
    alert('تم حذف هذه الغرفة');
    window.location.href = '/rooms.html';
  }
});
