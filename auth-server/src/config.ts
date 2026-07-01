// Auth Server Configuration
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  
  // JWT Secrets
  accessTokenSecret: process.env.JWT_SECRET || 'lora-defi-access-secret-key-2026',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'lora-defi-refresh-secret-key-2026',
  
  // Token Expiry
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  
  // PostgreSQL
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lora_defi',

  // CORS
  corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
};
