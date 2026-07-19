/* ════════════════════════════════════════
   WidBid — ui.js
   التحكم بالواجهة: قوائم، إيموجي، صور، توست
════════════════════════════════════════ */

let micOn = false;
function toggleMic() {
  /* زر المايك الأسفل = طلب/إنهاء السبيكر عبر نظام الطابور */
  if (typeof SpeakerSystem !== 'undefined') {
    const spkState = SpeakerSystem.getState?.();
    if (spkState?.isSpeaking) {
      SpeakerSystem.doneSpeaking();
    } else if (spkState?.inQueue) {
      SpeakerSystem.leaveQueue();
    } else {
      SpeakerSystem.requestSpeaker();
    }
  }
}

/* ── القائمة الجانبية ── */
function openSideMenu() {
  document.getElementById('sideMenu')?.classList.add('open');
  document.getElementById('overlay')?.classList.add('show');
  /* عبّئ بيانات الملف الشخصي */
  const uname = localStorage.getItem('username') || '—';
  const rank  = parseInt(localStorage.getItem('rank')) || 100;
  const el = document.getElementById('smUsername');
  if (el) el.textContent = uname;
  const rl = document.getElementById('smRankLabel');
  if (rl) rl.textContent = rankLabel(rank);
  const av = document.getElementById('smAvatar');
  if (av) av.src = `/avatars/${localStorage.getItem('avatar') || 'av1.svg'}`;
  /* أظهر قسم إدارة الغرفة للمشرفين فقط */
  const adminSection = document.getElementById('adminMenuSection');
  if (adminSection) adminSection.style.display = rank >= 500 ? 'block' : 'none';
}
function closeSideMenu() {
  document.getElementById('sideMenu')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('show');
}
function closeAll() {
  closeSideMenu();
  closeStatusMenu();
  document.getElementById('emojiPanel')?.classList.remove('show');
  document.getElementById('imagePicker')?.classList.remove('show');
}

function rankLabel(rank) {
  if (rank >= 1200) return 'Super Owner';
  if (rank >= 1100) return 'Owner';
  if (rank >= 1000) return 'Super Root';
  if (rank >= 900)  return 'Root';
  if (rank >= 800)  return 'Super Master';
  if (rank >= 700)  return 'Master';
  if (rank >= 600)  return 'Super Admin';
  if (rank >= 500)  return 'Admin';
  if (rank >= 200)  return 'Member';
  return 'زائر';
}


/* ── إعدادات الخط ── */
function applyFontSettings() {
  const size   = localStorage.getItem('chatFontSize')   || '14';
  const weight = localStorage.getItem('chatFontWeight') || '400';
  const color  = localStorage.getItem('chatFontColor')  || '#222';
  document.documentElement.style.setProperty('--chat-font-size',   size + 'px');
  document.documentElement.style.setProperty('--chat-font-weight', weight);
  document.documentElement.style.setProperty('--chat-font-color',  color);
}
/* تطبيق الإعدادات فور تحميل الصفحة */
applyFontSettings();

function openSettings() {
  /* نافذة إعدادات الخط */
  const overlay = document.getElementById('settingsOverlay');
  if (overlay) { overlay.classList.add('show'); return; }

  /* إنشاء النافذة إن لم تكن موجودة */
  const box = document.createElement('div');
  box.id = 'settingsOverlay';
  box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:flex;align-items:flex-end;justify-content:center';
  box.innerHTML = `
    <div style="width:100%;max-width:480px;background:#fff;border-radius:24px 24px 0 0;padding:20px 20px 30px;font-family:Tajawal,sans-serif" dir="rtl">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <span style="font-size:18px;font-weight:700;color:#1a1a2e">الإعدادات</span>
        <button onclick="document.getElementById('settingsOverlay').classList.remove('show')" style="font-size:22px;background:none;border:none;cursor:pointer;color:#666">✕</button>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:13px;color:#666;display:block;margin-bottom:6px">حجم الخط</label>
        <div style="display:flex;align-items:center;gap:12px;background:#f3f0ff;padding:10px 14px;border-radius:12px">
          <input type="range" min="11" max="26" step="1"
            value="${localStorage.getItem('chatFontSize')||14}"
            oninput="
              document.getElementById('_fsp').textContent=this.value+'px';
              document.documentElement.style.setProperty('--chat-font-size',this.value+'px');
            "
            onchange="localStorage.setItem('chatFontSize',this.value)"
            style="flex:1;accent-color:#7c3aed">
          <span id="_fsp" style="color:#7c3aed;font-weight:700;min-width:36px">${localStorage.getItem('chatFontSize')||14}px</span>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:13px;color:#666;display:block;margin-bottom:6px">سمك الخط</label>
        <div style="display:flex;gap:8px">
          <button onclick="document.documentElement.style.setProperty('--chat-font-weight','400');localStorage.setItem('chatFontWeight','400');this.style.background='#7c3aed';this.style.color='#fff';this.nextElementSibling.style.background='#f3f0ff';this.nextElementSibling.style.color='#1a1a2e'"
            style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-family:Tajawal;font-size:14px;background:${localStorage.getItem('chatFontWeight')==='700'?'#f3f0ff':'#7c3aed'};color:${localStorage.getItem('chatFontWeight')==='700'?'#1a1a2e':'#fff'}">رفيع</button>
          <button onclick="document.documentElement.style.setProperty('--chat-font-weight','700');localStorage.setItem('chatFontWeight','700');this.style.background='#7c3aed';this.style.color='#fff';this.previousElementSibling.style.background='#f3f0ff';this.previousElementSibling.style.color='#1a1a2e'"
            style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-family:Tajawal;font-size:14px;background:${localStorage.getItem('chatFontWeight')==='700'?'#7c3aed':'#f3f0ff'};color:${localStorage.getItem('chatFontWeight')==='700'?'#fff':'#1a1a2e'}">عريض</button>
        </div>
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:13px;color:#666;display:block;margin-bottom:6px">لون الخط</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${['#222222','#7c3aed','#1d4ed8','#15803d','#dc2626','#c2410c','#0e7490'].map(c=>`
            <button onclick="document.documentElement.style.setProperty('--chat-font-color','${c}');localStorage.setItem('chatFontColor','${c}')"
              style="width:32px;height:32px;border-radius:50%;background:${c};border:3px solid ${localStorage.getItem('chatFontColor')===c?'#7c3aed':'transparent'};cursor:pointer"></button>
          `).join('')}
        </div>
      </div>
      <button onclick="applyFontSettings();document.getElementById('settingsOverlay').classList.remove('show');showToast('✅ تم حفظ الإعدادات')"
        style="width:100%;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:13px;border-radius:14px;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:Tajawal">حفظ وتطبيق</button>
    </div>
  `;
  box.classList.add('show');
  box.style.display = 'none';
  box.style.cssText += ';display:flex';
  box.addEventListener('click', e => { if(e.target===box) box.classList.remove('show'); });
  document.body.appendChild(box);
}

/* ── قائمة الحالة ── */
function openStatusMenu() {
  document.getElementById('statusOverlay')?.classList.add('show');
  document.getElementById('statusPopup')?.classList.add('show');
}
function closeStatusMenu() {
  document.getElementById('statusOverlay')?.classList.remove('show');
  document.getElementById('statusPopup')?.classList.remove('show');
}
function setStatus(status, icon, label) {
  socket.emit('setStatus', {
    room_id : localStorage.getItem('room_id'),
    username: localStorage.getItem('username'),
    status,
  });
  closeStatusMenu();
  closeSideMenu();
  showToast(`${icon} الحالة: ${label}`);
}

/* ── الأعضاء ── */
let membersVisible = false;
function toggleMembers() {
  membersVisible = !membersVisible;
  document.getElementById('chatLayer')?.classList.toggle('open', membersVisible);
}

function setHandBadge(targetUsername, show) {
  const items = document.querySelectorAll('.member-item');
  items.forEach(item => {
    if (item.dataset.username === targetUsername) {
      let badge = item.querySelector('.hand-badge');
      if (show && !badge) {
        badge = document.createElement('span');
        badge.className = 'hand-badge';
        badge.textContent = '🖐️';
        item.appendChild(badge);
      } else if (!show && badge) {
        badge.remove();
      }
    }
  });
}

/* ── مفضلة الغرفة ── */
function toggleFavorite() {
  const room_id = localStorage.getItem('room_id');
  const favs = JSON.parse(localStorage.getItem('favRooms') || '[]');
  const idx = favs.indexOf(room_id);
  const favText = document.getElementById('favText');
  if (idx >= 0) {
    favs.splice(idx, 1);
    if (favText) favText.textContent = 'إضافة للمفضلة';
    showToast('☆ أُزيلت من المفضلة');
  } else {
    favs.push(room_id);
    if (favText) favText.textContent = 'إزالة من المفضلة';
    showToast('⭐ أُضيفت للمفضلة');
  }
  localStorage.setItem('favRooms', JSON.stringify(favs));
  closeSideMenu();
}

/* ── مسح الدردشة محلياً ── */
function clearLocalChat() {
  if (!confirm('مسح الدردشة من شاشتك فقط؟')) return;
  document.getElementById('messages').innerHTML = '';
  showToast('🧹 تم مسح الدردشة محلياً');
}

/* ── تبليغ ── */
function reportRoom() {
  if (!confirm('تبليغ عن هذه الغرفة؟')) return;
  socket.emit('reportRoom', {
    room_id: localStorage.getItem('room_id'),
    by: localStorage.getItem('username'),
  });
  closeSideMenu();
  showToast('🚨 تم إرسال التبليغ');
}

/* ── خروج من الغرفة ── */
function leaveRoom() {
  window.location.href = '/rooms.html';
}

/* ── إيموجي ── */
const EMOJI_TABS = [
  ['❤️','💕','💖','💗','💓','💞','💘','💝','😍','🥰'],
  ['😊','😄','😃','😁','😆','😅','😂','🤣','😉','😇'],
  ['🎉','🎊','🎈','🎁','🏆','🥇','👏','🙌','✨','🌟'],
  ['🌿','🌸','🌺','🌻','🌹','🍀','🌴','🌵','🌷','🌼'],
];
let currentEmojiTab = 0;
function toggleEmoji() {
  const panel = document.getElementById('emojiPanel');
  const isShowing = panel?.classList.toggle('show');
  if (isShowing) renderEmojiGrid();
  document.getElementById('imagePicker')?.classList.remove('show');
}
function switchEmojiTab(i) {
  currentEmojiTab = i;
  document.querySelectorAll('.emoji-tab').forEach((t, idx) => t.classList.toggle('active', idx === i));
  renderEmojiGrid();
}
function renderEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  grid.innerHTML = EMOJI_TABS[currentEmojiTab]
    .map(e => `<span class="emoji-item" onclick="insertEmoji('${e}')">${e}</span>`).join('');
}
function insertEmoji(e) {
  const input = document.getElementById('msgInput');
  if (input) { input.value += e; input.focus(); }
}
function sendQuick(emoji) {
  const input = document.getElementById('msgInput');
  if (input) { input.value = emoji; sendMessage(); }
}

/* ── صور ── */
function toggleImagePicker() {
  const panel = document.getElementById('imagePicker');
  panel?.classList.toggle('show');
  document.getElementById('emojiPanel')?.classList.remove('show');
}
function pickImage(source) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  if (source === 'camera') inp.capture = 'environment';
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('sendImage', {
        room_id : localStorage.getItem('room_id'),
        username: localStorage.getItem('username'),
        rank    : parseInt(localStorage.getItem('rank')) || 100,
        image   : reader.result,
        caption : '',
      });
    };
    reader.readAsDataURL(file);
  };
  inp.click();
  document.getElementById('imagePicker')?.classList.remove('show');
}

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── Socket events متعلقة بالواجهة ── */
document.addEventListener('socketReady', () => {
  socket.on('raiseHand', (d) => {
    setHandBadge(d.username, true);
    showToast(`✋ ${d.username} رفع يده`);
  });

  socket.on('speakerState', (data) => {
    /* [FIX] اليد 🖐️ تظهر فقط لمن هو فعلاً في طابور الانتظار (queue)،
       وتُحدَّث لكل المستخدمين في الغرفة (لا لنفسي فقط)، بناءً على الحالة
       الحقيقية القادمة من السيرفر — لا إظهار تخميني فوري قبل معرفة النتيجة */
    const queueNames = new Set((data.queue || []).map(u => u.username));
    document.querySelectorAll('.member-item').forEach(item => {
      setHandBadge(item.dataset.username, queueNames.has(item.dataset.username));
    });
  });

  socket.on('userMuted', (d) => showToast(`🔇 تم كتم ${d.username}`));
  socket.on('userUnmuted', (d) => showToast(`🔊 تم فك كتم ${d.username}`));
  socket.on('userKicked', (d) => showToast(`🚪 تم طرد ${d.username}`));
  socket.on('announcement', (d) => showToast(`📢 ${d.text}`));
  socket.on('youAreWarned', (d) => alert(`⚠️ تحذير من ${d.by}:\n${d.reason}`));
});


/* ══ onlineUsers handler — يُعبّئ window._onlineUsers ══
   مُضاف لتمكين قائمة المتواجدين من قراءة البيانات         */
socket.on('onlineUsers', (data) => {
  window._onlineUsers = Array.isArray(data) ? data
    : (data.users || data.online || data.members || []);

  /* تحديث العدد في كل مكان */
  const cnt = document.getElementById('membersCount');
  if (cnt) cnt.textContent = '(' + window._onlineUsers.length + ')';

  /* تحديث القائمة إذا كانت مفتوحة */
  if (typeof renderMembers === 'function') renderMembers();
});

socket.on('userJoined', (d) => {
  if (!d?.username || !window._onlineUsers) return;
  const exists = window._onlineUsers.some(u => u.username === d.username);
  if (!exists) window._onlineUsers.push({
    username: d.username,
    rank:     d.rank   || 100,
    avatar:   d.avatar || 'av1.svg',
  });
  const cnt = document.getElementById('membersCount');
  if (cnt) cnt.textContent = '(' + window._onlineUsers.length + ')';
  if (typeof renderMembers === 'function') renderMembers();
});

socket.on('userLeft', (d) => {
  if (!d?.username || !window._onlineUsers) return;
  window._onlineUsers = window._onlineUsers.filter(u => u.username !== d.username);
  const cnt = document.getElementById('membersCount');
  if (cnt) cnt.textContent = '(' + window._onlineUsers.length + ')';
  if (typeof renderMembers === 'function') renderMembers();
});
