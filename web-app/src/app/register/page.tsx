'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    loraId: '',
    hasDefibrillator: true,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'שגיאה בהרשמה');
        return;
      }

      setStatus('success');
      setMessage(data.message || 'נרשמת בהצלחה!');
      setFormData({ firstName: '', lastName: '', mobileNumber: '', loraId: '', hasDefibrillator: true });
    } catch {
      setStatus('error');
      setMessage('שגיאה בהתחברות לשרת');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl mb-4 shadow-lg shadow-cyan-500/25">
            📝
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">הרשמה כמתנדב</h1>
          <p className="text-slate-400">
            הצטרפו לרשת ההצלה — נדרש דפיברילטור נייד ו/או מכשיר LoRa
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
              שם פרטי <span className="text-red-400">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              required
              className="input-field"
              placeholder="הכנס שם פרטי"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
              שם משפחה <span className="text-slate-500">(אופציונלי)</span>
            </label>
            <input
              id="lastName"
              type="text"
              className="input-field"
              placeholder="הכנס שם משפחה"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-300 mb-2">
              מספר נייד <span className="text-red-400">*</span>
            </label>
            <input
              id="mobileNumber"
              type="tel"
              required
              className="input-field"
              placeholder="05X-XXX-XXXX"
              dir="ltr"
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">פורמט ישראלי: 050/052/053/054/055/058</p>
          </div>

          {/* LoRa ID */}
          <div>
            <label htmlFor="loraId" className="block text-sm font-medium text-slate-300 mb-2">
              מזהה LoRa <span className="text-slate-500">(אופציונלי)</span>
            </label>
            <input
              id="loraId"
              type="text"
              className="input-field"
              placeholder="!a1b2c3d4"
              dir="ltr"
              value={formData.loraId}
              onChange={(e) => setFormData({ ...formData, loraId: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">מזהה Meshtastic של המכשיר (אם יש)</p>
          </div>

          {/* Defibrillator checkbox */}
          <div className="flex items-center gap-3 p-4 glass-light rounded-xl">
            <input
              id="hasDefibrillator"
              type="checkbox"
              className="w-5 h-5 rounded accent-red-500"
              checked={formData.hasDefibrillator}
              onChange={(e) => setFormData({ ...formData, hasDefibrillator: e.target.checked })}
            />
            <label htmlFor="hasDefibrillator" className="text-sm text-slate-300">
              ברשותי דפיברילטור נייד (AED)
            </label>
            <span className="text-red-400 text-lg">🫀</span>
          </div>

          {/* Equipment notice */}
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-300 flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>
                להרשמה נדרש לפחות אחד מהבאים: דפיברילטור נייד, מכשיר LoRa, או שניהם.
              </span>
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                שולח...
              </span>
            ) : (
              'הרשם עכשיו'
            )}
          </button>

          {/* Status messages */}
          {status === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-slide-in-up">
              <p className="text-emerald-300 flex items-center gap-2">
                <span className="text-lg">✅</span>
                {message}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-in-up">
              <p className="text-red-300 flex items-center gap-2">
                <span className="text-lg">❌</span>
                {message}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
