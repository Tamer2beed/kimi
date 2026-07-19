/* ════════════════════════════════════════
   WidBid — setup-db.js
   إنشاء جميع جداول قاعدة البيانات
   شغّل مرة واحدة عند النشر الأول:
   node setup-db.js
════════════════════════════════════════ */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'widbid',
  port:     process.env.DB_PORT     || 3306,
};

/* ════════════════════════════════════════
   تعريف الجداول بالترتيب الصحيح
   (الجداول المعتمَدة أولاً)
════════════════════════════════════════ */
const TABLES = [

  /* ══ 1. المستخدمون ════════════════════ */
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        username      VARCHAR(50)  NOT NULL UNIQUE,
        email         VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255),
        rank          INT          DEFAULT 100  COMMENT '100=Guest 200=Member ... 1200=SuperOwner',
        points        INT          DEFAULT 0,
        is_active     TINYINT(1)   DEFAULT 1,
        is_banned     TINYINT(1)   DEFAULT 0,
        max_rooms     INT          DEFAULT 0    COMMENT 'للـ Owner: الحد الأقصى من الغرف',
        super_root_id INT          DEFAULT NULL COMMENT 'الـ SuperRoot المسؤول (للـ Root)',
        owner_id      INT          DEFAULT NULL COMMENT 'الـ Owner المسؤول',
        avatar        VARCHAR(50)  DEFAULT 'av1.svg' COMMENT 'اسم ملف SVG أو مسار صورة مرفوعة',
        has_paid_profile TINYINT(1) DEFAULT 0  COMMENT '1 = يمكنه رفع صورة مخصصة',
        country       VARCHAR(50)  DEFAULT NULL,
        last_login    TIMESTAMP    DEFAULT NULL,
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rank    (rank),
        INDEX idx_active  (is_active),
        INDEX idx_email   (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 2. الغرف ═════════════════════════ */
  {
    name: 'rooms',
    sql: `
      CREATE TABLE IF NOT EXISTS rooms (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        token           VARCHAR(50)  UNIQUE COMMENT 'OWNERTOKEN-ROOMNUMBER',
        type            ENUM('public','private') DEFAULT 'public',
        owner_id        INT          DEFAULT NULL,
        super_root_id   INT          DEFAULT NULL,
        root_id         INT          DEFAULT NULL,
        welcome_message TEXT         DEFAULT 'مرحباً بكم',
        theme           VARCHAR(20)  DEFAULT 'candy',
        member_count    INT          DEFAULT 0,
        max_capacity    INT          DEFAULT 200,
        is_active       TINYINT(1)   DEFAULT 1,
        is_frozen       TINYINT(1)   DEFAULT 0,
        is_locked       TINYINT(1)   DEFAULT 0  COMMENT 'منع دخول أعضاء جدد',
        is_protected    TINYINT(1)   DEFAULT 0  COMMENT 'اسم محمي',
        expires_at      TIMESTAMP    DEFAULT NULL,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_owner    (owner_id),
        INDEX idx_active   (is_active),
        INDEX idx_type     (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 3. الرسائل ════════════════════════ */
  {
    name: 'messages',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        room_id    INT  NOT NULL,
        sender_id  INT  DEFAULT NULL COMMENT 'NULL للزوار',
        content    TEXT NOT NULL,
        type       ENUM('text','image','system','announcement') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_room    (room_id),
        INDEX idx_sender  (sender_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 4. النقاط ═════════════════════════ */
  {
    name: 'points_history',
    sql: `
      CREATE TABLE IF NOT EXISTS points_history (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT NOT NULL,
        amount     INT NOT NULL COMMENT 'موجب = مكسب، سالب = خصم',
        reason     VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 5. ماسترز الغرف ══════════════════ */
  {
    name: 'room_masters',
    sql: `
      CREATE TABLE IF NOT EXISTS room_masters (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        room_id    INT NOT NULL,
        user_id    INT NOT NULL,
        assigned_by INT DEFAULT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_room_user (room_id, user_id),
        INDEX idx_room (room_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 6. حظر IP ══════════════════════════ */
  {
    name: 'ip_bans',
    sql: `
      CREATE TABLE IF NOT EXISTS ip_bans (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        room_id     INT          DEFAULT NULL COMMENT 'NULL = حظر عام',
        ip_address  VARCHAR(45)  NOT NULL,
        banned_by   VARCHAR(50),
        reason      VARCHAR(200) DEFAULT NULL,
        expires_at  TIMESTAMP    DEFAULT NULL COMMENT 'NULL = دائم',
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip     (ip_address),
        INDEX idx_room   (room_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 7. حظر الأجهزة ════════════════════ */
  {
    name: 'device_bans',
    sql: `
      CREATE TABLE IF NOT EXISTS device_bans (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        username    VARCHAR(50)  NOT NULL,
        device_id   VARCHAR(200) DEFAULT NULL,
        banned_by   VARCHAR(50),
        room_id     INT          DEFAULT NULL,
        expires_at  TIMESTAMP    DEFAULT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username  (username),
        INDEX idx_device    (device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 8. أجهزة المستخدمين (Dual Lock) ══ */
  {
    name: 'user_devices',
    sql: `
      CREATE TABLE IF NOT EXISTS user_devices (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        user_id       INT          NOT NULL,
        device_id     VARCHAR(200) NOT NULL,
        device_name   VARCHAR(200) DEFAULT NULL,
        registered_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        last_used     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_device (user_id, device_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 9. نظام الكوتة ════════════════════ */
  {
    name: 'user_quotas',
    sql: `
      CREATE TABLE IF NOT EXISTS user_quotas (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        room_id     INT DEFAULT NULL,
        quota_total INT DEFAULT 5  COMMENT 'الحد الأقصى المسموح',
        quota_used  INT DEFAULT 0  COMMENT 'المستخدم حالياً',
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_room (user_id, room_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 10. التحذيرات الرسمية ════════════ */
  {
    name: 'warnings',
    sql: `
      CREATE TABLE IF NOT EXISTS warnings (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        room_id         INT          NOT NULL,
        target_username VARCHAR(50)  NOT NULL,
        reason          TEXT,
        warned_by       VARCHAR(50),
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_target (target_username),
        INDEX idx_room   (room_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 11. البلاغات ══════════════════════ */
  {
    name: 'reports',
    sql: `
      CREATE TABLE IF NOT EXISTS reports (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        room_id     INT         DEFAULT NULL,
        reported_by INT         DEFAULT NULL,
        reason      VARCHAR(200) DEFAULT 'User report',
        status      ENUM('pending','reviewed','dismissed') DEFAULT 'pending',
        created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_room   (room_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 12. بيانات البصمة (WebAuthn) ══════ */
  {
    name: 'biometric_credentials',
    sql: `
      CREATE TABLE IF NOT EXISTS biometric_credentials (
        id              VARCHAR(200) PRIMARY KEY,
        user_id         INT          NOT NULL,
        credential_id   TEXT         NOT NULL,
        public_key      TEXT         NOT NULL,
        device_name     VARCHAR(200) DEFAULT NULL,
        biometric_type  ENUM('fingerprint','face','both') DEFAULT 'fingerprint',
        counter         BIGINT       DEFAULT 0,
        is_active       TINYINT(1)   DEFAULT 1,
        registered_ip   VARCHAR(45)  DEFAULT NULL,
        registered_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        last_used_at    TIMESTAMP    DEFAULT NULL,
        last_used_ip    VARCHAR(45)  DEFAULT NULL,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 13. محاولات البصمة ════════════════ */
  {
    name: 'biometric_attempts',
    sql: `
      CREATE TABLE IF NOT EXISTS biometric_attempts (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        user_id        INT         NOT NULL,
        success        TINYINT(1)  NOT NULL,
        ip_address     VARCHAR(45) DEFAULT NULL,
        user_agent     VARCHAR(255) DEFAULT NULL,
        failure_reason VARCHAR(100) DEFAULT NULL,
        attempted_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_time (attempted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 14. تحديات البصمة (مؤقتة) ════════ */
  {
    name: 'biometric_challenges',
    sql: `
      CREATE TABLE IF NOT EXISTS biometric_challenges (
        user_id    INT          PRIMARY KEY,
        challenge  VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP    NOT NULL,
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 15. باقات السوق ══════════════════ */
  {
    name: 'market_packages',
    sql: `
      CREATE TABLE IF NOT EXISTS market_packages (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        description     TEXT,
        type            ENUM('room','name_protected','name_royal','capacity','bundle','root','superroot') NOT NULL,
        rooms_count     INT          DEFAULT 1,
        masters_count   INT          DEFAULT 0,
        capacity_boost  INT          DEFAULT 0,
        duration_days   INT          NOT NULL,
        price           DECIMAL(10,2) NOT NULL,
        is_active       TINYINT(1)   DEFAULT 1,
        sort_order      INT          DEFAULT 0,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type   (type),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 16. طلبات السوق ══════════════════ */
  {
    name: 'market_orders',
    sql: `
      CREATE TABLE IF NOT EXISTS market_orders (
        id                  VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        user_id             INT           NOT NULL,
        package_id          INT           NOT NULL,
        status              ENUM('pending','ai_review','approved','rejected','expired') DEFAULT 'pending',
        payment_proof_url   VARCHAR(500)  DEFAULT NULL,
        payment_amount      DECIMAL(10,2) DEFAULT NULL,
        payment_date        DATE          DEFAULT NULL,
        payment_sender_name VARCHAR(100)  DEFAULT NULL,
        ai_confidence_score DECIMAL(5,2)  DEFAULT NULL,
        ai_verdict          ENUM('match','mismatch','uncertain') DEFAULT NULL,
        reviewed_by         INT           DEFAULT NULL,
        activated_at        TIMESTAMP     DEFAULT NULL,
        expires_at          TIMESTAMP     DEFAULT NULL,
        created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user   (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 17. الاشتراكات النشطة ════════════ */
  {
    name: 'active_subscriptions',
    sql: `
      CREATE TABLE IF NOT EXISTS active_subscriptions (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        order_id     VARCHAR(36)  DEFAULT NULL,
        user_id      INT          NOT NULL,
        service_type VARCHAR(50),
        service_data JSON         DEFAULT NULL,
        expires_at   TIMESTAMP    NOT NULL,
        is_active    TINYINT(1)   DEFAULT 1,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user    (user_id),
        INDEX idx_expires (expires_at),
        INDEX idx_active  (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

  /* ══ 18. سجل الإجراءات الإدارية ══════ */
  {
    name: 'admin_actions_log',
    sql: `
      CREATE TABLE IF NOT EXISTS admin_actions_log (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        room_id     INT          DEFAULT NULL,
        actor_id    INT          DEFAULT NULL,
        actor_name  VARCHAR(50),
        actor_rank  INT          DEFAULT 100,
        action      VARCHAR(50)  NOT NULL,
        target_name VARCHAR(50)  DEFAULT NULL,
        detail      VARCHAR(200) DEFAULT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_room   (room_id),
        INDEX idx_actor  (actor_id),
        INDEX idx_action (action),
        INDEX idx_time   (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },

];

/* ════════════════════════════════════════
   بيانات أولية (Seed Data)
════════════════════════════════════════ */
const SEED = [
  /* ── باقات السوق الافتراضية ─────────── */
  {
    table: 'market_packages',
    checkSql: 'SELECT COUNT(*) as cnt FROM market_packages',
    insertSql: `
      INSERT INTO market_packages
        (name, description, type, rooms_count, masters_count, capacity_boost, duration_days, price, sort_order)
      VALUES
        ('Starter',          'غرفة 1 + 5 Masters + 3 شهور',   'room',          1, 5,  0,  90,   30.00, 1),
        ('Basic',            'غرفة 1 + 10 Masters + 6 شهور',  'room',          1, 10, 0,  180,  60.00, 2),
        ('Pro',              'غرفة 1 + 15 Masters + سنة',      'room',          1, 15, 0,  365,  100.00, 3),
        ('Business',         '5 غرف + 25 Masters + سنة',       'bundle',        5, 25, 0,  365,  200.00, 4),
        ('اسم محمي',         'Protected Name + سنة',           'name_protected',0, 0,  0,  365,  50.00, 5),
        ('اسم ملكي',         'Royal Name + سنة',               'name_royal',    0, 0,  0,  365,  100.00, 6),
        ('تكبير السعة +25',  'زيادة سعة الغرفة 25 مستخدم',   'capacity',      0, 0,  25, 365,  50.00, 7),
        ('Root - 3 شهور',   'صلاحيات Root + 3 شهور',          'root',          0, 0,  0,  90,   250.00, 8),
        ('Root - سنة',       'صلاحيات Root + سنة',             'root',          0, 0,  0,  365,  600.00, 9);
    `
  },

  /* ── حساب Super Owner افتراضي ─────────
     كلمة المرور: Admin@2026 (يجب تغييرها)
     Hash مؤقت — استبدله بـ bcrypt حقيقي
  ─────────────────────────────────────── */
  {
    table: 'users',
    checkSql: "SELECT COUNT(*) as cnt FROM users WHERE rank = 1200",
    insertSql: `
      INSERT INTO users (username, email, password_hash, rank, is_active)
      VALUES ('superowner', 'admin@widbid.com', '$2b$10$placeholder_replace_with_bcrypt', 1200, 1)
    `
  },
];

/* ════════════════════════════════════════
   تشغيل الإعداد
════════════════════════════════════════ */
async function setup() {
  let conn;

  console.log('\n🚀 WidBid Database Setup');
  console.log('════════════════════════════════════════');
  console.log(`🔌 الاتصال بـ: ${DB.host}:${DB.port}/${DB.database}\n`);

  try {
    conn = await mysql.createConnection(DB);
    console.log('✅ تم الاتصال بقاعدة البيانات\n');

    // إنشاء الجداول
    console.log('📋 إنشاء الجداول...');
    for (const table of TABLES) {
      try {
        await conn.execute(table.sql);
        console.log(`  ✅ ${table.name}`);
      } catch (e) {
        console.error(`  ❌ ${table.name}: ${e.message}`);
      }
    }

    // إدراج البيانات الأولية
    console.log('\n🌱 إدراج البيانات الأولية...');
    for (const seed of SEED) {
      try {
        const [[row]] = await conn.execute(seed.checkSql);
        if (row.cnt === 0) {
          await conn.execute(seed.insertSql);
          console.log(`  ✅ ${seed.table} — تم الإدراج`);
        } else {
          console.log(`  ⏭️  ${seed.table} — موجود مسبقاً`);
        }
      } catch (e) {
        console.error(`  ❌ ${seed.table}: ${e.message}`);
      }
    }

    // إحصائيات
    console.log('\n📊 الإحصائيات:');
    for (const table of TABLES) {
      try {
        const [[row]] = await conn.execute(`SELECT COUNT(*) as cnt FROM ${table.name}`);
        console.log(`  📌 ${table.name.padEnd(30)} ${row.cnt} صف`);
      } catch {}
    }

    console.log('\n════════════════════════════════════════');
    console.log('✅ اكتمل الإعداد بنجاح!');
    console.log('\n⚠️  تذكر:');
    console.log('   1. غيّر كلمة مرور حساب superowner');
    console.log('   2. عدّل بيانات .env قبل النشر');
    console.log('   3. شغّل: node server/index.js');
    console.log('════════════════════════════════════════\n');

  } catch (e) {
    console.error('\n❌ خطأ في الاتصال:', e.message);
    console.error('تأكد من:');
    console.error('  - قاعدة البيانات شغّالة');
    console.error('  - ملف .env صحيح');
    console.error('  - اسم قاعدة البيانات موجود\n');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

setup();
