/* ════════════════════════════════════════
   WidBid — banner.js v2
   - الصورتان إلزاميتان معاً
   - تظهر الصور المحفوظة عند فتح المحرر
   - الصورة القديمة تُحفظ إذا لم تتغير
════════════════════════════════════════ */

const BannerSystem = (() => {

  const MAX_MOBILE  = 500  * 1024;
  const MAX_DESKTOP = 1024 * 1024;

  let savedMobile   = null;
  let savedDesktop  = null;
  let pendingMobile  = null;
  let pendingDesktop = null;

  /* ══ فتح المحرر ══ */
  function openBannerEditor() {
    const rank = parseInt(localStorage.getItem('rank') || '0');
    if (rank < 500) { showToast('⛔ للمشرفين فقط'); return; }
    pendingMobile  = null;
    pendingDesktop = null;
    _loadPreview('Mobile',  savedMobile);
    _loadPreview('Desktop', savedDesktop);
    document.getElementById('bannerEditorOverlay').style.display = 'flex';
  }

  function _loadPreview(type, src) {
    const wrap = document.getElementById(`banner${type}Preview`);
    if (!wrap) return;
    if (src) {
      wrap.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
    } else {
      wrap.innerHTML = `<div class="banner-preview-placeholder">${type==='Mobile'?'360 × 120':'1200 × 180'}</div>`;
    }
  }

  /* ══ إغلاق المحرر ══ */
  function closeBannerEditor() {
    document.getElementById('bannerEditorOverlay').style.display = 'none';
    pendingMobile  = null;
    pendingDesktop = null;
    ['bannerMobileFile','bannerDesktopFile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  /* ══ معاينة الصورة ══ */
  function previewBanner(type, input) {
    const file = input.files[0];
    if (!file) return;
    const maxSize = type === 'mobile' ? MAX_MOBILE : MAX_DESKTOP;
    if (file.size > maxSize) {
      showToast(`⚠️ الصورة كبيرة — الحد ${type==='mobile'?'500KB':'1MB'}`);
      input.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target.result;
      const T   = type === 'mobile' ? 'Mobile' : 'Desktop';
      _loadPreview(T, b64);
      if (type === 'mobile')  pendingMobile  = b64;
      else                    pendingDesktop = b64;
    };
    reader.readAsDataURL(file);
  }

  /* ══ ضغط الصورة ══ */
  async function compressImage(b64, maxWidth, quality = 0.82) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio  = Math.min(1, maxWidth / img.width);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(b64);
      img.src = b64;
    });
  }

  /* ══ حفظ البانر — الصورتان إلزاميتان ══ */
  async function saveBanner() {
    const finalMobile  = pendingMobile  || savedMobile;
    const finalDesktop = pendingDesktop || savedDesktop;

    if (!finalMobile) {
      showToast('⚠️ يجب رفع صورة الموبايل (360×120)'); return;
    }
    if (!finalDesktop) {
      showToast('⚠️ يجب رفع صورة الديسكتوب (1200×180)'); return;
    }

    showToast('⏳ جاري الحفظ...');

    const mobile  = pendingMobile  ? await compressImage(pendingMobile,  360,  0.80) : finalMobile;
    const desktop = pendingDesktop ? await compressImage(pendingDesktop, 1200, 0.82) : finalDesktop;

    socket.emit('setBanner', { room_id: roomId, mobile, desktop });
    closeBannerEditor();
  }

  /* ══ حذف البانر ══ */
  function removeBanner() {
    if (!confirm('حذف بانر الغرفة نهائياً؟')) return;
    savedMobile  = null;
    savedDesktop = null;
    socket.emit('setBanner', { room_id: roomId, mobile: null, desktop: null });
    closeBannerEditor();
  }

  /* ══ تطبيق البانر ══ */
  function applyBanner(data) {
    const mEl = document.getElementById('bannerMobile');
    const dEl = document.getElementById('bannerDesktop');
    if (data?.mobile)  { savedMobile  = data.mobile;  if (mEl) { mEl.src = data.mobile;  mEl.style.display = ''; } }
    else               { savedMobile  = null;          if (mEl) mEl.style.display = 'none'; }
    if (data?.desktop) { savedDesktop = data.desktop; if (dEl) { dEl.src = data.desktop; dEl.style.display = ''; } }
    else               { savedDesktop = null;          if (dEl) dEl.style.display = 'none'; }
  }

  /* ══ Socket Events ══ */
  function bindSocketEvents() {
    if (typeof socket === 'undefined') return;
    socket.on('roomBanner',    (d) => applyBanner(d));
    socket.on('bannerUpdated', (d) => { applyBanner(d); showToast(d?.mobile ? '🖼️ تم تحديث البانر' : '🗑️ تم حذف البانر'); });
    socket.on('bannerError',   (d) => showToast('❌ ' + (d?.message || 'خطأ في الحفظ')));
  }

  /* ══ INIT ══ */
  function initAdminUI() {
    if (parseInt(localStorage.getItem('rank') || '0') >= 500) {
      const btn = document.getElementById('bannerEditBtn');
      if (btn) btn.style.display = 'inline';
    }
  }

  document.addEventListener('socketReady', () => { bindSocketEvents(); initAdminUI(); });

  return { openBannerEditor, closeBannerEditor, previewBanner, saveBanner, removeBanner };

})();

window.BannerSystem = BannerSystem;
function openBannerEditor()         { BannerSystem.openBannerEditor(); }
function closeBannerEditor()        { BannerSystem.closeBannerEditor(); }
function previewBanner(type, input) { BannerSystem.previewBanner(type, input); }
function saveBanner()               { BannerSystem.saveBanner(); }
function removeBanner()             { BannerSystem.removeBanner(); }
