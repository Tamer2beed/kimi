/* ════════════════════════════════════════
   WidBid — ranks/root.js
   الرتب: Root(900) / Super Root(1000)
   يُحمَّل إذا userRank >= 900
════════════════════════════════════════ */

/* ── ما يضيفه Root فوق Super Master ─────
   ✅ تغيير ثيم الغرفة (5 ثيمات)
   ✅ تغيير البانر والمواصفات
   ✅ Dual Machine Lock (ربط الحساب بجهازَين)
   ✅ تعيين Super Master ضمن غرفته
   ✅ تقارير نشاط الغرفة
── Super Root (1000) يضيف ───────────────
   ✅ إدارة متعددة الغرف من شاشة واحدة
   ✅ إنشاء حسابات Root (ضمن كوتة Owner)
   ✅ تقارير مجمّعة لكل غرفه
   ✅ تحويل عضو بين الغرف
─────────────────────────────────────── */

/* ── تغيير الثيم ─────────────────────── */
const ROOM_THEMES = [
  { id:'candy',   name:'حلوى 🍬',   preview:'#7C4DBC' },
  { id:'ocean',   name:'بحر 🌊',    preview:'#1565C0' },
  { id:'flower',  name:'زهور 🌸',   preview:'#AD1457' },
  { id:'night',   name:'ليلي 🌙',   preview:'#1A1A2E' },
  { id:'neutral', name:'محايد 🌫️',  preview:'#455A64' },
];

function openThemeSelector() {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;';
  d.innerHTML = `
    <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;padding:20px 16px 32px">
      <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:16px;
        padding-bottom:12px;border-bottom:1px solid #eee">🎨 اختر ثيم الغرفة</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">
        ${ROOM_THEMES.map(t => `
          <div onclick="applyAndSaveTheme('${t.id}');this.closest('[style]').remove()"
            style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer">
            <div style="width:48px;height:48px;border-radius:12px;background:${t.preview};
              border:3px solid ${t.id === getCurrentTheme() ? '#F0A500' : 'transparent'}"></div>
            <span style="font-size:11px;color:#555;text-align:center">${t.name}</span>
          </div>`).join('')}
      </div>
      <button onclick="this.closest('[style]').remove()"
        style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;
        border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

function getCurrentTheme() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim();
  return ROOM_THEMES.find(t => t.preview === bg)?.id || 'candy';
}

function applyAndSaveTheme(themeId) {
  applyTheme(themeId);
  socket.emit('setTheme', { room_id: roomId, theme: themeId, by: username });
  showToast(`🎨 تم تغيير الثيم`);
  SoundSystem?.success();
}

/* ── Dual Machine Lock ───────────────────
   يربط الحساب بجهازَين كحد أقصى
─────────────────────────────────────── */
const DualLock = (() => {
  const DEVICE_KEY = 'wid_device_id';

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'DEV_' + Math.random().toString(36).slice(2,10).toUpperCase();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function register() {
    const deviceId = getDeviceId();
    socket.emit('registerDevice', {
      user_id: userId, device_id: deviceId,
      device_name: navigator.userAgent.slice(0, 50)
    });
    showToast('🔐 تم تسجيل هذا الجهاز');
    SoundSystem?.success();
  }

  function showDevices() {
    socket.emit('getMyDevices', { user_id: userId });
    socket.once('myDevices', (devices) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;';
      d.innerHTML = `
        <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;padding:16px;max-height:60vh;overflow-y:auto;">
          <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:12px;
            padding-bottom:10px;border-bottom:1px solid #eee">🔐 أجهزتي المرتبطة</div>
          ${devices.map(dev => `
            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:12px;border-bottom:1px solid #f5f5f5;">
              <div>
                <div style="font-weight:600;color:#1A1A2E">${dev.device_name || 'جهاز غير معروف'}</div>
                <div style="font-size:11px;color:#999">${dev.device_id}</div>
                <div style="font-size:11px;color:#27AE60">${dev.is_current ? '● الجهاز الحالي' : ''}</div>
              </div>
              ${!dev.is_current ? `
                <button onclick="DualLock.removeDevice('${dev.device_id}');this.closest('[style]').remove()"
                  style="padding:6px 12px;background:#FFE0E0;color:#E74C3C;border:none;
                  border-radius:8px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:600;cursor:pointer">
                  إزالة
                </button>` : ''}
            </div>`).join('')}
          <button onclick="this.closest('[style]').remove()"
            style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;
            border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer;margin-top:12px">إغلاق</button>
        </div>`;
      d.onclick = (e) => { if (e.target === d) d.remove(); };
      document.body.appendChild(d);
    });
  }

  function removeDevice(deviceId) {
    socket.emit('removeDevice', { user_id: userId, device_id: deviceId });
    showToast('✅ تم إزالة الجهاز');
  }

  return { getDeviceId, register, showDevices, removeDevice };
})();

/* ── تقرير نشاط الغرفة ──────────────── */
function showRoomReport() {
  socket.emit('getRoomReport', { room_id: roomId });
  socket.once('roomReport', (report) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;';
    d.innerHTML = `
      <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;padding:20px 16px 32px;">
        <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:16px;
          padding-bottom:12px;border-bottom:1px solid #eee">📊 تقرير الغرفة</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          ${[
            ['👥','المتواجدون', report.online || 0],
            ['💬','الرسائل اليوم', report.messages_today || 0],
            ['🚪','دخلوا اليوم', report.joins_today || 0],
            ['🔇','إجراءات إدارية', report.admin_actions || 0],
            ['⏱️','وقت التشغيل', `${report.uptime_hours || 0}س`],
            ['⭐','تقييم النشاط', report.activity_score || 'جيد'],
          ].map(([icon,label,val]) => `
            <div style="background:#F8F9FA;border-radius:12px;padding:14px;text-align:center">
              <div style="font-size:24px">${icon}</div>
              <div style="font-size:20px;font-weight:700;color:#2C3E7A;margin:4px 0">${val}</div>
              <div style="font-size:11px;color:#999">${label}</div>
            </div>`).join('')}
        </div>
        <button onclick="this.closest('[style]').remove()"
          style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;
          border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إغلاق</button>
      </div>`;
    d.onclick = (e) => { if (e.target === d) d.remove(); };
    document.body.appendChild(d);
  });
}

/* ══ Super Root (1000) — إدارة متعددة الغرف */
const SuperRootPanel = (() => {
  function open() {
    socket.emit('getSuperRootRooms', { user_id: userId });
    socket.once('superRootRooms', (rooms) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;';
      d.innerHTML = `
        <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;padding:16px;max-height:75vh;overflow-y:auto;">
          <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:12px;
            padding-bottom:10px;border-bottom:1px solid #eee">🌿 غرفي كسوبر روت</div>
          ${!rooms.length
            ? '<p style="text-align:center;color:#999;padding:20px">لا توجد غرف مُعيَّنة لك</p>'
            : rooms.map(r => `
              <div style="display:flex;align-items:center;gap:10px;padding:12px;
                border-bottom:1px solid #f5f5f5;">
                <div style="width:40px;height:40px;border-radius:10px;
                  background:linear-gradient(135deg,#2C3E7A,#4A90D9);
                  display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">🏠</div>
                <div style="flex:1">
                  <div style="font-weight:600;color:#1A1A2E">${r.name}</div>
                  <div style="font-size:11px;color:#999">
                    👥 ${r.member_count||0} | ${r.is_active ? '🟢 نشطة' : '🔴 غير نشطة'}
                  </div>
                </div>
                <button onclick="enterRoomFromPanel(${r.id},'${r.name}')"
                  style="padding:6px 12px;background:#2C3E7A;color:#fff;border:none;
                  border-radius:8px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:600;cursor:pointer">
                  دخول
                </button>
              </div>`).join('')}
          <button onclick="this.closest('[style]').remove()"
            style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;
            border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer;margin-top:12px">إغلاق</button>
        </div>`;
      d.onclick = (e) => { if (e.target === d) d.remove(); };
      document.body.appendChild(d);
    });
  }

  return { open };
})();

function enterRoomFromPanel(id, name) {
  localStorage.setItem('room_id', id);
  localStorage.setItem('room_name', name);
  window.location.reload();
}

/* ── لوحة أدوات Root ─────────────────── */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  const isSR = userRank >= 1000;
  title.textContent = isSR ? '🌿 أدوات السوبر روت' : '🔧 أدوات الروت';

  const tools = [
    // ── موروثة ──────────────────────────
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',         desc:'حذف الرسائل',                    fn: clearChat              },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة الإدارة',      desc:'إعلان للجميع',                   fn: openAnnouncementDialog },
    { icon:'📊', bg:'#E3F2FD', label:'إحصائيات',           desc:'نشاط الغرفة التفصيلي',           fn: showDetailedStats       },
    { icon:'💾', bg:'#E8F5E9', label:'Backup الغرفة',      desc:'حفظ الإعدادات',                  fn: fullBackup             },

    // ── خاصة بـ Root ──────────────────────
    { icon:'🎨', bg:'#F3E5F5', label:'تغيير الثيم',        desc:'اختر من 5 ثيمات',               fn: openThemeSelector      },
    { icon:'✏️', bg:'#E8F4FD', label:'تعديل البانر',       desc:'رسالة الترحيب',                  fn: openWelcomeEditor      },
    { icon:'📈', bg:'#E8F5E9', label:'تقرير الغرفة',       desc:'نشاط + إحصائيات شاملة',         fn: showRoomReport         },
    { icon:'🔐', bg:'#EDE7F6', label:'Dual Machine Lock',  desc:'أجهزتي المرتبطة بالحساب',        fn: DualLock.showDevices   },

    // ── خاصة بـ Super Root ────────────────
    { icon:'🌿', bg:'#E8F5E9', label:'غرفي كسوبر روت',    desc:'إدارة جميع غرفي',               fn: SuperRootPanel.open, show: isSR },
    { icon:'👑', bg:'#FFF8E1', label:'إنشاء روت جديد',    desc:'منح رتبة Root لعضو',            fn: openCreateRootDialog, show: isSR },
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

/* ── إنشاء Root جديد (Super Root فقط) ── */
function openCreateRootDialog() {
  const name = prompt('اسم المستخدم الذي تريد ترقيته لـ Root:');
  if (!name?.trim()) return;
  if (!confirm(`ترقية ${name.trim()} إلى Root؟ هذا يعني منحه صلاحيات واسعة.`)) return;
  assignRole(name.trim(), 900);
}

window.DualLock      = DualLock;
window.SuperRootPanel = SuperRootPanel;
