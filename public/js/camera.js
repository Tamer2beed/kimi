/* ════════════════════════════════════════
   WidBid — camera.js
   نظام الكاميرا وإرسال الصور
════════════════════════════════════════ */

const CameraSystem = (() => {

  let stream      = null;  // stream الكاميرا الحالي
  let mediaRec    = null;  // MediaRecorder للتسجيل
  let isStreaming = false;

  /* ══ CSS الخاص بالكاميرا ══════════════ */
  const style = document.createElement('style');
  style.textContent = `
  /* ── لوحة الصورة/الكاميرا ──────────── */
  .camera-overlay {
    position:fixed; inset:0; z-index:400;
    background:rgba(0,0,0,.92);
    display:none; flex-direction:column;
    align-items:center; justify-content:center;
  }
  .camera-overlay.show { display:flex; }

  .camera-preview {
    width:100%; max-width:420px; max-height:65vh;
    border-radius:16px; overflow:hidden;
    background:#000; position:relative;
  }
  #cameraVideo, #cameraCanvas {
    width:100%; display:block;
  }
  #cameraCanvas { display:none; }

  .camera-controls {
    display:flex; gap:20px; margin-top:20px;
    align-items:center; justify-content:center;
  }
  .cam-btn {
    width:56px; height:56px; border-radius:50%; border:none;
    display:flex; align-items:center; justify-content:center;
    font-size:24px; cursor:pointer; transition:transform .15s;
  }
  .cam-btn:active { transform:scale(.9); }
  .cam-btn-capture { background:#fff; color:#000; font-size:28px; }
  .cam-btn-flip    { background:rgba(255,255,255,.15); font-size:22px; }
  .cam-btn-close   { background:rgba(255,255,255,.15); font-size:22px; }
  .cam-btn-send    { background:#27AE60; color:#fff; font-size:22px; }
  .cam-btn-retake  { background:rgba(255,255,255,.15); font-size:22px; }

  /* ── معاينة الصورة قبل الإرسال ──────── */
  .img-preview-wrap {
    position:fixed; inset:0; z-index:400;
    background:rgba(0,0,0,.9);
    display:none; flex-direction:column;
    align-items:center; justify-content:center; padding:20px;
  }
  .img-preview-wrap.show { display:flex; }
  .img-preview-wrap img {
    max-width:100%; max-height:65vh;
    border-radius:12px; object-fit:contain;
  }
  .img-caption {
    margin-top:14px; width:100%; max-width:420px;
  }
  .img-caption input {
    width:100%; height:44px; background:rgba(255,255,255,.15);
    border:1px solid rgba(255,255,255,.2); border-radius:24px;
    color:#fff; padding:0 16px; font-family:'Tajawal',sans-serif;
    font-size:14px; outline:none; direction:rtl;
  }
  .img-caption input::placeholder { color:rgba(255,255,255,.5); }
  .img-actions {
    display:flex; gap:12px; margin-top:14px;
    width:100%; max-width:420px;
  }
  .img-actions button {
    flex:1; height:48px; border:none; border-radius:12px;
    font-family:'Tajawal',sans-serif; font-size:15px;
    font-weight:600; cursor:pointer;
  }
  .btn-img-send   { background:#27AE60; color:#fff; }
  .btn-img-cancel { background:rgba(255,255,255,.15); color:#fff; }

  /* ── رسالة صورة في الشات ─────────────── */
  .msg-image {
    max-width:220px; border-radius:12px;
    cursor:pointer; display:block;
    margin-top:4px;
    transition:opacity .2s;
  }
  .msg-image:active { opacity:.8; }
  .msg-image-caption {
    font-size:12px; color:var(--text-muted);
    margin-top:3px; font-style:italic;
  }

  /* ── عارض الصورة الكبيرة ─────────────── */
  .img-viewer {
    position:fixed; inset:0; z-index:500;
    background:rgba(0,0,0,.95);
    display:none; align-items:center; justify-content:center;
  }
  .img-viewer.show { display:flex; }
  .img-viewer img { max-width:95%; max-height:90vh; border-radius:8px; }
  .img-viewer-close {
    position:absolute; top:16px; left:16px;
    font-size:28px; color:#fff; cursor:pointer; opacity:.8;
  }
  `;
  document.head.appendChild(style);

  /* ══ HTML Elements ════════════════════ */
  function buildUI() {
    // كاميرا overlay
    const camOverlay = document.createElement('div');
    camOverlay.className = 'camera-overlay';
    camOverlay.id = 'cameraOverlay';
    camOverlay.innerHTML = `
      <div class="camera-preview">
        <video id="cameraVideo" autoplay playsinline muted></video>
        <canvas id="cameraCanvas"></canvas>
      </div>
      <div class="camera-controls" id="cameraControls">
        <button class="cam-btn cam-btn-close" onclick="CameraSystem.closeCamera()" title="إغلاق">✕</button>
        <button class="cam-btn cam-btn-capture" onclick="CameraSystem.capture()" title="التقاط">⬤</button>
        <button class="cam-btn cam-btn-flip" onclick="CameraSystem.flipCamera()" title="تدوير">🔄</button>
      </div>
      <div class="camera-controls" id="captureControls" style="display:none">
        <button class="cam-btn cam-btn-retake" onclick="CameraSystem.retake()" title="إعادة">↩️</button>
        <button class="cam-btn cam-btn-send" onclick="CameraSystem.sendCaptured()" title="إرسال">✓</button>
      </div>
    `;
    document.body.appendChild(camOverlay);

    // معاينة الصورة قبل الإرسال
    const imgPreview = document.createElement('div');
    imgPreview.className = 'img-preview-wrap';
    imgPreview.id = 'imgPreviewWrap';
    imgPreview.innerHTML = `
      <img id="imgPreviewEl" src="" alt="معاينة" />
      <div class="img-caption">
        <input id="imgCaption" placeholder="أضف تعليقاً (اختياري)..." />
      </div>
      <div class="img-actions">
        <button class="btn-img-cancel" onclick="CameraSystem.cancelImage()">إلغاء</button>
        <button class="btn-img-send"   onclick="CameraSystem.confirmSend()">إرسال ➤</button>
      </div>
    `;
    document.body.appendChild(imgPreview);

    // عارض الصورة الكبيرة
    const viewer = document.createElement('div');
    viewer.className = 'img-viewer';
    viewer.id = 'imgViewer';
    viewer.innerHTML = `
      <span class="img-viewer-close" onclick="CameraSystem.closeViewer()">✕</span>
      <img id="imgViewerEl" src="" alt="" />
    `;
    viewer.onclick = (e) => { if (e.target === viewer) CameraSystem.closeViewer(); };
    document.body.appendChild(viewer);
  }

  /* ══ فتح الكاميرا ═════════════════════ */
  let facingMode = 'user'; // 'user' = أمامية, 'environment' = خلفية
  let capturedBlob = null;

  async function openCamera() {
    closeImagePicker();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width:{ ideal:1280 }, height:{ ideal:720 } },
        audio: false
      });
      document.getElementById('cameraVideo').srcObject = stream;
      document.getElementById('cameraCanvas').style.display = 'none';
      document.getElementById('cameraVideo').style.display  = 'block';
      document.getElementById('cameraControls').style.display = 'flex';
      document.getElementById('captureControls').style.display = 'none';
      document.getElementById('cameraOverlay').classList.add('show');
    } catch (err) {
      showToast('⚠️ تعذّر الوصول للكاميرا — تأكد من الصلاحيات');
    }
  }

  function flipCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    closeCamera(false);
    openCamera();
  }

  function capture() {
    const video  = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.style.display = 'block';
    video.style.display  = 'none';

    document.getElementById('cameraControls').style.display = 'none';
    document.getElementById('captureControls').style.display = 'flex';

    canvas.toBlob(blob => { capturedBlob = blob; }, 'image/jpeg', 0.85);
  }

  function retake() {
    document.getElementById('cameraCanvas').style.display = 'none';
    document.getElementById('cameraVideo').style.display  = 'block';
    document.getElementById('cameraControls').style.display = 'flex';
    document.getElementById('captureControls').style.display = 'none';
    capturedBlob = null;
  }

  function sendCaptured() {
    if (!capturedBlob) return;
    closeCamera(true);
    showImagePreview(capturedBlob);
  }

  function closeCamera(stopStream = true) {
    if (stopStream && stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    document.getElementById('cameraOverlay').classList.remove('show');
  }

  /* ══ فتح المعرض ═══════════════════════ */
  function openGallery() {
    closeImagePicker();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) showImagePreview(file);
    };
    input.click();
  }

  /* ══ معاينة الصورة قبل الإرسال ═══════ */
  function showImagePreview(blob) {
    const url = URL.createObjectURL(blob);
    document.getElementById('imgPreviewEl').src = url;
    document.getElementById('imgCaption').value = '';
    document.getElementById('imgPreviewWrap').classList.add('show');
    document.getElementById('imgPreviewWrap').dataset.url = url;
    document.getElementById('imgPreviewWrap').dataset.blob = '';
    // نحفظ الـ blob مؤقتاً
    window._pendingImageBlob = blob;
  }

  function cancelImage() {
    document.getElementById('imgPreviewWrap').classList.remove('show');
    window._pendingImageBlob = null;
  }

  async function confirmSend() {
    const blob    = window._pendingImageBlob;
    const caption = document.getElementById('imgCaption').value.trim();
    if (!blob) return;

    // تحويل لـ base64 للإرسال عبر Socket
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      socket.emit('sendImage', {
        room_id: roomId,
        user_id: userId,
        username,
        rank: userRank,
        image: base64,
        caption,
      });
      cancelImage();
      showToast('✅ تم إرسال الصورة');
      SoundSystem?.send();
    };
    reader.readAsDataURL(blob);
  }

  /* ══ استقبال صورة (تُربط بعد تهيئة socket) ══ */
  function bindSocketEvents() {
    if (typeof socket === 'undefined') return;
    socket.on('newImage', (d) => {
      addImageMessage(d.username, d.image, d.caption, d.rank, d.username === username);
    });
  }

  function addImageMessage(user, base64, caption, rank, isMe) {
    const color   = getRankColor(rank || 100);
    const initial = getInitial(user);

    const wrap = document.createElement('div');
    wrap.className = `msg-row ${isMe ? 'self' : 'other'}`;

    const av = document.createElement('div');
    av.className = 'msg-avatar-sm';
    av.style.setProperty('--rank-color', color);
    av.textContent = initial;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (!isMe) {
      const sender = document.createElement('div');
      sender.className = 'msg-sender';
      sender.style.color = color;
      sender.textContent = user;
      bubble.appendChild(sender);
    }

    const img = document.createElement('img');
    img.className = 'msg-image';
    img.src = base64;
    img.loading = 'lazy';
    img.onclick = () => openViewer(base64);
    bubble.appendChild(img);

    if (caption) {
      const cap = document.createElement('div');
      cap.className = 'msg-image-caption';
      cap.textContent = caption;
      bubble.appendChild(cap);
    }

    wrap.appendChild(av);
    wrap.appendChild(bubble);
    const msgs = document.getElementById('messages');
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  /* ══ عرض الصورة الكبيرة ══════════════ */
  function openViewer(src) {
    document.getElementById('imgViewerEl').src = src;
    document.getElementById('imgViewer').classList.add('show');
  }
  function closeViewer() {
    document.getElementById('imgViewer').classList.remove('show');
  }

  /* ══ لوحة منتقي الصورة/الكاميرا ══════ */
  function closeImagePicker() {
    document.getElementById('imagePicker').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }

  /* ══ تصدير ═══════════════════════════ */
  return {
    buildUI, bindSocketEvents,
    openCamera, flipCamera, capture, retake,
    sendCaptured, closeCamera,
    openGallery, showImagePreview, cancelImage, confirmSend,
    openViewer, closeViewer,
  };
})();

/* ── بناء UI فور تحميل الملف ────────── */
CameraSystem.buildUI();

/* ── ربط socket events بعد أن يصبح socket جاهزاً ── */
document.addEventListener('socketReady', () => {
  CameraSystem.bindSocketEvents();
});

/* ── تحديث دوال الصورة في ui.js ────── */
function pickImage(src) {
  if (src === 'gallery') CameraSystem.openGallery();
  else                   CameraSystem.openCamera();
}
function toggleVideo() { CameraSystem.openCamera(); }

window.CameraSystem = CameraSystem;
