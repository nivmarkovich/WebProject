# 🚑 LoRa Defi — רשת הצלה חכמה עם דפיברילטורים ניידים

סימולטור רשת חירום המדגים כיצד טכנולוגיית **LoRa** ורשת **Meshtastic** מאפשרים שליחת התראות חירום למתנדבים עם דפיברילטורים ניידים — גם באזורים ללא קליטה סלולרית.

## 🏗️ ארכיטקטורה

הפרויקט מורכב מ-**שני שרתים** ו-**שני סוגי מסדי נתונים**:

### שרתים
| שרת | טכנולוגיה | פורט | תפקיד |
|------|----------|------|--------|
| Auth Server | Express.js | 4000 | אימות JWT (login, refresh, logout, verify) |
| Web App | Next.js 16 | 3000 | Frontend + API Routes |

### מסדי נתונים
| מסד | סוג | שימוש |
|------|------|--------|
| PostgreSQL | SQL | משתמשים, מנהלים, ניקוד מתנדבים |
| MongoDB | NoSQL | טלמטריית מכשירים, אירועי חירום, תוכן CMS |

## 🚀 התקנה והרצה

### דרישות מוקדמות
- Node.js 18+
- Docker & Docker Compose (למסדי נתונים)
- מפתח API של OpenRouteService (אופציונלי — ניתוב חלופי מובנה)

### 1. הרצת מסדי נתונים
```bash
docker-compose up -d
```

### 2. הרצת שרת האימות
```bash
cd auth-server
npm install
npm run dev
```
השרת מאתחל את טבלאות PostgreSQL ויוצר את משתמש המנהל (`micha`/`1234`) אוטומטית.

### 3. הרצת אפליקציית הווב
```bash
cd web-app
npm install
npm run dev
```

### 4. מילוי בסיס הנתונים (50 מתנדבים מדומים)
```bash
cd web-app
npx tsx scripts/seed.ts
```

### 5. גישה
- 🌐 **אפליקציה**: http://localhost:3000
- 🔐 **שרת אימות**: http://localhost:4000

## 📱 דפי האפליקציה

| דף | נתיב | תיאור |
|----|------|--------|
| דף הבית | `/` | הסבר על LoRa, תרשים זרימה, מדריך שימוש |
| סימולטור חירום | `/simulator` | מפה אינטראקטיבית, הפעלת התראה, ניתוב אופניים |
| הרשמה | `/register` | טופס רישום מתנדב |
| מידע וציוד | `/info` | קישורי רכישת LoRa, מפת דפיברילטורים מד"א |
| לוח הישגים | `/leaderboard` | ניקוד מתנדבים, תגים, טבלת מובילים |
| כניסת מנהל | `/admin/login` | התחברות JWT |
| לוח בקרה | `/admin/dashboard` | ניהול מתנדבים, עריכת תוכן CMS |

## 🔧 טכנולוגיות

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Express.js (Auth), Next.js API Routes
- **מפות**: Leaflet.js + CartoDB Dark Tiles
- **ניתוב**: OpenRouteService API (cycling-regular)
- **אימות**: JWT (access + refresh tokens), HttpOnly cookies
- **שפה**: TypeScript מלא, UI בעברית (RTL)



© 2026 LoRa Defi — פרויקט גמר אקדמי | **זהו סימולטור בלבד. במקרה חירום — חייגו 101**
