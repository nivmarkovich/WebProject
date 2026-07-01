// OpenRouteService Client — Bicycle Routing
// Coordinates throughout: ORS and GeoJSON use [lng, lat] order.

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: GeoJSON.LineString;
  isFallback?: boolean; // true = straight-line estimate, no real ORS data
}

// Haversine distance in km between two [lat,lng] pairs
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Straight-line fallback route when ORS is unavailable
function straightLineFallback(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): RouteResult {
  const distanceKm = Math.round(haversineKm(startLat, startLng, endLat, endLng) * 1.3 * 10) / 10;
  return {
    distanceKm,
    durationMin: Math.max(1, Math.round((distanceKm / 15) * 60)), // ~15 km/h cycling
    geometry: {
      type: 'LineString',
      coordinates: [
        [startLng, startLat],
        [endLng, endLat],
      ],
    },
    isFallback: true,
  };
}

/**
 * Get bicycle route from ORS, falling back to straight-line estimate.
 * Arguments: startLng, startLat, endLng, endLat  (all in ORS/GeoJSON [lng,lat] order)
 * NEVER throws — always returns a RouteResult or null.
 */
export async function getBicycleRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<RouteResult | null> {
  // Sanity check coordinates are in Israel / plausible range
  if (
    isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng) ||
    Math.abs(startLat) > 90 || Math.abs(endLat) > 90
  ) {
    console.error('getBicycleRoute: invalid coordinates', { startLng, startLat, endLng, endLat });
    return null;
  }

  // No valid API key → straight-line fallback
  if (!ORS_API_KEY || ORS_API_KEY.startsWith('your') || ORS_API_KEY.length < 20) {
    console.warn('ORS_API_KEY not configured — using straight-line fallback');
    return straightLineFallback(startLng, startLat, endLng, endLat);
  }

  try {
    const res = await fetch(`${ORS_BASE_URL}/directions/cycling-regular/geojson`, {
      method: 'POST',
      headers: {
        Authorization: ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [startLng, startLat],   // GeoJSON: [lng, lat]
          [endLng, endLat],
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`ORS API error ${res.status}:`, errText.slice(0, 200));
      // On rate-limit or auth error, fall back silently
      return straightLineFallback(startLng, startLat, endLng, endLat);
    }

    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) {
      console.error('ORS: no features in response', JSON.stringify(data).slice(0, 200));
      return straightLineFallback(startLng, startLat, endLng, endLat);
    }

    const summary = feature.properties?.summary;
    return {
      distanceKm: Math.round((summary.distance / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round(summary.duration / 60)),
      geometry: feature.geometry as GeoJSON.LineString,
      isFallback: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('getBicycleRoute fetch error:', msg);
    return straightLineFallback(startLng, startLat, endLng, endLat);
  }
}
