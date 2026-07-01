// Admin Seeding Script — Creates the hardcoded admin user
import bcrypt from 'bcrypt';
import pool, { initDatabase } from './db/postgres';

async function seedAdmin() {
  try {
    await initDatabase();

    const username = 'micha';
    const password = '1234';
    const saltRounds = 10;

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️  Admin "${username}" already exists (id: ${existing.rows[0].id}). Skipping.`);
    } else {
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const result = await pool.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2) RETURNING id',
        [username, passwordHash]
      );
      console.log(`✅ Admin "${username}" created with id: ${result.rows[0].id}`);
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seedAdmin();
