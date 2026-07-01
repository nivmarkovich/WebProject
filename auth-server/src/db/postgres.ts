// PostgreSQL Database Connection for Auth Server
import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
  process.exit(-1);
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create refresh_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         SERIAL PRIMARY KEY,
        admin_id   INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        token_jti  VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked    BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create volunteers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id                SERIAL PRIMARY KEY,
        first_name        VARCHAR(100) NOT NULL,
        last_name         VARCHAR(100),
        mobile_number     VARCHAR(20) NOT NULL UNIQUE,
        lora_id           VARCHAR(50),
        has_defibrillator BOOLEAN DEFAULT TRUE,
        has_lora          BOOLEAN DEFAULT FALSE,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create volunteer_scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS volunteer_scores (
        id              SERIAL PRIMARY KEY,
        volunteer_id    INTEGER REFERENCES volunteers(id) ON DELETE CASCADE,
        total_points    INTEGER DEFAULT 0,
        responses       INTEGER DEFAULT 0,
        avg_response_s  INTEGER DEFAULT 0,
        badges          TEXT[] DEFAULT '{}',
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized successfully');
  } finally {
    client.release();
  }
}

export default pool;
