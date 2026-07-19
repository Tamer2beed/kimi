/* ════════════════════════════════════════
   WidBid — seed.js
   بيانات تجريبية شاملة للاختبار
   شغّل مرة واحدة: node seed.js
   ⚠️  يحذف البيانات القديمة ويعيد الإدخال
════════════════════════════════════════ */
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'widbid',
  port:     parseInt(process.env.DB_PORT) || 3306,
};

/* ══ كلمة المرور الموحدة لكل الحسابات التجريبية ══ */
const TEST_PASS = '123456';

/* ══ الحسابات التجريبية — رتبة واحدة لكل مستوى ══ */
/* ══ الحسابات التجريبية — رتبة واحدة لكل مستوى ══
   الأفاتار: av1-av8.svg (افتراضي للجميع)
   has_paid_profile: 1 = يمكنه رفع صورة مخصصة
══════════════════════════════════════════════ */
const USERS = [
  /* رتب أساسية */
  { username: 'زائر_تجريبي',      rank: 100,  avatar: 'av1.svg', has_paid_profile: 0, country: 'العراق',   email: 'guest@widbid.com' },
  { username: 'أحمد_العراقي',      rank: 200,  avatar: 'av2.svg', has_paid_profile: 0, country: 'العراق',   email: 'member@widbid.com' },
  { username: 'سارة_الأردن',       rank: 200,  avatar: 'av4.svg', has_paid_profile: 0, country: 'الأردن',   email: 'member2@widbid.com' },
  { username: 'محمد_السعودية',     rank: 200,  avatar: 'av3.svg', has_paid_profile: 0, country: 'السعودية', email: 'member3@widbid.com' },
  { username: 'نورا_الكويت',       rank: 200,  avatar: 'av7.svg', has_paid_profile: 0, country: 'الكويت',   email: 'member4@widbid.com' },

  /* رتب متوسطة */
  { username: 'ProtectedUser',     rank: 300,  avatar: 'av5.svg', has_paid_profile: 1, country: 'الإمارات', email: 'protected@widbid.com' },
  { username: 'RoyalKing',         rank: 400,  avatar: 'av6.svg', has_paid_profile: 1, country: 'السعودية', email: 'royal@widbid.com' },
  { username: 'أبو_فهد_المدير',    rank: 500,  avatar: 'av8.svg', has_paid_profile: 1, country: 'السعودية', email: 'admin@widbid.com' },
  { username: 'SuperAdmin_Test',   rank: 600,  avatar: 'av2.svg', has_paid_profile: 1, country: 'مصر',      email: 'superadmin@widbid.com' },

  /* رتب عليا */
  { username: 'Master_لبنان',      rank: 700,  avatar: 'av3.svg', has_paid_profile: 1, country: 'لبنان',    email: 'master@widbid.com' },
  { username: 'SuperMaster_X',     rank: 800,  avatar: 'av1.svg', has_paid_profile: 1, country: 'الكويت',   email: 'supermaster@widbid.com' },
  { username: 'Root_System',       rank: 900,  avatar: 'av6.svg', has_paid_profile: 1, country: 'العراق',   email: 'root@widbid.com' },
  { username: 'SuperRoot_Admin',   rank: 1000, avatar: 'av5.svg', has_paid_profile: 1, country: 'العراق',   email: 'superroot@widbid.com' },

  /* أصحاب الغرف */
  { username: 'Owner_بغداد',       rank: 1100, avatar: 'av7.svg', has_paid_profile: 1, country: 'العراق',   email: 'owner@widbid.com',      max_rooms: 10 },
  { username: 'SuperOwner_WidBid', rank: 1200, avatar: 'av8.svg', has_paid_profile: 1, country: 'العراق',   email: 'superowner@widbid.com', max_rooms: 50 },
];

/* ══ الغرف التجريبية ══ */
const ROOMS = [
  /* الغرف المميزة (cat 1) */
  { name: 'الديوانية العراقية',    category_id: 1,  type: 'public',  theme: 'gold',    owner: 'test_owner' },
  { name: 'مجلس النخبة',           category_id: 1,  type: 'public',  theme: 'royal',   owner: 'test_superowner' },
  { name: 'غرفة الكبار',           category_id: 1,  type: 'private', theme: 'dark',    owner: 'test_owner' },

  /* العراق (cat 2) */
  { name: 'بغداد الحبيبة',         category_id: 2,  type: 'public',  theme: 'candy',   owner: 'test_owner' },
  { name: 'البصرة والخليج',        category_id: 2,  type: 'public',  theme: 'ocean',   owner: 'test_owner' },
  { name: 'أهل الموصل',            category_id: 2,  type: 'public',  theme: 'default', owner: 'test_superowner' },
  { name: 'كردستان العراق',        category_id: 2,  type: 'public',  theme: 'green',   owner: 'test_owner' },

  /* سوريا (cat 3) */
  { name: 'دمشق الشام',            category_id: 3,  type: 'public',  theme: 'candy',   owner: 'test_superowner' },
  { name: 'حلب العريقة',           category_id: 3,  type: 'public',  theme: 'default', owner: 'test_owner' },
  { name: 'أبناء الغربة السورية',  category_id: 3,  type: 'public',  theme: 'ocean',   owner: 'test_owner' },

  /* الأردن (cat 4) */
  { name: 'عمّان كابيتال',         category_id: 4,  type: 'public',  theme: 'royal',   owner: 'test_owner' },
  { name: 'أهل الأردن',            category_id: 4,  type: 'public',  theme: 'candy',   owner: 'test_superowner' },

  /* السعودية (cat 5) */
  { name: 'الرياض تتكلم',          category_id: 5,  type: 'public',  theme: 'gold',    owner: 'test_superowner' },
  { name: 'جدة والبحر الأحمر',     category_id: 5,  type: 'public',  theme: 'ocean',   owner: 'test_owner' },
  { name: 'مكة والمدينة',          category_id: 5,  type: 'public',  theme: 'green',   owner: 'test_owner' },

  /* مصر (cat 6) */
  { name: 'أم الدنيا',             category_id: 6,  type: 'public',  theme: 'candy',   owner: 'test_owner' },
  { name: 'الإسكندرية البحر',      category_id: 6,  type: 'public',  theme: 'ocean',   owner: 'test_superowner' },

  /* الإمارات (cat 7) */
  { name: 'دبي النجوم',            category_id: 7,  type: 'public',  theme: 'gold',    owner: 'test_superowner' },
  { name: 'أبوظبي الكبرى',         category_id: 7,  type: 'public',  theme: 'royal',   owner: 'test_owner' },

  /* الكويت (cat 8) */
  { name: 'ديوانية الكويت',        category_id: 8,  type: 'public',  theme: 'gold',    owner: 'test_owner' },

  /* لبنان (cat 9) */
  { name: 'بيروت لا تموت',         category_id: 9,  type: 'public',  theme: 'candy',   owner: 'test_owner' },
  { name: 'جبل لبنان',             category_id: 9,  type: 'public',  theme: 'green',   owner: 'test_superowner' },

  /* فلسطين (cat 10) */
  { name: 'القدس عاصمة فلسطين',   category_id: 10, type: 'public',  theme: 'default', owner: 'test_superowner' },
  { name: 'أبناء فلسطين',          category_id: 10, type: 'public',  theme: 'green',   owner: 'test_owner' },

  /* اليمن (cat 11) */
  { name: 'اليمن السعيد',          category_id: 11, type: 'public',  theme: 'default', owner: 'test_owner' },

  /* تركيا (cat 12) */
  { name: 'إسطنبول العربي',        category_id: 12, type: 'public',  theme: 'royal',   owner: 'test_owner' },

  /* الغرف الدينية (cat 14) */
  { name: 'القرآن الكريم',         category_id: 14, type: 'public',  theme: 'green',   owner: 'test_superowner' },
  { name: 'الفقه والعلم',          category_id: 14, type: 'public',  theme: 'green',   owner: 'test_owner' },

  /* ترفيه وألعاب (cat 15) */
  { name: 'غرفة الألعاب 🎮',       category_id: 15, type: 'public',  theme: 'dark',    owner: 'test_owner' },
  { name: 'الكلمات والألغاز',      category_id: 15, type: 'public',  theme: 'candy',   owner: 'test_superowner' },

  /* موسيقى وفن (cat 16) */
  { name: 'عالم الموسيقى 🎵',      category_id: 16, type: 'public',  theme: 'candy',   owner: 'test_owner' },

  /* عام (cat 17) */
  { name: 'غرفة الجميع',           category_id: 17, type: 'public',  theme: 'default', owner: 'test_owner' },
  { name: 'دردشة حرة',             category_id: 17, type: 'public',  theme: 'candy',   owner: 'test_superowner' },
];

/* ══ رسائل تجريبية لكل غرفة ══ */
const SAMPLE_MSGS = [
  'أهلاً وسهلاً بالجميع 👋',
  'مرحباً يا أهل الغرفة',
  'كيف الأحوال؟ 😊',
  'الله يحيّيكم جميعاً',
  'غرفة رائعة ومتميزة 🌟',
  'يسعد مساكم يا ناس',
  'تحياتي للجميع ❤️',
  'نورتوا الغرفة',
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(DB);
    console.log('✅ اتصال بقاعدة البيانات\n');

    /* ══ 1. تشفير كلمة المرور مرة واحدة ══ */
    process.stdout.write('⏳ تشفير كلمة المرور... ');
    const hash = await bcrypt.hash(TEST_PASS, 8);
    console.log('✅');

    /* ══ 2. حذف البيانات التجريبية القديمة ══ */
    process.stdout.write('⏳ تنظيف البيانات القديمة... ');
    await conn.query(`DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE username LIKE 'test_%')`);
    await conn.query(`DELETE FROM room_masters WHERE room_id IN (SELECT id FROM rooms WHERE name IN (${ROOMS.map(()=>'?').join(',')}) )`, ROOMS.map(r=>r.name));
    await conn.query(`DELETE FROM rooms WHERE name IN (${ROOMS.map(()=>'?').join(',')})`, ROOMS.map(r=>r.name));
    await conn.query(`DELETE FROM users WHERE username LIKE 'test_%'`);
    /* حذف بالإيميل أيضاً (احتياط من duplicates) */
    const emails = USERS.map(u => u.email);
    await conn.query(`DELETE FROM users WHERE email IN (${emails.map(()=>'?').join(',')})`, emails);
    console.log('✅');

    /* ══ 3. إدخال المستخدمين ══ */
    process.stdout.write('⏳ إنشاء الحسابات التجريبية (12 رتبة)... ');
    const userMap = {};
    for (const u of USERS) {
      const [r] = await conn.query(
        `INSERT INTO users (username, email, password_hash, rank, avatar, country, max_rooms, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [u.username, u.email, hash, u.rank, u.avatar, u.country, u.max_rooms || 0]
      );
      userMap[u.username] = r.insertId;
    }
    console.log('✅');

    /* ══ 4. إدخال الغرف ══ */
    process.stdout.write(`⏳ إنشاء ${ROOMS.length} غرفة تجريبية... `);
    for (const room of ROOMS) {
      const ownerId = userMap[room.owner];
      const token   = `WB-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

      const [r] = await conn.query(
        `INSERT INTO rooms
           (name, token, type, category_id, owner_id, theme,
            welcome_message, member_count, max_capacity, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 200, 1)`,
        [
          room.name, token, room.type, room.category_id,
          ownerId, room.theme,
          `مرحباً بكم في ${room.name} 🌟`,
          Math.floor(Math.random() * 45),   /* عدد أعضاء عشوائي للمظهر */
        ]
      );

      /* رسالة ترحيبية لكل غرفة */
      const msg = SAMPLE_MSGS[Math.floor(Math.random() * SAMPLE_MSGS.length)];
      await conn.query(
        `INSERT INTO messages (room_id, sender_id, content, type) VALUES (?, ?, ?, 'system')`,
        [r.insertId, ownerId, msg]
      );
    }
    console.log('✅');

    /* ══ 5. عرض ملخص ══ */
    const [[{uc}]] = await conn.query('SELECT COUNT(*) AS uc FROM users WHERE username LIKE "test_%"');
    const [[{rc}]] = await conn.query('SELECT COUNT(*) AS rc FROM rooms');
    const [[{cc}]] = await conn.query('SELECT COUNT(*) AS cc FROM categories');

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║          🎉 Seed مكتمل بنجاح                  ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  👤 حسابات : ${String(uc).padEnd(33)}║`);
    console.log(`║  🏠 غرف    : ${String(rc).padEnd(33)}║`);
    console.log(`║  📂 تصنيفات: ${String(cc).padEnd(33)}║`);
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║  🔑 كلمة المرور الموحدة: 123456               ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║  الإيميل                       الرتبة         ║');
    USERS.forEach(u => {
      const line = `  ${u.email.padEnd(30)} ${u.rank}`;
      console.log(`║${line.padEnd(48)}║`);
    });
    console.log('╚════════════════════════════════════════════════╝');

  } catch (err) {
    console.error('\n❌ خطأ:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
