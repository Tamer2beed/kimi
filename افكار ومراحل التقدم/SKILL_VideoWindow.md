# 📹 WidBid Video Window — Skill Kit
**للنموذج:** DeepSeek / أي نموذج AI
**المراجع:** Claude (للمراجعة والتحقق)
**الإصدار:** S11 — 2026-06-22

---

## 📋 نظرة عامة

نافذة بث فيديو منبثقة قابلة للسحب بثلاثة أحجام.
حالياً: **UI فقط** — الفيديو الحقيقي في Phase 21 (WebRTC).

---

## 🗂️ الملفات المعنية

| الملف | الدور | السطور المهمة |
|-------|-------|---------------|
| `public/js/video.js` | المنطق الكامل | كل الملف (276 سطر) |
| `public/css/chat.css` | التصميم | ابحث عن `VIDEO BROADCAST UI` |
| `public/chat.html` | HTML النافذة | ابحث عن `videoWindow` |
| `server/index.js` | أحداث Socket.io | ابحث عن `startBroadcast` |

---

## 🏗️ هيكل HTML الحالي

```html
<!-- نافذة البث — قابلة للسحب -->
<div class="video-window sz-sm" id="videoWindow" style="display:none">

  <!-- شريط العنوان (منطقة السحب) -->
  <div class="video-titlebar" id="videoTitlebar">
    <span class="video-broadcaster" id="videoBroadcasterName">🎥 البث المباشر</span>
    <div class="video-controls">
      <span onclick="cycleVideoSize()">⊞</span>  <!-- تغيير الحجم -->
      <span onclick="closeVideoWindow()">✕</span>
    </div>
  </div>

  <!-- منطقة الفيديو — Phase 21: يُستبدل بـ <video> -->
  <div class="video-screen" id="videoScreen">
    <div class="video-placeholder">...</div>
    <div class="live-badge">🔴 LIVE</div>
  </div>

  <!-- شريط الأحجام -->
  <div class="video-size-bar">
    <span class="size-btn active" data-size="sm" onclick="setVideoSize('sm')">صغير</span>
    <span class="size-btn"       data-size="md" onclick="setVideoSize('md')">وسط</span>
    <span class="size-btn"       data-size="lg" onclick="setVideoSize('lg')">كبير</span>
  </div>
</div>
```

---

## 📐 الأحجام الثلاثة

| الحجم | Class CSS | العرض | الاستخدام |
|-------|-----------|-------|-----------|
| صغير | `.sz-sm` | 160px | افتراضي — لا يحجب الشات |
| وسط  | `.sz-md` | 240px | مريح للمشاهدة |
| كبير | `.sz-lg` | 320px | رؤية أوضح |

الارتفاع: **`aspect-ratio: 16/9`** تلقائياً في CSS.

---

## ⚙️ CSS الأحجام

```css
/* public/css/chat.css — ابحث عن video-window */
.video-window { position: fixed; z-index: 200; border-radius: 14px; }
.video-window.sz-sm { width: 160px; }
.video-window.sz-md { width: 240px; }
.video-window.sz-lg { width: 320px; }
/* الارتفاع يتبع aspect-ratio في .video-screen */
```

---

## 🎮 دوال JavaScript

```javascript
// video.js — الدوال المتاحة:

startBroadcast()              // المُذيع يبدأ البث
stopBroadcast()               // المُذيع يوقف البث
requestWatchBroadcast(name)   // المشاهد يطلب المشاهدة
respondToRequest(accepted)    // المشاهد يقبل/يرفض طلبه
showBroadcastRequest(viewer)  // المُذيع يستقبل طلب
answerBroadcastReq(accepted)  // المُذيع يوافق/يرفض
closeVideoWindow()            // إغلاق النافذة
setVideoSize('sm'|'md'|'lg')  // تغيير الحجم
cycleVideoSize()              // التنقل بين الأحجام
```

---

## 🌐 أحداث Socket.io

### السيرفر → العميل
| الحدث | البيانات | المعنى |
|-------|----------|--------|
| `broadcastStarted` | `{ username }` | شخص بدأ البث |
| `broadcastStopped` | `{ username }` | البث انتهى |
| `watchRequest` | `{ viewer, room_id }` | طلب مشاهدة (للمُذيع) |
| `watchAccepted` | `{ broadcaster }` | قُبل الطلب (للمشاهد) |
| `watchRejected` | — | رُفض الطلب |

### العميل → السيرفر
| الحدث | البيانات | من |
|-------|----------|-----|
| `startBroadcast` | `{ room_id, username }` | المُذيع |
| `stopBroadcast` | `{ room_id }` | المُذيع |
| `requestWatch` | `{ room_id, broadcaster, viewer }` | المشاهد |
| `broadcastAnswer` | `{ room_id, viewer, accepted }` | المُذيع |

---

## 🖱️ نظام السحب (Drag)

```javascript
// يعمل عبر touch events على #videoTitlebar
// المتغيرات: videoState.dragOffX, videoState.dragOffY
// يمنع الخروج من حدود الشاشة:
const maxX = window.innerWidth  - win.offsetWidth;
const maxY = window.innerHeight - win.offsetHeight;
win.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
win.style.top  = Math.max(0, Math.min(y, maxY)) + 'px';
```

---

## 🔔 رمز الكاميرا في قائمة الأعضاء

```javascript
// يظهر 📹 بجانب اسم المُذيع عند بدء البث:
_addCamBadge(username)    // يُضيف 📹 يومض
_removeCamBadge(username) // يُزيل 📹
// الضغط على 📹 → requestWatchBroadcast(username)
```

---

## 🚧 Phase 21 — ما يجب إضافته (WebRTC)

```javascript
// في _openVideoWindow() — السطر الذي يجب استبداله:

// الآن (placeholder):
<div class="video-placeholder">📹 البث المباشر</div>

// Phase 21 (WebRTC):
const video = document.createElement('video');
video.srcObject = stream;  // stream من getUserMedia أو MediaStreamDestination
video.autoplay = true;
video.muted = (isMine);    // كتم للمُذيع نفسه
videoScreen.appendChild(video);

// مصادر الصوت/فيديو:
// 1. مايكروفون: navigator.mediaDevices.getUserMedia({ audio: true, video: true })
// 2. ملف صوتي: AudioContext + createMediaStreamSource
// 3. شاشة: navigator.mediaDevices.getDisplayMedia()
```

---

## 📝 سجل التعديلات

| التاريخ | الوصف | الملف | الدالة |
|---------|-------|-------|--------|
| S11 | إنشاء video.js كاملاً (UI placeholder) | video.js | كل الملف |
| S11 | إضافة socket events للبث في السيرفر | server/index.js | startBroadcast/stopBroadcast |
| S11 | حذف addBroadcastMenuItem() من INIT | video.js | DOMContentLoaded |

---

## ⚠️ تحذيرات مهمة للنموذج

1. **لا تستبدل `<div class="video-placeholder">`** إلا في Phase 21
2. **`videoState`** object هو الحالة الكاملة — لا تُضف متغيرات خارجه
3. **السحب يعمل فقط على `#videoTitlebar`** — لا تُضف drag على النافذة كاملة
4. **`z-index: 200`** للنافذة — لا تُخفضه أو ستختفي خلف عناصر أخرى
5. **`transition`** على العرض (width) فقط — لا تُضف transition على `top/left`

---

## 🔄 كيفية الاختبار

```bash
# اختبار النافذة:
# 1. سجّل دخول بـ admin@widbid.com
# 2. افتح ☰ → (لا يوجد زر بث — يُضاف في Phase 21)
# 3. اختبر السحب: اسحب شريط العنوان
# 4. اختبر الأحجام: اضغط ⊞ للتنقل
# 5. تحقق من حدود الشاشة: اسحب لحافة الشاشة

# اختبار طلب المشاهدة (UI فقط):
# هاتف 1: ابدأ البث من الكود مباشرة:
#   SpeakerSystem → startBroadcast()
# هاتف 2: اضغط 📹 بجانب اسم المُذيع
#   → يظهر طلب على هاتف 1
#   → القبول يفتح النافذة على هاتف 2
```

---

## 🎯 مهام مقترحة لـ DeepSeek

### مهمة 1: تحسين أحجام النافذة
```
الهدف: جعل النافذة تحتفظ بموضعها عند تغيير الحجم
الملف: public/js/video.js — دالة setVideoSize()
الحل المقترح: احسب المركز قبل التغيير وأعد التموضع بعده
```

### مهمة 2: إضافة حجم رابع "مصغّر" (PIP)
```
الهدف: حجم صغير جداً (80px) للمشاهدة المستمرة
الملف: public/css/chat.css — أضف .sz-xs { width: 80px; }
       public/js/video.js — أضف 'xs' لمصفوفة ['xs','sm','md','lg']
```

### مهمة 3: ذاكرة موضع النافذة
```
الهدف: النافذة تتذكر موضعها بعد إغلاق وإعادة فتح
الملف: public/js/video.js — احفظ في localStorage
       عند الإغلاق: localStorage.setItem('videoPos', JSON.stringify({left, top}))
       عند الفتح: استرجع وطبّق الموضع
```

---

## 🔄 تحديث مهم — الفيديو بدون صوت

**القرار المعماري (2026-06-22):**

```
نافذة الفيديو = صورة فقط (video track)
الصوت = حصري للسبيكر — لا علاقة له بنافذة الفيديو
```

### التأثير على video.js:

```javascript
// [SKILL-VIDEO] getUserMedia — فيديو فقط، لا صوت
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: false   // ← صريح، الصوت للسبيكر فقط
});

// [SKILL-VIDEO] عند تفعيل <video> في Phase 21:
const videoEl = document.createElement('video');
videoEl.srcObject = stream;
videoEl.muted     = true;    // ← دائماً مكتوم
videoEl.autoplay  = true;
videoEl.playsInline = true;
```

### من يمكنه بث الفيديو؟
- **أي مستخدم** يضغط زر الكاميرا (بغض النظر عن السبيكر)
- يمكن أن يكون شخص يبث فيديو بينما شخص آخر يتحدث بالصوت

### الفصل الكامل:
```
المستخدم أ: يتحدث بالصوت (السبيكر) — بدون فيديو
المستخدم ب: يبث فيديو (نافذة منبثقة) — بدون صوت
المستخدم ج: يسمع المستخدم أ + يرى المستخدم ب
```
