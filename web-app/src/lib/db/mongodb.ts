// MongoDB Connection Module for Next.js
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lora_defi';

let client: MongoClient;
let db: Db;

export async function getMongoDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('🍃 Connected to MongoDB');
  }

  db = client.db('lora_defi'); // Explicit DB name — URI has no DB segment, client.db() would default to 'test'

  // Ensure indexes
  await db.collection('device_telemetry').createIndex({ location: '2dsphere' });
  await db.collection('device_telemetry').createIndex({ volunteerId: 1 }, { unique: true });
  await db.collection('emergency_events').createIndex({ triggeredAt: -1 });
  await db.collection('cms_pages').createIndex({ slug: 1 }, { unique: true });

  return db;
}

export async function closeMongoDb(): Promise<void> {
  if (client) {
    await client.close();
  }
}
