// ============================================================
// מודול חיבור PostgreSQL — Next.js API Routes
// ============================================================
// קובץ זה מייצא אובייקט Pool אחד ויחיד שמשותף לכל ה-API routes.
// PostgreSQL הוא מסד הנתונים ה-RELATIONAL שלנו (SQL).
// הוא מנהל את הנתונים המובנים: טבלת מתנדבים, ניקוד, והתחברות אדמין.
// ============================================================

import { Pool } from 'pg';

// ─── Connection Pool ──────────────────────────────────────────────────────────
// Pool הוא "בריכת חיבורים". במקום לפתוח ולסגור חיבור לDB בכל בקשת API,
// Pool מחזיק מספר חיבורים פתוחים מראש ומשאיל אותם לפי הצורך.
// זה קריטי לביצועים — פתיחת חיבור SSL לSupabase לוקחת ~100ms.
//
// DATABASE_URL מגיע מ-.env.local (בפיתוח) או מ-Vercel env vars (בייצור).
// פורמט: postgresql://[user]:[password]@[host]:[port]/[database]
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lora_defi',

  // max: מספר החיבורים המקסימלי בבריכה.
  // Supabase בתוכנית החינמית מאפשר עד 60 חיבורים בו-זמנית.
  // אנחנו מגבילים ל-10 כדי לא לגזול כל הקיבולת.
  max: 10,

  // idleTimeoutMillis: חיבור שלא השתמשו בו 30 שניות — ייסגר אוטומטית.
  // חוסך משאבים כשאין תנועה לאתר.
  idleTimeoutMillis: 30000,

  // connectionTimeoutMillis: אם לא הצלחנו לקבל חיבור מהpool תוך 2 שניות,
  // תחזור שגיאה. מונע "תקיעה" אינסופית בגלל DB לא זמין.
  connectionTimeoutMillis: 2000,

  // ssl: הצפנת TLS להעברת הנתונים.
  // rejectUnauthorized: false — מאפשר אישור SSL עצמי-חתום של Supabase.
  // בסביבת פיתוח (localhost) אין SSL כלל, לכן undefined.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// ─── Event Handler — שגיאות בלתי צפויות ─────────────────────────────────────
// אם חיבור "נפל" בצורה בלתי צפויה (ניתוק רשת, timeout של Supabase),
// pg מקבל את האירוע הזה. ללא handler זה, Node.js היה "קורס" (unhandled error).
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// ─── ייצוא ───────────────────────────────────────────────────────────────────
// ייצוא ברירת מחדל (default export) — כל API route שיעשה import לpoolהזה
// יקבל את אותו האובייקט (Singleton pattern ב-Node.js module caching).
export default pool;
