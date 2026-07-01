// JWT Token Validation Middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  adminId?: number;
  adminUsername?: string;
}

export function validateAccessToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'אסימון גישה חסר' }); // Missing access token
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret as string) as unknown as {
      sub: number;
      username: string;
      role: string;
    };

    req.adminId = decoded.sub;
    req.adminUsername = decoded.username;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'אסימון גישה פג תוקף' }); // Access token expired
      return;
    }
    res.status(403).json({ error: 'אסימון גישה לא תקין' }); // Invalid access token
  }
}
