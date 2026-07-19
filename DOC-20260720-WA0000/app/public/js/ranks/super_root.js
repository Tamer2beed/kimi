/* ════════════════════════════════════════
   WidBid — ranks/super_root.js
   الرتبة: Super Root (1000)
   يُحمَّل بعد root.js إذا userRank >= 1000
════════════════════════════════════════ */

/* ── ما يضيفه Super Root فوق Root ───────
   ✅ إدارة متعددة الغرف من لوحة واحدة
   ✅ إنشاء حسابات Root جديدة (من كوتة Owner)
   ✅ تقارير مجمّعة لكل غرفه
   ✅ تحويل عضو من غرفة لأخرى
   ✅ إرسال إشعار لجميع غرفه دفعة واحدة
   ✅ إحصائيات مقارنة بين الغرف
─────────────────────────────────────── */

/* ══ لوحة Super Root ══════════════════ */
const SuperRootDashboard = (() => {

  function open() {
    let panel = document.getElementById('srDashboard');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'srDashboard';
      panel.className = 'owner-panel';
      panel.innerHTML = `
        <div class="owner-panel-header" style="background:#E67E22">
          <span class="owner-panel-title">🌿 لوحة السوبر روت</span>
          <span class="owner-panel-close" onclick="SuperRootDashboard.close()">✕</span>
        </div>
        <div style="display:flex;border-bottom:1px solid #E0E0E0;background:#fff">
          <div class="sr-tab active" onclick="SuperRootDashboard.switchTab('rooms')"  id="srTab-rooms">🏠 غرفي</div>
          <div class="sr-tab"        onclick="SuperRootDashboard.switchTab('report')" id="srTab-report">📊 التقارير</div>
          <div class="sr-tab"        onclick="SuperRootDashboard.switchTab('roots')"  id="srTab-roots">🔧 الروت</div>
          <div class="sr-tab"        onclick="SuperRootDashboard.switchTab('alert')"  id="srTab-alert">📢 إشعار</div>
        </div>
        <div class="owner-panel-body" id="srPanelBody">
          <div style="text-align:center;padding:40px;color:#999">جاري التحميل...</div>
        </div>`;
      document.body.appendChild(panel);
    }

    // CSS للتبويبات
    if (!document.getElementById('srTabStyle')) {
      const s = document.createElement('style');
      s.id = 'srTabStyle';
      s.textContent = `
        .sr-tab {
          flex:1; padding:12px 4px; text-align:center;
          font-size:12px; font-weight:600; color:#7F8C8D; cursor:pointer;
          border-bottom:2px solid transparent;
        }
        .sr-tab.active { color:#E67E22; border-bottom-color:#E67E22; }
      `;
      document.head.appendChild(s);
    }

    panel.classList.add('show');
    switchTab('rooms');
  }

  function close() {
    document.getElementById('srDashboard')?.classList.remove('show');
  }

  function switchTab(tab) {
    document.querySelectorAll('.sr-tab').forEach(t =>
      t.classList.toggle('active', t.id === `srTab-${tab}`)
    );
    const body = document.getElementById('srPanelBody');
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#999">جاري التحميل...</div>`;

    if (tab === 'rooms')  loadMyRooms(body);
    if (tab === 'report') loadMyReport(body);
    if (tab === 'roots')  loadMyRoots(body);
    if (tab === 'alert')  showAlertSender(body);
  }

  /* ── غرفي ─────────────────────────── */
  function loadMyRooms(body) {
    socket.emit('getSuperRootRooms', { user_id: userId });
    socket.once('superRootRooms', (rooms) => {
      if (!rooms.length) {
        body.innerHTML = `<div style="text-align:center;padding:40px">
          <div style="font-size:48px">🏠</div>
          <p style="color:#999;margin-top:8px">لا توجد غرف مُعيَّنة لك</p></div>`;
        return;
      }

      // إجماليات
      const totalOnline = rooms.reduce((s, r) => s + (r.member_count||0), 0);
      const activeCount = rooms.filter(r => r.is_active).length;

      body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          ${[['🏠',rooms.length,'الغرف'],['🟢',activeCount,'نشطة'],['👥',totalOnline,'متواجد']].map(([ic,v,lb])=>`
            <div style="background:#fff;border-radius:12px;padding:12px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.06)">
              <div style="font-size:20px">${ic}</div>
              <div style="font-size:18px;font-weight:700;color:#E67E22">${v}</div>
              <div style="font-size:10px;color:#999">${lb}</div>
            </div>`).join('')}
        </div>
        ${rooms.map(r => `
          <div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;
            box-shadow:0 2px 8px rgba(0,0,0,.06);border-right:4px solid ${r.is_active?'#27AE60':'#E74C3C'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div>
                <div style="font-weight:700;color:#1A1A2E">${r.name}</div>
                <div style="font-size:11px;color:#4A90D9">#${r.id}</div>
              </div>
              <span style="font-size:11px;padding:3px 8px;border-radius:10px;font-weight:600;
                background:${r.is_active?'#D4EDDA':'#FFE0E0'};color:${r.is_active?'#27AE60':'#E74C3C'}">
                ${r.is_active ? '🟢 نشطة' : '🔴 غير نشطة'}
              </span>
            </div>
            <div style="font-size:12px;color:#999;margin-bottom:8px">
              👥 ${r.member_count||0} متواجد &nbsp;|&nbsp; 👑 Master: ${r.master_name||'غير محدد'}
            </div>
            <div style="display:flex;gap:6px">
              <button onclick="SuperRootDashboard.enterRoom(${r.id},'${r.name}')"
                style="flex:2;height:34px;background:#E67E22;color:#fff;border:none;border-radius:8px;
                font-family:'Tajawal',sans-serif;font-size:12px;font-weight:600;cursor:pointer">دخول</button>
              <button onclick="SuperRootDashboard.transferMember(${r.id},'${r.name}')"
                style="flex:1;height:34px;background:#E8F4FD;color:#1565C0;border:none;border-radius:8px;
                font-family:'Tajawal',sans-serif;font-size:12px;font-weight:600;cursor:pointer">نقل</button>
            </div>
          </div>`).join('')}`;
    });
  }

  /* ── التقارير المقارنة ────────────── */
  function loadMyReport(body) {
    socket.emit('getSuperRootReport', { user_id: userId });
    socket.once('superRootReport', (data) => {
      body.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
          <div style="font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:12px">📊 ملخص الأسبوع</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${[
              ['💬','رسائل اليوم',    data.messages_today||0],
              ['🚪','دخول اليوم',     data.joins_today||0],
              ['🔇','إجراءات إدارية', data.admin_actions||0],
              ['⏱️','متوسط التشغيل',  `${data.avg_uptime||0}س`],
            ].map(([ic,lb,v])=>`
              <div style="background:#F8F9FA;border-radius:10px;padding:12px;text-align:center">
                <div style="font-size:20px">${ic}</div>
                <div style="font-size:16px;font-weight:700;color:#E67E22">${v}</div>
                <div style="font-size:11px;color:#999">${lb}</div>
              </div>`).join('')}
          </div>
        </div>
        <div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
          <div style="font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:10px">🏆 أنشط الغرف</div>
          ${(data.top_rooms||[]).map((r,i)=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">
              <div style="font-size:16px;width:24px;text-align:center">${['🥇','🥈','🥉'][i]||'•'}</div>
              <div style="flex:1;font-weight:600;color:#1A1A2E">${r.name}</div>
              <div style="font-size:12px;color:#E67E22;font-weight:600">${r.message_count||0} رسالة</div>
            </div>`).join('') || '<p style="text-align:center;color:#999">لا توجد بيانات</p>'}
        </div>`;
    });
  }

  /* ── الروت التابعون ──────────────── */
  function loadMyRoots(body) {
    socket.emit('getMySuperRootRoots', { user_id: userId });
    socket.once('mySuperRootRoots', (roots) => {
      body.innerHTML = `
        <div style="margin-bottom:10px">
          <button onclick="SuperRootDashboard.createRoot()"
            style="width:100%;height:46px;background:#E67E22;color:#fff;border:none;
            border-radius:12px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer">
            + إنشاء روت جديد
          </button>
        </div>
        ${!roots.length ? '<p style="text-align:center;color:#999;padding:20px">لا توجد روت مسجّلة</p>' :
          roots.map(r=>`
            <div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:8px;
              box-shadow:0 2px 8px rgba(0,0,0,.06);border-right:4px solid #F39C12">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:700;color:#F39C12">🔧 ${r.username}</div>
                  <div style="font-size:11px;color:#999">غرف نشطة: ${r.active_rooms||0}</div>
                </div>
                <button onclick="SuperRootDashboard.removeRoot('${r.username}')"
                  style="padding:5px 10px;background:#FFE0E0;color:#E74C3C;border:none;
                  border-radius:8px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:600;cursor:pointer">
                  إزالة
                </button>
              </div>
            </div>`).join('')}`;
    });
  }

  /* ── إشعار جماعي لكل الغرف ─────── */
  function showAlertSender(body) {
    body.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <div style="font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:12px">
          📢 إرسال إشعار لجميع غرفك
        </div>
        <textarea id="srAlertTxt" placeholder="اكتب الرسالة هنا..." style="
          width:100%;height:100px;border:1.5px solid #E0E0E0;border-radius:10px;
          padding:10px;resize:none;outline:none;
          font-family:'Tajawal',sans-serif;font-size:14px;direction:rtl"></textarea>
        <div style="font-size:12px;color:#999;margin:8px 0">سيُرسل للجميع في كل غرفك</div>
        <button onclick="SuperRootDashboard.sendBroadcast()"
          style="width:100%;height:46px;background:#E67E22;color:#fff;border:none;
          border-radius:12px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer">
          إرسال للجميع 📢
        </button>
      </div>`;
  }

  /* ── الإجراءات ───────────────────── */
  function enterRoom(id, name) {
    localStorage.setItem('room_id', id);
    localStorage.setItem('room_name', name);
    window.location.reload();
  }

  function transferMember(targetRoomId, targetRoomName) {
    const memberName = prompt(`نقل أي عضو إلى غرفة "${targetRoomName}"؟`);
    if (!memberName?.trim()) return;
    socket.emit('transferMember', {
      from_room: roomId, to_room: targetRoomId,
      target: memberName.trim(), by: username
    });
    showToast(`✅ تم نقل ${memberName} لغرفة ${targetRoomName}`);
  }

  function createRoot() {
    const name = prompt('اسم المستخدم الذي تريد ترقيته لـ Root:');
    if (!name?.trim()) return;
    socket.emit('createRoot', {
      target: name.trim(), super_root_id: userId, by: username
    });
    showToast(`✅ تم إنشاء روت: ${name}`);
    SoundSystem?.success();
  }

  function removeRoot(name) {
    if (!confirm(`إزالة Root "${name}"؟`)) return;
    socket.emit('removeRoot', { target: name, by: username });
    showToast(`✅ تم إزالة روت: ${name}`);
  }

  function sendBroadcast() {
    const txt = document.getElementById('srAlertTxt')?.value.trim();
    if (!txt) { showToast('⚠️ اكتب الرسالة أولاً'); return; }
    socket.emit('superRootBroadcast', { text: txt, by: username, user_id: userId });
    showToast('📢 تم إرسال الإشعار لجميع غرفك');
    SoundSystem?.announcement();
    document.getElementById('srAlertTxt').value = '';
  }

  return { open, close, switchTab, enterRoom, transferMember, createRoot, removeRoot, sendBroadcast };
})();

/* ── تحديث لوحة الأدوات ─────────────── */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  title.textContent = '🌿 أدوات السوبر روت';

  const tools = [
    { icon:'🌿', bg:'#FEF3E2', label:'لوحة السوبر روت',   desc:'إدارة جميع غرفي وروتي',          fn: SuperRootDashboard.open   },
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',          desc:'حذف الرسائل الحالية',             fn: clearChat                 },
    { icon:'🎨', bg:'#F3E5F5', label:'تغيير الثيم',         desc:'اختر من 5 ثيمات',               fn: openThemeSelector         },
    { icon:'✏️', bg:'#E8F4FD', label:'تعديل البانر',        desc:'رسالة الترحيب',                  fn: openWelcomeEditor         },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة عامة',          desc:'إعلان لهذه الغرفة',             fn: openAnnouncementDialog    },
    { icon:'📊', bg:'#E3F2FD', label:'تقرير الغرفة',        desc:'إحصائيات تفصيلية',              fn: showRoomReport            },
    { icon:'🔐', bg:'#EDE7F6', label:'Dual Machine Lock',   desc:'أجهزتي المرتبطة',               fn: DualLock.showDevices      },
    { icon:'💾', bg:'#E8F5E9', label:'Backup الغرفة',       desc:'حفظ الإعدادات',                 fn: fullBackup                },
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

/* ── أحداث Socket ───────────────────── */
socket.on('memberTransferred', (d) => {
  addSystem(`↗️ ${d.target} انتقل إلى غرفة ${d.to_room_name}`);
});
socket.on('superRootBroadcast', (d) => {
  const el = document.createElement('div');
  el.className = 'announcement-msg';
  el.style.borderRight = '4px solid #E67E22';
  el.innerHTML = `
    <div class="ann-from">🌿 إشعار من السوبر روت ${d.by}</div>
    <div class="ann-text">${d.text}</div>`;
  document.getElementById('messages').appendChild(el);
  document.getElementById('messages').scrollTop = 9999;
  SoundSystem?.announcement();
});

window.SuperRootDashboard = SuperRootDashboard;
