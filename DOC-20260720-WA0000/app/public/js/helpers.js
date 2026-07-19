/* ════════════════════════════════════════
   WidBid — helpers.js
   دوال مشتركة بين ملفات الرتب
   تُحمَّل قبل أي ملف رتبة
════════════════════════════════════════ */

/* ── مسح الشات ──────────────────────── */
function clearChat() {
  socket.emit('clearChat', { room_id: roomId, by: username });
  closeAll();
}

/* ── كتم الجميع / فك الكتم ─────────── */
function muteAll() {
  socket.emit('muteAll', { room_id: roomId, by: username });
  showToast('🔇 تم كتم الجميع');
}
function unmuteAll() {
  socket.emit('unmuteAll', { room_id: roomId, by: username });
  showToast('🔊 تم فك كتم الجميع');
}

/* ── فك كتم فرد ─────────────────────── */
function unmuteUser(name) {
  socket.emit('unmuteUser', { room_id: roomId, target: name, by: username });
  showToast(`🔊 تم فك كتم ${name}`);
}

/* ── إعلان عام ───────────────────────── */
function openAnnouncementDialog() {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:12px">📢 رسالة من الإدارة</div>
      <textarea id="announceTxt" placeholder="اكتب رسالتك هنا..." style="
        width:100%;height:90px;border:1.5px solid #E0E0E0;border-radius:10px;
        padding:10px;resize:none;outline:none;
        font-family:'Tajawal',sans-serif;font-size:13px;direction:rtl"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="sendAnnouncement(this)" style="flex:1;height:44px;background:#2C3E7A;color:#fff;border:none;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer">إرسال</button>
        <button onclick="this.closest('[style]').remove()" style="flex:1;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
      </div>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}
function sendAnnouncement(btn) {
  const txt = document.getElementById('announceTxt')?.value.trim();
  if (!txt) { showToast('⚠️ اكتب الرسالة أولاً'); return; }
  socket.emit('announcement', { room_id: roomId, text: txt, by: username });
  btn.closest('[style]').remove();
  showToast('📢 تم إرسال الإعلان');
}

/* ── تعديل البانر ───────────────────── */
function openWelcomeEditor() {
  const current = document.getElementById('welcomeBanner')?.textContent || '';
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;width:100%;max-width:360px;">
      <div style="font-size:15px;font-weight:700;color:#1A1A2E;margin-bottom:12px">✏️ تعديل البانر</div>
      <textarea id="welcomeEditorTxt" style="width:100%;height:100px;border:1.5px solid #E0E0E0;border-radius:10px;padding:10px;resize:none;outline:none;font-family:'Tajawal',sans-serif;font-size:13px;direction:rtl">${current}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="
          const txt=document.getElementById('welcomeEditorTxt').value.trim();
          if(!txt){showToast('⚠️ اكتب النص');return;}
          socket.emit('setWelcome',{room_id:roomId,message:txt,by:username});
          this.closest('[style]').remove();
          showToast('✅ تم تحديث البانر');
        " style="flex:1;height:44px;background:#2C3E7A;color:#fff;border:none;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:600;cursor:pointer">حفظ</button>
        <button onclick="this.closest('[style]').remove()" style="flex:1;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer">إلغاء</button>
      </div>
    </div>`;
  d.onclick = (e) => { if (e.target === d) d.remove(); };
  document.body.appendChild(d);
}

/* ── إحصائيات الغرفة ────────────────── */
function showDetailedStats() {
  socket.emit('getRoomStats', { room_id: roomId });
  socket.once('roomStats', (s) => {
    showToast(`👥 ${s.online||0} متواجد | 💬 ${s.messages||0} رسالة | ⏱️ ${s.uptime||0} دق`);
  });
}

/* ── التحكم بالميكات ────────────────── */
function enableAllMics() {
  socket.emit('controlAllMics', { room_id: roomId, action: 'enable', by: username });
  showToast('🎙️ تم تفعيل كل الميكات');
}
function disableAllMics() {
  socket.emit('controlAllMics', { room_id: roomId, action: 'disable', by: username });
  showToast('🔕 تم إيقاف كل الميكات');
}

/* ── تعيين رتبة ─────────────────────── */
function assignRole(targetName, newRank) {
  const rankName = getRankName(newRank);
  if (!confirm(`تغيير رتبة ${targetName} إلى ${rankName}؟`)) return;
  socket.emit('assignRole', { room_id: roomId, target: targetName, new_rank: newRank, by: username });
  showToast(`✅ تم تغيير رتبة ${targetName}`);
  SoundSystem?.success();
}

/* ── تقرير الغرفة ────────────────────── */
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
            ['👥','المتواجدون', report.online||0],
            ['💬','الرسائل اليوم', report.messages_today||0],
            ['🚪','دخلوا اليوم', report.joins_today||0],
            ['🔇','إجراءات إدارية', report.admin_actions||0],
            ['⏱️','وقت التشغيل', `${report.uptime_hours||0}س`],
            ['📈','مستوى النشاط', report.activity_score||'جيد'],
          ].map(([ic,lb,v]) => `
            <div style="background:#F8F9FA;border-radius:12px;padding:14px;text-align:center">
              <div style="font-size:24px">${ic}</div>
              <div style="font-size:20px;font-weight:700;color:#2C3E7A;margin:4px 0">${v}</div>
              <div style="font-size:11px;color:#999">${lb}</div>
            </div>`).join('')}
        </div>
        <button onclick="this.closest('[style]').remove()" style="width:100%;height:44px;background:#f5f5f5;color:#888;border:none;border-radius:12px;font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer">إغلاق</button>
      </div>`;
    d.onclick = (e) => { if (e.target === d) d.remove(); };
    document.body.appendChild(d);
  });
}

/* ── Backup كامل ─────────────────────── */
function fullBackup() {
  const data = {
    room_id:   roomId,
    room_name: roomName,
    theme:     getComputedStyle(document.documentElement).getPropertyValue('--theme-bg').trim(),
    welcome:   document.getElementById('welcomeBanner')?.innerHTML || '',
    backed_at: new Date().toISOString(),
    backed_by: username,
  };
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'})),
    download: `widbid_room${roomId}_${Date.now()}.json`
  });
  a.click();
  showToast('💾 تم حفظ الـ Backup');
  SoundSystem?.success();
}

/* ── handleAdminTool المشترك ────────── */
function handleAdminTool(i) {
  closeAdminSheet?.();
  window._adminTools?.[i]?.fn?.();
}
function closeAdminSheet() {
  document.getElementById('adminSheet')?.classList.remove('open');
  document.getElementById('adminOverlay')?.classList.remove('show');
}

/* ── أحداث Socket المشتركة ──────────── */
socket.on('roleAssigned', (d) => {
  addSystem(`✅ ${d.target} أصبح ${getRankName(d.new_rank)} بواسطة ${d.by}`);
  SoundSystem?.success();
});
socket.on('allMicsControlled', (d) => {
  addSystem(`${d.action === 'enable' ? '🎙️' : '🔕'} ${d.by} ${d.action === 'enable' ? 'فتح' : 'أغلق'} كل الميكات`);
});
socket.on('ipBanned',     (d) => addSystem(`🚫 تم حظر IP ${d.target}`));
socket.on('deviceBanned', (d) => addSystem(`🔒 تم حظر جهاز ${d.target}`));
