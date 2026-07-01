// Database Seed Script — Populates both PostgreSQL and MongoDB with mock data
// Run: npx tsx scripts/seed.ts
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly (Next.js convention) BEFORE anything else
config({ path: resolve(process.cwd(), '.env.local') });

import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { generateMockVolunteers, generateMockScores } from '../src/lib/mock-data';

const DATABASE_URL = process.env.DATABASE_URL;
const MONGODB_URI = process.env.MONGODB_URI;

// ── Debug: verify env vars are loaded (password masked) ──────────────────────
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Make sure web-app/.env.local exists.');
  process.exit(1);
}
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Make sure web-app/.env.local exists.');
  process.exit(1);
}

const maskedPg = DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
const maskedMg = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
console.log(`🔗 PostgreSQL → ${maskedPg}`);
console.log(`🔗 MongoDB    → ${maskedMg}\n`);

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ── Connect to PostgreSQL ────────────────────────────────────────────────────
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase pooler
  });

  // Verify PG connection before proceeding
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('🐘 Connected to PostgreSQL (Supabase)');

  // ── Connect to MongoDB ───────────────────────────────────────────────────────
  const mongoClient = new MongoClient(MONGODB_URI!);
  await mongoClient.connect();
  // Always use the explicit DB name — the URI has no DB segment and client.db() defaults to 'test'
  const DB_NAME = 'lora_defi';
  const mongodb = mongoClient.db(DB_NAME);
  console.log(`🍃 Connected to MongoDB Atlas (db: ${DB_NAME})\n`);

  // ── Generate mock data ───────────────────────────────────────────────────────
  const volunteers = generateMockVolunteers();
  console.log(`📋 Generated ${volunteers.length} mock volunteers\n`);

  // ── Clear existing data ──────────────────────────────────────────────────────
  await pool.query('DELETE FROM volunteer_scores');
  await pool.query('DELETE FROM volunteers');
  await mongodb.collection('device_telemetry').deleteMany({});
  await mongodb.collection('emergency_events').deleteMany({});
  console.log('🗑️  Cleared existing data\n');

  // ── Insert volunteers ────────────────────────────────────────────────────────
  for (const vol of volunteers) {
    // PostgreSQL
    const pgResult = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, mobile_number, lora_id, has_defibrillator, has_lora)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [vol.firstName, vol.lastName, vol.mobileNumber, vol.loraId, vol.hasDefibrillator, vol.hasLora]
    );
    const volunteerId = pgResult.rows[0].id;

    // Gamification scores
    const scores = generateMockScores(volunteerId);
    await pool.query(
      `INSERT INTO volunteer_scores (volunteer_id, total_points, responses, avg_response_s, badges)
       VALUES ($1, $2, $3, $4, $5)`,
      [volunteerId, scores.totalPoints, scores.responses, scores.avgResponseS, scores.badges]
    );

    // MongoDB telemetry
    const lastTransmission = new Date(
      Date.now() - vol.lastTransmissionMinutesAgo * 60 * 1000
    );
    await mongodb.collection('device_telemetry').insertOne({
      volunteerId,
      loraId: vol.loraId,
      location: {
        type: 'Point',
        coordinates: [vol.lng, vol.lat], // GeoJSON: [lng, lat]
      },
      batteryLevel: vol.batteryLevel,
      lastTransmission,
      signalStrength: vol.signalStrength,
      meshHops: vol.meshHops,
      isOnline: vol.lastTransmissionMinutesAgo < 30,
    });

    console.log(
      `  ✅ ${vol.firstName} ${vol.lastName} (${vol.mobileNumber}) ` +
      `${vol.hasLora ? '📡' : '📱'} ${vol.hasDefibrillator ? '🫀' : ''} ` +
      `[${vol.lat.toFixed(4)}, ${vol.lng.toFixed(4)}]`
    );
  }

  // Ensure 2dsphere index on telemetry
  await mongodb.collection('device_telemetry').createIndex({ location: '2dsphere' });
  console.log('\n✅ Created 2dsphere index on device_telemetry');

  // ── Seed CMS pages ───────────────────────────────────────────────────────────
  const cmsPages = [
    {
      slug: 'call-to-action',
      title: 'הצטרפו למהפכת ההצלה',
      content: `## כל שנייה קובעת

בכל שנה, אלפי אנשים מפסידים את חייהם בגלל דום לב פתאומי באזורים מרוחקים.
הסיכוי לשרוד דום לב יורד ב-10% עם כל דקה שעוברת ללא טיפול.

עם טכנולוגיית **LoRa** ורשת **Meshtastic**, אנו יוצרים רשת הצלה שעובדת גם במקומות ללא קליטה סלולרית.

### איך אתם יכולים לעזור?

- הצטרפו כמתנדבים עם דפיברילטור נייד
- רכשו מכשיר LoRa והצטרפו לרשת המש
- שתפו את הפרויקט עם חברים ומשפחה`,
      updatedAt: new Date(),
      updatedBy: 'system',
    },
    {
      slug: 'purchasing-guide',
      title: 'מדריך רכישה — מכשירי LoRa ודפיברילטורים',
      content: `## מכשירי LoRa מומלצים (תדר 433MHz)

לשימוש בישראל, יש לוודא שהמכשיר תומך בתדר **433MHz** (תדר ISM המאושר בישראל).

### מכשירים מומלצים:

1. **LILYGO T-Beam v1.2** — כולל GPS מובנה ומודול LoRa. מושלם למתנדבים ברכיבה.
2. **Heltec WiFi LoRa 32 V3** — מכשיר קומפקטי עם מסך OLED מובנה.
3. **RAK WisBlock** — מודולרי, ניתן להרכבה בהתאמה אישית.

### דפיברילטורים ניידים:

דפיברילטור נייד (AED) הוא מכשיר קומפקטי שיכול להציל חיים.
מומלץ לרכוש דגמים מאושרים ע"י משרד הבריאות.`,
      updatedAt: new Date(),
      updatedBy: 'system',
    },
    {
      slug: 'maintenance-info',
      title: 'תחזוקת ציוד — שמירה על מוכנות',
      content: `## תחזוקת מכשיר LoRa

- טענו את הסוללה לפחות פעם בשבוע
- ודאו שהאנטנה מחוברת כהלכה
- עדכנו את קושחת Meshtastic בכל גרסה חדשה
- בדקו את מצב ה-GPS — ודאו שהמיקום מדויק

## תחזוקת דפיברילטור

- בדקו את תאריך התפוגה של הפדים (אלקטרודות)
- ודאו שהסוללה טעונה (נורית ירוקה דולקת)
- אחסנו במקום יבש בטמפרטורה סבירה
- בצעו בדיקה עצמית חודשית`,
      updatedAt: new Date(),
      updatedBy: 'system',
    },
  ];

  await mongodb.collection('cms_pages').deleteMany({});
  await mongodb.collection('cms_pages').insertMany(cmsPages);
  await mongodb.collection('cms_pages').createIndex({ slug: 1 }, { unique: true });
  console.log('📄 Seeded 3 CMS pages (Markdown format)');

  // ── VERIFICATION: count what actually landed in MongoDB ─────────────────────
  const telemetryCount = await mongodb.collection('device_telemetry').countDocuments();
  const cmsCount = await mongodb.collection('cms_pages').countDocuments();
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 VERIFICATION — documents in lora_defi database:');
  console.log(`   device_telemetry: ${telemetryCount} documents  ${telemetryCount === 50 ? '✅' : '❌ EXPECTED 50'}`);
  console.log(`   cms_pages:        ${cmsCount} documents  ${cmsCount === 3 ? '✅' : '❌ EXPECTED 3'}`);
  console.log('═══════════════════════════════════════════════');

  // ── Clean up ─────────────────────────────────────────────────────────────────
  await pool.end();
  await mongoClient.close();
  console.log('\n✨ Seed complete! Databases are ready.\n');
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message || err);
  process.exit(1);
});
