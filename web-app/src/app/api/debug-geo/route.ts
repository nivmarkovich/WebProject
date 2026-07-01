// Debug-only route — remove before production deployment
import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '31.8846');
  const lng = parseFloat(url.searchParams.get('lng') ?? '34.7997');
  const radiusKm = parseFloat(url.searchParams.get('r') ?? '20');

  const earthRadius = 6378.1;
  const radiusInRadians = radiusKm / earthRadius;

  try {
    const db = await getMongoDb();
    const col = db.collection('device_telemetry');

    const totalDocs = await col.countDocuments();
    const sample = await col.find().limit(3).toArray();
    const indexes = await col.listIndexes().toArray();
    const has2dsphere = indexes.some(ix =>
      Object.values(ix.key ?? {}).includes('2dsphere')
    );

    // Run the exact same query as the trigger route
    const geoResults = await col.find({
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
    }).toArray();

    // Brute-force Haversine for all docs regardless of geo query
    const allDocs = await col.find().toArray();
    const withDistances = allDocs.map(d => {
      const [docLng, docLat] = d.location?.coordinates ?? [0, 0];
      const R = 6378.1;
      const dLat = (docLat - lat) * Math.PI / 180;
      const dLng = (docLng - lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2
        + Math.cos(lat * Math.PI/180) * Math.cos(docLat * Math.PI/180)
        * Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return {
        volunteerId: d.volunteerId,
        docLat,
        docLng,
        distKm: Math.round(dist * 100) / 100,
        withinRadius: dist <= radiusKm,
        locationRaw: d.location,
      };
    }).sort((a, b) => a.distKm - b.distKm);

    return NextResponse.json({
      query: { lat, lng, radiusKm, radiusInRadians, centerSphere: [lng, lat] },
      collection: {
        totalDocs,
        has2dsphere,
        indexes: indexes.map(ix => ({ name: ix.name, key: ix.key })),
      },
      sampleDocs: sample.map(d => ({
        volunteerId: d.volunteerId,
        location: d.location,
      })),
      geoQueryHits: geoResults.length,
      geoQueryResults: geoResults.map(d => ({
        volunteerId: d.volunteerId,
        coords: d.location?.coordinates,
      })),
      bruteForce_closest10: withDistances.slice(0, 10),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
