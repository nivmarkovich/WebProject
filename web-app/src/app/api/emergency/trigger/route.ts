// ============================================================
// API Route: Emergency Simulation — Trigger and List Events
// ============================================================
// קובץ זה הוא ה"מוח" של כל הפרויקט — הלוגיקה העסקית המרכזית.
// כשהמשתמש לוחץ "הפעל התראת חירום" בסימולטור, בקשת POST מגיעה לכאן.
//
// תהליך שלם (End-to-End):
// 1. קבלת מיקום GPS ורדיוס מהלקוח
// 2. שאילתה גיאוגרפית ב-MongoDB לאיתור מכשירים בטווח
// 3. שליפת פרטי המתנדבים המתאימים מ-PostgreSQL
// 4. חישוב מסלול אופניים עבור כל מתנדב דרך OpenRouteService API
// 5. שמירת אירוע החירום ב-MongoDB
// 6. עדכון נקודות גיימיפיקציה ב-PostgreSQL
// 7. החזרת כל הנתונים לsimulator שמציג אותם על המפה
//
// Next.js App Router:
// קובץ route.ts בתוך תיקיית app/api/emergency/trigger
// => URL: /api/emergency/trigger
// הפונקציות POST ו-GET מייצגות את HTTP Methods התואמים.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';       // חיבור PostgreSQL (volunteers, scores)
import { getMongoDb } from '@/lib/db/mongodb'; // חיבור MongoDB (device_telemetry)
import { getBicycleRoute } from '@/lib/ors';   // חישוב מסלול אופניים דרך ORS API

// ==========================================
// POST /api/emergency/trigger
// ==========================================
export async function POST(req: NextRequest) {
  try {
    // ── פענוח גוף הבקשה ────────────────────────────────────────────────────
    // הלקוח שולח JSON: { lat, lng, radiusKm }
    // lat/lng: קואורדינטות מיקום החירום (לחיצה על המפה)
    // radiusKm: הרדיוס שהמשתמש בחר (10-50 ק"מ), ברירת מחדל 15
    const body = await req.json();
    const { lat, lng, radiusKm = 15 } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'מיקום חירום נדרש' }, { status: 400 });
    }

    // ── קבלת חיבור MongoDB ─────────────────────────────────────────────────
    const mongodb = await getMongoDb();

    // ── המרת הרדיוס לרדיאנים ──────────────────────────────────────────────
    // MongoDB $centerSphere מצפה לרדיוס ב-radians, לא בקילומטרים.
    // נוסחה: radians = km / earthRadiusKm
    // רדיוס כדור הארץ = 6378.1 ק"מ (ממוצע)
    // דוגמה: 20 ק"מ / 6378.1 = 0.003136 radians
    const earthRadiusKm = 6378.1;
    const radiusInRadians = radiusKm / earthRadiusKm;

    // ──────────────────────────────────────────────────────────────────────────
    // שלב 1: שאילתה גיאוגרפית ב-MongoDB — $geoWithin
    // ──────────────────────────────────────────────────────────────────────────
    // $geoWithin: מוצא מסמכים שה-location שלהם נמצאת בתוך צורה גיאוגרפית.
    // $centerSphere: מגדיר ספירה (כדור) — מרכז + רדיוס.
    //
    // ⚠️ סדר קואורדינטות קריטי:
    //   MongoDB ו-GeoJSON: [lng, lat] — אורך גיאוגרפי ראשון!
    //   Leaflet: [lat, lng] — רוחב גיאוגרפי ראשון!
    // ב-$centerSphere נשלח [lng, lat] לפי תקן GeoJSON.
    //
    // כדי שהשאילתה תעבוד, חייב להיות 2dsphere index על שדה location.
    // Index זה נוצר ב-getMongoDb() בעת האתחול.
    const geoQuery = {
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians], // [lng, lat] — GeoJSON order!
        },
      },
    };

    // מריצים את השאילתה ומקבלים מערך של מסמכי device_telemetry
    const nearbyDevices = await mongodb
      .collection('device_telemetry')
      .find(geoQuery)
      .toArray();

    // אם לא נמצאו מתנדבים בטווח — מחזירים תשובה מוסברת (לא שגיאה)
    if (nearbyDevices.length === 0) {
      return NextResponse.json({
        message: 'לא נמצאו מתנדבים בטווח. נסה להגדיל את הרדיוס.',
        notifiedVolunteers: [],
        totalNearby: 0,
        totalNotified: 0,
        emergencyLocation: { lat, lng },
        radiusKm,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // שלב 2: דגימה אקראית — מקסימום 15 מתנדבים לסימולציה
    // ──────────────────────────────────────────────────────────────────────────
    // sort(() => Math.random() - 0.5): שינוי סדר אקראי (Fisher-Yates-like).
    // Math.random() מחזיר 0-1. חיסור 0.5 נותן ערכים שליליים וחיוביים
    // בהתפלגות שווה — תוצאה: כל איבר יכול לקדום או לאחר אחרים.
    // slice(0, 15): לוקחים את ה-15 הראשונים מהמערך המעורבב.
    const shuffled = nearbyDevices.sort(() => Math.random() - 0.5);
    const sampled = shuffled.slice(0, Math.min(15, shuffled.length));

    // ──────────────────────────────────────────────────────────────────────────
    // שלב 3: שליפת פרטי המתנדבים מ-PostgreSQL
    // ──────────────────────────────────────────────────────────────────────────
    // MongoDB שומר רק נתוני מיקום ו-GPS (device_telemetry).
    // פרטי המתנדב (שם, טלפון, has_lora) שמורים ב-PostgreSQL (volunteers).
    // אנחנו משלבים את שתי הDB בשאילתה אחת.
    //
    // ANY($1): מקבל מערך של IDs ובודק האם v.id שייך למערך.
    //   שקול ל: WHERE v.id IN (1, 2, 3, ...) אבל בטוח יותר מ-Injection.
    // LEFT JOIN: מאחד עם טבלת volunteer_scores.
    //   LEFT = מחזיר גם שורות שאין להם ניקוד עדיין (null = 0 נקודות).
    const volunteerIds = sampled.map((d) => d.volunteerId);
    const volunteersResult = await pool.query(
      `SELECT v.*, vs.total_points, vs.responses 
       FROM volunteers v
       LEFT JOIN volunteer_scores vs ON v.id = vs.volunteer_id
       WHERE v.id = ANY($1)`,
      [volunteerIds]
    );

    // Map לחיפוש מהיר O(1) לפי ID: { volunteerId → volunteerData }
    const volunteersMap = new Map(
      volunteersResult.rows.map((v) => [v.id, v])
    );

    // ──────────────────────────────────────────────────────────────────────────
    // שלב 4: חישוב מסלול אופניים דרך OpenRouteService (ORS)
    // ──────────────────────────────────────────────────────────────────────────
    const notifiedVolunteers = [];
    let skippedNoRoute = 0;  // סופר כמה מתנדבים דולגו כי לא נמצא מסלול
    let skippedTooFar = 0;   // סופר כמה מתנדבים דולגו כי המסלול ארוך מדי

    for (const device of sampled) {
      const volunteer = volunteersMap.get(device.volunteerId);
      if (!volunteer) continue; // מתנדב נמחק מPostgreSQL? מדלגים.

      // ── חילוץ קואורדינטות ─────────────────────────────────────────────
      // MongoDB שומר כ-GeoJSON: { type: 'Point', coordinates: [lng, lat] }
      // Destructuring: [deviceLng, deviceLat] — שם lng ראשון!
      // שגיאה נפוצה: לחלץ [lat, lng] ואז לשלוח ל-ORS הפוך.
      const [deviceLng, deviceLat] = device.location.coordinates;

      // ── קריאה ל-OpenRouteService API ──────────────────────────────────
      // getBicycleRoute(fromLng, fromLat, toLng, toLat)
      // ORS מחזיר: { distanceKm, durationMin, geometry: GeoJSON LineString, isFallback }
      // isFallback=true אומר שלא הייתה אינטרנט/מפתח ומחזיר קו ישר (פחות מדויק).
      // נשלח: [מיקום מתנדב] → [מיקום חירום]
      let route = null;
      try {
        route = await getBicycleRoute(deviceLng, deviceLat, lng, lat);
      } catch (routeErr) {
        const msg = routeErr instanceof Error ? routeErr.message : JSON.stringify(routeErr);
        console.error(`   ❌ Route error for volunteer ${device.volunteerId}:`, msg);
      }

      // אם לא הוחזר מסלול כלל — מדלגים על מתנדב זה
      if (!route) {
        skippedNoRoute++;
        continue;
      }

      // ── סינון לפי מרחק ────────────────────────────────────────────────
      // threshold: פי 2 מרדיוס החיפוש הישר.
      // נתיב אופניים יכול להיות ארוך יותר מהמרחק הישר בגלל כבישים ועקמומיות.
      // אם מסלול האופניים ארוך פי 2 מהרדיוס — המתנדב רחוק מדי.
      const threshold = radiusKm * 2;
      if (route.distanceKm > threshold) {
        skippedTooFar++;
        continue;
      }

      // ── חישוב ערוץ ההתראה ─────────────────────────────────────────────
      // channel מגדיר איך מתנדב זה יקבל התראה בפרויקט האמיתי:
      //   'both': יש לו LoRa פעיל וגם מספר טלפון — שני ערוצים
      //   'lora': יש לו LoRa בלבד (ללא טלפון — נדיר אבל אפשרי)
      //   'sms':  אין LoRa — קבלת התראה דרך SMS בלבד
      // device.isOnline: האם ה-LoRa שידר לאחרונה (עד שעה אחורה)
      let channel: 'lora' | 'sms' | 'both' = 'sms';
      if (volunteer.has_lora && device.isOnline) {
        channel = volunteer.mobile_number ? 'both' : 'lora';
      }

      // ── חישוב זמן תגובה סימולטיבי ────────────────────────────────────
      // 30-90 שניות + פי 2 מזמן הנסיעה = זמן "כולל" של הגעה
      // הוספת אקראיות כי זמן אמיתי תלוי ברמת ערנות המתנדב
      const responseTimeSec = Math.floor(30 + Math.random() * 60 + route.durationMin * 2);

      // ── חישוב נקודות גיימיפיקציה ─────────────────────────────────────
      // ניקוד מינימלי: 10 נקודות על כל תגובה
      // בונוס על מהירות: ±10 נקודות אם מגיע תוך 5 דקות
      // בונוס LoRa: +3 נקודות למי שמשדר LoRa (תורם לרשת)
      // בונוס סוללה: +2 אם הסוללה מעל 80% (ציוד מוכן)
      let pointsAwarded = 10;
      if (route.durationMin < 5) pointsAwarded += 10;
      else if (route.durationMin < 10) pointsAwarded += 5;
      if (volunteer.has_lora) pointsAwarded += 3;
      if (device.batteryLevel > 80) pointsAwarded += 2;

      // ── הוספה לרשימת המתנדבים המועמדים ──────────────────────────────
      notifiedVolunteers.push({
        volunteerId: device.volunteerId,
        name: `${volunteer.first_name} ${volunteer.last_name || ''}`.trim(),
        channel,
        distanceKm: route.distanceKm,
        estimatedTimeMin: route.durationMin,
        // routeGeoJSON: הגיאומטריה של המסלול בפורמט LineString.
        // זהו המידע שEmergencyMap.tsx צובע על המפה כקו (polyline).
        routeGeoJSON: route.geometry,
        // deviceLocation: { lat, lng } — כבר בסדר הנכון לLeaflet
        deviceLocation: { lat: deviceLat, lng: deviceLng },
        batteryLevel: device.batteryLevel,
        lastTransmission: device.lastTransmission,
        hasLora: volunteer.has_lora,
        hasDefibrillator: volunteer.has_defibrillator,
        loraId: device.loraId,
        meshHops: device.meshHops,           // כמה ממסרים עברה ההודעה ב-Mesh
        signalStrength: device.signalStrength, // עוצמת אות ב-dBm (ערך שלילי — -80 > -120)
        responded: Math.random() > 0.2,       // 80% סיכוי לתגובה בסימולציה
        responseTimeSec,
        pointsAwarded,
      });
    }

    // מיון לפי זמן הגעה משוער — הקרוב ביותר ראשון
    notifiedVolunteers.sort((a, b) => a.estimatedTimeMin - b.estimatedTimeMin);

    // ──────────────────────────────────────────────────────────────────────────
    // שלב 5: שמירת אירוע החירום ב-MongoDB
    // ──────────────────────────────────────────────────────────────────────────
    // שומרים את כל האירוע כמסמך אחד ב-emergency_events.
    // MongoDB מתאים לזה: אחסון document גדול עם מערך מקונן של מתנדבים.
    // ב-PostgreSQL זה היה מצריך 3-4 טבלאות וJOINS מורכבים.
    const emergencyEvent = {
      triggeredAt: new Date(),
      emergencyLocation: {
        type: 'Point' as const,
        coordinates: [lng, lat], // GeoJSON תמיד [lng, lat]!
      },
      radiusKm,
      notifiedVolunteers,       // מערך מקונן של כל המתנדבים עם מסלוליהם
      totalNearby: nearbyDevices.length,
      totalNotified: notifiedVolunteers.length,
      status: 'active',
    };

    // insertOne מחזיר אובייקט עם insertedId (ObjectId של MongoDB)
    const insertResult = await mongodb
      .collection('emergency_events')
      .insertOne(emergencyEvent);

    // ──────────────────────────────────────────────────────────────────────────
    // שלב 6: עדכון ניקוד גיימיפיקציה ב-PostgreSQL
    // ──────────────────────────────────────────────────────────────────────────
    // רק מתנדבים שסומנו כ-responded=true (80% מהם) מקבלים נקודות.
    for (const vol of notifiedVolunteers) {
      if (vol.responded) {
        try {
          await pool.query(
            // UPDATE מורכב עם CASE לחישוב ממוצע מושכל (Incremental Mean)
            `UPDATE volunteer_scores SET 
              total_points = total_points + $1,
              responses = responses + 1,
              avg_response_s = CASE 
                WHEN responses = 0 THEN $2
                ELSE (avg_response_s * responses + $2) / (responses + 1)
                -- נוסחה לממוצע מצטבר: (ישן * כמות_ישנה + חדש) / כמות_חדשה
              END,
              badges = CASE
                -- badge "מציל חיים" ניתן כשמגיעים ל-50 נקודות לראשונה
                WHEN total_points + $1 >= 50 AND NOT ('מציל חיים' = ANY(badges))
                  THEN array_append(badges, 'מציל חיים')
                  -- array_append: מוסיף איבר למערך PostgreSQL
                ELSE badges
              END,
              updated_at = CURRENT_TIMESTAMP
             WHERE volunteer_id = $3`,
            [vol.pointsAwarded, vol.responseTimeSec, vol.volunteerId]
          );
        } catch (pgErr) {
          // שגיאה בעדכון ניקוד לא אמורה לכשיל את כל הסימולציה
          const msg = pgErr instanceof Error ? pgErr.message : JSON.stringify(pgErr);
          console.error(`   Score update failed for volunteer ${vol.volunteerId}:`, msg);
        }
      }
    }

    // ── החזרת תשובה ללקוח ────────────────────────────────────────────────
    // Next.js NextResponse.json() = res.json() של Express
    // הלקוח (EmergencyMap.tsx) מקבל את הנתונים ומציג על המפה
    return NextResponse.json({
      eventId: insertResult.insertedId.toString(), // ObjectId → string
      emergencyLocation: { lat, lng },
      radiusKm,
      totalNearby: nearbyDevices.length,
      totalNotified: notifiedVolunteers.length,
      notifiedVolunteers,
    });

  } catch (err) {
    // ── טיפול בשגיאות לא צפויות ─────────────────────────────────────────
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('POST /api/emergency/trigger FATAL:', message, stack);
    
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('timeout') || lowerMessage.includes('econnrefused') || lowerMessage.includes('enotfound') || lowerMessage.includes('connection')) {
      return NextResponse.json(
        { error: 'Database is currently waking up, please try again in a minute' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `שגיאת שרת: ${message}` },
      { status: 500 }
    );
  }
}

// ==========================================
// GET /api/emergency/trigger — שליפת עבר
// ==========================================
// מחזיר את 20 אירועי החירום האחרונים ב-MongoDB.
// משמש את הסימולטור להצגת היסטוריית הדמיות.
// sort({ triggeredAt: -1 }): מיון יורד = מהאחרון לראשון.
// limit(20): מגביל לדף ראשון — pagination בסיסי.
export async function GET() {
  try {
    const mongodb = await getMongoDb();
    const events = await mongodb
      .collection('emergency_events')
      .find()
      .sort({ triggeredAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('GET /api/emergency/trigger error:', message);
    
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('timeout') || lowerMessage.includes('econnrefused') || lowerMessage.includes('enotfound') || lowerMessage.includes('connection')) {
      return NextResponse.json(
        { error: 'Database is currently waking up, please try again in a minute' },
        { status: 503 }
      );
    }
    
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
