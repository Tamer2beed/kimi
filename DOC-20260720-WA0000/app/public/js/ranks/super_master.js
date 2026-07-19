/* ════════════════════════════════════════
   WidBid — ranks/super_master.js
   الرتبة: Super Master (800)
   يُحمَّل بعد master.js إذا userRank >= 800
════════════════════════════════════════ */

/* ── ما يضيفه Super Master فوق Master ──
   ✅ حظر Device ID (Hardware Ban دائم)
   ✅ تعيين Master جديد (ضمن الكوتة)
   ✅ Backup كامل لإعدادات الغرفة
   ✅ Restore الإعدادات من Backup
   ✅ نظام الكوتة (عرض ما بقي)
   ✅ قفل الغرفة مؤقتاً (منع الدخول)
─────────────────────────────────────── */

/* ── نظام الكوتة ────────────────────────
   Super Master لديه عدد محدد من Masters
   يستطيع تعيينهم (يُحدَّد من DB)
─────────────────────────────────────── */
const QuotaSystem = (() => {
  let quota     = { total: 5, used: 0 }; // افتراضي
  let roomLocked = false;

  function load() {
    socket.emit('getQuota', { room_id: roomId, user_id: userId });
    socket.on('quotaInfo', (q) => { quota = q; });
  }

  function canAssignMaster() {
    return quota.used < quota.total;
  }

  function getDisplay() {
    return `${quota.used} / ${quota.total}`;
  }

  return { load, canAssignMaster, getDisplay, get roomLocked() { return roomLocked; }, setLocked(v) { roomLocked = v; } };
})();

QuotaSystem.load();

/* ── تحديث لوحة الأدوات ─────────────── */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  title.textContent = '⚡ أدوات السوبر ماستر';

  const tools = [
    // ── موروثة ──────────────────────────
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',             desc:'حذف جميع الرسائل',                      fn: clearChat           },
    { icon:'🔇', bg:'#FFF3CD', label:'كتم الجميع',             desc:'منع الكتابة',                            fn: muteAll             },
    { icon:'🔊', bg:'#D4EDDA', label:'فك كتم الجميع',          desc:'السماح للجميع',                          fn: unmuteAll           },
    { icon:'✏️', bg:'#E8F4FD', label:'تعديل البانر',           desc:'تغيير رسالة الترحيب',                    fn: openWelcomeEditor   },
    { icon:'🎙️', bg:'#EDE7F6', label:'تفعيل/إيقاف الميكات',  desc:'التحكم بكل المايكات',                    fn: toggleAllMicsMenu   },
    { icon:'📊', bg:'#E3F2FD', label:'إحصائيات تفصيلية',      desc:'نشاط الغرفة الكامل',                     fn: showDetailedStats   },

    // ── خاصة بـ Super Master ─────────────
    { icon:'👑', bg:'#FFF8E1', label:`تعيين Master (${QuotaSystem.getDisplay()})`,
                                 desc:'منح رتبة Master لعضو',             fn: openAssignMasterDialog },
    { icon:'🔒', bg:'#FCE4EC', label:'قفل الغرفة',             desc:'منع دخول أعضاء جدد مؤقتاً',            fn: toggleRoomLock      },
    { icon:'💾', bg:'#E8F5E9', label:'Backup الغرفة',          desc:'حفظ الإعدادات كاملة',                   fn: fullBackup          },
    { icon:'♻️', bg:'#F3E5F5', label:'Restore الإعدادات',      desc:'استعادة من ملف Backup',                 fn: restoreBackup       },
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

/* ── تعيين Master ─────────────────────── */
function openAssignMasterDialog() {
  if (!QuotaSystem.canAssignMaster()) {
    showToast(`⚠️ وصلت الحد الأقصى: ${QuotaSystem.getDisplay()} Masters`);
    return;
  }
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:320px;">
      <div style="font-size:15px;font-weight:700;color:#1A1A2E;margin-bottom:4px">👑 تعيين Master</div>
      <div style="font-size:12px;color:#999;margin-bottom:14px">الكوتة: ${QuotaSystem.getDisplay()} مستخدم</div>
      <input id="masterTargetName" placeholder="اسم المستخدم..."
        style="width:100%;height:46px;border:1.5px solid #E0E0E0;border-radius:10px;
        padding:0 14px;font-family:Tajawal,sans-serif;font-size:14px;direction:rtl;outline:none;margin-bottom:10px" />
      <div style="display:flex;gap:8px">
        <button onclick="
          const name = document.getElementById('masterTargetName').value.trim();
          if(!name){showToast('⚠️ أدخل الاسم');return;}
          assignRole(name, 700);
          this.closest('[style]').remove();
        " style="flex:1;height:44px;background:#E74C3C;color:#fff;border:none;border-radius:10px;
          font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;cursor:pointer">تعيين</button>
        <button onclick="this.closest('[style]').remove()"
          style="flex:1;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:10px;
          font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
      </div>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

/* ── قفل الغرفة ──────────────────────── */
function toggleRoomLock() {
  const locked = !QuotaSystem.roomLocked;
  QuotaSystem.setLocked(locked);
  socket.emit('lockRoom', { room_id: roomId, locked, by: username });
  showToast(locked ? '🔒 تم قفل الغرفة — لا يمكن لأحد الدخول' : '🔓 تم فتح الغرفة');
  SoundSystem?.toggle(!locked);
}
socket.on('roomLocked', (d) => {
  QuotaSystem.setLocked(d.locked);
  addSystem(d.locked ? `🔒 ${d.by} قفل الغرفة` : `🔓 ${d.by} فتح الغرفة`);
});

/* ── Backup كامل ─────────────────────── */
function fullBackup() {
  const data = {
    version:  '1.0',
    room_id:  roomId,
    room_name: roomName,
    theme:    getComputedStyle(document.documentElement)
                .getPropertyValue('--theme-bg').trim(),
    welcome:  document.getElementById('welcomeBanner')?.innerHTML || '',
    quota:    QuotaSystem.getDisplay(),
    backed_at: new Date().toISOString(),
    backed_by: username,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `widbid_room${roomId}_${Date.now()}.json`
  });
  a.click();
  showToast('💾 تم حفظ الـ Backup');
  SoundSystem?.success();
}

/* ── Restore من Backup ───────────────── */
function restoreBackup() {
  const input = Object.assign(document.createElement('input'), {
    type: 'file', accept: '.json'
  });
  input.onchange = (e) => {
    const file   = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.room_id !== roomId) {
          showToast('⚠️ هذا الـ Backup لغرفة مختلفة');
          return;
        }
        if (data.welcome) {
          socket.emit('setWelcome', { room_id: roomId, message: data.welcome, by: username });
        }
        if (data.theme) {
          socket.emit('setTheme', { room_id: roomId, theme: data.theme, by: username });
        }
        showToast('♻️ تم استعادة الإعدادات بنجاح');
        SoundSystem?.success();
      } catch {
        showToast('⚠️ ملف Backup غير صالح');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ── قائمة تبديل الميكات ─────────────── */
function toggleAllMicsMenu() {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:280px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#1A1A2E">🎙️ التحكم بالميكات</div>
      <button onclick="enableAllMics();this.closest('[style]').remove()"
        style="width:100%;height:46px;background:#27AE60;color:#fff;border:none;border-radius:10px;
        font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px">
        🎙️ تفعيل كل الميكات
      </button>
      <button onclick="disableAllMics();this.closest('[style]').remove()"
        style="width:100%;height:46px;background:#E74C3C;color:#fff;border:none;border-radius:10px;
        font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px">
        🔕 إيقاف كل الميكات
      </button>
      <button onclick="this.closest('[style]').remove()"
        style="width:100%;height:42px;background:#f5f5f5;color:#888;border:none;
        border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

window.QuotaSystem = QuotaSystem;
