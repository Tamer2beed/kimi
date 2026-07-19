/* ════════════════════════════════════════
   WidBid — emojis.js
   نظام الإيموجي الكامل + اختصارات الكيبورد
════════════════════════════════════════ */

const EmojiSystem = (() => {

  /* ── بيانات الإيموجي ───────────────── */
  const TABS = [
    {
      icon: '❤️', name: 'قلوب',
      emojis: ['❤️','💔','💕','💞','💓','💗','💘','💝','💖','🤍','💛','💚',
               '💙','💜','🖤','🤎','❣️','💟','🌹','🌷','🌸','🌺','💐','🎁',
               '🎂','🎊','🎉','🥂','✨','⭐','🌟','💫','🔥','💥','🎀','🎗️']
    },
    {
      icon: '😊', name: 'وجوه',
      emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉',
               '😌','😍','🥰','😘','😋','😛','😝','😜','😎','🤩','🥳','😏',
               '😒','😔','😢','😭','😤','😠','🤔','🤗','🤭','😷','🤧','😴']
    },
    {
      icon: '🎉', name: 'احتفالات',
      emojis: ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🎯','🎲','🎮',
               '🕹️','👾','🎱','🏓','🎾','⚽','🏀','🎸','🎵','🎶','🎤','🎧',
               '📱','💻','🚀','✈️','🌍','🌈','☀️','🌙','⭐','🎠','🎡','🎢']
    },
    {
      icon: '🌿', name: 'طبيعة',
      emojis: ['🌿','🌱','🌲','🌳','🌴','🌵','🎋','🍀','☘️','🍃','🍂','🍁',
               '🌺','🌸','🌼','🌻','🌞','💫','✨','🌙','☀️','🌊','🏔️','🗻',
               '🌋','🏖️','🏜️','🌅','🌄','🌃','🌆','🦋','🐝','🦜','🐬','🌠']
    },
    {
      icon: '🍕', name: 'طعام',
      emojis: ['🍕','🍔','🌮','🌯','🍜','🍣','🍱','🍛','🥗','🍖','🍗','🥩',
               '🍳','🥚','🧀','🥐','🍞','🥨','🧆','🥙','🌭','🥓','🍟','🍦',
               '🍧','🍨','🍩','🍪','🎂','🍰','☕','🍵','🧃','🥤','🧋','🍺']
    },
    {
      icon: '🙏', name: 'إسلامية',
      emojis: ['🙏','☪️','🕌','🕋','📿','⭐','🌙','🤲','📖','🌿','🌺','💚',
               '🤍','☀️','🌟','✨','💫','🕊️','🌸','🌹','💐','🍀','☘️','🌴',
               '⚡','🔮','💎','👑','🏅','🎖️','🏆','🎗️','🎀','🎊','🎉','🎈']
    },
  ];

  /* ── اختصارات الكيبورد ─────────────────
     :) → 😊  :D → 😄  :( → 😢
     <3 → ❤️  ;) → 😉  :P → 😛
     :o → 😮  >:( → 😠  XD → 😂
     :* → 😘  B) → 😎  ^^ → 😊
  ──────────────────────────────────────── */
  const SHORTCUTS = {
    ':)'  : '😊', ':D'  : '😄', ':('  : '😢',
    '<3'  : '❤️', ';)'  : '😉', ':P'  : '😛',
    ':p'  : '😛', ':o'  : '😮', ':O'  : '😮',
    '>:(' : '😠', 'XD'  : '😂', 'xD'  : '😂',
    ':*'  : '😘', 'B)'  : '😎', '^^'  : '😊',
    ':/'  : '😕', ':|'  : '😐', '>_<' : '😣',
    'T_T' : '😭', '^_^' : '😊', '-_-' : '😑',
    'o_o' : '😶', 'O_O' : '😲', ':3'  : '🥺',
    'uwu' : '🥰', 'owo' : '😮', 'lol' : '😂',
    ':fire:' : '🔥', ':heart:' : '❤️',
    ':star:' : '⭐', ':pray:' : '🙏',
    ':+1:' : '👍', ':-1:' : '👎',
    ':ok:' : '👌', ':clap:' : '👏',
  };

  let currentTab = 0;
  let searchMode = false;

  /* ── بناء لوحة الإيموجي ──────────────── */
  function buildPanel() {
    const panel = document.getElementById('emojiPanel');
    panel.innerHTML = `
      <div class="emoji-tabs" id="emojiTabs"></div>
      <div class="emoji-search-wrap">
        <input class="emoji-search" id="emojiSearch"
          placeholder="🔍 ابحث عن إيموجي..." autocomplete="off" />
      </div>
      <div class="emoji-grid" id="emojiGrid"></div>
      <div class="emoji-shortcuts-bar" id="shortcutsBar"></div>
    `;

    // التبويبات
    const tabsEl = document.getElementById('emojiTabs');
    TABS.forEach((t, i) => {
      const tab = document.createElement('div');
      tab.className = 'emoji-tab' + (i === 0 ? ' active' : '');
      tab.textContent = t.icon;
      tab.title = t.name;
      tab.onclick = () => switchTab(i);
      tabsEl.appendChild(tab);
    });

    // بحث
    document.getElementById('emojiSearch').addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q) {
        searchMode = true;
        renderSearch(q);
      } else {
        searchMode = false;
        renderTab(currentTab);
      }
    });

    renderTab(0);
    buildShortcutsBar();
  }

  function switchTab(i) {
    currentTab = i;
    searchMode = false;
    document.getElementById('emojiSearch').value = '';
    document.querySelectorAll('.emoji-tab').forEach((t, idx) =>
      t.classList.toggle('active', idx === i)
    );
    renderTab(i);
  }

  function renderTab(i) {
    renderEmojis(TABS[i].emojis);
  }

  function renderSearch(q) {
    const all = TABS.flatMap(t => t.emojis);
    // بحث بسيط — نبحث في الـ shortcut names أيضاً
    const results = all.filter(e => {
      const name = getEmojiName(e).toLowerCase();
      return name.includes(q.toLowerCase()) || e.includes(q);
    });
    renderEmojis(results.length ? results : all.slice(0, 36));
  }

  function renderEmojis(list) {
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = '';
    list.forEach(e => {
      const span = document.createElement('span');
      span.className = 'emoji-item';
      span.textContent = e;
      span.onclick = () => insertEmoji(e);
      grid.appendChild(span);
    });
  }

  function buildShortcutsBar() {
    const bar = document.getElementById('shortcutsBar');
    if (!bar) return;
    const preview = Object.entries(SHORTCUTS).slice(0, 8);
    bar.innerHTML = preview.map(([k, v]) =>
      `<span class="shortcut-chip" title="${k}">${v} <em>${k}</em></span>`
    ).join('');
  }

  /* ── إدراج إيموجي ────────────────────── */
  function insertEmoji(emoji) {
    const input = document.getElementById('msgInput');
    const pos   = input.selectionStart || input.value.length;
    input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
    input.setSelectionRange(pos + emoji.length, pos + emoji.length);
    input.focus();
  }

  /* ── تحويل الاختصارات تلقائياً ──────────
     يعمل لحظة كتابة المسافة أو الإرسال
  ────────────────────────────────────── */
  function applyShortcuts(text) {
    let result = text;
    // ترتيب من الأطول للأقصر لتجنب التعارض
    const sorted = Object.entries(SHORTCUTS)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [short, emoji] of sorted) {
      // استبدال كلمة كاملة فقط (حدود الكلمة)
      const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'g'), emoji);
    }
    return result;
  }

  /* ── ربط الاختصارات بحقل الكتابة ───────── */
  function attachInputListener() {
    const input = document.getElementById('msgInput');

    // تحويل عند الضغط على مسافة
    input.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const before  = input.value;
        const after   = applyShortcuts(before);
        if (before !== after) {
          input.value = after;
          // حرك المؤشر للنهاية
          input.setSelectionRange(after.length, after.length);
        }
      }
    });
  }

  /* ── اسم الإيموجي (للبحث) ───────────── */
  const EMOJI_NAMES = {
    '❤️':'heart love قلب','💔':'broken heart','😊':'smile happy سعيد',
    '😂':'laugh خنده ضحك','😍':'love eyes','😢':'sad بكاء حزن',
    '🔥':'fire نار','⭐':'star نجم','🎉':'party احتفال',
    '🙏':'pray شكر صلاة دعاء','❓':'question','💯':'100 perfect',
    '👍':'good okay تمام','👏':'clap تصفيق','🌹':'rose وردة',
  };
  function getEmojiName(e) { return EMOJI_NAMES[e] || e; }

  /* ── التصدير ─────────────────────────── */
  return { buildPanel, insertEmoji, applyShortcuts, switchTab, SHORTCUTS, TABS };
})();

/* ── CSS الإضافي للإيموجي ─────────────── */
const emojiStyles = document.createElement('style');
emojiStyles.textContent = `
.emoji-search-wrap {
  padding:6px 8px; background:var(--bg-light);
  border-bottom:1px solid var(--border);
}
.emoji-search {
  width:100%; height:32px; border:1px solid var(--border);
  border-radius:16px; padding:0 12px; outline:none;
  font-family:'Tajawal',sans-serif; font-size:13px;
  direction:rtl; background:#fff;
}
.emoji-shortcuts-bar {
  display:flex; gap:6px; padding:6px 8px;
  overflow-x:auto; border-top:1px solid var(--border);
  background:var(--bg-light);
}
.emoji-shortcuts-bar::-webkit-scrollbar { display:none; }
.shortcut-chip {
  display:flex; align-items:center; gap:3px; flex-shrink:0;
  background:#fff; border:1px solid var(--border);
  border-radius:10px; padding:3px 8px;
  font-size:13px; cursor:pointer;
  transition:background .15s;
}
.shortcut-chip em {
  font-style:normal; font-size:10px; color:var(--text-muted);
}
.shortcut-chip:active { background:var(--bg-light); }
`;
document.head.appendChild(emojiStyles);

/* ── تهيئة ───────────────────────────── */
EmojiSystem.buildPanel();
EmojiSystem.attachInputListener?.();

function toggleEmoji() {
  const p = document.getElementById('emojiPanel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    setTimeout(() => document.getElementById('emojiSearch')?.focus(), 200);
  } else {
    document.getElementById('msgInput').focus();
  }
}
function closeEmoji() {
  document.getElementById('emojiPanel').classList.remove('open');
}
function switchEmojiTab(i) { EmojiSystem.switchTab(i); }

window.EmojiSystem = EmojiSystem;
