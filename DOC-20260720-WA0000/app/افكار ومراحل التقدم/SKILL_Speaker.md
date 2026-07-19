# 🎙️ WidBid Speaker System — Skill Kit
**للنموذج:** DeepSeek / أي نموذج AI
**المراجع:** Claude (للمراجعة والتحقق)
**الإصدار:** S11 — 2026-06-22

---

## 📋 نظرة عامة

نظام طابور السبيكر في WidBid يُتيح للمستخدمين طلب الكلام بالدور.
حالياً: **UI فقط** — الصوت الحقيقي في Phase 21 (WebRTC).

---

## 🗂️ الملفات المعنية

| الملف | الدور | السطور المهمة |
|-------|-------|---------------|
| `public/js/speaker.js` | المنطق الكامل للعميل | كل الملف |
| `server/index.js` | أحداث Socket.io | ابحث عن `speakerRequest` |
| `public/chat.html` | واجهة `#speakerHeaderRow` | السطر ~45 |
| `public/css/chat.css` | تصميم `.header-speaker` | السطر ~66 |

---

## 🏗️ البنية الحالية

### السيرفر — متغيرات الغرفة
```javascript
// server/index.js — السطر ~76
const rooms = {};
// rooms[room_id] = {
//   current:     { username, rank, endsAt } | null,
//   queue:       [{ username, rank }],
//   defaultTime: 120,   // ثانية
//   timer:       null,  // setTimeout للانتهاء
//   warnTimer:   null,  // setTimeout للتحذير (5 ثوانٍ قبل)
// }
```

### أحداث Socket.io (السيرفر → العميل)

| الحدث | البيانات | المعنى |
|-------|----------|--------|
| `speakerState` | `{ current, queue, defaultTime, serverNow }` | حالة كاملة |
| `speakerWarning` | `{ username, remaining }` | 5 ثوانٍ تبقت |
| `speakerRenewed` | `{ username, seconds }` | تجديد تلقائي |
| `speakerTimeUpdated` | `{ endsAt }` | وقت ممدد |

### أحداث Socket.io (العميل → السيرفر)

| الحدث | البيانات | الصلاحية |
|-------|----------|----------|
| `speakerRequest` | `{ room_id, username, rank }` | الجميع |
| `speakerDone` | `{ room_id, username }` | الجميع |
| `speakerLeaveQueue` | `{ room_id, username }` | الجميع |
| `speakerExtend` | `{ room_id, seconds }` | Admin 500+ |
| `speakerRevoke` | `{ room_id }` | Admin 500+ |
| `speakerSkip` | `{ room_id }` | Admin 500+ |
| `speakerGiveTo` | `{ room_id, target }` | Admin 500+ |

---

## ⚙️ المنطق الأساسي

### التجديد التلقائي
```
إذا الطابور فارغ عند الـ 5 ثوانٍ الأخيرة:
  → جدّد 60 ثانية تلقائياً (RENEW_SECS = 60)
  → يتكرر لا نهائياً

إذا يوجد طابور:
  → أرسل speakerWarning
  → عند الصفر: _nextSpeaker() → أعطِ للتالي
```

### دوال السيرفر الرئيسية
```javascript
_giveSpeaker(rid, user)   // أعطِ المايك لمستخدم
_nextSpeaker(rid)          // انتقل للتالي في الطابور
_autoRenew(rid)            // جدّد 60 ثانية
_broadcastState(rid)       // أبلغ الجميع
_sendStateTo(socket, rid)  // أبلغ مستخدماً واحداً
```

### دوال العميل الرئيسية
```javascript
SpeakerSystem.requestSpeaker()  // طلب المايك
SpeakerSystem.doneSpeaking()    // انتهى
SpeakerSystem.leaveQueue()      // خروج من الطابور
SpeakerSystem.adminExtend()     // تمديد (500+)
SpeakerSystem.adminRevoke()     // سحب (500+)
SpeakerSystem.adminSkip()       // تخطي (500+)
SpeakerSystem.adminGiveTo(name) // إعطاء (500+)
```

---

## 🎨 واجهة المستخدم

### الهيدر (`#speakerHeaderRow`)
- يظهر فقط عند وجود نشاط (متحدث أو طابور)
- يتمدد الهيدر من 54px → 96px بانيميشن
- يحتوي: اسم المتحدث + عداد تنازلي + أقراص الطابور

### زر المايك (`#micTbBtn`)
```
🎤 أخضر  = متاح أو في الطابور (اضغط للطلب)
🛑 أحمر  = أنت تتحدث (اضغط للإنهاء)
#2 برتقالي = رقمك في الطابور (اضغط للخروج)
```

### لوحة المشرف (`#spkAdminPanel`)
- تفتح من قائمة ☰ → "إدارة السبيكر"
- تمديد + سحب + تخطي + إعطاء مباشر

---

## 🚦 قائمة الخصائص للتطوير

### مُنجز ✅
- [x] طابور الانتظار
- [x] عداد تنازلي مع تصحيح فارق الوقت
- [x] تجديد تلقائي (60s) عند طابور فارغ
- [x] تحذير 5 ثوانٍ
- [x] تحكم المشرف (تمديد/سحب/تخطي/إعطاء)
- [x] رمز 🖐️ في قائمة الأعضاء عند الطلب

### مطلوب تنفيذه — الصوت عبر Mediasoup ✅ (راجع SKILL_WebRTC_Audio.md)
- [ ] تفعيل بث الصوت (مايكروفون فقط) عند استلام السبيكر
- [ ] قطع الصوت تلقائياً عند انتهاء الدور أو السحب
- [ ] استقبال الصوت لجميع المتواجدين في الغرفة

> **ملاحظة معمارية:** الصوت مرتبط بالسبيكر فقط.
> نافذة الفيديو (SKILL_VideoWindow.md) تبث صورة فقط — بدون صوت.
> الفصل كامل: صوت ↔ السبيكر، صورة ↔ نافذة الفيديو.

---

## 📝 سجل التعديلات

| التاريخ | الوصف | الملف | السطر |
|---------|-------|-------|-------|
| S11 | إنشاء النظام الأساسي | speaker.js | كل الملف |
| S11 | إصلاح ReferenceError — speakerQueues vs rooms | server/index.js | ~277 |
| S11 | إصلاح العداد — clockOffset لتصحيح الوقت | speaker.js | startTimer() |
| S11 | إزالة زر "السبيكر متاح" | speaker.js | buildUI() |
| S11 | اخفاء header-speaker عند عدم النشاط | speaker.js | render() |
| S11 | تجديد تلقائي 60s عند طابور فارغ | server/index.js | _autoRenew() |

---

## ⚠️ تحذيرات مهمة للنموذج

1. **لا تعدّل `rooms{}` خارج `io.on('connection')`** — كان هذا خللاً قاتلاً في S11
2. **`serverNow`** يجب أن يُرسل مع كل `speakerState` لتصحيح فارق الوقت
3. **`warnTimer`** و`timer` يجب `clearTimeout` لكليهما في `_giveSpeaker` و`_nextSpeaker`
4. **`userRank`** في `speaker.js` يأتي من `core.js` — لا تُعرّفه مرتين
5. **زر المايك `#micTbBtn`** هو العنصر الوحيد للتحكم — لا تُضف أزراراً موازية

---

## 🔄 كيفية الاختبار

```bash
# على Termux:
node server/index.js

# افتح من هاتفين على نفس WiFi:
# هاتف 1: http://192.168.1.X:3000 — سجّل test_admin (rank 500)
# هاتف 2: http://192.168.1.X:3000 — سجّل test_member (rank 200)

# اختبر:
# 1. هاتف 2 يطلب السبيكر → يحصل عليه فوراً
# 2. هاتف 1 يطلب → يدخل الطابور (#1)
# 3. هاتف 2 ينهي → هاتف 1 يحصل تلقائياً
# 4. هاتف 1 (admin) يمدد/يسحب من لوحة التحكم
```
