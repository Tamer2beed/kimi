/* ════════════════════════════════════════
   WidBid — ranks/member.js
   الرتب: Member(200) / Protected(300) / Royal(400)
   يُحمَّل فقط إذا userRank >= 200
════════════════════════════════════════ */

/* ── ما يضيفه Member فوق Guest ──────────
   ✅ اسم مسجل محفوظ
   ✅ تحكم كامل بإعدادات الرسائل الخاصة
   ✅ يظهر أعلى الـ Guest في قائمة الأعضاء
── Protected (300) يضيف ────────────────
   ✅ شارة حماية الاسم (🛡️)
   ✅ لون بنفسجي مميز
── Royal (400) يضيف ───────────────────
   ✅ لون ذهبي
   ✅ يظهر أعلى Protected في القائمة
─────────────────────────────────────── */

/* ── المعلومات الإضافية عند دخول الغرفة ── */
(function initMember() {
  // إضافة tooltip على الاسم يُظهر نوع الحساب
  const rankLabel = getRankName(userRank);
  const title = document.getElementById('roomTitle');
  if (title) {
    title.setAttribute('title', `${username} — ${rankLabel}`);
  }

  // إذا كان Protected أو Royal — إضافة شارة في الهيدر
  if (userRank >= 300 && userRank < 500) {
    const badge = document.createElement('span');
    badge.style.cssText = `
      font-size:11px; font-weight:700;
      padding:2px 8px; border-radius:10px; margin-right:6px;
      background:${getRankColor(userRank)}33;
      color:${getRankColor(userRank)};
    `;
    badge.textContent = getRankBadge(userRank);
    const title = document.getElementById('roomTitle');
    if (title && title.parentNode) {
      title.parentNode.insertBefore(badge, title);
    }
  }
})();

/* ── إعدادات الرسائل الخاصة ─────────────
   Member يتحكم بمن يستطيع مراسلته
─────────────────────────────────────── */
function openSettings() {
  closeAll();

  const sheet = document.createElement('div');
  sheet.style.cssText = `
    position:fixed;inset:0;z-index:300;
    background:rgba(0,0,0,.5);display:flex;align-items:flex-end;
  `;

  const pmSetting = localStorage.getItem('pm_setting') || 'members';

  sheet.innerHTML = `
    <div style="width:100%;background:#fff;border-radius:20px 20px 0 0;
      padding:20px 16px 32px;animation:slideUp .25s ease;">

      <div style="font-size:16px;font-weight:700;color:#1A1A2E;
        text-align:center;margin-bottom:16px;padding-bottom:12px;
        border-bottom:1px solid #eee">⚙️ الإعدادات</div>

      <!-- الرسائل الخاصة -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#7F8C8D;margin-bottom:8px">
          💬 الرسائل الخاصة
        </div>
        ${['all','members','none'].map(v => `
          <label style="display:flex;align-items:center;gap:10px;
            padding:12px;border-bottom:1px solid #f5f5f5;cursor:pointer">
            <input type="radio" name="pm" value="${v}"
              ${pmSetting === v ? 'checked' : ''}
              style="accent-color:#2C3E7A;width:16px;height:16px">
            <span style="font-size:14px;color:#1A1A2E">
              ${v==='all' ? '✅ قبول جميع الرسائل' :
                v==='members' ? '👤 من الأعضاء المسجلين فقط' :
                '🚫 رفض جميع الرسائل'}
            </span>
          </label>`).join('')}
      </div>

      <!-- إعدادات عامة -->
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:#7F8C8D;margin-bottom:8px">
          🔔 الإشعارات
        </div>
        ${[
          ['notif_sound',   'الصوت عند وصول رسالة'],
          ['notif_join',    'إشعار دخول الأعضاء'],
          ['notif_mention', 'إشعار عند ذكر اسمي'],
        ].map(([key, label]) => `
          <label style="display:flex;align-items:center;justify-content:space-between;
            padding:12px;border-bottom:1px solid #f5f5f5;cursor:pointer">
            <span style="font-size:14px;color:#1A1A2E">${label}</span>
            <input type="checkbox" ${localStorage.getItem(key) !== 'off' ? 'checked' : ''}
              onchange="localStorage.setItem('${key}', this.checked ? 'on' : 'off')"
              style="accent-color:#2C3E7A;width:18px;height:18px">
          </label>`).join('')}
      </div>

      <button onclick="
        const v = document.querySelector('[name=pm]:checked')?.value || 'members';
        localStorage.setItem('pm_setting', v);
        this.closest('[style]').remove();
        showToast('✅ تم حفظ الإعدادات');
      " style="width:100%;height:50px;background:#2C3E7A;color:#fff;
        border:none;border-radius:12px;font-family:Tajawal,sans-serif;
        font-size:15px;font-weight:700;cursor:pointer;">حفظ</button>
    </div>
  `;

  sheet.onclick = (e) => { if (e.target === sheet) sheet.remove(); };
  document.body.appendChild(sheet);
}
