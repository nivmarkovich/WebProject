// Auth Routes — Login, Refresh, Logout, Verify
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/postgres';
import { config } from '../config';
import { validateAccessToken, AuthRequest } from '../middleware/validateToken';

const router = Router();

// ==========================================
// POST /auth/login
// ==========================================
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'שם משתמש וסיסמה נדרשים' });
      return;
    }

    // Find admin by username
    const result = await pool.query(
      'SELECT id, username, password_hash FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      return;
    }

    const admin = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
      return;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { sub: admin.id, username: admin.username, role: 'admin' },
      config.accessTokenSecret as string,
      { expiresIn: config.accessTokenExpiry as any }
    );

    const jti = uuidv4();
    const refreshToken = jwt.sign(
      { sub: admin.id, jti },
      config.refreshTokenSecret as string,
      { expiresIn: config.refreshTokenExpiry as any }
    );

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryMs);
    await pool.query(
      'INSERT INTO refresh_tokens (admin_id, token_jti, expires_at) VALUES ($1, $2, $3)',
      [admin.id, jti, expiresAt]
    );

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.refreshTokenExpiryMs,
      path: '/auth',
    });

    res.json({
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ==========================================
// POST /auth/refresh
// ==========================================
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'אסימון רענון חסר' });
      return;
    }

    // Verify the refresh token
    let decoded: { sub: number; jti: string };
    try {
      decoded = jwt.verify(refreshToken, config.refreshTokenSecret as string) as unknown as {
        sub: number;
        jti: string;
      };
    } catch {
      res.status(401).json({ error: 'אסימון רענון לא תקין' });
      return;
    }

    // Check if the token exists and is not revoked
    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_jti = $1 AND revoked = FALSE AND expires_at > NOW()',
      [decoded.jti]
    );

    if (tokenResult.rows.length === 0) {
      res.status(401).json({ error: 'אסימון רענון בוטל או פג תוקף' });
      return;
    }

    // Revoke old refresh token (rotation)
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE token_jti = $1',
      [decoded.jti]
    );

    // Get admin info
    const adminResult = await pool.query(
      'SELECT id, username FROM admins WHERE id = $1',
      [decoded.sub]
    );

    if (adminResult.rows.length === 0) {
      res.status(401).json({ error: 'מנהל לא נמצא' });
      return;
    }

    const admin = adminResult.rows[0];

    // Issue new tokens
    const newAccessToken = jwt.sign(
      { sub: admin.id, username: admin.username, role: 'admin' },
      config.accessTokenSecret as string,
      { expiresIn: config.accessTokenExpiry as any }
    );

    const newJti = uuidv4();
    const newRefreshToken = jwt.sign(
      { sub: admin.id, jti: newJti },
      config.refreshTokenSecret as string,
      { expiresIn: config.refreshTokenExpiry as any }
    );

    // Store new refresh token
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiryMs);
    await pool.query(
      'INSERT INTO refresh_tokens (admin_id, token_jti, expires_at) VALUES ($1, $2, $3)',
      [admin.id, newJti, expiresAt]
    );

    // Set new cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.refreshTokenExpiryMs,
      path: '/auth',
    });

    res.json({
      accessToken: newAccessToken,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ==========================================
// POST /auth/logout
// ==========================================
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, config.refreshTokenSecret as string) as unknown as {
          jti: string;
        };
        // Revoke the token
        await pool.query(
          'UPDATE refresh_tokens SET revoked = TRUE WHERE token_jti = $1',
          [decoded.jti]
        );
      } catch {
        // Token invalid, just clear the cookie
      }
    }

    // Clear the cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
    });

    res.json({ message: 'התנתקת בהצלחה' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// ==========================================
// GET /auth/verify
// ==========================================
router.get('/verify', validateAccessToken, (req: AuthRequest, res: Response) => {
  res.json({
    valid: true,
    admin: {
      id: req.adminId,
      username: req.adminUsername,
    },
  });
});

export default router;
