'use client';

// ============================================================
// EmergencyMap.tsx — קומפוננטת המפה האינטראקטיבית
// ============================================================
// קובץ זה הוא Client Component המכיל את כל ה-Leaflet map logic.
//
// למה 'use client'?
// בNext.js App Router, כל קומפוננטה היא Server Component כברירת מחדל.
// Leaflet זקוק לglobal `window` ו-DOM שלא קיימים בServer.
// 'use client' מסמן: "קמפל ושלח קוד זה רק לדפדפן, לא לשרת."
//
// למה next/dynamic עם ssr:false?
// גם עם 'use client', Next.js עדיין עושה Server-Side Rendering של ה-HTML.
// next/dynamic({ ssr: false }) מונע זאת לחלוטין עבור קומפוננטה זו.
// ב-MermaidWrapper.tsx כבר עשינו זאת עבור EmergencyMap.
//
// מערכת קואורדינטות — הבנה קריטית:
// ============================================================
// ┌─────────────────┬────────────────────────────────────────┐
// │  ספרייה         │  סדר קואורדינטות                        │
// ├─────────────────┼────────────────────────────────────────┤
// │  Leaflet        │  [lat, lng]  — רוחב גיאוגרפי ראשון    │
// │  GeoJSON/ORS    │  [lng, lat]  — אורך גיאוגרפי ראשון    │
// │  MongoDB        │  [lng, lat]  — תקן GeoJSON             │
// └─────────────────┴────────────────────────────────────────┘
// טעות בסדר = סמנים מופיעים בים התיכון במקום בישראל!
// ============================================================

// Loaded via next/dynamic with ssr:false from MermaidWrapper — never runs on server.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── תיקון icons של Leaflet בסביבת Webpack/Next.js ───────────────────────────
// Leaflet מנסה לטעון קבצי PNG של icons דרך URL יחסי.
// Webpack (שNext.js משתמש בו) מבלבל את הנתיב.
// הפתרון: מוחקים את ה-getter הבעייתי ומגדירים CDN URLs ישירות.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
// NotifiedVolunteer: הטיפוס שמגיע מהAPI (/api/emergency/trigger)
// מגדיר את המבנה המדויק של כל מתנדב שנמצא בטווח החירום
export interface NotifiedVolunteer {
  volunteerId: number;
  name: string;
  channel: 'lora' | 'sms' | 'both'; // ערוץ ההתראה
  distanceKm: number;
  estimatedTimeMin: number;
  // GeoJSON LineString — coordinates are [lng, lat] pairs (GeoJSON standard)
  // זוהי הגיאומטריה של מסלול האופניים שהוחזרה מOpenRouteService
  routeGeoJSON: GeoJSON.LineString;
  // Already extracted as { lat, lng } in the API route
  deviceLocation: { lat: number; lng: number };
  batteryLevel: number;
  lastTransmission: string;
  hasLora: boolean;
  hasDefibrillator: boolean;
  loraId: string | null;
  meshHops: number;       // כמה Mesh relays עברה ההודעה
  signalStrength: number; // עוצמת אות LoRa ב-dBm
  responded: boolean;
  responseTimeSec: number;
  pointsAwarded: number;
}

// EmergencyMapProps: הProps שהקומפוננטה מקבלת מהדף האב (simulator/page.tsx)
interface EmergencyMapProps {
  emergencyLocation: { lat: number; lng: number } | null; // null = טרם נבחר מיקום
  volunteers: NotifiedVolunteer[];
  radiusKm: number;
  onMapClick: (lat: number, lng: number) => void; // callback ללחיצה על המפה
  isLoading: boolean;
}

// ─── Coordinate Helper ────────────────────────────────────────────────────────
// Leaflet always wants [lat, lng].
// GeoJSON (ORS routes, MongoDB) always stores [lng, lat].
// Conversion: geoJsonCoord → leaflet = [coord[1], coord[0]]
function toLeaflet(lat: number, lng: number): L.LatLngTuple {
  return [lat, lng]; // already correct order for Leaflet
}

export default function EmergencyMap({
  emergencyLocation,
  volunteers,
  radiusKm,
  onMapClick,
  isLoading,
}: EmergencyMapProps) {
  // ─── Refs — מצביעים לאובייקטים של Leaflet ─────────────────────────────────
  // useRef במקום useState: שינוי ב-ref לא מריץ re-render.
  // Leaflet מנהל את ה-DOM שלו — React לא צריך לדעת על שינויים פנימיים שלו.
  const containerRef = useRef<HTMLDivElement>(null);      // ה-div שLeaflet ימלא
  const mapRef = useRef<L.Map | null>(null);              // אובייקט המפה הראשי
  const markersRef = useRef<L.LayerGroup | null>(null);   // שכבת הסמנים (markers)
  const routesRef = useRef<L.LayerGroup | null>(null);    // שכבת הפוליליינים (routes)
  const circleRef = useRef<L.Circle | null>(null);        // עיגול הרדיוס

  // ─── Stable Callback Ref ──────────────────────────────────────────────────
  // בעיה: onMapClick עשוי להשתנות בין renders של הדף האב.
  // אם נשתמש בפונקציה ישירות בuseEffect, נצטרך לרשום אותה ב-deps array.
  // זה יגרום ל-useEffect לרוץ שוב ואנחנו נצור מפה חדשה כל פעם — קריסה!
  // פתרון: Ref שמצביע תמיד ל-callback הנוכחי. המפה יכולה להשתמש ב-Ref בטוחה.
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // ──────────────────────────────────────────────────────────────────────────
  // useEffect מס' 1: אתחול המפה — רץ פעם אחת בלבד
  // ──────────────────────────────────────────────────────────────────────────
  // [] כ-dependency array = כמו componentDidMount.
  // מאתחל את Leaflet, מגדיר tiles, ומרשים click handler.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── הגנה מפני StrictMode של React ───────────────────────────────────
    // React StrictMode מריץ כל useEffect פעמיים בפיתוח:
    //   mount → unmount → mount
    // בסיום mount הראשון, Leaflet מוסיף _leaflet_id ל-div.
    // בהתחלה של mount השני, אנחנו בודקים: אם _leaflet_id קיים — דלג!
    // ללא הגנה זו, Leaflet היה נקרא פעמיים על אותו div וקורס.
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

    // ── יצירת המפה ──────────────────────────────────────────────────────
    // מרכז מיקום ישראל: lat 32.05, lng 34.95 — זה מכסה את כל אשכולות הנתונים
    // Ben Shemen ~31.95N, Carmel ~32.73N, Be'eri ~31.42N
    const map = L.map(container, {
      center: [32.05, 34.95],  // ישראל
      zoom: 9,                  // zoom 9 = כל הארץ גלויה
      zoomControl: false,       // נוסיף בידנו ב-topleft
    });

    // ── שכבת Tiles (רקע המפה) ─────────────────────────────────────────
    // CartoDB Dark: מפה כהה שמתאימה לDesign System הכהה שלנו.
    // {s}: subdomain (a/b/c) — מפזר את הטעינה על מספר שרתים
    // {z}/{x}/{y}: Tile coordinates — זום/עמודה/שורה
    // {r}: @2x לRetina displays
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | CartoDB',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // ── Layer Groups — ניהול שכבות ─────────────────────────────────────
    // LayerGroup מאפשר לנו לנקות את כל הסמנים בשורה אחת (clearLayers).
    // ללא זה, היינו צריכים לעקוב אחרי כל סמן בנפרד.
    markersRef.current = L.layerGroup().addTo(map);
    routesRef.current = L.layerGroup().addTo(map);

    // ── Click Handler ──────────────────────────────────────────────────
    // משתמש ב-ref הstable כדי לא לגרום ל-useEffect לרוץ שוב.
    // e.latlng.lat/lng: Leaflet מחזיר תמיד [lat, lng].
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    // ── Cleanup (Unmount) ────────────────────────────────────────────
    // פונקציית cleanup רצה כש:
    //   1. הקומפוננטה מ-unmount (ניווט לדף אחר)
    //   2. בפיתוח: StrictMode unmount בין שני ה-mounts
    // map.remove() מנקה את כל ה-DOM של Leaflet בצורה בטוחה
    return () => {
      try { map.remove(); } catch { /* ignore */ }
      mapRef.current = null;
      markersRef.current = null;
      routesRef.current = null;
      circleRef.current = null;
    };
  }, []); // empty deps — run once only

  // ──────────────────────────────────────────────────────────────────────────
  // useEffect מס' 2: ציור תוכן המפה — רץ בכל פעם שמתנדבים/מיקום משתנה
  // ──────────────────────────────────────────────────────────────────────────
  // כל Leaflet layer mutations מרוכזות ב-effect אחד כדי למנוע conflicts.
  // dependency: [emergencyLocation, volunteers, radiusKm]
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const routes = routesRef.current;
    if (!map || !markers || !routes) return; // המפה טרם אותחלה

    // ── ניקוי קודם ─────────────────────────────────────────────────────
    // לפני כל ציור חדש — מוחקים את הישן.
    // clearLayers() מסיר את כל הcildren מהLayerGroup ומה-DOM.
    markers.clearLayers();
    routes.clearLayers();
    if (circleRef.current) {
      try { map.removeLayer(circleRef.current); } catch { /* ignore */ }
      circleRef.current = null;
    }

    if (!emergencyLocation) return; // אם אין מיקום — אין מה לצייר

    const { lat, lng } = emergencyLocation;

    // ── סמן מיקום החירום (אדום, פועם) ────────────────────────────────
    // divIcon: מאפשר HTML מותאם אישית במקום תמונת PNG סטנדרטית.
    // box-shadow עם opacity: אפקט "זוהר" (glow) אדום
    const emergencyIcon = L.divIcon({
      html: `<div style="
        width:48px;height:48px;
        background:linear-gradient(135deg,#ef4444,#dc2626);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:24px;
        box-shadow:0 0 30px rgba(239,68,68,0.6),0 0 60px rgba(239,68,68,0.3);
        border:3px solid rgba(255,255,255,0.3);
      ">🚨</div>`,
      className: '',    // מנקה את class הברירת מחדל של Leaflet
      iconSize: [48, 48],
      iconAnchor: [24, 24], // נקודת העיגון = מרכז האיקון
    });

    // bindPopup: tooltip שמופיע בלחיצה על הסמן
    L.marker(toLeaflet(lat, lng), { icon: emergencyIcon })
      .bindPopup(`<div style="text-align:center"><strong>📍 מיקום חירום</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`)
      .addTo(markers);

    // ── עיגול רדיוס ─────────────────────────────────────────────────
    // L.circle: עיגול על המפה. radius ב-מטרים (לא ק"מ!)
    // fillOpacity נמוך (0.07) — שקוף, רק גבול גלוי
    // dashArray: '10 5' — קו מקווקוו (10px קו, 5px רווח)
    circleRef.current = L.circle(toLeaflet(lat, lng), {
      radius: radiusKm * 1000, // ק"מ → מטרים
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.07,
      weight: 2,
      dashArray: '10 5',
    }).addTo(map);

    // אם אין מתנדבים עדיין — zoom למיקום החירום
    if (volunteers.length === 0) {
      map.setView(toLeaflet(lat, lng), Math.max(map.getZoom(), 12));
      return;
    }

    // ── סמנים ומסלולים של מתנדבים ───────────────────────────────────
    // palette: צבעים לכל מתנדב. % palette.length = חוזר מהתחלה אחרי 7
    const palette = ['#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];

    volunteers.forEach((vol, i) => {
      const color = palette[i % palette.length];

      // vol.deviceLocation.lat/lng: כבר בסדר הנכון { lat, lng }
      const volLat = vol.deviceLocation.lat;
      const volLng = vol.deviceLocation.lng;

      // ── אייקון מתנדב דינמי ────────────────────────────────────────
      // LoRa → ציאן, SMS בלבד → ענבר
      // דפיברילטור → ❤️, LoRa בלבד → 📡
      const volIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          background:${vol.hasLora
            ? 'linear-gradient(135deg,#06b6d4,#0891b2)'
            : 'linear-gradient(135deg,#f59e0b,#d97706)'};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
          box-shadow:0 0 15px ${vol.hasLora ? 'rgba(6,182,212,0.5)' : 'rgba(245,158,11,0.5)'};
          border:2px solid rgba(255,255,255,0.3);
        ">${vol.hasDefibrillator ? '🫀' : '📡'}</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const channelLabel = vol.channel === 'both' ? 'LoRa + SMS' : vol.channel === 'lora' ? 'LoRa' : 'SMS';
      const channelColor = vol.channel !== 'sms' ? '#06b6d4' : '#f59e0b';

      // ── Popup עם פרטי המתנדב ──────────────────────────────────────
      // dir:rtl = עברית מימין לשמאל בתוך הpopup
      L.marker(toLeaflet(volLat, volLng), { icon: volIcon })
        .bindPopup(`
          <div style="min-width:200px;direction:rtl;">
            <strong style="font-size:14px;">${vol.name}</strong><br/>
            <div style="margin-top:8px;">
              <span style="color:${channelColor};font-weight:bold;">📢 ${channelLabel}</span><br/>
              📏 ${vol.distanceKm} ק"מ | ⏱️ ${vol.estimatedTimeMin} דקות<br/>
              🔋 ${vol.batteryLevel}% | 📶 ${vol.signalStrength} dBm<br/>
              ${vol.loraId ? `📡 ${vol.loraId} (${vol.meshHops} hops)<br/>` : ''}
              ${vol.responded
                ? '<span style="color:#10b981;">✅ הגיב</span>'
                : '<span style="color:#ef4444;">❌ לא הגיב</span>'}
              | +${vol.pointsAwarded} נקודות
            </div>
          </div>
        `)
        .addTo(markers);

      // ── ציור מסלול אופניים — Polyline ────────────────────────────
      // routeGeoJSON.coordinates: מערך של [lng, lat] pairs (GeoJSON!)
      // חייב לעבור המרה ל-[lat, lng] עבור Leaflet (c[1], c[0])
      // Array.isArray(coords) && coords.length >= 2: ולידציה לפני ציור
      const coords = vol.routeGeoJSON?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const latlngs: L.LatLngTuple[] = coords.map(
          (c: number[]) => [c[1], c[0]] as L.LatLngTuple // [lng,lat] → [lat,lng]
        );
        L.polyline(latlngs, {
          color,         // כל מתנדב קיבל צבע ייחודי מה-palette
          weight: 3,     // עובי הקו בpixels
          opacity: 0.85,
          dashArray: '10 5', // קו מקווקוו = מסלול, לא גבול
        }).addTo(routes);
      }
    });

    // ── Fit Bounds — Zoom אוטומטי לכל הסמנים ───────────────────────
    // LatLngBounds: מלבן תוחם שמכיל את כל נקודות המפה.
    // fitBounds: עושה zoom+pan כדי שכל הסמנים יהיו גלויים.
    // padding: [60,60] = 60px ריפוד מסביב לגבולות
    // maxZoom: 14 = לא יתקרב יותר מדי גם אם יש נקודה אחת
    const bounds: L.LatLngTuple[] = [
      toLeaflet(lat, lng),
      ...volunteers.map(v => toLeaflet(v.deviceLocation.lat, v.deviceLocation.lng)),
    ];
    try {
      map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 14 });
    } catch { /* ignore if bounds are degenerate */ }

  }, [emergencyLocation, volunteers, radiusKm]); // mapRef is stable, no need to list

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10">
      {/* containerRef: ה-div שLeaflet ישתמש בו כ-container */}
      <div ref={containerRef} className="w-full h-[500px] lg:h-[600px]" />

      {/* Loading Overlay: מוצג בזמן שהAPI חוזר */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-4 border-cyan-500/30 animate-ping delay-300" />
              <div className="absolute inset-4 rounded-full bg-red-500/20 flex items-center justify-center text-2xl">📡</div>
            </div>
            <p className="text-white font-bold">משדר התראת חירום...</p>
            <p className="text-sm text-slate-400 mt-1">מחפש מתנדבים בקרבת מקום</p>
          </div>
        </div>
      )}

      {/* הנחיה ראשונית — מוצגת לפני שנבחר מיקום */}
      {!emergencyLocation && !isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] glass-light rounded-xl px-4 py-2 whitespace-nowrap">
          <p className="text-sm text-slate-300 flex items-center gap-2">
            <span className="text-red-400">👆</span>
            לחץ על אחד מאזורי הרכיבה במפה (כרמל / בן שמן / בארי)
          </p>
        </div>
      )}
    </div>
  );
}
