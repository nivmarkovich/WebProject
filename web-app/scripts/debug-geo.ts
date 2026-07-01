// Debug script — tests MongoDB geo query directly
// Run: npx tsx scripts/debug-geo.ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  const testLat = 31.8846;
  const testLng = 34.7997;
  const radiusKm = 20;
  const earthRadius = 6378.1;
  const radiusInRadians = radiusKm / earthRadius;

  console.log('═══════════════════════════════════════════════');
  console.log('🔍 MongoDB Geo-Query Debug');
  console.log(`   Test point:  lat=${testLat}, lng=${testLng}`);
  console.log(`   Radius:      ${radiusKm} km`);
  console.log(`   Earth radius: ${earthRadius} km`);
  console.log(`   radiusInRadians: ${radiusKm} / ${earthRadius} = ${radiusInRadians.toFixed(8)}`);
  console.log(`   $centerSphere: [[${testLng}, ${testLat}], ${radiusInRadians.toFixed(8)}]`);
  console.log('═══════════════════════════════════════════════\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB Atlas\n');

  const db = client.db();
  const col = db.collection('device_telemetry');

  // Step 1: Count all documents
  const total = await col.countDocuments();
  console.log(`📦 Total documents in device_telemetry: ${total}`);

  if (total === 0) {
    console.log('❌ Collection is empty — run the seed script first!');
    await client.close();
    return;
  }

  // Step 2: Show 3 sample documents to confirm coordinate format
  console.log('\n📋 Sample documents (first 3):');
  const samples = await col.find().limit(3).toArray();
  for (const s of samples) {
    console.log(`   volunteerId=${s.volunteerId}  location=${JSON.stringify(s.location)}`);
  }

  // Step 3: Check index exists
  const indexes = await col.listIndexes().toArray();
  const has2dsphere = indexes.some(ix => {
    const keys = Object.values(ix.key || {});
    return keys.includes('2dsphere');
  });
  console.log(`\n🗂  2dsphere index present: ${has2dsphere}`);
  if (!has2dsphere) {
    console.log('   ⚠️  Creating 2dsphere index now...');
    await col.createIndex({ location: '2dsphere' });
    console.log('   ✅ Index created');
  }

  // Step 4: Run the exact $geoWithin $centerSphere query
  console.log('\n🔎 Running $geoWithin $centerSphere query...');
  const results = await col.find({
    location: {
      $geoWithin: {
        $centerSphere: [[testLng, testLat], radiusInRadians],
      },
    },
  }).toArray();

  console.log(`\n   → Matched ${results.length} volunteers within ${radiusKm}km`);

  if (results.length > 0) {
    console.log('\n   Matched volunteers:');
    for (const r of results) {
      const [docLng, docLat] = r.location.coordinates;
      // Haversine distance for verification
      const R = 6378.1;
      const dLat = (docLat - testLat) * Math.PI / 180;
      const dLng = (docLng - testLng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(testLat*Math.PI/180)*Math.cos(docLat*Math.PI/180)*Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      console.log(`   ✅ volunteerId=${r.volunteerId}  [${docLat.toFixed(4)}, ${docLng.toFixed(4)}]  dist=${dist.toFixed(2)}km`);
    }
  } else {
    // Step 5: Brute-force check — find closest volunteer
    console.log('\n   No geo match. Running brute-force distance check on ALL documents...');
    const all = await col.find().toArray();
    const distances = all.map(d => {
      const [docLng, docLat] = d.location.coordinates;
      const R = 6378.1;
      const dLat = (docLat - testLat) * Math.PI / 180;
      const dLng = (docLng - testLng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(testLat*Math.PI/180)*Math.cos(docLat*Math.PI/180)*Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return { volunteerId: d.volunteerId, docLat, docLng, dist };
    }).sort((a, b) => a.dist - b.dist);

    console.log('\n   5 closest volunteers to your test point:');
    for (const d of distances.slice(0, 5)) {
      const within = d.dist <= radiusKm ? '✅ WITHIN' : '❌ outside';
      console.log(`   ${within} volunteerId=${d.volunteerId}  [${d.docLat.toFixed(4)}, ${d.docLng.toFixed(4)}]  dist=${d.dist.toFixed(2)}km`);
    }
  }

  await client.close();
  console.log('\n✅ Debug complete.');
}

main().catch(err => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
