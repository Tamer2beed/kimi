/* ════════════════════════════════════════
   WidBid — ranks/master.js
   الرتب: Master(700) / Super Master(800)
   يُحمَّل فقط إذا userRank >= 700
════════════════════════════════════════ */

/* ── ما يضيفه Master فوق Super Admin ────
   ✅ تعيين Admin وإزالته
   ✅ حظر IP مؤقت (24 ساعة)
   ✅ تعديل بانر الترحيب
   ✅ تفعيل/إيقاف كل الميكات
   ✅ إحصائيات تفصيلية
── Super Master (800) يضيف ─────────────
   ✅ حظر Device ID (Hardware Ban)
   ✅ تعيين Master آخر ضمن الكوتة
   ✅ Backup إعدادات الغرفة
─────────────────────────────────────── */

/* ── تفعيل UI المشرف (Master يرث Admin) ─ */
(function initMaster() {
  // Master يرى كل أدوات Admin + أدواته
  if (typeof initAdmin === 'function') initAdmin();

  // تحديث عنوان الأدوات
  const title = document.getElementById('adminSheetTitle');
  if (title) {
    title.textContent = userRank >= 800
      ? '⚡ أدوات السوبر ماستر'
      : '🔴 أدوات الماستر';
  }
})();

/* ── إجراءات Master على الأعضاء ──────── */
function getMasterActions(targetName, targetRank) {
  const actions = [];
  if (userRank < 700) return actions;
  if (userRank <= targetRank) return actions;

  // تعيين / إزالة Admin
  if (targetRank < 500) {
    actions.push({
      icon: '🔵', label: 'تعيين Admin',
      fn: () => assignRole(targetName, 500)
    });
  } else if (targetRank === 500) {
    actions.push({
      icon: '🔵', label: 'ترقية لـ Super Admin',
      fn: () => assignRole(targetName, 600)
    });
    actions.push({
      icon: '⬇️', label: 'إزالة صلاحيات Admin',
      fn: () => assignRole(targetName, 200), danger: true
    });
  } else if (targetRank === 600) {
    actions.push({
      icon: '⬇️', label: 'إزالة صلاحيات Super Admin',
      fn: () => assignRole(targetName, 200), danger: true
    });
  }

  // حظر IP
  actions.push({
    icon: '🚫', label: 'حظر IP (24 ساعة)',
    fn: () => banIP(targetName), danger: true
  });

  // Super Master فقط: Hardware Ban
  if (userRank >= 800) {
    actions.push({
      icon: '🔒', label: 'حظر الجهاز (دائم)',
      fn: () => banDevice(targetName), danger: true
    });
  }

  return actions;
}

/* ── أدوات المشرف (Master) ───────────── */
function assignRole(targetName, newRank) {
  const rankName = getRankName(newRank);
  if (!confirm(`تغيير رتبة ${targetName} إلى ${rankName}؟`)) return;
  socket.emit('assignRole', {
    room_id: roomId, target: targetName,
    new_rank: newRank, by: username
  });
  showToast(`✅ تم تغيير رتبة ${targetName} إلى ${rankName}`);
  SoundSystem?.success();
}

function banIP(targetName) {
  if (!confirm(`حظر IP المستخدم ${targetName} لمدة 24 ساعة؟`)) return;
  socket.emit('banIP', { room_id: roomId, target: targetName, by: username });
  showToast(`🚫 تم حظر IP ${targetName}`);
}

function banDevice(targetName) {
  if (!confirm(`⚠️ حظر جهاز ${targetName} نهائياً؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
  socket.emit('banDevice', { room_id: roomId, target: targetName, by: username });
  showToast(`🔒 تم حظر جهاز ${targetName}`);
  SoundSystem?.warning();
}

/* ── لوحة أدوات Master ──────────────── */
function openAdminSheet() {
  const sheet    = document.getElementById('adminSheet');
  const overlay  = document.getElementById('adminOverlay');
  const title    = document.getElementById('adminSheetTitle');
  const toolList = document.getElementById('adminToolsList');

  const isSM = userRank >= 800;
  title.textContent = isSM ? '⚡ أدوات السوبر ماستر' : '🔴 أدوات الماستر';

  const tools = [
    // ── موروثة من Admin ──────────────────
    { icon:'🗑️', bg:'#FFE0E0', label:'مسح الشات',          desc:'حذف جميع الرسائل',              fn:clearChat,            show:true },
    { icon:'🔇', bg:'#FFF3CD', label:'كتم الجميع',          desc:'منع الكتابة لـ Guest/Member',    fn:muteAll,              show:true },
    { icon:'🔊', bg:'#D4EDDA', label:'فك كتم الجميع',       desc:'السماح للجميع بالكتابة',         fn:unmuteAll,            show:true },

    // ── خاصة بـ Master ───────────────────
    { icon:'✏️', bg:'#E8F4FD', label:'تعديل البانر',        desc:'تغيير رسالة الترحيب',            fn:openWelcomeEditor,    show:true },
    { icon:'🎙️', bg:'#EDE7F6', label:'تفعيل كل الميكات',   desc:'السماح للجميع بالكلام',          fn:enableAllMics,        show:true },
    { icon:'🔕', bg:'#FCE4EC', label:'إيقاف كل الميكات',   desc:'منع الجميع من الكلام',           fn:disableAllMics,       show:true },
    { icon:'📊', bg:'#E3F2FD', label:'إحصائيات تفصيلية',   desc:'سجل النشاط + المتواجدين',         fn:showDetailedStats,    show:true },
    { icon:'📢', bg:'#FDE8D8', label:'رسالة من الإدارة',    desc:'إعلان للجميع',                   fn:openAnnouncementDialog, show:true },

    // ── خاصة بـ Super Master ─────────────
    { icon:'💾', bg:'#E8F5E9', label:'Backup الإعدادات',    desc:'حفظ إعدادات الغرفة محلياً',      fn:backupSettings,       show:isSM },
    { icon:'⚡', bg:'#FFF8E1', label:'تعيين Master',        desc:'منح رتبة Master لعضو',           fn:openAssignMaster,     show:isSM },
  ];

  const visible = tools.filter(t => t.show);
  toolList.innerHTML = visible.map((t, i) => `
    <div class="admin-tool ${t.danger?'danger':''}" onclick="handleAdminTool(${i})">
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

/* ── أدوات Master الإضافية ───────────── */
function openWelcomeEditor() {
  const current = document.getElementById('welcomeBanner')?.textContent || '';
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:360px;">
      <div style="font-size:15px;font-weight:700;color:#1A1A2E;margin-bottom:12px">✏️ تعديل البانر</div>
      <textarea id="welcomeEditorTxt" style="width:100%;height:100px;border:1.5px solid #E0E0E0;border-radius:10px;padding:10px;resize:none;outline:none;font-family:Tajawal,sans-serif;font-size:13px;direction:rtl">${current}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="
          const txt = document.getElementById('welcomeEditorTxt').value.trim();
          if(!txt){showToast('⚠️ اكتب النص');return;}
          socket.emit('setWelcome',{room_id:roomId,message:txt,by:username});
          this.closest('[style]').remove();
          showToast('✅ تم تحديث البانر');
        " style="flex:1;height:44px;background:#2C3E7A;color:#fff;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:600;cursor:pointer">حفظ</button>
        <button onclick="this.closest('[style]').remove()" style="flex:1;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
      </div>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

function enableAllMics() {
  socket.emit('controlAllMics', { room_id: roomId, action: 'enable', by: username });
  showToast('🎙️ تم تفعيل كل الميكات');
}
function disableAllMics() {
  socket.emit('controlAllMics', { room_id: roomId, action: 'disable', by: username });
  showToast('🔕 تم إيقاف كل الميكات');
}

function showDetailedStats() {
  socket.emit('getRoomStats', { room_id: roomId });
  socket.once('roomStats', (stats) => {
    showToast(`👥 ${stats.online} | 💬 ${stats.messages} رسالة | ⏱️ ${stats.uptime} دقيقة`);
  });
}

function backupSettings() {
  const data = {
    room_id:   roomId,
    room_name: roomName,
    theme:     getComputedStyle(document.documentElement)
                 .getPropertyValue('--theme-bg').trim(),
    welcome:   document.getElementById('welcomeBanner')?.innerHTML || '',
    backed_at: new Date().toISOString(),
    backed_by: username,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `room_${roomId}_backup.json`;
  a.click();
  showToast('💾 تم حفظ الـ Backup');
  SoundSystem?.success();
}

function openAssignMaster() {
  const name = prompt('اسم المستخدم الذي تريد ترقيته لـ Master:');
  if (!name?.trim()) return;
  assignRole(name.trim(), 700);
}

/* ── أحداث Socket لـ Master ─────────── */
socket.on('roleAssigned', (d) => {
  addSystem(`✅ ${d.target} أصبح ${getRankName(d.new_rank)} بواسطة ${d.by}`);
  SoundSystem?.success();
});
socket.on('ipBanned',     (d) => { addSystem(`🚫 تم حظر IP ${d.target}`); });
socket.on('deviceBanned', (d) => { addSystem(`🔒 تم حظر جهاز ${d.target}`); });
socket.on('allMicsControlled', (d) => {
  addSystem(`${d.action === 'enable' ? '🎙️' : '🔕'} ${d.by} ${d.action === 'enable' ? 'فتح' : 'أغلق'} كل الميكات`);
});
