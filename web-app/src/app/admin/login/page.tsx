'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authServerUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'http://localhost:4000';
      const res = await fetch(`${authServerUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'שגיאה בהתחברות');
        return;
      }

      // Store access token in sessionStorage
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('adminUsername', data.admin.username);

      router.push('/admin/dashboard');
    } catch {
      setError('שגיאה בהתחברות לשרת ההזדהות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl mb-4 shadow-lg shadow-indigo-500/25">
            🔐
          </div>
          <h1 className="text-3xl font-bold">כניסת מנהל</h1>
          <p className="text-slate-400 mt-2">הזן את פרטי המנהל כדי לגשת ללוח הבקרה</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label htmlFor="admin-username" className="block text-sm font-medium text-slate-300 mb-2">
              שם משתמש
            </label>
            <input
              id="admin-username"
              type="text"
              required
              className="input-field"
              placeholder="הכנס שם משתמש"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-2">
              סיסמה
            </label>
            <input
              id="admin-password"
              type="password"
              required
              className="input-field"
              placeholder="הכנס סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300 flex items-center gap-2">
                ❌ {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-lg shadow-lg shadow-indigo-500/25 transition-all duration-300"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                מתחבר...
              </span>
            ) : (
              'כניסה'
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-slate-500">
              גישה מוגבלת למנהלי המערכת בלבד
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
