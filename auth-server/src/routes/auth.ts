// ============================================================
// Auth Routes — Login, Refresh, Logout, Verify
// ============================================================
// קובץ זה מגדיר את כל נקודות הקצה (Endpoints) של שרת האימות.
// שרת האימות הוא Express.js נפרד שרץ על פורט 4000.
//
// למה שרת נפרד ולא API Route ב-Next.js?
// ============================================================
// דרישת המטלה: "שימוש לפחות בשני שרתים אחד מהם Express למימוש JWT עם יכולת רענון."
// הפרדה זו מייצגת ארכיטקטורת Microservices:
//   - Next.js (פורט 3000) = ממשק משתמש + API של הנתונים
//   - Express (פורט 4000) = שרת אימות ייעודי (Auth Server)
// ============================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';     // ספרייה להצפנת סיסמאות (hashing)
import jwt from 'jsonwebtoken'; // ספרייה ליצירת ואימות JWT tokens
import { v4 as uuidv4 } from 'uuid'; // ייצור מזהים ייחודיים (UUID v4)
import pool from '../db/postgres';   // חיבור לPostgreSQL (טבלת admins ו-refresh_tokens)
import { config } from '../config';  // הגדרות: סודות JWT, זמני תפוגה
import { validateAccessToken, AuthRequest } from '../middleware/validateToken';

const router = Router();

// ==========================================
// POST /auth/login
// ==========================================
// תהליך ההתחברות — מקבל username+password, מחזיר accessToken + refreshToken (בcookie)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // ── ולידציה בסיסית ─────────────────────────────────────────────────────
    if (!username || !password) {
      res.status(400).json({ error: 'שם משתמש וסיסמה נדרשים' });
      return;
    }

    // ── בדיקת קיום האדמין ב-DB ────────────────────────────────────────────
    // שאילתת PostgreSQL: מחפשים את האדמין לפי שם משתמש.
    // הסיסמה מאוחסנת כ-hash בלבד — לעולם לא בטקסט גלוי!
    // $1 הוא placeholder parameterized — מגן מפני SQL Injection.
    const result = await pool.query(
      'SELECT id, username, password_hash FROM admins WHERE username = $1',
      [username]
    );

    // אם לא מצאנו משתמש — מחזירים 401 עם הודעה כללית.
    // לא אומרים "שם משתמש לא קיים" — זה חושף מידע למתקיף (User Enumeration).
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      return;
    }

    const admin = result.rows[0];

    // ── אימות הסיסמה ──────────────────────────────────────────────────────
    // bcrypt.compare: מצפינה את password שהתקבלה ומשווה עם הhash ב-DB.
    // bcrypt כולל "salt" — תוספת אקראית שמונעת Rainbow Table attacks.
    // גם אם שני אדמינים בחרו את אותה סיסמה — ה-hash שלהם יהיה שונה!
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      return;
    }

    // ── יצירת Access Token ─────────────────────────────────────────────────
    // JWT = JSON Web Token. מבנה: Header.Payload.Signature (מופרדים בנקודות)
    // Payload (המידע שמוצפן): { sub: admin.id, username, role: 'admin' }
    //   - sub (Subject): מזהה המשתמש. מוסכמה סטנדרטית ב-JWT (RFC 7519).
    // accessTokenSecret: מפתח סודי לחתימת הtoken. רק שרת האימות יודע אותו.
    // expiresIn: '15m' — הtoken פג תוקף אחרי 15 דקות בלבד.
    //   למה כל כך קצר? אם הtoken נגנב, הנזק מוגבל לחלון זמן קצר.
    const accessToken = jwt.sign(
      { sub: admin.id, username: admin.username, role: 'admin' },
      config.accessTokenSecret as string,
      { expiresIn: config.accessTokenExpiry as any } // '15m'
    );

    // ── יצירת Refresh Token ────────────────────────────────────────────────
    // Refresh Token הוא token ארוך-חיים (7 ימים) ששמור ב-DB.
    // תפקידו: לאפשר קבלת access token חדש ללא הזדהות מחדש.
    // jti (JWT ID): מזהה ייחודי לkoken הספציפי הזה.
    //   אם ה-jti לא קיים ב-DB, ה-token בוטל — מנגנון הrevocation.
    const jti = uuidv4(); // נוצר: "a8f9d3c1-4e2b-..." — מזהה ייחודי
    const refreshToken = jwt.sign(
      { sub: admin.id, jti },
      config.refreshTokenSecret as string,
      { expiresIn: config.refreshTokenExpiry as any } // '7d'
    );

    // ── שמירת ה-Refresh Token ב-DB ─────────────────────────────────────────
    // אנחנו לא בוטחים רק בחתימת ה-JWT לאימות refresh tokens.
    // אנחנו גם בודקים שהjti קיים ולא "בוטל" (revoked=FALSE) בDB.
    // זה מאפשר logout אמיתי: לאחר logout, הjti מסומן כrevoked
    // ואפילו token עם חתימה תקפה לא יוכל להשתמש לרענון.
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryMs); // 7 ימים קדימה
    await pool.query(
      'INSERT INTO refresh_tokens (admin_id, token_jti, expires_at) VALUES ($1, $2, $3)',
      [admin.id, jti, expiresAt]
    );

    // ── הגדרת HttpOnly Cookie ──────────────────────────────────────────────
    // ה-Refresh Token נשלח כ-HttpOnly Cookie — לא כJSON בgody!
    // למה? HttpOnly = JavaScript בצד הלקוח לא יכול לגשת לcookie.
    // זה מגן מפני מתקפת XSS (Cross-Site Scripting):
    //   גם אם תוקף מצליח להריץ JavaScript זדוני באתר,
    //   הוא לא יוכל לגנוב את ה-refresh token.
    // secure: true = שולח רק על HTTPS (לא HTTP) בסביבת ייצור.
    // sameSite: 'strict' = מגן מפני CSRF (Cross-Site Request Forgery).
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.refreshTokenExpiryMs, // אורך חיים ב-ms
      path: '/auth', // הcookie נשלח רק לנתיבים שמתחילים ב-/auth
    });

    // ─ החזרת ה-Access Token ל-client ─
    // ה-Access Token נשלח ב-JSON body — הllient שומר אותו ב-memory (לא ב-localStorage!).
    res.json({
      accessToken,
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    console.error('Login error:', err);
    const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (errorMessage.includes('timeout') || errorMessage.includes('econnrefused') || errorMessage.includes('enotfound') || errorMessage.includes('connection')) {
      res.status(503).json({ error: 'Database is currently waking up, please try again in a minute' });
      return;
    }
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ==========================================
// POST /auth/refresh — JWT Rotation
// ==========================================
// זהו לב מנגנון הרענון.
// הClient שולח בקשה כאשר ה-Access Token שלו פג תוקף.
// הCookie עם ה-Refresh Token נשלח אוטומטית על ידי הדפדפן.
// השרת בודק, מבטל את ה-Refresh Token הישן, ומנפיק זוג חדש.
// תהליך זה נקרא "Refresh Token Rotation" — best practice אבטחתית.
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // ה-cookie נקרא אוטומטית על ידי middleware cookie-parser
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'אסימון רענון חסר' });
      return;
    }

    // ── אימות חתימת ה-Refresh Token ───────────────────────────────────────
    // שלב 1: jwt.verify בודק שהחתימה תקפה ושהtoken לא פג תוקף.
    // אם הtoken זויף או שהסוד שונה — תיזרק שגיאה ונחזיר 401.
    let decoded: { sub: number; jti: string };
    try {
      decoded = jwt.verify(refreshToken, config.refreshTokenSecret as string) as unknown as {
        sub: number;
        jti: string;
      };
    } catch {
      res.status(401).json({ error: 'אסימון רענון לא תקין' });
      return;
    }

    // ── בדיקת תקינות ב-DB (Revocation Check) ─────────────────────────────
    // שלב 2: גם אם החתימה תקפה — אנחנו בודקים שהjti קיים ב-DB
    // ושהוא לא בוטל (revoked=FALSE) ולא פג תוקף (expires_at > NOW()).
    // זה מסנן: tokens שבוטלו עם logout, ו-replay attacks.
    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_jti = $1 AND revoked = FALSE AND expires_at > NOW()',
      [decoded.jti]
    );

    if (tokenResult.rows.length === 0) {
      res.status(401).json({ error: 'אסימון רענון בוטל או פג תוקף' });
      return;
    }

    // ── ביטול ה-Refresh Token הישן (Rotation) ────────────────────────────
    // שלב 3: מסמן את הjti הישן כ-revoked=TRUE.
    // אחרי הרענון, אף אחד לא יוכל להשתמש ב-token הישן הזה שוב.
    // זה עוצר Refresh Token Reuse Attack: אם תוקף מצא token ישן,
    // הוא כבר לא יוכל להשתמש בו כי הMissing כבר rotated.
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE token_jti = $1',
      [decoded.jti]
    );

    // ── שליפת פרטי האדמין מה-DB ───────────────────────────────────────────
    // אנחנו לא סומכים על הpayload של ה-token הישן לגמרי —
    // שולפים את הפרטים הרלוונטיים ישירות מה-DB כדי לוודא שהמשתמש עדיין פעיל.
    const adminResult = await pool.query(
      'SELECT id, username FROM admins WHERE id = $1',
      [decoded.sub]
    );

    if (adminResult.rows.length === 0) {
      res.status(401).json({ error: 'מנהל לא נמצא' });
      return;
    }

    const admin = adminResult.rows[0];

    // ── הנפקת זוג Tokens חדש ──────────────────────────────────────────────
    // שלב 4: יוצרים Access Token חדש ו-Refresh Token חדש עם jti חדש.
    // ה-jti החדש נשמר ב-DB. המחזור מתחיל מחדש.
    const newAccessToken = jwt.sign(
      { sub: admin.id, username: admin.username, role: 'admin' },
      config.accessTokenSecret as string,
      { expiresIn: config.accessTokenExpiry as any }
    );

    const newJti = uuidv4();
    const newRefreshToken = jwt.sign(
      { sub: admin.id, jti: newJti },
      config.refreshTokenSecret as string,
      { expiresIn: config.refreshTokenExpiry as any }
    );

    // ── שמירת Refresh Token חדש ב-DB ──────────────────────────────────────
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryMs);
    await pool.query(
      'INSERT INTO refresh_tokens (admin_id, token_jti, expires_at) VALUES ($1, $2, $3)',
      [admin.id, newJti, expiresAt]
    );

    // ── עדכון ה-Cookie עם ה-Refresh Token החדש ────────────────────────────
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.refreshTokenExpiryMs,
      path: '/auth',
    });

    res.json({
      accessToken: newAccessToken,
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (errorMessage.includes('timeout') || errorMessage.includes('econnrefused') || errorMessage.includes('enotfound') || errorMessage.includes('connection')) {
      res.status(503).json({ error: 'Database is currently waking up, please try again in a minute' });
      return;
    }
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ==========================================
// POST /auth/logout
// ==========================================
// התנתקות: מבטל את ה-Refresh Token ומוחק את ה-Cookie.
// ה-Access Token יפוג מעצמו אחרי 15 דקות (אי אפשר "לבטל" JWT קצר-חיים).
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        // מנסה לפרוס את ה-token ולשלוף את ה-jti
        const decoded = jwt.verify(refreshToken, config.refreshTokenSecret as string) as unknown as {
          jti: string;
        };
        // מסמן כ-revoked ב-DB — מנגנון הביטול האמיתי
        await pool.query(
          'UPDATE refresh_tokens SET revoked = TRUE WHERE token_jti = $1',
          [decoded.jti]
        );
      } catch {
        // אם ה-token כבר לא תקף — לא נורא, ממשיכים למחיקת ה-Cookie
      }
    }

    // ── מחיקת ה-Cookie ────────────────────────────────────────────────────
    // clearCookie שולח Set-Cookie עם maxAge=0, שגורם לדפדפן למחוק את ה-cookie.
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
    });

    res.json({ message: 'התנתקת בהצלחה' });
  } catch (err) {
    console.error('Logout error:', err);
    const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (errorMessage.includes('timeout') || errorMessage.includes('econnrefused') || errorMessage.includes('enotfound') || errorMessage.includes('connection')) {
      res.status(503).json({ error: 'Database is currently waking up, please try again in a minute' });
      return;
    }
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ==========================================
// GET /auth/verify
// ==========================================
// מאמת שה-Access Token שנשלח ב-Authorization header תקין.
// משמש את Next.js לבדוק אם המשתמש מחובר (ב-middleware ובדפי אדמין).
// validateAccessToken הוא middleware שרץ לפני ה-handler:
//   - מחלץ את הtoken מה-header
//   - מאמת את החתימה
//   - מוסיף adminId ו-adminUsername ל-req
router.get('/verify', validateAccessToken, (req: AuthRequest, res: Response) => {
  // אם הגענו לכאן — validateAccessToken אישר את הtoken
  res.json({
    valid: true,
    admin: {
      id: req.adminId,
      username: req.adminUsername,
    },
  });
});

export default router;
