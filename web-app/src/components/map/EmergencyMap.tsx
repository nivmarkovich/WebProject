'use client';

// Loaded via next/dynamic with ssr:false from MermaidWrapper — never runs on server.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons in webpack/Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface NotifiedVolunteer {
  volunteerId: number;
  name: string;
  channel: 'lora' | 'sms' | 'both';
  distanceKm: number;
  estimatedTimeMin: number;
  // GeoJSON LineString — coordinates are [lng, lat] pairs (GeoJSON standard)
  routeGeoJSON: GeoJSON.LineString;
  // Already extracted as { lat, lng } in the API route
  deviceLocation: { lat: number; lng: number };
  batteryLevel: number;
  lastTransmission: string;
  hasLora: boolean;
  hasDefibrillator: boolean;
  loraId: string | null;
  meshHops: number;
  signalStrength: number;
  responded: boolean;
  responseTimeSec: number;
  pointsAwarded: number;
}

interface EmergencyMapProps {
  emergencyLocation: { lat: number; lng: number } | null;
  volunteers: NotifiedVolunteer[];
  radiusKm: number;
  onMapClick: (lat: number, lng: number) => void;
  isLoading: boolean;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  // Stable ref to always-current callback — avoids re-creating map on parent re-render
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // ── Map initialization — runs once, safe for StrictMode ──────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // StrictMode guard: Leaflet sets _leaflet_id on the container div.
    // If it's already set, we're in StrictMode's second mount — skip init.
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

    // Center on Israel so all seeded volunteer clusters are visible
    // (Ben Shemen ~31.95N, Carmel ~32.73N, Be'eri ~31.42N)
    const map = L.map(container, {
      center: [32.05, 34.95],   // geographic center of Israel
      zoom: 9,                   // zoom 9 shows the whole country
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | CartoDB',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    routesRef.current = L.layerGroup().addTo(map);

    // Use ref so the callback doesn't stale-close over onMapClick
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      // Full teardown — safe to call even if container was already removed
      try { map.remove(); } catch { /* ignore */ }
      mapRef.current = null;
      markersRef.current = null;
      routesRef.current = null;
      circleRef.current = null;
    };
  }, []); // empty deps — run once only

  // ── Draw / redraw all map content ─────────────────────────────────────────
  // Single effect owns ALL Leaflet layer mutations to avoid conflicts.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const routes = routesRef.current;
    if (!map || !markers || !routes) return;

    // ─ Clear everything ─
    markers.clearLayers();
    routes.clearLayers();
    if (circleRef.current) {
      try { map.removeLayer(circleRef.current); } catch { /* ignore */ }
      circleRef.current = null;
    }

    if (!emergencyLocation) return;

    const { lat, lng } = emergencyLocation;

    // ─ Emergency marker ─
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
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    L.marker(toLeaflet(lat, lng), { icon: emergencyIcon })
      .bindPopup(`<div style="text-align:center"><strong>📍 מיקום חירום</strong><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`)
      .addTo(markers);

    // ─ Radius circle ─
    circleRef.current = L.circle(toLeaflet(lat, lng), {
      radius: radiusKm * 1000,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.07,
      weight: 2,
      dashArray: '10 5',
    }).addTo(map);

    // Zoom to show the emergency area if no volunteers yet
    if (volunteers.length === 0) {
      map.setView(toLeaflet(lat, lng), Math.max(map.getZoom(), 12));
      return;
    }

    // ─ Volunteer markers + route polylines ─
    const palette = ['#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];

    volunteers.forEach((vol, i) => {
      const color = palette[i % palette.length];

      // vol.deviceLocation is already { lat, lng } — correct order
      const volLat = vol.deviceLocation.lat;
      const volLng = vol.deviceLocation.lng;

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

      // Route polyline:
      // GeoJSON coordinates are [lng, lat] — must swap to [lat, lng] for Leaflet
      const coords = vol.routeGeoJSON?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const latlngs: L.LatLngTuple[] = coords.map(
          (c: number[]) => [c[1], c[0]] as L.LatLngTuple  // [lng,lat] → [lat,lng]
        );
        L.polyline(latlngs, {
          color,
          weight: 3,
          opacity: 0.85,
          dashArray: '10 5',
        }).addTo(routes);
      }
    });

    // ─ Fit all markers in view ─
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
      <div ref={containerRef} className="w-full h-[500px] lg:h-[600px]" />

      {/* Loading overlay */}
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

      {/* Instruction hint */}
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
