/* ════════════════════════════════════════
   WidBid — ranks/super_owner.js
   الرتبة: Super Owner (1200)
   يُحمَّل بعد owner.js إذا userRank >= 1200
════════════════════════════════════════ */

/* ── ما يضيفه Super Owner فوق Owner ─────
   ✅ إدارة جميع Owners على المنصة
   ✅ شجرة كاملة: SuperRoot→Root→Rooms
   ✅ إحصائيات المنصة الكاملة (لوحة رئيسية)
   ✅ صلاحيات الطوارئ (تجميد أي حساب فوراً)
   ✅ إدارة الاشتراكات والباقات
   ✅ إرسال إشعار لكل المنصة
   ✅ رؤية وتعديل جميع الإعدادات
─────────────────────────────────────── */

/* ══ CSS خاص بـ Super Owner ════════════ */
const soStyle = document.createElement('style');
soStyle.textContent = `
.so-panel {
  position:fixed; inset:0; z-index:400;
  background:#F4F6F9; display:none; flex-direction:column;
}
.so-panel.show { display:flex; }
.so-panel-header {
  background:linear-gradient(135deg,#1a1a2e,#2C3E7A);
  color:#fff; padding:0 16px; height:60px;
  display:flex; align-items:center; justify-content:space-between;
}
.so-panel-title { font-size:17px; font-weight:700; display:flex; align-items:center; gap:8px; }
.so-panel-close { font-size:24px; cursor:pointer; opacity:.8; }
.so-tabs {
  display:flex; background:#fff;
  border-bottom:1px solid #E0E0E0;
  overflow-x:auto; flex-shrink:0;
}
.so-tabs::-webkit-scrollbar { display:none; }
.so-tab {
  flex-shrink:0; padding:12px 14px; font-size:12px; font-weight:600;
  color:#7F8C8D; cursor:pointer; white-space:nowrap;
  border-bottom:2px solid transparent;
}
.so-tab.active { color:#2C3E7A; border-bottom-color:#2C3E7A; }
.so-body { flex:1; overflow-y:auto; padding:12px; }

/* بطاقة إحصاء */
.so-stat-card {
  background:#fff; border-radius:14px; padding:16px;
  box-shadow:0 2px 8px rgba(0,0,0,.06);
  display:flex; flex-direction:column; align-items:center;
}
.so-stat-icon   { font-size:28px; margin-bottom:6px; }
.so-stat-value  { font-size:24px; font-weight:900; color:#2C3E7A; }
.so-stat-label  { font-size:11px; color:#7F8C8D; margin-top:2px; }

/* بطاقة Owner */
.owner-card {
  background:#fff; border-radius:14px; padding:14px;
  margin-bottom:10px; box-shadow:0 2px 8px rgba(0,0,0,.06);
  border-right:4px solid #D4AF37;
}
.owner-card-name  { font-size:15px; font-weight:700; color:#D4AF37; }
.owner-card-stats { font-size:12px; color:#7F8C8D; margin:6px 0; }
.owner-card-actions { display:flex; gap:6px; margin-top:8px; }
.owner-action {
  flex:1; height:34px; border:none; border-radius:8px; cursor:pointer;
  font-family:'Tajawal',sans-serif; font-size:12px; font-weight:600;
}

/* شجرة الهرم */
.tree-container { padding:8px 0; }
.tree-item {
  background:#fff; border-radius:12px; padding:12px 14px;
  margin-bottom:6px; box-shadow:0 1px 4px rgba(0,0,0,.06);
  cursor:pointer;
}
.tree-item.level-sr { border-right:4px solid #E67E22; margin-right:0; }
.tree-item.level-r  { border-right:4px solid #F39C12; margin-right:16px; }
.tree-item.level-rm { border-right:4px solid #4A90D9; margin-right:32px; }
.tree-item-name { font-weight:600; color:#1A1A2E; font-size:13px; }
.tree-item-meta { font-size:11px; color:#7F8C8D; margin-top:2px; }
`;
document.head.appendChild(soStyle);

/* ══ لوحة Super Owner الرئيسية ════════ */
const SuperOwnerDashboard = (() => {

  let currentTab = 'overview';

  function open() {
    let panel = document.getElementById('soDashboard');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'soDashboard';
      panel.className = 'so-panel';
      panel.innerHTML = `
        <div class="so-panel-header">
          <div class="so-panel-title">
            <span style="font-size:22px">👑</span>
            <span>لوحة السوبر أونر</span>
          </div>
          <span class="so-panel-close" onclick="SuperOwnerDashboard.close()">✕</span>
        </div>
        <div class="so-tabs" id="soTabs">
          <div class="so-tab active" onclick="SuperOwnerDashboard.switchTab('overview')">📊 نظرة عامة</div>
          <div class="so-tab"        onclick="SuperOwnerDashboard.switchTab('owners')">👑 الأونرز</div>
          <div class="so-tab"        onclick="SuperOwnerDashboard.switchTab('tree')">🌳 الهرم</div>
          <div class="so-tab"        onclick="SuperOwnerDashboard.switchTab('broadcast')">📢 إشعار</div>
          <div class="so-tab"        onclick="SuperOwnerDashboard.switchTab('emergency')">⚡ طوارئ</div>
        </div>
        <div class="so-body" id="soBody">
          <div style="text-align:center;padding:40px;color:#999">جاري التحميل...</div>
        </div>`;
      document.body.appendChild(panel);
    }
    panel.classList.add('show');
    switchTab('overview');
  }

  function close() {
    document.getElementById('soDashboard')?.classList.remove('show');
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.so-tab').forEach((t, i) => {
      const tabs = ['overview','owners','tree','broadcast','emergency'];
      t.classList.toggle('active', tabs[i] === tab);
    });
    const body = document.getElementById('soBody');
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#999">جاري التحميل...</div>`;

    if (tab === 'overview')   loadOverview(body);
    if (tab === 'owners')     loadOwners(body);
    if (tab === 'tree')       loadTree(body);
    if (tab === 'broadcast')  showBroadcast(body);
    if (tab === 'emergency')  showEmergency(body);
  }

  /* ── النظرة العامة ───────────────── */
  function loadOverview(body) {
    socket.emit('getPlatformStats', { user_id: userId });
    socket.once('platformStats', (stats) => {
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          ${[
            ['👥', stats.total_users||0,   'إجمالي المستخدمين'],
            ['🏠', stats.total_rooms||0,   'إجمالي الغرف'],
            ['🟢', stats.active_rooms||0,  'غرف نشطة الآن'],
            ['👑', stats.total_owners||0,  'Owners'],
            ['🌿', stats.total_sroots||0,  'Super Roots'],
            ['💬', stats.messages_today||0,'رسائل اليوم'],
          ].map(([ic,v,lb]) => `
            <div class="so-stat-card">
              <div class="so-stat-icon">${ic}</div>
              <div class="so-stat-value">${v.toLocaleString()}</div>
              <div class="so-stat-label">${lb}</div>
            </div>`).join('')}
        </div>

        <!-- أنشط الغرف -->
        <div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
          <div style="font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:10px">🏆 أنشط الغرف</div>
          ${(stats.top_rooms||[]).map((r,i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">
              <span style="font-size:18px">${['🥇','🥈','🥉'][i]||'•'}</span>
              <div style="flex:1">
                <div style="font-weight:600;color:#1A1A2E;font-size:13px">${r.name}</div>
                <div style="font-size:11px;color:#999">👥 ${r.member_count||0} متواجد</div>
              </div>
              <div style="font-size:12px;color:#4A90D9;font-weight:600">${r.messages||0} رسالة</div>
            </div>`).join('') || '<p style="color:#999;text-align:center">لا توجد بيانات</p>'}
        </div>

        <!-- نشاط الساعة الأخيرة -->
        <div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
          <div style="font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:10px">⏱️ الساعة الأخيرة</div>
          <div style="display:flex;justify-content:space-around">
            ${[
              ['🚪', stats.joins_last_hour||0,    'دخول'],
              ['💬', stats.messages_last_hour||0,  'رسائل'],
              ['🔇', stats.actions_last_hour||0,   'إجراءات'],
            ].map(([ic,v,lb]) => `
              <div style="text-align:center">
                <div style="font-size:20px">${ic}</div>
                <div style="font-size:18px;font-weight:700;color:#2C3E7A">${v}</div>
                <div style="font-size:10px;color:#999">${lb}</div>
              </div>`).join('')}
          </div>
        </div>`;
    });
  }

  /* ── الأونرز ─────────────────────── */
  function loadOwners(body) {
    socket.emit('getAllOwners', { user_id: userId });
    socket.once('allOwners', (owners) => {
      body.innerHTML = `
        <button onclick="SuperOwnerDashboard.createOwner()"
          style="width:100%;height:46px;background:#2C3E7A;color:#fff;border:none;
          border-radius:12px;font-family:'Tajawal',sans-serif;font-size:14px;
          font-weight:600;cursor:pointer;margin-bottom:12px">+ إضافة Owner جديد</button>
        ${!owners.length
          ? '<p style="text-align:center;color:#999;padding:20px">لا يوجد Owners</p>'
          : owners.map(o => `
            <div class="owner-card">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div class="owner-card-name">👑 ${o.username}</div>
                  <div class="owner-card-stats">
                    🏠 ${o.room_count||0} غرفة &nbsp;|&nbsp;
                    🌿 ${o.sroot_count||0} سوبر روت &nbsp;|&nbsp;
                    ${o.is_active ? '🟢 نشط' : '🔴 مجمّد'}
                  </div>
                </div>
              </div>
              <div class="owner-card-actions">
                <button class="owner-action"
                  onclick="SuperOwnerDashboard.toggleOwner('${o.username}',${o.is_active})"
                  style="background:${o.is_active?'#FFE0E0':'#D4EDDA'};color:${o.is_active?'#E74C3C':'#27AE60'}">
                  ${o.is_active ? 'تجميد' : 'تفعيل'}
                </button>
                <button class="owner-action"
                  onclick="SuperOwnerDashboard.editOwnerQuota('${o.username}',${o.max_rooms||10})"
                  style="background:#E8F4FD;color:#1565C0">الكوتة</button>
                <button class="owner-action"
                  onclick="SuperOwnerDashboard.viewOwnerRooms('${o.username}')"
                  style="background:#F3E5F5;color:#6A1B9A">الغرف</button>
              </div>
            </div>`).join('')}`;
    });
  }

  /* ── شجرة الهرم ─────────────────── */
  function loadTree(body) {
    socket.emit('getPlatformTree', { user_id: userId });
    socket.once('platformTree', (tree) => {
      if (!tree.length) {
        body.innerHTML = '<p style="text-align:center;color:#999;padding:40px">الشجرة فارغة</p>';
        return;
      }
      let html = '<div class="tree-container">';
      tree.forEach(sr => {
        html += `
          <div class="tree-item level-sr">
            <div class="tree-item-name">🌿 ${sr.username}</div>
            <div class="tree-item-meta">كوتة: ${sr.quota_used||0}/${sr.quota_total||0}</div>
          </div>`;
        (sr.roots||[]).forEach(r => {
          html += `
            <div class="tree-item level-r">
              <div class="tree-item-name">🔧 ${r.username}</div>
              <div class="tree-item-meta">غرف: ${r.room_count||0}</div>
            </div>`;
          (r.rooms||[]).forEach(rm => {
            html += `
              <div class="tree-item level-rm">
                <div class="tree-item-name">🏠 ${rm.name}</div>
                <div class="tree-item-meta">👥 ${rm.member_count||0} | ${rm.is_active?'🟢 نشطة':'🔴 متوقفة'}</div>
              </div>`;
          });
        });
      });
      html += '</div>';
      body.innerHTML = html;
    });
  }

  /* ── إشعار لكل المنصة ───────────── */
  function showBroadcast(body) {
    body.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <div style="font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:12px">
          📢 إشعار لجميع غرف المنصة
        </div>
        <div style="font-size:12px;color:#E74C3C;background:#FFE0E0;padding:10px;
          border-radius:8px;margin-bottom:12px">
          ⚠️ هذا الإشعار سيصل لجميع المستخدمين في كل غرف المنصة
        </div>
        <textarea id="soBroadcastTxt" placeholder="اكتب رسالتك هنا..." style="
          width:100%;height:120px;border:1.5px solid #E0E0E0;border-radius:10px;
          padding:12px;resize:none;outline:none;
          font-family:'Tajawal',sans-serif;font-size:14px;direction:rtl"></textarea>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button onclick="SuperOwnerDashboard.sendPlatformBroadcast()"
            style="flex:2;height:48px;background:#2C3E7A;color:#fff;border:none;
            border-radius:12px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer">
            إرسال للمنصة كاملة 📢
          </button>
          <button onclick="document.getElementById('soBroadcastTxt').value=''"
            style="flex:1;height:48px;background:#f5f5f5;color:#888;border:none;
            border-radius:12px;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer">
            مسح
          </button>
        </div>
      </div>`;
  }

  /* ── صلاحيات الطوارئ ────────────── */
  function showEmergency(body) {
    body.innerHTML = `
      <div style="background:#FFE0E0;border-radius:14px;padding:16px;margin-bottom:12px">
        <div style="font-size:14px;font-weight:700;color:#E74C3C;margin-bottom:6px">⚡ صلاحيات الطوارئ</div>
        <div style="font-size:12px;color:#C62828">
          هذه الصلاحيات تؤثر على المنصة كاملة — استخدمها بحذر شديد
        </div>
      </div>

      ${[
        { icon:'🔒', bg:'#FFE0E0', color:'#E74C3C', label:'تجميد حساب فوراً',    desc:'منع مستخدم من الدخول لأي غرفة', fn:'freezeAccount' },
        { icon:'🔓', bg:'#D4EDDA', color:'#27AE60', label:'رفع التجميد',          desc:'استعادة وصول حساب مجمّد',        fn:'unfreezeAccount' },
        { icon:'🚫', bg:'#FCE4EC', color:'#AD1457', label:'حظر دائم (IP + جهاز)', desc:'حظر شامل لمستخدم بعينه',         fn:'permanentBan' },
        { icon:'🏠', bg:'#E8F4FD', color:'#1565C0', label:'إغلاق غرفة طارئ',     desc:'إخراج الجميع وإغلاق غرفة',       fn:'emergencyCloseRoom' },
        { icon:'📣', bg:'#FFF3CD', color:'#856404', label:'إعلان طوارئ للمنصة',  desc:'إشعار عاجل لجميع المستخدمين',    fn:'sendEmergencyAlert' },
      ].map((a,i) => `
        <div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:8px;
          box-shadow:0 2px 6px rgba(0,0,0,.06);display:flex;align-items:center;gap:12px;cursor:pointer"
          onclick="SuperOwnerDashboard.emergencyAction('${a.fn}')">
          <div style="width:44px;height:44px;border-radius:10px;background:${a.bg};
            display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${a.icon}</div>
          <div style="flex:1">
            <div style="font-weight:600;color:${a.color};font-size:13px">${a.label}</div>
            <div style="font-size:11px;color:#7F8C8D;margin-top:2px">${a.desc}</div>
          </div>
          <span style="color:#ccc;font-size:18px">›</span>
        </div>`).join('')}`;
  }

  /* ── الإجراءات ───────────────────── */
  function createOwner() {
    const name = prompt('اسم المستخدم الذي تريد ترقيته لـ Owner:');
    if (!name?.trim()) return;
    const quota = prompt('الكوتة القصوى من الغرف:', '20');
    if (!quota || isNaN(quota)) return;
    socket.emit('createOwner', { target: name.trim(), max_rooms: parseInt(quota), by: username });
    showToast(`✅ تم إنشاء Owner: ${name}`);
    SoundSystem?.success();
  }

  function toggleOwner(name, isActive) {
    if (!confirm(`${isActive?'تجميد':'تفعيل'} حساب Owner "${name}"؟`)) return;
    socket.emit(isActive ? 'freezeOwner' : 'unfreezeOwner', { target: name, by: username });
    showToast(`${isActive?'🔵 تم تجميد':'🟢 تم تفعيل'} ${name}`);
    setTimeout(() => loadOwners(document.getElementById('soBody')), 800);
  }

  function editOwnerQuota(name, current) {
    const q = prompt(`كوتة ${name} الحالية: ${current}\nالكوتة الجديدة:`, current);
    if (!q || isNaN(q)) return;
    socket.emit('updateOwnerQuota', { target: name, max_rooms: parseInt(q), by: username });
    showToast(`✅ تم تحديث كوتة ${name} إلى ${q}`);
  }

  function viewOwnerRooms(name) {
    showToast(`🏠 غرف ${name} — قريباً`);
  }

  function sendPlatformBroadcast() {
    const txt = document.getElementById('soBroadcastTxt')?.value.trim();
    if (!txt) { showToast('⚠️ اكتب الرسالة أولاً'); return; }
    if (!confirm('إرسال هذا الإشعار لجميع مستخدمي المنصة؟')) return;
    socket.emit('platformBroadcast', { text: txt, by: username });
    showToast('📢 تم الإرسال لجميع غرف المنصة');
    SoundSystem?.announcement();
    document.getElementById('soBroadcastTxt').value = '';
  }

  function emergencyAction(fn) {
    const actions = {
      freezeAccount: () => {
        const name = prompt('اسم الحساب الذي تريد تجميده فوراً:');
        if (!name?.trim()) return;
        if (!confirm(`⚠️ تجميد "${name}" فوراً على مستوى المنصة؟`)) return;
        socket.emit('emergencyFreeze', { target: name.trim(), by: username });
        showToast(`⚡ تم تجميد ${name} فوراً`);
        SoundSystem?.warning();
      },
      unfreezeAccount: () => {
        const name = prompt('اسم الحساب المجمّد:');
        if (!name?.trim()) return;
        socket.emit('emergencyUnfreeze', { target: name.trim(), by: username });
        showToast(`✅ تم رفع التجميد عن ${name}`);
      },
      permanentBan: () => {
        const name = prompt('اسم الحساب للحظر الدائم:');
        if (!name?.trim()) return;
        if (!confirm(`⚠️ حظر دائم لـ "${name}" (IP + جهاز)؟ لا يمكن التراجع.`)) return;
        socket.emit('permanentBan', { target: name.trim(), by: username });
        showToast(`🚫 تم الحظر الدائم لـ ${name}`);
        SoundSystem?.warning();
      },
      emergencyCloseRoom: () => {
        const id = prompt('رقم الغرفة للإغلاق الطارئ:');
        if (!id?.trim() || isNaN(id)) return;
        if (!confirm(`إغلاق طارئ للغرفة #${id}؟`)) return;
        socket.emit('emergencyCloseRoom', { room_id: parseInt(id), by: username });
        showToast(`🏠 تم الإغلاق الطارئ للغرفة #${id}`);
      },
      sendEmergencyAlert: () => {
        const msg = prompt('رسالة الطوارئ (ستُرسل لجميع المستخدمين):');
        if (!msg?.trim()) return;
        socket.emit('emergencyAlert', { message: msg.trim(), by: username });
        showToast('📣 تم إرسال إعلان الطوارئ');
        SoundSystem?.announcement();
      },
    };
    actions[fn]?.();
  }

  return {
    open, close, switchTab,
    createOwner, toggleOwner, editOwnerQuota, viewOwnerRooms,
    sendPlatformBroadcast, emergencyAction,
  };
})();

/* ── تحديث لوحة الأدوات لـ Super Owner ─ */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  title.textContent = '👑 أدوات السوبر أونر';

  const tools = [
    { icon:'👑', bg:'#FFF8E1', label:'لوحة السوبر أونر',  desc:'نظرة عامة + شجرة المنصة',       fn: SuperOwnerDashboard.open  },
    { icon:'🏠', bg:'#E8F4FD', label:'لوحة الغرف',         desc:'إدارة جميع غرفك',               fn: openOwnerPanel            },
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',          desc:'حذف الرسائل الحالية',            fn: clearChat                 },
    { icon:'🎨', bg:'#F3E5F5', label:'تغيير الثيم',         desc:'اختر من 5 ثيمات',              fn: openThemeSelector         },
    { icon:'✏️', bg:'#E8F4FD', label:'تعديل البانر',        desc:'رسالة الترحيب',                fn: openWelcomeEditor         },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة للمنصة',        desc:'إعلان لجميع مستخدمي المنصة',   fn: () => SuperOwnerDashboard.open() || SuperOwnerDashboard.switchTab('broadcast') },
    { icon:'⚡', bg:'#FCE4EC', label:'صلاحيات الطوارئ',    desc:'تجميد + حظر + إغلاق طارئ',     fn: () => SuperOwnerDashboard.open() || SuperOwnerDashboard.switchTab('emergency') },
    { icon:'📊', bg:'#E3F2FD', label:'إحصائيات المنصة',    desc:'نشاط كامل للمنصة',              fn: () => SuperOwnerDashboard.open() || SuperOwnerDashboard.switchTab('overview') },
    { icon:'💾', bg:'#E8F5E9', label:'Backup شامل',         desc:'حفظ إعدادات الغرفة',           fn: fullBackup                },
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

/* ── أحداث Socket لـ Super Owner ─────── */
socket.on('platformBroadcast', (d) => {
  const el = document.createElement('div');
  el.className = 'announcement-msg';
  el.style.cssText += 'border:2px solid #D4AF37;';
  el.innerHTML = `
    <div class="ann-from">👑 إعلان السوبر أونر — ${d.by}</div>
    <div class="ann-text">${d.text}</div>`;
  document.getElementById('messages').appendChild(el);
  document.getElementById('messages').scrollTop = 9999;
  SoundSystem?.announcement();
});

socket.on('emergencyAlert', (d) => {
  const el = document.createElement('div');
  el.style.cssText = `
    background:#E74C3C; color:#fff; border-radius:12px;
    padding:14px; margin:8px 0; position:relative; z-index:1;
    border:2px solid #C0392B; animation:popIn .3s ease;
  `;
  el.innerHTML = `
    <div style="font-size:11px;opacity:.8;margin-bottom:4px">📣 إعلان طوارئ — ${d.by}</div>
    <div style="font-size:15px;font-weight:700">${d.message}</div>`;
  document.getElementById('messages').appendChild(el);
  document.getElementById('messages').scrollTop = 9999;
  SoundSystem?.warning();
});

socket.on('ownerCreated',    (d) => addSystem(`✅ تم إنشاء Owner: ${d.target}`));
socket.on('ownerFrozen',     (d) => addSystem(`🔵 تم تجميد Owner: ${d.target}`));
socket.on('ownerUnfrozen',   (d) => addSystem(`🟢 تم تفعيل Owner: ${d.target}`));
socket.on('permanentBanned', (d) => addSystem(`🚫 تم الحظر الدائم لـ ${d.target}`));

window.SuperOwnerDashboard = SuperOwnerDashboard;
