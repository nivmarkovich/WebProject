// API Route: Emergency Simulation — Trigger and List Events
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';
import { getMongoDb } from '@/lib/db/mongodb';
import { getBicycleRoute } from '@/lib/ors';

// POST /api/emergency/trigger — Trigger an emergency simulation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, radiusKm = 15 } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'מיקום חירום נדרש' }, { status: 400 });
    }

    const mongodb = await getMongoDb();

    // ── DIAGNOSTIC LOG 1: Query parameters ─────────────────────────────────
    const earthRadiusKm = 6378.1;
    const radiusInRadians = radiusKm / earthRadiusKm;
    console.log('═══════════════════════════════════════════════');
    console.log('🚨 EMERGENCY TRIGGER');
    console.log(`   Input lat=${lat}, lng=${lng}, radiusKm=${radiusKm}`);
    console.log(`   $centerSphere center=[${lng}, ${lat}] (lng,lat — GeoJSON order)`);
    console.log(`   radiusInRadians = ${radiusKm} / ${earthRadiusKm} = ${radiusInRadians.toFixed(8)}`);

    // Step 1: Find nearby devices using MongoDB 2dsphere geo query
    // $centerSphere expects [lng, lat] (GeoJSON order), radius in radians
    const geoQuery = {
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
    };

    const nearbyDevices = await mongodb
      .collection('device_telemetry')
      .find(geoQuery)
      .toArray();

    // ── DIAGNOSTIC LOG 2: Raw MongoDB result ────────────────────────────────
    console.log(`   MongoDB raw hit count: ${nearbyDevices.length}`);
    if (nearbyDevices.length > 0) {
      nearbyDevices.slice(0, 3).forEach((d, i) => {
        console.log(`   Device[${i}]: volunteerId=${d.volunteerId} coords=${JSON.stringify(d.location?.coordinates)}`);
      });
    } else {
      // Debug: count ALL documents to see if collection has data at all
      const totalDocs = await mongodb.collection('device_telemetry').countDocuments();
      console.log(`   ⚠️  0 devices found. Total docs in collection: ${totalDocs}`);
      if (totalDocs > 0) {
        const sample = await mongodb.collection('device_telemetry').findOne();
        console.log(`   Sample doc location: ${JSON.stringify(sample?.location)}`);
      }
    }
    console.log('═══════════════════════════════════════════════');

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

    // Step 2: Randomly sample up to 15 volunteers
    const shuffled = nearbyDevices.sort(() => Math.random() - 0.5);
    const sampled = shuffled.slice(0, Math.min(15, shuffled.length));

    // Step 3: Get volunteer details from PostgreSQL
    const volunteerIds = sampled.map((d) => d.volunteerId);
    const volunteersResult = await pool.query(
      `SELECT v.*, vs.total_points, vs.responses 
       FROM volunteers v
       LEFT JOIN volunteer_scores vs ON v.id = vs.volunteer_id
       WHERE v.id = ANY($1)`,
      [volunteerIds]
    );

    console.log(`   PG volunteers fetched: ${volunteersResult.rows.length} for ids ${volunteerIds.join(',')}`);

    const volunteersMap = new Map(
      volunteersResult.rows.map((v) => [v.id, v])
    );

    // Step 4: Calculate routes for each volunteer
    const notifiedVolunteers = [];
    let skippedNoRoute = 0;
    let skippedTooFar = 0;

    for (const device of sampled) {
      const volunteer = volunteersMap.get(device.volunteerId);
      if (!volunteer) continue;

      // GeoJSON stores [lng, lat] — extract correctly
      const [deviceLng, deviceLat] = device.location.coordinates;

      // ── DIAGNOSTIC LOG 3: Per-volunteer routing ─────────────────────────
      console.log(`   → Routing volunteer ${device.volunteerId} at [${deviceLat.toFixed(4)}, ${deviceLng.toFixed(4)}]`);

      let route = null;
      try {
        route = await getBicycleRoute(deviceLng, deviceLat, lng, lat);
      } catch (routeErr) {
        const msg = routeErr instanceof Error ? routeErr.message : JSON.stringify(routeErr);
        console.error(`   ❌ Route error for volunteer ${device.volunteerId}:`, msg);
      }

      if (!route) {
        console.log(`   ⚠️  No route returned for volunteer ${device.volunteerId}`);
        skippedNoRoute++;
        continue;
      }

      // Threshold: allow up to 2× the straight-line radius for cycling detours
      const threshold = radiusKm * 2;
      if (route.distanceKm > threshold) {
        console.log(`   ⚠️  Volunteer ${device.volunteerId} route ${route.distanceKm}km > threshold ${threshold}km — skipped`);
        skippedTooFar++;
        continue;
      }

      console.log(`   ✅ Volunteer ${device.volunteerId} included: routeKm=${route.distanceKm}, durationMin=${route.durationMin}, fallback=${route.isFallback}`);

      // Determine notification channel
      let channel: 'lora' | 'sms' | 'both' = 'sms';
      if (volunteer.has_lora && device.isOnline) {
        channel = volunteer.mobile_number ? 'both' : 'lora';
      }

      const responseTimeSec = Math.floor(30 + Math.random() * 60 + route.durationMin * 2);

      let pointsAwarded = 10;
      if (route.durationMin < 5) pointsAwarded += 10;
      else if (route.durationMin < 10) pointsAwarded += 5;
      if (volunteer.has_lora) pointsAwarded += 3;
      if (device.batteryLevel > 80) pointsAwarded += 2;

      notifiedVolunteers.push({
        volunteerId: device.volunteerId,
        name: `${volunteer.first_name} ${volunteer.last_name || ''}`.trim(),
        channel,
        distanceKm: route.distanceKm,
        estimatedTimeMin: route.durationMin,
        routeGeoJSON: route.geometry,
        deviceLocation: { lat: deviceLat, lng: deviceLng },
        batteryLevel: device.batteryLevel,
        lastTransmission: device.lastTransmission,
        hasLora: volunteer.has_lora,
        hasDefibrillator: volunteer.has_defibrillator,
        loraId: device.loraId,
        meshHops: device.meshHops,
        signalStrength: device.signalStrength,
        responded: Math.random() > 0.2,
        responseTimeSec,
        pointsAwarded,
      });
    }

    console.log(`   📊 Final: ${notifiedVolunteers.length} included, ${skippedNoRoute} no-route, ${skippedTooFar} too-far`);

    // Sort by estimated arrival time
    notifiedVolunteers.sort((a, b) => a.estimatedTimeMin - b.estimatedTimeMin);

    // Step 5: Save emergency event to MongoDB
    const emergencyEvent = {
      triggeredAt: new Date(),
      emergencyLocation: {
        type: 'Point' as const,
        coordinates: [lng, lat],  // GeoJSON [lng, lat]
      },
      radiusKm,
      notifiedVolunteers,
      totalNearby: nearbyDevices.length,
      totalNotified: notifiedVolunteers.length,
      status: 'active',
    };

    const insertResult = await mongodb
      .collection('emergency_events')
      .insertOne(emergencyEvent);

    // Step 6: Update gamification scores
    for (const vol of notifiedVolunteers) {
      if (vol.responded) {
        try {
          await pool.query(
            `UPDATE volunteer_scores SET 
              total_points = total_points + $1,
              responses = responses + 1,
              avg_response_s = CASE 
                WHEN responses = 0 THEN $2
                ELSE (avg_response_s * responses + $2) / (responses + 1)
              END,
              badges = CASE
                WHEN total_points + $1 >= 50 AND NOT ('מציל חיים' = ANY(badges))
                  THEN array_append(badges, 'מציל חיים')
                ELSE badges
              END,
              updated_at = CURRENT_TIMESTAMP
             WHERE volunteer_id = $3`,
            [vol.pointsAwarded, vol.responseTimeSec, vol.volunteerId]
          );
        } catch (pgErr) {
          const msg = pgErr instanceof Error ? pgErr.message : JSON.stringify(pgErr);
          console.error(`   Score update failed for volunteer ${vol.volunteerId}:`, msg);
        }
      }
    }

    return NextResponse.json({
      eventId: insertResult.insertedId.toString(),
      emergencyLocation: { lat, lng },
      radiusKm,
      totalNearby: nearbyDevices.length,
      totalNotified: notifiedVolunteers.length,
      notifiedVolunteers,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('POST /api/emergency/trigger FATAL:', message, stack);
    return NextResponse.json(
      { error: `שגיאת שרת: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/emergency/trigger — List past emergency events
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
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
