// Auth Server Entry Point
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { initDatabase } from './db/postgres';
import authRoutes from './routes/auth';

const app = express();

// ===========================================
// Middleware
// ===========================================
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,  // Required for cookies
}));
app.use(express.json());
app.use(cookieParser());

// ===========================================
// Routes
// ===========================================
app.use('/auth', authRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'auth-server', timestamp: new Date().toISOString() });
});

// ===========================================
// Start Server
// ===========================================
async function start() {
  try {
    // Initialize database tables
    await initDatabase();
    console.log('📦 Database initialized');

    // Seed admin if not exists
    const bcrypt = await import('bcrypt');
    const pool = (await import('./db/postgres')).default;
    
    const existing = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      ['micha']
    );

    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash('1234', 10);
      await pool.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        ['micha', passwordHash]
      );
      console.log('👤 Default admin "micha" created');
    }

    app.listen(config.port, () => {
      console.log(`🔐 Auth Server running on http://localhost:${config.port}`);
      console.log(`   CORS origin: ${config.corsOrigin}`);
    });
  } catch (err) {
    console.error('❌ Failed to start auth server:', err);
    process.exit(1);
  }
}

start();
