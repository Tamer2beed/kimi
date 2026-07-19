/* ════════════════════════════════════════
   WidBid — ranks/guest.js
   الرتبة: Guest (100) — القاعدة الأساسية
   كل الرتب الأعلى تحمّل هذا الملف أيضاً
════════════════════════════════════════ */

/* ── ما يستطيع فعله Guest ──────────────
   ✅ قراءة الرسائل وإرسالها
   ✅ رؤية قائمة الأعضاء بألوانهم
   ✅ تغيير حالته (7 حالات)
   ✅ طلب الكلام (Raise Hand)
   ✅ إرسال إيموجي وردود سريعة
   ✅ إعدادات شخصية
   ❌ أي إجراء إداري
─────────────────────────────────────── */

/* ── Context Menu للـ Guest ─────────────
   يرى فقط: رسالة خاصة
─────────────────────────────────────── */
function showMemberMenu(name, rank) {
  if (name === username) return;

  const existing = document.getElementById('ctxMenu');
  if (existing) existing.remove();

  const color    = getRankColor(rank);
  const rankName = getRankName(rank);

  const menu = document.createElement('div');
  menu.id = 'ctxMenu';
  menu.className = 'ctx-menu';
  menu.style.cssText = `
    position:fixed;
    bottom:calc(var(--toolbar1-h) + var(--toolbar2-h) + 12px);
    right:50%; transform:translateX(50%);
  `;

  // هيدر القائمة
  menu.innerHTML = `
    <div class="ctx-header">
      <div class="ctx-avatar" style="border:2px solid ${color}">
        ${getInitial(name)}
      </div>
      <div>
        <div class="ctx-username" style="color:${color}">${name}</div>
        <span class="ctx-rank" style="background:${color}22;color:${color}">
          ${rankName}
        </span>
      </div>
    </div>
  `;

  // الإجراءات المتاحة لـ Guest
  const actions = [
    { icon:'💬', label:'رسالة خاصة', fn:() => openPrivateChat(name) },
  ];

  // إضافة إجراءات الرتب الأعلى (تُضاف من ملفاتها)
  if (typeof getAdminActions === 'function') {
    actions.push(...getAdminActions(name, rank));
  }
  if (typeof getMasterActions === 'function') {
    actions.push(...getMasterActions(name, rank));
  }

  // رسالة عدم الصلاحية
  if (userRank >= 500 && userRank <= rank) {
    menu.innerHTML += `
      <div class="ctx-no-action">
        لا يمكن تنفيذ إجراء على هذه الرتبة
      </div>`;
  } else {
    actions.forEach(a => {
      const item = document.createElement('div');
      item.className = 'ctx-item' + (a.danger ? ' danger' : '');
      item.innerHTML = `
        <span class="ci-icon">${a.icon}</span>
        <span>${a.label}</span>
      `;
      item.onclick = () => { menu.remove(); a.fn(); };
      menu.appendChild(item);
    });
  }

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 100);
}

/* ── أحداث Socket خاصة بـ Guest ────────── */
socket.on('youAreMuted', (d) => {
  showToast(`🔇 تم كتمك بواسطة ${d.by}`);
  const inp = document.getElementById('msgInput');
  inp.disabled = true;
  inp.placeholder = 'أنت مكتوم...';
  inp.style.opacity = '0.5';
});

socket.on('youAreUnmuted', () => {
  showToast('✅ تم فك كتمك');
  const inp = document.getElementById('msgInput');
  inp.disabled = false;
  inp.placeholder = 'اكتب رسالة...';
  inp.style.opacity = '1';
});

socket.on('youAreKicked', (d) => {
  alert(`تم طردك من الغرفة بواسطة ${d.by}`);
  window.location.href = '/rooms.html';
});

socket.on('chatCleared', (d) => {
  document.getElementById('messages').innerHTML =
    `<div class="welcome-banner">تم مسح الشات بواسطة ${d.by}</div>`;
  msgCount = 0;
  const el = document.getElementById('statMsgs');
  if (el) el.textContent = '0';
});

socket.on('announcement', (d) => {
  const el = document.createElement('div');
  el.className = 'announcement-msg';
  el.innerHTML = `
    <div class="ann-from">📢 إعلان من ${d.by}</div>
    <div class="ann-text">${d.text}</div>
  `;
  document.getElementById('messages').appendChild(el);
  document.getElementById('messages').scrollTop = 9999;
});

socket.on('userMuted',   (d) => { if (d.username !== username) addSystem(`🔇 تم كتم ${d.username} بواسطة ${d.by}`); });
socket.on('userUnmuted', (d) => { if (d.username !== username) addSystem(`🔊 تم فك كتم ${d.username}`); });
socket.on('userKicked',  (d) => { if (d.username !== username) addSystem(`🚪 ${d.username} طُرد بواسطة ${d.by}`); });
socket.on('userWarned',  (d) => { if (d.username !== username) addSystem(`⚠️ تم تحذير ${d.username} بواسطة ${d.by}`); });
