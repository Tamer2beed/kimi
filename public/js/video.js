// public/js/video.js
// [VIDEO-WEBRTC][public/js/video.js:1] — بث الفيديو P2P عبر WebRTC
// المشكلة التي يحلها: تفعيل البث الحقيقي بدون SFU
// القرار المعماري: الفيديو = صورة فقط (بدون صوت)، حد أقصى 20 مشاهد
// تاريخ: 2026-06-25

/* ══ الإعدادات ══ */
const VIDEO_MAX_VIEWERS = 20;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/* ══ الحالة ══ */
const videoState = {
  isBroadcasting  : false,
  isWatching      : false,
  broadcasterName : '',
  currentSize     : 'sm',
  pendingViewer   : null,
  localStream     : null,
  /* Map<viewerUsername, RTCPeerConnection> — للمُذيع */
  peerConnections : {},
  /* RTCPeerConnection — للمشاهد */
  viewerPC        : null,
  dragOffX        : 0,
  dragOffY        : 0,
};

const SIZES = {
  sm: { w: 160, label: 'صغير' },
  md: { w: 240, label: 'وسط'  },
  lg: { w: 320, label: 'كبير' },
};

/* ══════════════════════════════════════════
   1. بدء البث (المُذيع)
══════════════════════════════════════════ */
async function startBroadcast() {
  if (videoState.isBroadcasting) {
    showToast('⚠️ أنت تبث بالفعل');
    return;
  }

  try {
    /* اطلب إذن الكاميرا — فيديو فقط بدون صوت */
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
      audio: false,
    });

    videoState.localStream     = stream;
    videoState.isBroadcasting  = true;
    videoState.broadcasterName = localStorage.getItem('username') || 'أنت';

    /* أرسل للسيرفر: أنا أبث الآن */
    socket.emit('startBroadcast', {
      room_id : localStorage.getItem('room_id'),
      username: videoState.broadcasterName,
    });

    /* افتح نافذة البث وأظهر الكاميرا المحلية */
    _openVideoWindow(videoState.broadcasterName, true, stream);
    showToast('🔴 بدأ البث المباشر');

  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showToast('⛔ لم تمنح إذن الكاميرا');
    } else {
      showToast('❌ خطأ في تفعيل الكاميرا');
      console.error('startBroadcast:', err);
    }
  }
}

/* ══════════════════════════════════════════
   2. إيقاف البث (المُذيع)
══════════════════════════════════════════ */
function stopBroadcast() {
  if (!videoState.isBroadcasting) return;
  videoState.isBroadcasting = false;

  /* أغلق كل الاتصالات مع المشاهدين */
  Object.values(videoState.peerConnections).forEach(pc => pc.close());
  videoState.peerConnections = {};

  /* أوقف الكاميرا */
  videoState.localStream?.getTracks().forEach(t => t.stop());
  videoState.localStream = null;

  socket.emit('stopBroadcast', { room_id: localStorage.getItem('room_id') });
  closeVideoWindow();
  showToast('⏹️ انتهى البث');
}

/* ══════════════════════════════════════════
   3. المشاهد يطلب المشاهدة
══════════════════════════════════════════ */
function requestWatchBroadcast(broadcasterName) {
  if (videoState.isWatching) {
    showToast('⚠️ أنت تشاهد بثاً بالفعل');
    return;
  }

  const overlay = document.getElementById('videoRequestOverlay');
  document.getElementById('vreqBroadcasterName').textContent = broadcasterName;
  document.getElementById('vreqViewerName').textContent =
    localStorage.getItem('username') || 'مستخدم';
  videoState.broadcasterName = broadcasterName;
  overlay.style.display = 'flex';
}

/* ══════════════════════════════════════════
   4. المشاهد يؤكد الطلب
══════════════════════════════════════════ */
function respondToRequest(accepted) {
  document.getElementById('videoRequestOverlay').style.display = 'none';
  if (!accepted) return;

  socket.emit('requestWatch', {
    room_id    : localStorage.getItem('room_id'),
    broadcaster: videoState.broadcasterName,
    viewer     : localStorage.getItem('username'),
  });
  showToast('⏳ في انتظار موافقة المُذيع...');
}

/* ══════════════════════════════════════════
   5. المُذيع يستقبل طلب مشاهدة → ينشئ PeerConnection
══════════════════════════════════════════ */
async function _handleWatchRequest(viewerName) {
  if (!videoState.isBroadcasting || !videoState.localStream) return;

  /* فحص الحد الأقصى */
  const count = Object.keys(videoState.peerConnections).length;
  if (count >= VIDEO_MAX_VIEWERS) {
    socket.emit('broadcastAnswer', {
      room_id : localStorage.getItem('room_id'),
      viewer  : viewerName,
      accepted: false,
      reason  : 'full',
    });
    showToast(`⛔ الحد الأقصى للمشاهدين (${VIDEO_MAX_VIEWERS}) وصل`);
    return;
  }

  /* إنشاء PeerConnection للمشاهد */
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  videoState.peerConnections[viewerName] = pc;

  /* أضف مسارات الفيديو */
  videoState.localStream.getTracks().forEach(track =>
    pc.addTrack(track, videoState.localStream)
  );

  /* أرسل ICE candidates للمشاهد عبر السيرفر */
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('webrtc:ice', {
        room_id : localStorage.getItem('room_id'),
        to      : viewerName,
        from    : videoState.broadcasterName,
        candidate,
      });
    }
  };

  /* عند إغلاق الاتصال */
  pc.onconnectionstatechange = () => {
    if (['disconnected','failed','closed'].includes(pc.connectionState)) {
      pc.close();
      delete videoState.peerConnections[viewerName];
    }
  };

  /* أنشئ Offer */
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  /* أرسل القبول + الـ Offer للمشاهد */
  socket.emit('broadcastAnswer', {
    room_id : localStorage.getItem('room_id'),
    viewer  : viewerName,
    accepted: true,
    offer   : pc.localDescription,
  });

  showBroadcastRequest(viewerName); /* أظهر Toast للمُذيع */
}

/* ══════════════════════════════════════════
   6. المشاهد يستقبل القبول + Offer → ينشئ PeerConnection
══════════════════════════════════════════ */
async function _handleWatchAccepted(broadcasterName, offer) {
  videoState.isWatching      = true;
  videoState.broadcasterName = broadcasterName;

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  videoState.viewerPC = pc;

  /* ICE candidates من المُذيع */
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('webrtc:ice', {
        room_id : localStorage.getItem('room_id'),
        to      : broadcasterName,
        from    : localStorage.getItem('username'),
        candidate,
      });
    }
  };

  /* عند وصول مسار الفيديو */
  pc.ontrack = ({ streams }) => {
    if (streams[0]) {
      _openVideoWindow(broadcasterName, false, streams[0]);
      showToast(`✅ تشاهد بث ${broadcasterName}`);
    }
  };

  /* عند إغلاق الاتصال */
  pc.onconnectionstatechange = () => {
    if (['disconnected','failed','closed'].includes(pc.connectionState)) {
      _stopWatching();
    }
  };

  /* ضع الـ Offer وأنشئ Answer */
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  /* أرسل الـ Answer للمُذيع */
  socket.emit('webrtc:answer', {
    room_id    : localStorage.getItem('room_id'),
    broadcaster: broadcasterName,
    viewer     : localStorage.getItem('username'),
    answer     : pc.localDescription,
  });
}

/* ══════════════════════════════════════════
   7. المُذيع يستقبل Answer من المشاهد
══════════════════════════════════════════ */
async function _handleViewerAnswer(viewerName, answer) {
  const pc = videoState.peerConnections[viewerName];
  if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

/* ══════════════════════════════════════════
   8. استقبال ICE candidate
══════════════════════════════════════════ */
async function _handleIceCandidate(from, candidate) {
  /* أنا مُذيع — الـ candidate من مشاهد */
  const pc = videoState.peerConnections[from] || videoState.viewerPC;
  if (!pc || !candidate) return;
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.warn('ICE candidate error:', e.message);
  }
}

/* ══════════════════════════════════════════
   9. إيقاف المشاهدة
══════════════════════════════════════════ */
function _stopWatching() {
  videoState.isWatching = false;
  videoState.viewerPC?.close();
  videoState.viewerPC = null;
  closeVideoWindow();
}

/* ══════════════════════════════════════════
   10. فتح نافذة البث وعرض الفيديو
══════════════════════════════════════════ */
function _openVideoWindow(name, isMine, stream) {
  const win    = document.getElementById('videoWindow');
  const screen = document.getElementById('videoScreen');

  document.getElementById('videoBroadcasterName').textContent =
    `📹 ${isMine ? 'بثك المباشر' : name}`;

  /* استبدل الـ placeholder بعنصر <video> حقيقي */
  let videoEl = screen.querySelector('video');
  if (!videoEl) {
    screen.innerHTML = '';
    videoEl = document.createElement('video');
    videoEl.autoplay     = true;
    videoEl.playsInline  = true;
    videoEl.muted        = true;   /* الفيديو = صورة فقط بدون صوت */
    videoEl.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;';
    screen.appendChild(videoEl);

    /* مؤشر LIVE */
    const live = document.createElement('div');
    live.className   = 'live-badge';
    live.textContent = '🔴 LIVE';
    screen.appendChild(live);
  }

  if (stream) videoEl.srcObject = stream;

  win.className      = `video-window sz-${videoState.currentSize}`;
  win.style.display  = 'block';
}

/* ══════════════════════════════════════════
   11. إغلاق نافذة البث
══════════════════════════════════════════ */
function closeVideoWindow() {
  const win = document.getElementById('videoWindow');
  win.style.display = 'none';

  /* أوقف عنصر الفيديو */
  const videoEl = win.querySelector('video');
  if (videoEl) { videoEl.srcObject = null; videoEl.remove(); }

  if (videoState.isBroadcasting) stopBroadcast();
  if (videoState.isWatching)     _stopWatching();
}

/* ══════════════════════════════════════════
   12. تغيير الحجم
══════════════════════════════════════════ */
function setVideoSize(size) {
  videoState.currentSize = size;
  const win = document.getElementById('videoWindow');
  win.className = `video-window sz-${size}`;
  document.querySelectorAll('.size-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.size === size)
  );
}
function cycleVideoSize() {
  const order = ['sm','md','lg'];
  const next  = order[(order.indexOf(videoState.currentSize)+1) % 3];
  setVideoSize(next);
}

/* ══════════════════════════════════════════
   13. سحب النافذة (Touch)
══════════════════════════════════════════ */
(function initVideoDrag() {
  const bar = document.getElementById('videoTitlebar');
  if (!bar) return;

  bar.addEventListener('touchstart', e => {
    const win  = document.getElementById('videoWindow');
    const rect = win.getBoundingClientRect();
    videoState.dragOffX = e.touches[0].clientX - rect.left;
    videoState.dragOffY = e.touches[0].clientY - rect.top;
    win.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!e.target.closest('#videoTitlebar')) return;
    const win = document.getElementById('videoWindow');
    if (win.style.display === 'none') return;
    const x   = e.touches[0].clientX - videoState.dragOffX;
    const y   = e.touches[0].clientY - videoState.dragOffY;
    const maxX = window.innerWidth  - win.offsetWidth;
    const maxY = window.innerHeight - win.offsetHeight;
    win.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    win.style.top  = Math.max(0, Math.min(y, maxY)) + 'px';
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!e.target.closest('#videoTitlebar')) return;
    document.getElementById('videoWindow').style.transition = '';
  });
})();

/* ══════════════════════════════════════════
   14. إظهار Toast للمُذيع عند قبول مشاهد
══════════════════════════════════════════ */
function showBroadcastRequest(viewerName) {
  const count = Object.keys(videoState.peerConnections).length;
  showToast(`📹 ${viewerName} يشاهد بثك (${count}/${VIDEO_MAX_VIEWERS})`);
}

/* ══════════════════════════════════════════
   15. رمز الكاميرا في قائمة الأعضاء
══════════════════════════════════════════ */
function _addCamBadge(uname) {
  document.querySelectorAll('.member-item').forEach(el => {
    if (el.dataset.username === uname && !el.querySelector('.cam-badge')) {
      const badge       = document.createElement('span');
      badge.className   = 'cam-badge';
      badge.textContent = '📹';
      badge.title       = 'يبث مباشر — اضغط للمشاهدة';
      badge.onclick     = e => { e.stopPropagation(); requestWatchBroadcast(uname); };
      el.querySelector('.member-name')?.prepend(badge);
    }
  });
}
function _removeCamBadge(uname) {
  document.querySelectorAll('.member-item').forEach(el => {
    if (el.dataset.username === uname)
      el.querySelector('.cam-badge')?.remove();
  });
}

/* ══════════════════════════════════════════
   16. زر البث في القائمة ☰
══════════════════════════════════════════ */
function addBroadcastMenuItem() {
  /* البث موجود مباشرة في القائمة الجديدة — لا تكرار */
}

/* ══════════════════════════════════════════
   17. ربط Socket Events
══════════════════════════════════════════ */
function bindVideoSocketEvents() {
  if (typeof socket === 'undefined') return;

  /* شخص آخر بدأ البث */
  socket.on('broadcastStarted', ({ username: uname, viewerCount }) => {
    _addCamBadge(uname);
    showToast(`📹 ${uname} بدأ البث المباشر`);
  });

  /* البث انتهى */
  socket.on('broadcastStopped', ({ username: uname }) => {
    _removeCamBadge(uname);
    if (videoState.isWatching && videoState.broadcasterName === uname) {
      _stopWatching();
      showToast('⏹️ انتهى البث المباشر');
    }
  });

  /* المُذيع يستقبل طلب مشاهدة */
  socket.on('watchRequest', ({ viewer }) => {
    if (videoState.isBroadcasting) _handleWatchRequest(viewer);
  });

  /* المشاهد: المُذيع قبل ← وصل Offer */
  socket.on('watchAccepted', ({ broadcaster, offer }) => {
    _handleWatchAccepted(broadcaster, offer);
  });

  /* المشاهد: المُذيع رفض */
  socket.on('watchRejected', ({ reason }) => {
    const msg = reason === 'full'
      ? `⛔ الغرفة ممتلئة (حد أقصى ${VIDEO_MAX_VIEWERS} مشاهد)`
      : '❌ رفض المُذيع طلب المشاهدة';
    showToast(msg);
  });

  /* المُذيع يستقبل Answer من المشاهد */
  socket.on('webrtc:answer', ({ viewer, answer }) => {
    if (videoState.isBroadcasting) _handleViewerAnswer(viewer, answer);
  });

  /* استقبال ICE candidate */
  socket.on('webrtc:ice', ({ from, candidate }) => {
    _handleIceCandidate(from, candidate);
  });

  /* تحديث عدد المشاهدين */
  socket.on('viewerCount', ({ username: uname, count }) => {
    if (videoState.isBroadcasting) {
      const badge = document.getElementById('videoBroadcasterName');
      if (badge) badge.textContent = `📹 بثك المباشر (${count} مشاهد)`;
    }
  });
}

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  bindVideoSocketEvents();
  addBroadcastMenuItem();
});
