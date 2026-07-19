# 🎙️ WidBid — WebRTC Audio (Mediasoup SFU) Skill Kit
**للنموذج:** DeepSeek
**المراجع الإلزامي:** Claude (يراجع كل كود قبل التطبيق)
**الهدف:** تفعيل البث الصوتي الحقيقي عبر Mediasoup SFU
**النطاق:** صوت فقط — الفيديو في مرحلة لاحقة
**البيئة:** Node.js v22 + Termux (Android) + MySQL

---

## ⚠️ قواعد العمل الإلزامية

1. **قبل كل تعديل:** اكتب تعليقاً بهذا الشكل:
```javascript
// [SKILL-AUDIO][الملف:السطر] — [وصف التغيير]
// المشكلة التي يحلها: [وصف]
// تاريخ: [YYYY-MM-DD]
```

2. **لا تُعدّل** الملفات التالية إلا بتعليق صريح:
   - `Qwen_markdown.md` — الدستور، ممنوع تعديله
   - `setup-db.js` — المخطط الأصلي

3. **بعد كل تعديل:** اكتب ملاحظة بهذا الشكل:
```
✅ تم: [ما فعلته]
📁 الملف: [path]
📍 السطور: [من-إلى]
↩️ للتراجع: [كيفية التراجع]
```

4. **عند وجود خطأ:** لا تحذف الكود القديم — علّق عليه:
```javascript
/* [DISABLED by SKILL-AUDIO] — السبب: ... */
// الكود القديم هنا
```

---

## 🏗️ البنية المطلوبة

```
server/
  index.js          ← موجود (Socket.io الرئيسي)
  mediasoup.js      ← جديد (يُنشأ من الصفر)
  
public/js/
  audio.js          ← جديد (منطق العميل)
  speaker.js        ← موجود (يُعدَّل فقط لربط الصوت)
```

---

## 📋 المتطلبات

### تثبيت الحزم (نفّذ على Termux):
```bash
cd ~/widbid2/widbid2
npm install mediasoup
```

### متطلبات النظام (جاهزة ✅):
- Node.js >= 22 ✅ (v22.22.2)
- Python 3 ✅ (3.12.3)
- gcc ✅ (13.3.0)

---

## 🔧 الخطوة 1 — إنشاء `server/mediasoup.js`

### ما يجب أن يحتويه:

```javascript
// server/mediasoup.js
// [SKILL-AUDIO][server/mediasoup.js:1] — Worker + Router + Transport factory
// المشكلة التي يحلها: إنشاء SFU كامل لبث الصوت

const mediasoup = require('mediasoup');

/* ══ إعدادات الصوت ══ */
const MEDIA_CODECS = [
  {
    kind      : 'audio',
    mimeType  : 'audio/opus',
    clockRate : 48000,
    channels  : 2,
  }
];

/* ══ إعدادات الشبكة ══
   يجب تحديث listenIps بـ IP الجهاز الفعلي
   على Termux: اعرف IP بـ `ip route` أو من إعدادات WiFi */
const LISTEN_IPS = [
  { ip: '0.0.0.0', announcedIp: null }  // ← غيّر null لـ IP هاتفك للإنترنت
];

let worker = null;

/* الغرف: Map<roomId, { router, producers, consumers, transports }> */
const sfuRooms = new Map();

/* ══ تهيئة Worker ══ */
async function initWorker() { ... }

/* ══ إنشاء غرفة SFU ══ */
async function getOrCreateRoom(roomId) { ... }

/* ══ إنشاء WebRtcTransport ══ */
async function createTransport(router) { ... }

module.exports = { initWorker, getOrCreateRoom, createTransport, sfuRooms };
```

**يجب أن ينفّذ DeepSeek هذه الدوال الأربع كاملةً.**

---

## 🔧 الخطوة 2 — تعديل `server/index.js`

### نقاط التعديل الدقيقة:

**2a. استيراد mediasoup.js (في الأعلى):**
```javascript
// [SKILL-AUDIO][server/index.js:~5] — استيراد SFU
const { initWorker, getOrCreateRoom, createTransport, sfuRooms } = require('./mediasoup');
```

**2b. تشغيل Worker عند بدء السيرفر:**
```javascript
// [SKILL-AUDIO][server/index.js:~بعد server.listen] — تشغيل Mediasoup Worker
server.listen(PORT, async () => {
  console.log(`🚀 WidBid Server on port ${PORT}`);
  await initWorker();
  console.log('🎙️ Mediasoup Worker ready');
});
```

**2c. أحداث Socket.io الجديدة (داخل io.on('connection')):**

أضف هذه الأحداث الستة بالترتيب:

```javascript
/* ── [SKILL-AUDIO] RTP Capabilities ─────── */
socket.on('audio:getCapabilities', async ({ room_id }) => {
  // أرسل router.rtpCapabilities للعميل
});

/* ── [SKILL-AUDIO] إنشاء Transport للإرسال ─ */
socket.on('audio:createSendTransport', async ({ room_id }) => {
  // أنشئ WebRtcTransport وأرسل params
});

/* ── [SKILL-AUDIO] إنشاء Transport للاستقبال */
socket.on('audio:createRecvTransport', async ({ room_id }) => {
  // أنشئ WebRtcTransport وأرسل params
});

/* ── [SKILL-AUDIO] Connect Transport ──────── */
socket.on('audio:connectTransport', async ({ transportId, dtlsParameters }) => {
  // transport.connect()
});

/* ── [SKILL-AUDIO] Produce (بدء البث) ─────── */
socket.on('audio:produce', async ({ transportId, kind, rtpParameters }) => {
  // transport.produce() — أبلغ الغرفة بـ producer جديد
});

/* ── [SKILL-AUDIO] Consume (استقبال البث) ─── */
socket.on('audio:consume', async ({ room_id, producerId, rtpCapabilities }) => {
  // router.canConsume() → transport.consume()
});
```

---

## 🔧 الخطوة 3 — إنشاء `public/js/audio.js`

### الهيكل الكامل:

```javascript
// public/js/audio.js
// [SKILL-AUDIO][public/js/audio.js:1] — Mediasoup Client
// يعتمد على: mediasoup-client (CDN أو npm)

/* ══ الاستيراد من CDN ══
   أضف في chat.html قبل audio.js:
   <script src="https://cdn.jsdelivr.net/npm/mediasoup-client/lib/mediasoup-client.min.js"></script>
*/

const AudioSystem = (() => {

  let device         = null;  // mediasoup Device
  let sendTransport  = null;  // WebRtcTransport للإرسال
  let recvTransport  = null;  // WebRtcTransport للاستقبال
  let audioProducer  = null;  // Producer (مايك المستخدم)
  let audioConsumers = {};    // { producerId: Consumer }
  let localStream    = null;  // MediaStream من المايك

  /* ══ 1. تهيئة Device ══ */
  async function initDevice(roomId) { ... }

  /* ══ 2. بدء البث (المتحدث) ══ */
  async function startSpeaking() {
    // getUserMedia({ audio: true })
    // createSendTransport
    // produce()
  }

  /* ══ 3. إيقاف البث ══ */
  async function stopSpeaking() {
    // audioProducer.close()
    // localStream.getTracks().stop()
  }

  /* ══ 4. استقبال بث شخص آخر ══ */
  async function consumeAudio(producerId) {
    // createRecvTransport (مرة واحدة)
    // consume()
    // new Audio(stream).play()
  }

  /* ══ 5. ربط مع speaker.js ══ */
  // عند استلام السبيكر → startSpeaking()
  // عند انتهاء السبيكر → stopSpeaking()
  // عند دخول متحدث جديد → consumeAudio(producerId)

  return { initDevice, startSpeaking, stopSpeaking, consumeAudio };
})();
```

---

## 🔧 الخطوة 4 — ربط audio.js مع speaker.js

### التعديل المطلوب في `public/js/speaker.js`:

```javascript
// [SKILL-AUDIO][public/js/speaker.js:requestSpeaker] — تفعيل الصوت عند الطلب
function requestSpeaker() {
  socket.emit('speakerRequest', { room_id: roomId, username, rank: userRank });
  if (typeof setHandBadge === 'function') setHandBadge(username, true);
  // [SKILL-AUDIO] أضف هنا:
  AudioSystem?.initDevice(roomId);  // جهّز الجهاز عند الطلب
}

// [SKILL-AUDIO][public/js/speaker.js:speakerState handler]
// عندما تصبح isSpeaking = true → AudioSystem.startSpeaking()
// عندما تصبح isSpeaking = false → AudioSystem.stopSpeaking()
```

---

## 🔧 الخطوة 5 — إضافة audio.js لـ chat.html

```html
<!-- [SKILL-AUDIO][public/chat.html] — مكتبة Mediasoup Client + audio.js -->
<!-- أضف قبل </body> وبعد speaker.js -->
<script src="https://cdn.jsdelivr.net/npm/mediasoup-client/lib/mediasoup-client.min.js"></script>
<script src="/js/audio.js"></script>
```

---

## 🌐 إعداد STUN/TURN

### للاختبار على نفس WiFi (مجاني):
```javascript
// في server/mediasoup.js
const LISTEN_IPS = [
  { ip: '0.0.0.0', announcedIp: '192.168.1.X' }  // ← IP هاتف Termux
];
// لا يحتاج TURN على نفس الشبكة
```

### للإنتاج (إنترنت عام):
```javascript
// احصل على TURN مجاني من: https://www.metered.ca/tools/openrelay/
const ICE_SERVERS = [
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: '...', credential: '...' }
];
```

---

## 📝 سجل التعديلات (يُكمله DeepSeek)

| التاريخ | الوصف | الملف | السطور | للتراجع |
|---------|-------|-------|--------|---------|
| — | *يُملأ بعد كل تعديل* | — | — | — |

---

## 🔄 ترتيب التنفيذ الإلزامي

```
1. npm install mediasoup          (Termux)
2. إنشاء server/mediasoup.js     (DeepSeek)
3. تعديل server/index.js          (DeepSeek)
4. إنشاء public/js/audio.js       (DeepSeek)
5. تعديل public/js/speaker.js     (DeepSeek)
6. تعديل public/chat.html         (DeepSeek)
7. مراجعة Claude                  (Claude)
8. اختبار على Termux              (تامر)
```

---

## 🔄 كيفية الاختبار

```bash
# الخطوات على Termux:
cd ~/widbid2/widbid2
npm install mediasoup
node server/index.js

# الاختبار:
# هاتف 1 (192.168.1.244:3000): سجّل test_member، ادخل غرفة، اطلب السبيكر
# هاتف 2 (192.168.1.244:3000): سجّل test_guest، ادخل نفس الغرفة
# هاتف 1 يحصل على السبيكر → يُفعَّل المايك → هاتف 2 يسمعه
```

---

## ✅ معايير النجاح

- [ ] هاتف 1 يتحدث → هاتف 2 يسمعه في الغرفة
- [ ] عند انتهاء وقت السبيكر → يُقطع الصوت تلقائياً
- [ ] عند طلب شخص آخر → يُقطع صوت الحالي ويُفتح للتالي
- [ ] لا يُطلب إذن المايك إلا عند الضغط على المايك فعلاً
- [ ] الصوت يعمل على نفس WiFi بدون TURN

---

## 🔄 تحديث مهم — فصل الصوت عن الفيديو

**القرار المعماري (2026-06-22):**

```
السبيكر  = صوت فقط (مايكروفون)
الفيديو  = صورة فقط (كاميرا، بدون صوت)
```

### التأثير على audio.js:

```javascript
// [SKILL-AUDIO] getUserMedia — صوت فقط، لا فيديو
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: false   // ← صريح وواضح
});

// [SKILL-AUDIO] MEDIA_CODECS في mediasoup.js — صوت فقط
const MEDIA_CODECS = [
  {
    kind      : 'audio',    // ← فقط audio، لا video
    mimeType  : 'audio/opus',
    clockRate : 48000,
    channels  : 2,
  }
  // لا يوجد codec للفيديو هنا
];
```

### شرط إضافي:
- الصوت **يُفعَّل فقط** عندما يحصل المستخدم على السبيكر
- الصوت **يُقطع تلقائياً** عند انتهاء دوره أو سحب السبيكر منه
- المستخدمون الآخرون **يسمعون** لكن لا يُبثون
