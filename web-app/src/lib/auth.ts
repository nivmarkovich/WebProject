// Auth Helpers — Communicate with the Auth Server from Next.js
const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:4000';

export interface AdminInfo {
  id: number;
  username: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: AdminInfo;
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_SERVER_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'שגיאה בהתחברות');
  }

  return res.json();
}

export async function refreshAccessToken(): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_SERVER_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('הפעלה פגה. יש להתחבר מחדש');
  }

  return res.json();
}

export async function logoutAdmin(): Promise<void> {
  await fetch(`${AUTH_SERVER_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function verifyToken(accessToken: string): Promise<AdminInfo | null> {
  try {
    const res = await fetch(`${AUTH_SERVER_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.admin;
  } catch {
    return null;
  }
}
