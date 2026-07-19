# WidBid — ملخص الجلسة S10
**للاستخدام في بداية المحادثة القادمة — اقرأه كاملاً قبل أي عمل**
**التاريخ:** 2026-06-04 | **المستودع:** github.com/Tamer2beed/widbid2 (Private)

---

## 1. معلومات المشروع الأساسية

| البند | التفصيل |
|-------|---------|
| اسم المشروع | WidBid — منصة دردشة عربية |
| المستودع الجديد | `github.com/Tamer2beed/widbid2` (Private) |
| المستودع القديم | `github.com/Tamer2beed/widbid` |
| Stack | Node.js + MySQL + Socket.io + JWT |
| البيئة | Windows, VS Code, MySQL بدون كلمة مرور |
| البريد | tamerabeed@gmail.com |

---

## 2. الدستور (القواعد الذهبية — لا تُخالَف)

1. **ملف الدستور:** `Qwen_markdown` هو المرجع الأساسي — لا يُعدَّل ولا يُحذف منه إلا بإذن صريح
2. **الهرم الرسمي الثابت:**
```
Guest(100) → Member(200) → Protected Name(300) → Royal Name(400)
→ Admin(500) → Super Admin(600) → Master(700) → Super Master(800)
→ Root(900) → Super Root(1000) → Owner(1100) → Super Owner(1200)
```
3. **مبدأ التوارث:** كل رتبة = كل ما يملكه Guest + صلاحياتها الإدارية فقط
4. **ناقش قبل التعديل** — لا تعدّل أي ملف دون موافقة مسبقة
5. **أبلغ عند الحاجة لرفع GitHub**

---

## 3. ألوان الرتب الرسمية (من الدستور — ثابتة)

```
Guest(100)        #888888    Member(200)      #FFB6C1
Protected(300)    #E066FF    Royal(400)       #FFD700
Admin(500)        #4A90D9    Super Admin(600) #27AE60
Master(700)       #E74C3C    Super Master(800)#C0392B
Root(900)         #F39C12    Super Root(1000) #E67E22
Owner(1100)       #D4AF37    Super Owner(1200)#FFFFFF
```

---

## 4. هيكل المشروع الكامل (widbid2)

```
widbid2/
├── package.json              ← npm start / npm run dev / npm run setup
├── setup-db.js               ← node setup-db.js (ينشئ 18 جدول)
├── .gitignore
├── server/
│   ├── index.js              ← 914 سطر — Socket.io الكامل
│   ├── db.js                 ← MySQL connection pool
│   ├── middleware.js         ← JWT + rank verification
│   └── routes/
│       ├── auth.js           ← Register/Login/Guest/Verify
│       ├── rooms.js          ← CRUD للغرف
│       ├── roles.js          ← إدارة الرتب
│       ├── users.js          ← إدارة المستخدمين
│       ├── points.js         ← نظام النقاط والمتجر
│       └── owner.js          ← Owner + Super Owner Dashboard
└── public/
    ├── index.html            ← Login (3 تبويبات: زائر/عضو/جديد)
    ├── rooms.html            ← قائمة الغرف (4 تبويبات)
    ├── chat.html             ← الشات (231 سطر — هيكل فقط)
    ├── css/
    │   ├── base.css          ← متغيرات التصميم
    │   ├── chat.css          ← تصميم الغرفة
    │   └── admin.css         ← لوحات التحكم
    └── js/
        ├── core.js           ← Socket + رسائل
        ├── ui.js             ← قوائم + أزرار + أفاتار
        ├── sounds.js         ← 8 أصوات (Web Audio API)
        ├── camera.js         ← كاميرا + معرض + صور
        ├── emojis.js         ← 216 إيموجي + 30 اختصار كيبورد
        ├── helpers.js        ← دوال مشتركة بين الرتب
        └── ranks/
            ├── guest.js      ← 100 (القاعدة)
            ├── member.js     ← 200-400
            ├── admin.js      ← 500
            ├── super_admin.js← 600
            ├── master.js     ← 700
            ├── super_master.js← 800
            ├── root.js       ← 900
            ├── super_root.js ← 1000
            ├── owner.js      ← 1100
            └── super_owner.js← 1200
```

---

## 5. جداول قاعدة البيانات (18 جدول)

```
users                  ← المستخدمون + الرتب + النقاط
rooms                  ← الغرف + ثيم + بانر + انتهاء
messages               ← الرسائل + الصور
points_history         ← سجل النقاط
room_masters           ← ماسترز الغرف
ip_bans                ← حظر IP
device_bans            ← حظر الجهاز
user_devices           ← Dual Machine Lock
user_quotas            ← نظام الكوتة
warnings               ← التحذيرات الرسمية
reports                ← البلاغات
biometric_credentials  ← WebAuthn (البصمة)
biometric_attempts     ← محاولات البصمة
biometric_challenges   ← تحديات مؤقتة
market_packages        ← باقات السوق (9 باقات افتراضية)
market_orders          ← طلبات الشراء + AI فحص
active_subscriptions   ← الاشتراكات النشطة
admin_actions_log      ← سجل كل الإجراءات
```

---

## 6. أحداث Socket.io الكاملة (server/index.js)

### أحداث عامة (الجميع)
```
joinRoom        → يجلب rank من DB + يرسل roomInfo + messageHistory
sendMessage     → يفحص isMuted + يرسل rank مع الرسالة
leaveRoom       → يُحدّث قائمة المتواجدين
setStatus       → 7 حالات
micOn/micOff    → مؤشر الكلام
raiseHand       → طلب الكلام
reportRoom      → تبليغ
sendImage       → إرسال صورة (base64)
```

### أحداث إدارية (Admin 500+)
```
muteUser / unmuteUser    → كتم/فك كتم فرد
kickUser                 → طرد
clearChat                → مسح الشات
muteAll / unmuteAll      → كتم/فك الجميع
getAdminsList            → قائمة المشرفين (600+)
getMutedList             → قائمة المكتومين (600+)
announcement             → إعلان عام (600+)
warnUser                 → تحذير رسمي (600+)
```

### أحداث متقدمة (Master 700+)
```
assignRole               → تعيين رتبة
banIP                    → حظر IP
banDevice                → حظر جهاز (800+)
lockRoom                 → قفل الغرفة (800+)
controlAllMics           → تحكم بكل الميكات
setTheme                 → تغيير الثيم (900+)
setWelcome               → تغيير البانر (700+)
registerDevice           → تسجيل جهاز (900+)
```

### أحداث Super Root + Owner + Super Owner
```
getSuperRootRooms        → غرف السوبر روت
superRootBroadcast       → بث لكل غرف السوبر روت
transferMember           → نقل عضو بين غرف
createRoot               → إنشاء Root
getOwnerRooms            → غرف Owner
freezeRoom / unfreezeRoom→ تجميد/تفعيل غرفة
deleteRoom               → حذف غرفة
getPlatformStats         → إحصائيات المنصة (1200)
getAllOwners              → كل Owners (1200)
getPlatformTree          → شجرة الهرم (1200)
platformBroadcast        → بث للمنصة كاملة (1200)
emergencyFreeze          → تجميد طارئ (1200)
permanentBan             → حظر دائم (1200)
```

---

## 7. localStorage Keys في الواجهة

```javascript
token         // JWT أو 'guest_timestamp'
user_id       // رقم المستخدم (0 للزائر)
username      // اسم المستخدم
rank          // الرتبة (100-1200)
avatar        // الإيموجي المختار
country       // الدولة
room_id       // آخر غرفة
room_name     // اسم آخر غرفة
wid_favorites // مصفوفة JSON للغرف المفضلة
saved_email   // البريد المحفوظ (تذكرني)
pm_setting    // إعداد الرسائل الخاصة
notif_sound   // الصوت (on/off)
notif_join    // إشعار الدخول (on/off)
```

---

## 8. منطق تحميل ملفات الرتب (chat.html)

```javascript
// يُحمَّل فقط ما يحتاجه المستخدم حسب رتبته
await load('/js/emojis.js');       // الجميع
await load('/js/helpers.js');      // الجميع
await load('/js/ranks/guest.js');  // الجميع

if (rank >= 200)  await load('/js/ranks/member.js');
if (rank >= 500)  await load('/js/ranks/admin.js');
if (rank >= 600)  await load('/js/ranks/super_admin.js');
if (rank >= 700)  await load('/js/ranks/master.js');
if (rank >= 800)  await load('/js/ranks/super_master.js');
if (rank >= 900)  await load('/js/ranks/root.js');
if (rank >= 1000) await load('/js/ranks/super_root.js');
if (rank >= 1100) await load('/js/ranks/owner.js');
if (rank >= 1200) await load('/js/ranks/super_owner.js');
```

---

## 9. القرارات المعتمدة في هذه الجلسة

| القرار | التفصيل |
|--------|---------|
| معمارية الملفات | Modular — ملف منفصل لكل رتبة وكل نظام |
| نهج البناء | من الأسفل ⬆️ Guest → Super Owner |
| AI Agent | WebAuthn FIDO2 إلزامي للمشرفين (Admin+) |
| نظام الصوت | Web Audio API (بدون ملفات خارجية) |
| الكاميرا | MediaDevices API + base64 عبر Socket |
| الإيموجي | 6 تبويبات + 30 اختصار كيبورد |
| قاعدة البيانات | MySQL مع 18 جدول |
| المنافس المرجعي | WEVO (wevo.ae) |

---

## 10. ما تم في هذه الجلسة ✅

- [x] قراءة S09 + الدستور + تحليل 46 صورة من WEVO
- [x] تحليل wevo.ae كاملاً
- [x] تحديث خارطة الطريق → v6 (36 مرحلة + بيومترك)
- [x] إنشاء WidBid_Stitch_Prompts.md (16 شاشة لـ Google Stitch)
- [x] إنشاء WidBid_Constitution_v2.md (أقسام 25-33 جديدة)
- [x] بناء index.html + rooms.html + chat.html
- [x] بناء 20 ملف JS/CSS (معمارية معيارية)
- [x] بناء server/index.js الكامل (914 سطر)
- [x] إعادة كتابة كل routes (auth, rooms, roles, users, points, owner)
- [x] إنشاء setup-db.js (18 جدول)
- [x] رفع المشروع على widbid2 (34 ملف، 8532 سطر)

---

## 11. الخطوة التالية المقترحة

**market.html — صفحة المتجر + AI Agent**
- عرض الباقات
- رفع إثبات التحويل
- فحص AI للصورة (Claude Vision API أو Google Vision)
- تفعيل الغرفة تلقائياً بعد التحقق

---

## 12. تحذير أمني مهم ⚠️

**يجب تنفيذ هذا فوراً:**
- اذهب لـ github.com/settings/tokens
- اضغط على التوكن المستخدم في هذه الجلسة
- اضغط **Delete** أو **Regenerate**
- السبب: التوكن ظهر في المحادثة ويجب إبطاله

---

## 13. أوامر تشغيل المشروع

```bash
# استنساخ المشروع
git clone https://github.com/Tamer2beed/widbid2.git
cd widbid2

# تثبيت المكتبات
npm install

# إنشاء .env
cp .env.example .env  # عدّل القيم

# إنشاء جداول DB
npm run setup

# تشغيل السيرفر
npm start
# أو للتطوير:
npm run dev
```

---

*هذا الملخص يكفي لاستكمال المشروع في أي جلسة قادمة*
*ارفعه على widbid2 في مجلد: `افكار ومراحل التقدم/WidBid_S10.md`*
