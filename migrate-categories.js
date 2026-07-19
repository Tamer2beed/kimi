/* ════════════════════════════════════════
   WidBid — migrate-categories.js
   إضافة جدول التصنيفات وربطه بالغرف
   شغّل مرة واحدة: node migrate-categories.js
════════════════════════════════════════ */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'widbid',
  port:     process.env.DB_PORT     || 3306,
};

const STEPS = [

  /* 1. جدول التصنيفات */
  {
    name: 'إنشاء جدول categories',
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(60)  NOT NULL,
        icon       VARCHAR(10)  NOT NULL DEFAULT '🏠',
        sort_order INT          DEFAULT 0,
        is_active  TINYINT(1)   DEFAULT 1,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* 2. عمود category_id في جدول rooms */
  {
    name: 'إضافة category_id لجدول rooms',
    sql: `
      ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL,
        ADD INDEX IF NOT EXISTS idx_category (category_id);
    `
  },

  /* 3. البيانات الأولية — التصنيفات الافتراضية */
  {
    name: 'إدخال التصنيفات الافتراضية',
    sql: `
      INSERT IGNORE INTO categories (id, name, icon, sort_order) VALUES
        (1,  'الغرف المميزة',          '⭐', 0),
        (2,  'العراق',                 '🇮🇶', 1),
        (3,  'سوريا',                  '🇸🇾', 2),
        (4,  'الأردن',                 '🇯🇴', 3),
        (5,  'السعودية',               '🇸🇦', 4),
        (6,  'مصر',                    '🇪🇬', 5),
        (7,  'الإمارات',               '🇦🇪', 6),
        (8,  'الكويت',                 '🇰🇼', 7),
        (9,  'لبنان',                  '🇱🇧', 8),
        (10, 'فلسطين',                 '🇵🇸', 9),
        (11, 'اليمن',                  '🇾🇪', 10),
        (12, 'تركيا',                  '🇹🇷', 11),
        (13, 'ألمانيا',                '🇩🇪', 12),
        (14, 'الغرف الدينية والتعليمية','📖', 13),
        (15, 'ترفيه وألعاب',           '🎮', 14),
        (16, 'موسيقى وفن',             '🎵', 15),
        (17, 'عام',                    '💬', 16);
    `
  }
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(DB);
    console.log('✅ اتصال بقاعدة البيانات ناجح\n');

    for (const step of STEPS) {
      process.stdout.write(`⏳ ${step.name}... `);
      await conn.query(step.sql);
      console.log('✅');
    }

    console.log('\n🎉 Migration مكتملة — التصنيفات جاهزة!');
    console.log('📊 شغّل: node server/index.js لتشغيل السيرفر');
  } catch (err) {
    console.error('\n❌ خطأ:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
