/* WidBid — migrate-banner.js
   إضافة عمودَي banner_mobile و banner_desktop لجدول rooms
   شغّل مرة واحدة: node migrate-banner.js */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'widbid',
  port: parseInt(process.env.DB_PORT) || 3306,
};

(async () => {
  const conn = await mysql.createConnection(DB);
  console.log('✅ اتصال بقاعدة البيانات\n');

  const steps = [
    { name: 'إضافة banner_mobile',
      sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS banner_mobile  LONGTEXT DEFAULT NULL` },
    { name: 'إضافة banner_desktop',
      sql: `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS banner_desktop LONGTEXT DEFAULT NULL` },
  ];

  for (const s of steps) {
    process.stdout.write(`⏳ ${s.name}... `);
    await conn.query(s.sql);
    console.log('✅');
  }

  console.log('\n🎉 Migration البانر مكتملة!');
  await conn.end();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
