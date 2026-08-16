// ============================================================
// מודול חיבור MongoDB — Next.js API Routes
// ============================================================
// קובץ זה מספק חיבור Singleton למסד הנתונים MongoDB Atlas.
// MongoDB הוא מסד הנתונים ה-NoSQL שלנו (Document-based).
// הוא מאחסן:
//   - device_telemetry: מיקומי GPS בזמן אמת של כל מתנדב (GeoJSON)
//   - emergency_events: רשומות של כל הדמיות חירום שבוצעו
//   - cms_pages: תוכן דפי השיווק (Markdown)
//
// PROČ MongoDB ולא PostgreSQL לנתוני המיקום?
// כי MongoDB תומך ב-GeoJSON ו-2dsphere index מובנה.
// שאילתת "תן לי כל המכשירים ברדיוס X ק"מ ממיקום Y"
// היא שורת קוד אחת ב-MongoDB. ב-SQL זה מצריך Haversine formula ידנית.
// ============================================================

import { MongoClient, Db } from 'mongodb';

// ─── URI חיבור ────────────────────────────────────────────────────────────────
// הURI מגיע מ-.env.local. פורמט:
// mongodb+srv://[user]:[pass]@[cluster].mongodb.net/?appName=Cluster0
// הפרוטוקול mongodb+srv מציין SRV DNS lookup — Atlas מנהל את הנתב האמיתי.
// שים לב: אין שם DB בURI! לכן אנחנו מגדירים אותו בעצמנו בשורה 35.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lora_defi';

// ─── Singleton Pattern ────────────────────────────────────────────────────────
// ב-Next.js בסביבת פיתוח, כל שמירת קוד מריצה מחדש את המודול.
// ללא Singleton, יווצרו עשרות חיבורים מיותרים ל-Atlas.
// client ו-db מוגדרים מחוץ לפונקציה — ב-module scope.
// Node.js מאחסן מודולים ב-cache, כך שהמשתנים נשמרים בין קריאות.
let client: MongoClient;
let db: Db;

// ─── getMongoDb ───────────────────────────────────────────────────────────────
// פונקציה אסינכרונית שמחזירה אובייקט Db מחובר.
// בקריאה הראשונה: פותח חיבור ויוצר indexes.
// בכל קריאה לאחר מכן: מחזיר את אותו ה-Db מה-cache.
export async function getMongoDb(): Promise<Db> {
  // אם db כבר אוּתחל — החזר מיד ללא חיבור מחדש (cache hit)
  if (db) return db;

  // פתיחת חיבור חדש רק אם client לא קיים עדיין
  if (!client) {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout fast if DB is sleeping
    });
    await client.connect(); // TCP + TLS handshake עם Atlas
    console.log('🍃 Connected to MongoDB');
  }

  // חיבור לשם הDB המפורש 'lora_defi'.
  // קריטי! האמנות ב-URI שלנו לא מכיל שם DB (מסתיים ב-/?appName=...).
  // client.db() ללא ארגומנט יחזיר את DB ברירת המחדל 'test' — שגיאה!
  // לכן אנחנו מציינים את השם במפורש כדי לוודא שהAPI והseed כותבים לאותו מקום.
  db = client.db('lora_defi'); // שם מסד הנתונים המפורש

  // ─── יצירת Indexes ─────────────────────────────────────────────────────────
  // Index מאיץ שאילתות ספציפיות. createIndex הוא idempotent — בטוח לקרוא כמה פעמים.

  // 2dsphere index — מאפשר שאילתות גיאוגרפיות כמו $geoWithin ו-$geoNear.
  // ללא index זה, MongoDB לא יכול לחשב רדיוסים ומרחקים ביעילות.
  // זהו ה-index הכי חשוב בפרויקט — בלעדיו הסימולטור לא יעבוד!
  await db.collection('device_telemetry').createIndex({ location: '2dsphere' });

  // unique index על volunteerId — מונע כפילות, מאיץ חיפוש לפי מתנדב
  await db.collection('device_telemetry').createIndex({ volunteerId: 1 }, { unique: true });

  // index על שדה הזמן — מאיץ מיון של אירועי חירום מהחדש לישן
  await db.collection('emergency_events').createIndex({ triggeredAt: -1 });

  // unique index על slug של דפי CMS — מונע שני דפים עם אותה כתובת
  await db.collection('cms_pages').createIndex({ slug: 1 }, { unique: true });

  return db;
}

// ─── closeMongoDb ────────────────────────────────────────────────────────────
// פונקציה לסגירה נקייה של החיבור.
// משמשת בעיקר בסביבת טסטים ובסקריפט הseed.
// ב-Next.js בייצור, Vercel מנהל את מחזור החיים של הsession ולא נצטרך זאת.
export async function closeMongoDb(): Promise<void> {
  if (client) {
    await client.close();
  }
}
