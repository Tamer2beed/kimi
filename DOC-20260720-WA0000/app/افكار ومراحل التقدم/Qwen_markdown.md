# WidBid_Master_Architecture_Ultimate_vFinal
**Version:** Ultimate Final (Standalone, High-Concurrency, Advanced Security, Immunity Logic & Premium UI)  
**Status:** Reference Document — Independent Project (Unabridged, No Deletions, Fully Merged)  
**Last Updated:** 2026-06-03  

---

## 📋 فهرس المحتويات
1. رؤية المشروع
2. معمارية التطبيق وبيئة التشغيل
3. المكدس التقني المعتمد (High-Concurrency Stack)
4. منظومة الأمان متعددة الطبقات (Multi-Layered Security)
5. دورة الحياة والنسخ الاحتياطي الآمن (DevOps & Backup)
6. نظام الحضور والدمج مع الاتصالات (Telephony Integration)
7. محرك النصوص وتجربة المستخدم
8. هوية الغرف والتفاعلات البصرية
9. الإعدادات الافتراضية للغرف
10. نظام الغرف الفرعية الخاصة
11. إدارة الوسائط المتجاوبة
12. صلاحيات Master (Level 700)
13. صلاحيات Super Master (Level 800)
14. نظام حراسة الهوية وتنقية الشات
15. معمارية الإدارة عن بُعد ومحرك البحث الشامل
16. إدارة حسابات Root والأمان الصارم (Root Security Flags)
17. لوحة مراقبة الموارد والتحليل الحي
18. نظام أتمتة أوقات الذروة وعزل العمليات وسعة الغرفة (Capacity Guard)
19. مصفوفة الصلاحيات الكاملة ونظام الحصانة (Immunity Logic)
20. نظام الحظر المتقدم (Hardware Ban)
21. البنية المستقبلية للصوت والفيديو (WebRTC + SFU)
22. منظومة البث التفاعلي والإشعارات الموجهة
23. مواصفات الهوية البصرية وميزة الاسم المتوهج (Premium Glow & Virtual Lists)
24. هيكل قاعدة البيانات الكاملة (Full SQL Production Schema)
25. خارطة الطريق التطويرية

---

### 1. رؤية المشروع
WidBid هي منصة دردشة ومجتمعات عربية متكاملة تعمل **حصرياً كتطبيقات مستقلة ومخصصة (Standalone / Native)** للديسكتوب والهواتف، مبنية على معمارية شجرية هرمية متقدمة مع نظام صلاحيات ديناميكي وبنية تحتية قابلة للتوسع العالي (High-Concurrency).  
**الهدف:** منصة مجتمعية عربية تنافس Wevo وDiscord بميزات متقدمة وأعلى معايير الأمان والسيطرة المطلقة على العتاد.

### 2. معمارية التطبيق وبيئة التشغيل
- **ديسكتوب (Desktop App):** مبني بـ Electron.js، يتيح الوصول المباشر للعتاد (Hardware Access)، قراءة MAC Address الثابت بدقة 100%، وعزل كامل عن المتصفح.
- **هواتف (Mobile Apps):** مبنية بإطار عمل Flutter (Dart) لضمان أداء قريب من الـ Native على iOS وAndroid، مع صلاحيات نظام التشغيل الأصلية.
- **لوحة تحكم الإدارة (Admin Panel):** تطبيق منفصل ومعزول للمشرفين (Owner, Super Root, Root) للإدارة عن بُعد دون الحاجة للتواجد داخل الغرف.
- **بروتوكول الاتصال:** Real-time Full-Duplex عبر WebSockets (Socket.io) و RESTful APIs للعمليات غير الفورية.

### 3. المكدس التقني المعتمد (High-Concurrency Stack)
| الطبقة | التقنية | السبب التقني |
| --- | --- | --- |
| **Backend Engine** | Node.js + TypeScript + Express | أمان الأنواع (Type Safety)، تقليل الأخطاء المنطقية بنسبة 80% |
| **Real-time Engine** | Socket.io + Redis Adapter | مزامنة الجلسات، توزيع الحمل، وتحديد معدل الطلبات (Rate Limiting) |
| **Primary Database** | PostgreSQL | تفوق في التعامل مع البيانات المعقدة (JSONB, Arrays, MVCC) |
| **Messages Database** | Cassandra أو MongoDB | مصممة للكتابة السريعة (Write-heavy) لملايين رسائل الشات |
| **Cache & Pub/Sub** | Redis | إدارة الجلسات، Rate Limiting، وعدادات الوقت الفعلي |
| **Analytics & Logs** | ClickHouse | تحليلات فورية وسريعة لسجلات التدقيق ومراقبة الموارد |
| **Voice/Video** | Mediasoup (SFU) | توجيه الحزم بدون إعادة ترميز لاستهلاك منخفض للمعالج |
| **Frontend (Desktop)** | Electron.js + TypeScript | وصول كامل للعتاد، تشفير AES-256، و Obfuscation |
| **Frontend (Mobile)** | Flutter (Dart) | كود واحد لأداء ممتاز على iOS و Android |

### 4. منظومة الأمان متعددة الطبقات (Multi-Layered Security)
- **Advanced Obfuscation:** استخدام `javascript-obfuscator` لتحويل المتغيرات لرموز معقدة، تقسيم السلاسل النصية، حقن أكواد وهمية، وتفعيل الدفاع الذاتي (Self-Defending).
- **ASAR Encryption:** تشفير ملف `app.asar` بمفتاح AES-256، وفك التشفير جزئياً داخل الذاكرة العشوائية (RAM Only) أثناء التشغيل.
- **Network Security:** تشفير WebSocket عبر WSS، وتفعيل **SSL Pinning** داخل Electron والهواتف لرفض أي اتصال لا تتطابق شهادته مع شهادة السيرفر.
- **Backend-Centric Enforcement:** التحقق الفعلي من الصلاحيات يتم بالكامل داخل Node.js المحمي عبر JWT Tokens.
- **Database Encryption:** تشفير كلمات المرور بـ **Argon2id**، وتشفير بصمات الأجهزة و MAC Address بـ **AES-256-GCM**.
- **Super Secret Code:** لا يكفي اسم المستخدم وكلمة المرور لدخول حسابات الإدارة العليا، بل يتطلب إدخال "كود سري" ديناميكي يتم التحقق منه عبر One-way hashing.
- **Executive E2EE Protocol:** استخدام خوارزمية Diffie-Hellman لتوليد مفاتيح تشفير مؤقتة للمحادثات الخاصة بين الرتب العليا (Super Owner, Owner, Super Root)، بحيث لا يستطيع حتى مدير السيرفر قراءة محتوى هذه المحادثات الإدارية الحساسة.
- **Socket.io Rate Limiting:** استخدام خوارزمية Token Bucket عبر Redis. إذا تجاوز المستخدم 5 طلبات في الثانية، يتم كتمه تلقائياً لمدة دقيقة، وإذا كرر الأمر يتم حظره وإرسال تنبيه لنظام الأتمتة (n8n) كـ DDoS Attempt.
- **Connection State Recovery:** تفعيل ميزة `connectionStateRecovery` في Socket.io. يحتفظ السيرفر بحالة الـ Socket لمدة دقيقتين عند انقطاع الشبكة المفاجئ، مما يسمح بإعادة ربط المستخدم بنفس الجلسة دون فقدان الصلاحيات أو ظهوره كـ "خارج" في القائمة.

### 5. دورة الحياة والنسخ الاحتياطي الآمن (DevOps & Backup)
- **Auto-Updater:** تحديث تلقائي في الخلفية عبر `electron-updater`.
- **Hierarchical Backup Policy:**
  - **Super Master:** تصدير يدوي مشفر لجهازه المحلي فقط.
  - **Root / Super Root:** استعادة يدوية معزولة لنطاق غرفهم فقط.
  - **Owner / Super Owner:** أتمتة كاملة عبر `node-cron` و `mysqldump-node` كل 24 ساعة.
- **Data Isolation Policy (Hot-Restore):** يُمنع برمجياً استخدام `DROP` أو `TRUNCATE`. يعتمد النظام على `INSERT ... ON DUPLICATE KEY UPDATE` مقترناً بـ `Room ID` أو `Manager ID`.
- **DB Partitioning & Log Rotation:** تطبيق تقنية Partitioning في قاعدة البيانات لجدول `system_logs` شهرياً. الاستعلامات تبحث فقط في الشهر الحالي، والأشهر القديمة تُنقل تلقائياً إلى تخزين بارد (Cold Storage) مضغوط لمنع تضخم الجدول وإبطاء السيرفر.
- **JWT Refresh Token Rotation:** نظام مزدوج: `Access Token` (15 دقيقة) + `Refresh Token` (7 أيام). عند استخدام الـ Refresh Token، يتم إتلاف القديم فوراً. أي محاولة لاستخدام التوكن القديم تؤدي لتجميد الحساب فوراً.
- **Termux/Local Parity:** وجود ملف `env.development` يسمح للمطور بتشغيل النظام محلياً (حتى على هاتف عبر Termux) عن طريق استبدال Redis بـ In-memory Cache مؤقت، وتقليل تكرارات تشفير Argon2id لتسريع الاختبار دون استهلاك موارد الجهاز.

### 6. نظام الحضور والدمج مع الاتصالات
- **الحالات:** متاح، بالخارج، مشغول، مكالمة هاتفية، طعام، صلاة، نائم، سيارة.
- **Call State Listener:** يتكامل مع مكتبات الهاتف الأصلية لتحويل الحالة تلقائياً عند بدء مكالمة.
- **Audio Focus Eviction:** إذا كان المستخدم يذيع بالمايك ودخل مكالمة هاتفية، يقوم السيرفر بسحب المايك تلقائياً وتمريره للتالي لحماية الخصوصية.

### 7. محرك النصوص وتجربة المستخدم
- **Dynamic Font Scaling:** شريط منزلق لتغيير حجم الخط.
- **Font Weight Toggle:** مفتاح تبديل للخط العريض.
- **Legacy Mode:** تبديل آلية رندر الشات للأسلوب الكلاسيكي النصي.
- **Clear Cache:** "مسح النص لدي فقط" (للجميع)، "مسح النص للجميع" (Super Admin فما فوق).

### 8. هوية الغرف والتفاعلات البصرية
- **Visual Badges:** تاج ذهبي للرتب الإدارية، وعلامة زرقاء للحسابات الموثقة.
- **Raise Hand:** أيقونة "يد مرفوعة" بجانب الاسم عند طلب الكلام.
- **Active Speaker Identifier:** مؤشر "كلام ذهبي متذبذب" مع عداد زمني تصاعدي لحساب زمن استهلاك المايك بدقة.
- **Private Message Policies:** 
  1. `PRV_ALLOW_ALL`: قبول من الجميع.
  2. `PRV_ALLOW_REGISTERED`: قبول من المسجلين فقط.
  3. `PRV_DENY_ALL`: رفض الخاص تماماً مع ميزة **الحظر الارتدادي (Bounce Ban)**، حيث يمنع السيرفر ترحيل الحزمة ويطلق تنبيهاً فورياً للمرسل.

### 9. الإعدادات الافتراضية للغرف
- **Deep Linking:** روابط عميقة تفتح التطبيق مباشرة (`Widbid://room/123`).
- **Auto Super Master:** يُنشأ تلقائياً مع كل غرفة جديدة (واحد فقط)، بكلمة سر عشوائية مرتبطة بـ MAC Address.
- **Room Secret Code:** كود سري فريد لتغيير كلمة مرور Super Master، متاح فقط لـ Owner, Super Root, Super Owner.
- **Default Capacity:** الحد الافتراضي: 50 في الغرفة الرئيسية (قابل للتعديل من Owner).
- **Owner-Controlled Quota:** يحدد الـ Owner حصص الرتب حصرياً بناءً على باقة الاشتراك.

### 10. نظام الغرف الفرعية الخاصة
- ترتبط تلقائياً بنفس حساب وأمان الغرفة الرئيسية.
- الحد الأقصى الافتراضي: **5 أعضاء** فقط.
- **Default Guest Block:** حظر Guest افتراضياً من الدخول للغرف الفرعية.

### 11. إدارة الوسائط المتجاوبة
- **Desktop Banner:** `1920 x 350`.
- **Mobile Banner:** `800 x 400`.
- **Room Thumbnail:** صورة مصغرة تظهر في قوائم الغرف والبحث.
- يمكن لـ Masters و Super Masters رفع وتعديل غلاف الغرفة وصورتها المصغرة في أي وقت.

### 12. صلاحيات Master (Level 700)
- تفعيل/إلغاء السماح لجميع الميكات/الكاميرات.
- تعديل رسالة الترحيب والبانر المزدوج.
- حظر على مستوى الغرفة أو IPs لفترات محددة.
- تفويض إنشاء مشرفين محددين ضمن حصة يحددها Super Master.
- **قيود:** لا يملك Global Ban، ولا يملك صلاحية النسخ الاحتياطي الشامل.

### 13. صلاحيات Super Master (Level 800)
- **Room Control Panel:** لوحة تحكم شاملة داخل الغرفة.
- **Backup:** تصدير إعدادات الغرفة يدوياً (ملف مشفر لذاكرة الجهاز).
- **Quota System:** توزيع الحصص على المشرفين ضمن الحدود المقررة من الـ Owner.
- **ميزات حصرية:** رفع البروفايل مجاناً، 5 ألبومات، قفل خادم الغرفة بالـ MAC/Device Fingerprint.
- **قيود:** لا يملك Global Ban، ولا يعدل حصص الرتب العليا.

### 14. نظام حراسة الهوية وتنقية الشات
- **منع تكرار الهوية:** منع دخول جهازين يحملان نفس البصمة الرقمية في نفس الغرفة.
- **Name Alteration Lock:** بمجرد ترقية العضو لرتبة إدارية (من Admin فما فوق)، يُقفل اسمه ولا يمكن تغييره إلا من لوحة التحكم المركزية.
- **Auto-Purge System:** الحد الأقصى لرسائل الشات في الواجهة هو **100 رسالة**. عند الوصول للرسالة 101، يتم حذف الرسالة الأقدم فوراً من واجهة جميع المتصلين.

### 15. معمارية الإدارة عن بُعد ومحرك البحث الشامل
- **Drill-Down UI:** نظام شجري متتابع يسمح بالتحكم الكامل في الغرفة عن بُعد.
- **Omni-Search Engine:** مربع بحث مركزي يستدعي إجراءات فورية (تغيير الكود، إخلاء المتواجدين، تجميد الحساب، طرد الجلسة، حظر العتاد).
- **Audit Trail Engine:** توثيق العمليات الحرجة بالثانية. يتم جلب السجلات عبر نظام استعلامات مجزأ (`LIMIT 50 OFFSET 0`).
- **Media Muting Protocol:** أوامر فورية: `Mute Private`، `Mute CAM`، `Mute Private + CAM`.

### 16. إدارة حسابات Root والأمان الصارم (Root Security Flags)
- **Automated Root Provisioning:** عند إنشاء حساب Root، يولد الـ Backend كلمة سر عشوائية معقدة و"كود سري" مشفر بـ Argon2id.
- **Dual Machine Lock:** يتم قفل حساب الـ Root برمجياً على **جهازين فقط لا ثالث لهما**: جهاز ديسكتوب واحد وجهاز هاتف واحد. أي محاولة فتح من جهاز آخر تتطلب "فك الحظر" من رتبة أعلى.
- **Strict Isolation & Audit Blindness:** 
  - حظر كامل لإنشاء غرف جديدة (يقتصر على إدارة الغرف المسندة من Owner).
  - لا يمكن للـ Root الاطلاع على سجلات العمليات التي يقوم بها الـ Roots الآخرون.
  - تفعيل إجباري لخيار `Join only specified rooms`. أي محاولة دخول لغرفة خارج النطاق تطلق استثناء أمني (`Access Denied`).

### 17. لوحة مراقبة الموارد والتحليل الحي
- **Global Hardware Monitor:** تحديث كل 3 ثوانٍ لـ: CPU%، RAM، Network Throughput، وعدد العمليات الفرعية النشطة.
- **Top Resource-Consuming Rooms Engine:** جدول تفاعلي مرتب تنازلياً يعرض استهلاك كل غرفة.
- **أزرار السيطرة:** "ترس التحكم"، "إخلاء/طرد"، "التجاوز الفوري".

### 18. نظام أتمتة أوقات الذروة وعزل العمليات وسعة الغرفة
- **Smart Auto-Scaler Listener:** مراقبة حية لمعدل اتصال Socket وحجم تدفق البيانات.
- **Automated Hot-Swapping:** عند تجاوز 500 مستخدم أو 70% استهلاك للمعالج، ينشئ الخادم تلقائياً `Dedicated Worker Thread` وينقل الغرفة برمجياً دون انقطاع.
- **Redis Socket Adapter:** يضمن تزامن الجلسات وتوزيع الحمل أفقياً.
- **Cool-Down Protocol:** عند انخفاض المتواجدين تحت العتبة لمدة 15 دقيقة متواصلة، تعاد الغرفة للوضع الاشتراكي.
- **Capacity Guard (Pre-join Validation):** قبل إتمام عملية ربط الـ Socket، يتحقق الـ Middleware من عدد الاتصالات النشطة (`active_connections`) ويقارنها بـ `max_capacity` في قاعدة البيانات. إذا امتلأت الغرفة، يرفض النظام الاتصال ويرسل إشعاراً فورياً للأونر.

### 19. مصفوفة الصلاحيات الكاملة ونظام الحصانة (Immunity Logic)
#### 19.1 هرم الصلاحيات
Super Owner (1200) → Owner (1100) → Super Root (1000) → Root (900) → Super Master (800) → Master (700) → Super Admin (600) → Admin (500) → Royal Name (400) → Protected Name (300) → Member (200) → Guest (100).

#### 19.2 جدول الصلاحيات العامة
| الصلاحية | SO | Owner | SR | Root | SM | Master | SA | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| إنشاء Owner | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إنشاء Super Root | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| إنشاء Root | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **إنشاء غرف جديدة** | ✅ | ✅ | **❌** | **❌** | ❌ | ❌ | ❌ | ❌ |
| إدارة Super Master | ✅ | ✅ | ✅ | ❌ | — | — | — | — |
| Global Ban (كامل) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| حظر الغرفة | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 19.3 جدول الطرد والتعامل مع الرتب
| المنفِّذ | Guest | Member | Protected | Royal | Admin | SA | Master | SM | Root | SR | Owner | SO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin (500) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Super Admin (600) | ✅ | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Master (700) | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Super Master (800) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Root (900) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Super Root (1000) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Owner (1100) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Super Owner (1200) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
*(✅* Super Admin يستطيع طرد Royal Name لكن ليس حظره)*

#### 19.4 نظام الحصانة المتقدم (Advanced Immunity Logic)
1. **مصفوفة الأوزان الرقمية (Role Weight Matrix):** 
   - Super_Owner=100, Owner=80, Super_Root=70, Root=60, Super_Master=50, Master=40, Admin=30, User=10.
   - يمنع الـ Middleware تنفيذ أي إجراء إذا كان وزن المنفِّذ أقل من أو يساوي وزن الهدف.
2. **حصانة خط النسب (Lineage Immunity):** قاعدة برمجية تمنع "الابن" من معاقبة "الأب" الذي أنشأه (`if (adminUser.parent_id === targetUser.id) return false;`).
3. **الحصانة الملكية (Royal Immunity):** إذا كان الحساب المستهدف يحمل صفة `is_royal = true`، يتم رفض أي محاولة طرد أو كتم فوراً، ويتم إرسال تنبيه فوري عبر n8n.

### 20. نظام الحظر المتقدم (Hardware Ban)
- يجمع بين `mac_address`، `device_fingerprint`، و `ip_address`.
- يستحيل تجاوزه بتغيير IP أو VPN.
- يتم تشفير سجلات الحظر بـ **AES-256-GCM** في قاعدة البيانات.
- خيارات المدة: ساعة، 24 ساعة، أسبوع، شهر، دائم، أو مدة مخصصة.

### 21. البنية المستقبلية للصوت والفيديو (WebRTC + SFU Architecture)
- **المعمارية:** Mediasoup (Node.js) أو Janus WebRTC Gateway.
- **السبب:** SFU يوجه الحزم بدون إعادة ترميز (استهلاك منخفض للمعالج)، مما يسمح بمعالجة مئات الاتصالات الصوتية/المرئية في الغرفة الواحدة دون انهيار خادم Node.js الرئيسي.
- **نظام طلب البث:** `requestStream` → `approveStream` / `rejectStream` → `startStream` → `endStream`.
- **التوسع الأفقي:** MVP (سيرفر SFU واحد) → Scale (فصل سيرفرات الأعمال عن الميديا) → Enterprise (Kubernetes Auto-scaling عند 75% bandwidth).

### 22. منظومة البث التفاعلي والإشعارات الموجهة
منظومة مكملة للصوت/الفيديو تتيح إرسال رسائل بناءً على الرتب:
- **Super Owner / Owner:** بث شامل أو موجه لرتبة معينة، مع حفظ نسخة في قاعدة البيانات كإشعار.
- **Super Root / Root:** بث للمستخدمين داخل الغرف التي يشرفون عليها فقط.
- **Super Master:** بث لكافة المستخدمين داخل غرفته، أو لطاقم المشرفين فقط.
- **الأنماط:** نافذة منبثقة فورية، تصويت متعدد الخيارات، اختبار سرعة البديهة مع توثيق الفائز بأجزاء من الثانية.

### 23. مواصفات الهوية البصرية وميزة الاسم المتوهج (Premium Glow & Virtual Lists)
تم تصميم هذه الميزة لتكون حصرية لباقة VIP، وتُفعل يدوياً فقط بواسطة Super Owner أو Owner. لضمان عدم التأثير على أداء التطبيق، **تطبق هذه التأثيرات حصرياً على الأسماء في "قائمة الحضور" (Member List)**، وليس في نصوص الشات المتداولة بسرعة.

#### 23.1 آلية الأداء والحماية (Virtual Lists & Adaptive Rendering)
- **Virtual Lists / Lazy Loading:** يتم استخدام تقنية القوائم الافتراضية في واجهة المستخدم. حتى لو كانت الغرفة تحتوي على 500 عضو، يقوم التطبيق برسم (Render) أسماء الـ 15-20 عضواً الظاهرين على الشاشة فقط في أي لحظة. هذا يلغي مشكلة الـ Repaints/Reflows المتكررة ويحافظ على معدل إطارات (FPS) عالٍ.
- **Adaptive Rendering (التكيف الذكي):** عند فتح التطبيق، يفحص الكود إمكانيات الجهاز. إذا كان الجهاز متوسطاً أو ضعيفاً، يقوم النظام **تلقائياً** بإيقاف تأثير "التوهج" (Glow/Shadow)، لكنه **يحتفظ بلون الرتبة** الأساسي. هذا يضمن تجربة مستخدم سلسة للجميع دون شعور المستخدم الضعيف بأنه "مستبعد".

#### 23.2 المواصفات البصرية التفصيلية (Dark Mode vs White Mode)
- **Super Owner (1200):** Dark: `color: #FFFFFF`, `text-shadow: 0 0 10px rgba(255, 255, 255, 0.8)` | White: `color: #000000`, `text-shadow: 0 0 8px rgba(0, 0, 0, 0.3)`
- **Owner (1100):** Dark: `color: #D4AF37`, `text-shadow: 0 0 10px rgba(212, 175, 55, 0.6)` | White: `color: #D4AF37`, `text-shadow: 0 0 8px rgba(92, 73, 14, 0.4)`
- **Super Root (1000):** Dark: `color: #FF4500`, `text-shadow: 0 0 12px #FF4500` | White: `color: #D32F2F`, `text-shadow: 0 0 8px rgba(211, 47, 47, 0.4)`
- **Root (900):** Dark: `color: #FF8C00`, `text-shadow: 0 0 10px #FF8C00` | White: `color: #E65100`, `text-shadow: 0 0 8px rgba(230, 81, 0, 0.35)`
- **Super Master (800):** Dark: `font-weight: bold`, `color: #E74C3C`, `text-shadow: 0 0 10px #E74C3C` | White: `font-weight: bold`, `color: #C62828`, `text-shadow: 0 0 8px rgba(198, 40, 40, 0.4)`
- **Master (700 - أحمر):** Dark: `color: #FF0000`, `text-shadow: 0 0 8px #FF0000` | White: `color: #B71C1C`, `text-shadow: 0 0 6px rgba(0, 0, 0, 0.25)`
- **Master (700 - وردي):** Dark: `color: #FFB6C1`, `text-shadow: 0 0 8px #FFB6C1` | White: `color: #C2185B`, `text-shadow: 0 0 6px rgba(194, 24, 91, 0.3)`
- **Super Admin (600):** Dark: `color: #00FF00`, `text-shadow: 0 0 10px #00FF00` | White: `color: #2E7D32`, `text-shadow: 0 0 6px rgba(46, 125, 50, 0.35)`
- **Admin (500):** Dark: `color: #0000FF`, `text-shadow: 0 0 8px #0000FF` | White: `color: #1A237E`, `text-shadow: 0 0 6px rgba(26, 35, 126, 0.3)`
- **Royal Name (400):** Dark: `color: #FFD700`, `text-shadow: 0 0 8px #FFD700` | White: `color: #AA7C11`, `text-shadow: 0 0 6px rgba(0, 0, 0, 0.2)`
- **Protected Name (300):** Dark: `color: #E066FF`, `text-shadow: 0 0 8px #E066FF` | White: `color: #6A1B9A`, `text-shadow: 0 0 6px rgba(106, 27, 154, 0.3)`
- **Member (200) & Guest (100):** (في حال تفعيل الميزة لهما)
  - Member Dark: `color: #FFB6C1`, `text-shadow: 0 0 8px #FFB6C1` | White: `color: #D81B60`, `text-shadow: 0 0 6px rgba(216, 27, 96, 0.25)`
  - Guest Dark: `color: #888888`, `text-shadow: 0 0 8px rgba(255, 255, 255, 0.4)` | White: `color: #4A4A4A`, `text-shadow: 0 0 6px rgba(0, 0, 0, 0.3)`

### 24. هيكل قاعدة البيانات الكاملة (Full SQL Production Schema)
*ملاحظة: تم الاحتفاظ بجميع الجداول الأصلية، وإضافة الجداول الجديدة لتحسين الأداء والأمان، مع دمج الحقول المتقدمة.*

```sql
-- ==========================================
-- 1. الجداول الأساسية والحسابات (PostgreSQL)
-- ==========================================
CREATE TABLE users (
  id UUID PRIMARY KEY, 
  username VARCHAR(50) UNIQUE, 
  email VARCHAR(100) UNIQUE, 
  password_hash VARCHAR(255), 
  avatar VARCHAR(255), 
  status VARCHAR(20) DEFAULT 'Available', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE global_system_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  username VARCHAR(50) UNIQUE NOT NULL, 
  email VARCHAR(100) UNIQUE, 
  password_hash VARCHAR(255) NOT NULL, 
  secret_code VARCHAR(255) NOT NULL, 
  role ENUM('Super_Owner', 'Owner', 'Super_Root', 'Root', 'Super_Master', 'Master', 'Admin', 'User') NOT NULL DEFAULT 'User', 
  parent_id INT NULL, 
  is_frozen BOOLEAN DEFAULT FALSE, 
  is_royal BOOLEAN DEFAULT FALSE, 
  allowed_owners_quota INT DEFAULT 0, 
  allowed_rooms_quota INT DEFAULT 0, 
  last_login_mac VARCHAR(255) NULL, 
  last_login_ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(parent_id) REFERENCES global_system_accounts(id) ON DELETE RESTRICT
);

-- ==========================================
-- 2. نظام حماية الأسماء والهوية
-- ==========================================
CREATE TABLE protected_identities_mask (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  reserved_name VARCHAR(50) UNIQUE NOT NULL, 
  owner_account_id INT NOT NULL, 
  FOREIGN KEY(owner_account_id) REFERENCES global_system_accounts(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. نظام الغرف اللامركزي والإداري
-- ==========================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY, 
  name VARCHAR(100), 
  type VARCHAR(20), 
  owner_id UUID REFERENCES users(id), 
  owner_id_global UUID,
  room_token VARCHAR(100) UNIQUE, 
  room_number VARCHAR(50) UNIQUE, 
  room_secret_code VARCHAR(100),
  max_members INT DEFAULT 50, 
  max_supermaster INT, max_master INT, max_superadmin INT, max_admin INT, max_member INT,
  master_username VARCHAR(50), master_password VARCHAR(255), master_must_change_password BOOLEAN, frozen BOOLEAN,
  settings JSONB, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE production_rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY, 
  room_name VARCHAR(100) NOT NULL, 
  creator_root_id INT NOT NULL, 
  super_master_id INT NOT NULL, 
  room_master_id INT NULL, 
  max_capacity INT DEFAULT 200, 
  room_password VARCHAR(100) NULL, 
  is_isolated BOOLEAN DEFAULT FALSE, 
  cpu_usage_weight DECIMAL(5,2) DEFAULT 0.00, 
  expires_at DATETIME NOT NULL, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  FOREIGN KEY(creator_root_id) REFERENCES global_system_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY(super_master_id) REFERENCES global_system_accounts(id),
  FOREIGN KEY(room_master_id) REFERENCES global_system_accounts(id) ON DELETE SET NULL
);

CREATE TABLE room_members (
  id UUID PRIMARY KEY, 
  room_id UUID REFERENCES rooms(id), 
  user_id UUID REFERENCES users(id), 
  role INT, 
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- ==========================================
-- 4. نظام الرتب والصلاحيات
-- ==========================================
CREATE TABLE global_roles (
  id INT PRIMARY KEY, 
  name VARCHAR(50), 
  level INT, 
  name_color VARCHAR(20), 
  badge_color VARCHAR(20), 
  permissions JSONB, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_global_roles (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id), 
  role_id INT REFERENCES global_roles(id), 
  assigned_by UUID REFERENCES users(id), 
  expires_at TIMESTAMP, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE global_custom_roles (
  id UUID PRIMARY KEY, 
  created_by UUID REFERENCES users(id), 
  role_name VARCHAR(50), 
  priority INT, 
  name_color VARCHAR(20), 
  badge_color VARCHAR(20), 
  permissions JSONB, 
  scope_type VARCHAR(20), 
  expires_at TIMESTAMP, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. نظام الأونر والمجموعات
-- ==========================================
CREATE TABLE owners (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id) UNIQUE, 
  max_rooms INT, 
  rooms_count INT DEFAULT 0, 
  owner_token VARCHAR(100) UNIQUE, 
  created_by UUID, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_groups (
  id UUID PRIMARY KEY, 
  name VARCHAR(100), 
  owner_id UUID REFERENCES owners(id), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_group_members (
  id UUID PRIMARY KEY, 
  group_id UUID REFERENCES room_groups(id), 
  room_id UUID REFERENCES rooms(id)
);

CREATE TABLE room_group_superroots (
  id UUID PRIMARY KEY, 
  group_id UUID REFERENCES room_groups(id), 
  user_id UUID REFERENCES users(id)
);

-- ==========================================
-- 6. نظام الحظر المتقدم (Hardware Ban)
-- ==========================================
CREATE TABLE bans (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id), 
  mac_address VARCHAR(255), 
  device_fingerprint VARCHAR(255), 
  ip_address VARCHAR(45),
  ban_type VARCHAR(20), 
  ban_scope VARCHAR(20), 
  room_ids INTEGER[], 
  group_id UUID,
  reason TEXT, 
  expires_at TIMESTAMP, 
  created_by UUID REFERENCES users(id), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. نظام النقاط والمتجر
-- ==========================================
CREATE TABLE user_points (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id) UNIQUE, 
  points INT DEFAULT 0, 
  total_earned INT DEFAULT 0, 
  daily_earned INT DEFAULT 0, 
  last_reset TIMESTAMP
);

CREATE TABLE points_history (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id), 
  amount INT, 
  reason VARCHAR(100), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store_items (
  id UUID PRIMARY KEY, 
  name VARCHAR(100), 
  description TEXT, 
  type VARCHAR(50), 
  value INT, 
  price INT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_purchases (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id), 
  item_id UUID REFERENCES store_items(id), 
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. نظام الحضور والحالات
-- ==========================================
CREATE TABLE user_status (
  id UUID PRIMARY KEY, 
  user_id UUID REFERENCES users(id) UNIQUE, 
  status VARCHAR(20), 
  custom_emoji VARCHAR(10), 
  private_messages VARCHAR(20) DEFAULT 'ALLOW_ALL', 
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. نظام الغرف الفرعية والألعاب
-- ==========================================
CREATE TABLE sub_rooms (
  id UUID PRIMARY KEY, 
  parent_room_id UUID REFERENCES rooms(id), 
  name VARCHAR(100), 
  max_members INT DEFAULT 5, 
  created_by UUID REFERENCES users(id), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE games (
  id UUID PRIMARY KEY, 
  name VARCHAR(100), 
  type VARCHAR(50), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY, 
  game_id UUID REFERENCES games(id), 
  room_id UUID REFERENCES rooms(id), 
  players JSONB, 
  status VARCHAR(20), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_scores (
  id UUID PRIMARY KEY, 
  session_id UUID REFERENCES game_sessions(id), 
  user_id UUID REFERENCES users(id), 
  score INT, 
  xp INT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. نظام البث والتفاعل
-- ==========================================
CREATE TABLE stream_requests (
  id UUID PRIMARY KEY, 
  room_id UUID REFERENCES rooms(id), 
  user_id UUID REFERENCES users(id), 
  type VARCHAR(20), 
  status VARCHAR(20), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE active_streams (
  id UUID PRIMARY KEY, 
  room_id UUID REFERENCES rooms(id), 
  user_id UUID REFERENCES users(id), 
  type VARCHAR(20), 
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interactive_broadcasts (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id),
  target_scope VARCHAR(50), 
  broadcast_type VARCHAR(50), 
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 11. نظام السجلات والتدقيق
-- ==========================================
CREATE TABLE system_logs (
  id UUID PRIMARY KEY, 
  admin_id UUID REFERENCES users(id), 
  action_type VARCHAR(100), 
  target_id UUID, 
  details JSONB, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_actions_log (
  action_id INT AUTO_INCREMENT PRIMARY KEY, 
  room_id INT NOT NULL, 
  admin_id INT NOT NULL, 
  target_id INT NOT NULL, 
  action_type ENUM('Kick','Mute','Ban','NameChange') NOT NULL, 
  is_blocked_by_immunity BOOLEAN DEFAULT FALSE, 
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 12. تفويض الحصص للمشرفين
-- ==========================================
CREATE TABLE master_quotas (
  id UUID PRIMARY KEY, 
  room_id UUID REFERENCES rooms(id), 
  master_user_id UUID REFERENCES users(id), 
  max_super_admin INT DEFAULT 0, 
  max_admin INT DEFAULT 0, 
  max_member INT DEFAULT 0,
  current_super_admin INT DEFAULT 0, 
  current_admin INT DEFAULT 0, 
  current_member INT DEFAULT 0,
  assigned_by UUID REFERENCES users(id), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, master_user_id)
);

-- ==========================================
-- 13. فهارس الأداء الحرجة (Composite Indexes Strategy)
-- ==========================================
CREATE INDEX idx_user_role_parent ON global_system_accounts(id, role, parent_id);
CREATE INDEX idx_protected_names ON protected_identities_mask(reserved_name, owner_account_id);
CREATE INDEX idx_room_capacity ON production_rooms(room_id, max_capacity);
---

### 25. خارطة الطريق التطويرية (Development Roadmap)

> **ملاحظة:** هذا القسم كان مذكوراً في الفهرس ولم يُكتب — يُضاف الآن بالكامل.

#### 25.1 المراحل المكتملة (Phases 1–14)
| المرحلة | الهدف | الحالة |
|---------|-------|--------|
| 1–9 | النظام الأساسي (Auth, Rooms, Chat, Socket.io, JWT) | ✅ مكتمل |
| 10 | نظام الرتب العالمي 12 مستوى (100→1200) | ✅ مكتمل |
| 11 | نظام النقاط والمتجر | ✅ مكتمل |
| 12 | الألعاب — Tic Tac Toe | ⚠️ جزئي (bug مزامنة) |
| 13 | لوحة Super Owner — الهيكل الأساسي | ✅ مكتمل |
| 14 | لوحة Owner — الهيكل الأساسي | ⚠️ شبه مكتمل |

#### 25.2 خارطة الطريق القادمة
| المرحلة | الهدف | الأسبوع |
|---------|-------|---------|
| **أ — لوحات التحكم (Guest→Super Owner)** | | |
| 15أ | إعادة بناء chat.html — تجربة Guest الكاملة | أسبوع 1 |
| 15ب | تجربة Member→Royal Name في الشات | أسبوع 1 |
| 16 | لوحة Admin / Super Admin | أسبوع 2 |
| 17 | لوحة Master / Super Master | أسبوع 2 |
| 18 | لوحة Root / Super Root | أسبوع 3 |
| 19 | لوحة Owner + بطاقات الغرف | أسبوع 3 |
| 20 | لوحة Super Owner + شجرة SuperRoot→Root→Rooms | أسبوع 4 |
| **ب — AI Agent الذكي** | | |
| 21 | AI Agent — فحص إثبات التحويل | أسبوع 5 |
| 22 | AI Agent — إنشاء الغرفة تلقائياً بعد التحقق | أسبوع 5 |
| 23 | AI Agent — ضبط الصلاحيات حسب الباقة | أسبوع 6 |
| 24 | WidBid Market — صفحة المتجر والباقات | أسبوع 6 |
| **ج — الميزات الجوهرية** | | |
| 25 | نظام الحصانة + Hardware Ban | أسبوع 7 |
| 26 | الألوان + الرتب في الشات (Glow للأسماء) | أسبوع 7 |
| 27 | حالات المستخدم الموسّعة + Call Listener | أسبوع 8 |
| 28 | إصلاح bug الألعاب + توسعة | أسبوع 8 |
| **د — الميديا والبث** | | |
| 29 | الصوت والفيديو — WebRTC + Mediasoup SFU | أسبوع 9–10 |
| 30 | البث التفاعلي + إشعارات موجّهة | أسبوع 11 |
| 31 | مراقبة الموارد الحية + Worker Thread تلقائي | أسبوع 11 |
| **هـ — ترقية البنية (مرحلة ب)** | | |
| 32 | هجرة DB → PostgreSQL + Redis + Cassandra | أسبوع 13–14 |
| 33 | أمان متقدم — E2EE + JWT Rotation + Rate Limit | أسبوع 15 |
| 34 | تطبيق Electron ديسكتوب | أسبوع 16–18 |
| 35 | تطبيقات Flutter — iOS + Android | أسبوع 19–22 |

---

## ═══════════════════════════════════════════════════
## الملحق التصميمي — UI/UX Design Specification
## ═══════════════════════════════════════════════════
> **أُضيف في:** 2026-06-04 | **المصدر:** تحليل WEVO + 46 لقطة شاشة + wevo.ae
> **القاعدة:** لا يُعدَّل ولا يُحذف من أي قسم سابق — هذا ملحق إضافي فقط.

---

### 26. مبدأ التوارث الهرمي (Inheritance Principle)

> **القاعدة الذهبية:** كل رتبة تملك كل ما يملكه Guest + صلاحياتها الإدارية الخاصة بها فقط.
> بدون Guest لا يوجد تفاعل — Guest هو القاعدة الجوهرية للمنصة.

```
Super Owner (1200)
    └── كل ما يملكه Owner + صلاحيات المنصة الكاملة
Owner (1100)
    └── كل ما يملكه Super Root + إدارة جميع Owners
Super Root (1000)
    └── كل ما يملكه Root + إدارة متعددة الغرف
Root (900)
    └── كل ما يملكه Super Master + Dual Lock + تغيير الثيم
Super Master (800)
    └── كل ما يملكه Master + Hardware Ban + Backup
Master (700)
    └── كل ما يملكه Super Admin + تعيين Admins + IP Ban
Super Admin (600)
    └── كل ما يملكه Admin + كتم/طرد Admin + تحذير رسمي
Admin (500)
    └── كل ما يملكه Royal + كتم/طرد Guest+Member + مسح الشات
Royal Name (400)
    └── كل ما يملكه Protected + لون ذهبي + تمييز في القائمة
Protected Name (300)
    └── كل ما يملكه Member + badge حماية + لون بنفسجي
Member (200)
    └── كل ما يملكه Guest + اسم محفوظ + تحكم كامل بالخاص
Guest (100) ← القاعدة — كل الميزات تُبنى فوقه
```

---

### 27. صلاحيات كل رتبة بالتفصيل (Per-Role Capabilities)

#### Guest (100) — القاعدة الكاملة
- ✅ قراءة الرسائل وإرسالها (إذا لم يُكتم)
- ✅ رؤية قائمة الحضور بألوان رتبهم
- ✅ رؤية حالات الأعضاء (متاح، مشغول، نائم...)
- ✅ إرسال إيموجي وتعبيرات سريعة
- ✅ طلب الكلام (Raise Hand 🖐️)
- ✅ تغيير حالته الشخصية (7 حالات)
- ✅ ضبط إعداداته (خط، إشعارات، لغة)
- ✅ إرسال رسالة خاصة (حسب إعدادات المستلم)
- ❌ أي إجراء إداري على أي أحد

#### Member (200) — Guest +
- ✅ اسم مسجل محفوظ لا يأخذه أحد
- ✅ حفظ بيانات الدخول تلقائياً
- ✅ تحكم كامل بإعدادات الرسائل الخاصة (3 خيارات)

#### Protected Name (300) — Member +
- ✅ اسمه محمي بـ badge لا يظهر لأحد آخر
- ✅ لون بنفسجي `#E066FF` في قائمة الحضور والشات

#### Royal Name (400) — Protected +
- ✅ لون ذهبي `#FFD700` مميز
- ✅ ظهور مميز في أعلى قائمة الأعضاء (فوق Protected)

#### Admin (500) — Royal +
- ✅ كتم مايك Guest و Member
- ✅ طرد Guest و Member من الغرفة
- ✅ مسح الشات العام ("مسح النص للجميع")
- ❌ لا يؤثر على من هو بنفس رتبته أو أعلى

#### Super Admin (600) — Admin +
- ✅ كتم وطرد Admin
- ✅ طرد Royal Name (بدون حظر)
- ✅ إصدار تحذير رسمي مسجّل

#### Master (700) — Super Admin +
- ✅ تعيين Admin و Super Admin وإزالتهم
- ✅ حظر IP مؤقت (24 ساعة)
- ✅ رؤية إحصائيات الغرفة
- ✅ تفعيل/إلغاء جميع الميكات/الكاميرات
- ✅ تعديل رسالة الترحيب والبانر

#### Super Master (800) — Master +
- ✅ حظر Device ID (Hardware Ban)
- ✅ تعيين Master آخر ضمن كوتته
- ✅ Backup يدوي مشفر لإعدادات الغرفة
- ✅ قفل الخادم بالـ MAC/Device Fingerprint
- ✅ Quota System — توزيع الحصص على المشرفين

#### Root (900) — Super Master +
- ✅ تعيين Super Master
- ✅ Dual Machine Lock (ربط الحساب بجهازين فقط)
- ✅ تغيير ثيم الغرفة (5 ثيمات)
- ✅ تغيير رسالة الترحيب وبانر الغرفة
- ✅ تعيين غرف لـ Masters ضمن نطاقه

#### Super Root (1000) — Root +
- ✅ إدارة متعددة الغرف من لوحة واحدة
- ✅ إنشاء حسابات Root ضمن كوتته من Owner
- ✅ تقارير جميع الغرف في نطاقه

#### Owner (1100) — Super Root +
- ✅ تعيين Super Roots وتحديد كوتتهم
- ✅ لوحة تحكم بجميع غرف المنصة الخاصة به
- ✅ بطاقات الغرف (ID، Master، السعة، الحالة، انتهاء الاشتراك)
- ✅ تجميد/تفعيل/حذف الغرف

#### Super Owner (1200) — Owner +
- ✅ إدارة جميع Owners
- ✅ شجرة كاملة: SuperRoot → Root → Rooms
- ✅ إحصائيات المنصة الكاملة
- ✅ صلاحيات الطوارئ (تجميد أي حساب)

---

### 28. واجهة الغرفة — التصميم التفصيلي (chat.html)

#### 28.1 الهيدر
```
┌─────────────────────────────────────────────┐
│ 🔊 [اسم الغرفة] [Unlimited/Mic Free/عداد]  👥 💬 ≡ │
└─────────────────────────────────────────────┘
```
- **🔊 زر المايك:** Mic Free / Unlimited / عداد تنازلي
- **👥 زر الأعضاء:** يفتح قائمة الحضور (Slide من اليمين)
- **💬 زر المحادثات الخاصة:** قائمة المحادثات النشطة
- **≡ القائمة الجانبية:** الحالة / الإعدادات / مسح النص / تبليغ / خروج

#### 28.2 منطقة العرض المزدوجة
```
┌──────────────┬──────────────────────────────┐
│ قائمة الأعضاء│    منطقة الشات               │
│  (30% عرض)  │     (70% عرض)                │
│  أفاتار+اسم │  خلفية الثيم + نقش شفاف      │
│  ملوّن      │  بانر الترحيب (بطاقة بيضاء)  │
│  🎤 عند كلام│  فقاعات الرسائل + أفاتار      │
└──────────────┴──────────────────────────────┘
```

#### 28.3 شريط الأدوات السفلي
```
الشريط الأول:
┌───────────────────────────────────────────────┐
│  🎤  💬···  [  اكتب رسالة...  ]  ⌨️  😊  📤  │
└───────────────────────────────────────────────┘

الشريط الثاني (السريع):
┌───────────────────────────────────────────────┐
│  ⏰   😐   🖐️   ❤️   💡                       │
└───────────────────────────────────────────────┘
```

| الزر | الوظيفة |
|------|---------|
| 🎤 | مايك (اضغط للتحدث / مايك حر / قفل) |
| 💬··· | رسائل صوتية / ميزات إضافية |
| حقل الكتابة | كتابة رسالة نصية |
| ⌨️ | تبديل لوحة المفاتيح |
| 😊 | لوحة الإيموجي (تبويبات: قلوب / وجوه / احتفالات) |
| 📤 | إرسال صورة من المعرض أو التقاط صورة أو كاميرا |
| ⏰ | الوقت الحالي |
| 😐 | تعبيرات سريعة |
| 🖐️ | طلب الكلام (Raise Hand) |
| ❤️ | إرسال قلب للجميع |
| 💡 | فكرة / تنبيه |

#### 28.4 قائمة الحالات الـ 7
| الحالة | الأيقونة | اللون |
|--------|---------|-------|
| متاح | دائرة خضراء | `#4CAF50` |
| بالخارج | ساعة برتقالية | `#FF9800` |
| مشغول | دائرة حمراء | `#F44336` |
| هاتف | 📞 أزرق | `#2196F3` |
| طعام | 🍴 أخضر زيتوني | `#8BC34A` |
| نائم | 💤 بنفسجي | `#9C27B0` |
| سيارة | 🚗 رمادي | `#607D8B` |

#### 28.5 الإعدادات الشخصية
| القسم | الخيارات |
|-------|---------|
| الخط | حجم (شريط منزلق) + لون (عجلة ألوان) + عريض (تبديل) |
| الرسائل الخاصة | رفض الكل / من المسجلين فقط / قبول الكل |
| عام | تحويل الحالة عند المكالمة الهاتفية (تبديل) + سحب المايك تلقائياً (تبديل) |
| الإشعارات | إلغاء الصوتية / أثناء التحدث / تذكير الاسم / الخاصة / الدخول والخروج |
| اللغة | عربي / English / Français / Deutsch / Türkçe / فارسی |

---

### 29. صفحة الغرف (rooms.html) — التصميم

#### 29.1 الهيكل العام
```
┌─────────────────────────────────────────────┐
│              WIDBID (Logo)                  │
├─────────────────────────────────────────────┤
│  الغرف المميزة ⭐ | العراق 🇮🇶 | السعودية 🇸🇦 │
│  (اسم الدولة + علم + عدد المستخدمين + غرف) │
├─────────────────────────────────────────────┤
│ شريط أسفل: الغرف 🏠 | مفضلة ❤️ | بحث 🔍 | ··· │
└─────────────────────────────────────────────┘
```

#### 29.2 بطاقة الدولة
- علم دائري + اسم الدولة
- عدد المستخدمين (أيقونة 👥 + رقم)
- عدد الغرف (أيقونة 💬 + رقم)
- ⭐ نجمة مفضلة (تبديل أصفر/رمادي)

#### 29.3 صفحة داخل الدولة (الغرف)
- قائمة الغرف مع: اسم الغرفة + عدد المتواجدين + ⭐ مفضلة + رقم المتواجدين
- البحث: بالاسم أو رقم الغرفة
- شريط الإجماليات أسفل الشاشة: مجموع المستخدمين + مجموع الغرف

---

### 30. صفحة الدخول (login.html) — التصميم

```
┌─────────────────────────────────────────────┐
│  [ زائر ] [ عضو ] [ مسجل ]  ← تبويبات     │
├─────────────────────────────────────────────┤
│ زائر:                                       │
│   اسم مستعار + علم الدولة + أفاتار (54 خيار)│
│                                             │
│ عضو / مسجل:                                │
│   Username + Password + حفظ البيانات        │
├─────────────────────────────────────────────┤
│         [ دخول ]  [ إلغاء ]                │
└─────────────────────────────────────────────┘
```

---

### 31. الثيمات البصرية للغرف (Room Themes)

| # | الثيم | لون الخلفية | النقش الشفاف |
|---|-------|------------|-------------|
| 1 | حلوى (افتراضي) | `#C8A0D8` بنفسجي | حلوى وكعك |
| 2 | بحر | `#A0C8E8` أزرق فاتح | أمواج وأسماك |
| 3 | زهور | `#E8C8A0` بيج وردي | زهور وأوراق |
| 4 | ليلي | `#1A1A2E` كحلي | نجوم وسماء |
| 5 | محايد | `#E8E8E8` رمادي | بدون نقش |

---

### 32. نظام AI Agent — التفعيل التلقائي (WidBid Smart Automation)

#### 32.1 رؤية النظام
ميزة تنافسية جوهرية تُميّز WidBid عن WEVO — تحويل العمليات اليدوية (التي تستغرق ساعات) إلى تفعيل فوري تلقائي خلال ثوانٍ.

#### 32.2 مسار الشراء والتفعيل
```
المستخدم يختار الباقة من WidBid Market
            ↓
يضغط "شراء" ← يظهر: رقم الحساب + تعليمات التحويل
            ↓
يرفع صورة/لقطة إثبات التحويل
            ↓
    [AI Agent يفحص الصورة]
    ┌─────────────────────┐
    │ يستخرج: المبلغ      │
    │ يستخرج: التاريخ     │
    │ يستخرج: اسم المرسل  │
    │ يطابق مع الباقة     │
    └─────────────────────┘
            ↓
    ┌──────────┬────────────┐
    │ تطابق ✅ │ لا تطابق ❌│
    ↓          ↓
تفعيل تلقائي  مراجعة يدوية
- ينشئ الغرفة  + إشعار للمستخدم
- يُعيّن Master
- يضبط السعة
- يُفعّل تاريخ الانتهاء
- يُرسل إشعار
```

#### 32.3 قواعد التحقق
- المبلغ يجب أن يطابق سعر الباقة بدقة (±0)
- التاريخ لا يتجاوز 24 ساعة من وقت الرفع
- في حالة الشك → يُحوَّل للمراجعة اليدوية تلقائياً

#### 32.4 الباقات المقترحة (WidBid Market)
| الباقة | المحتوى | السعر |
|--------|---------|-------|
| Starter | غرفة 1 + 5 Masters + 3 شهور | $30 |
| Basic | غرفة 1 + 10 Masters + 6 شهور | $60 |
| Pro | غرفة 1 + 15 Masters + سنة | $100 |
| Business | 5 غرف + 25 Masters + سنة | $200 |
| اسم محمي | Protected Name + سنة | $50 |
| اسم ملكي | Royal Name + سنة | $100 |
| تكبير سعة | +25 مستخدم للغرفة | $50 |

#### 32.5 جداول قاعدة البيانات المضافة (AI Agent & Market)
```sql
-- جدول الباقات
CREATE TABLE market_packages (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type ENUM('room','name_protected','name_royal','capacity','bundle') NOT NULL,
  rooms_count INT DEFAULT 1,
  masters_count INT DEFAULT 0,
  capacity_boost INT DEFAULT 0,
  duration_days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الطلبات
CREATE TABLE market_orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  package_id UUID REFERENCES market_packages(id),
  status ENUM('pending','ai_review','approved','rejected','expired') DEFAULT 'pending',
  payment_proof_url VARCHAR(500),
  payment_amount DECIMAL(10,2),
  payment_date DATE,
  payment_sender_name VARCHAR(100),
  ai_confidence_score DECIMAL(5,2),
  ai_verdict ENUM('match','mismatch','uncertain'),
  reviewed_by UUID REFERENCES users(id),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الخدمات النشطة
CREATE TABLE active_subscriptions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES market_orders(id),
  user_id UUID REFERENCES users(id),
  service_type VARCHAR(50),
  service_data JSONB,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 33. مقارنة WidBid vs WEVO (الميزة التنافسية)

| الميزة | WEVO (wevo.ae) | WidBid |
|--------|---------------|--------|
| تفعيل الغرفة بعد الدفع | يدوي (ساعات أو أيام) | ✅ تلقائي بالذكاء الاصطناعي (ثوانٍ) |
| نظام نقاط للمستخدمين | ❌ لا يوجد | ✅ نقاط + متجر |
| تصميم الواجهة | قديم (منذ 2003) | ✅ حديث موبايل-فيرست |
| الألعاب داخل الغرفة | ❌ لا يوجد | ✅ ألعاب تفاعلية |
| لوحة تحكم ويب | ❌ تطبيق ديسكتوب فقط | ✅ ويب + Electron + Flutter |
| تخصيص الباقات | محدود | ✅ مرن وقابل للتوسع |
| الذكاء الاصطناعي | ❌ لا يوجد | ✅ AI Agent متكامل |
| مصدر النظام | مغلق | ✅ مبني من الصفر، كامل التحكم |

---

> **آخر تحديث للدستور:** 2026-06-04
> **تحديث الملحق:** 2026-06-04 (إضافة أقسام 25–33)
> **القاعدة الذهبية:** لا يُحذف ولا يُعدَّل من هذا الدستور إلا بإذن صريح من تامر.
