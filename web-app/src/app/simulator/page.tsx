'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { NotifiedVolunteer } from '@/components/map/EmergencyMap';

// Dynamic import for Leaflet (avoid SSR)
const EmergencyMap = dynamic(() => import('@/components/map/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] lg:h-[600px] rounded-2xl bg-slate-800/50 animate-pulse flex items-center justify-center">
      <p className="text-slate-400">טוען מפה...</p>
    </div>
  ),
});

export default function SimulatorPage() {
  const [emergencyLocation, setEmergencyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [volunteers, setVolunteers] = useState<NotifiedVolunteer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    totalNearby: number;
    totalNotified: number;
    eventId: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setEmergencyLocation({ lat, lng });
    setVolunteers([]);
    setResult(null);
    setError('');
  }, []);

  const triggerEmergency = async () => {
    if (!emergencyLocation) {
      setError('יש לבחור מיקום על המפה תחילה');
      return;
    }

    setIsLoading(true);
    setError('');
    setVolunteers([]);
    setResult(null);

    try {
      const res = await fetch('/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: emergencyLocation.lat,
          lng: emergencyLocation.lng,
          radiusKm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'שגיאה בהפעלת הסימולציה');
        return;
      }

      setVolunteers(data.notifiedVolunteers || []);
      setResult({
        totalNearby: data.totalNearby,
        totalNotified: data.totalNotified,
        eventId: data.eventId,
      });
    } catch {
      setError('שגיאה בהתחברות לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const loraCount = volunteers.filter(v => v.channel === 'lora' || v.channel === 'both').length;
  const smsCount = volunteers.filter(v => v.channel === 'sms' || v.channel === 'both').length;
  const respondedCount = volunteers.filter(v => v.responded).length;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 flex items-center justify-center gap-3">
            <span className="animate-pulse-emergency inline-block w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              🚨
            </span>
            סימולטור חירום
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            לחצו על המפה לבחירת מיקום האירוע, הגדירו רדיוס, והפעילו את הסימולציה
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map — takes 2 columns */}
          <div className="lg:col-span-2">
            <EmergencyMap
              emergencyLocation={emergencyLocation}
              volunteers={volunteers}
              radiusKm={radiusKm}
              onMapClick={handleMapClick}
              isLoading={isLoading}
            />
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {/* Controls */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">⚙️ הגדרות סימולציה</h3>

              {/* Location display */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">מיקום חירום</label>
                {emergencyLocation ? (
                  <div className="input-field text-sm" dir="ltr">
                    {emergencyLocation.lat.toFixed(4)}, {emergencyLocation.lng.toFixed(4)}
                  </div>
                ) : (
                  <div className="input-field text-sm text-slate-500">
                    לחץ על המפה לבחירה
                  </div>
                )}
              </div>

              {/* Radius slider */}
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-1">
                  רדיוס חיפוש: <strong className="text-cyan-400">{radiusKm} ק&quot;מ</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 ק&quot;מ</span>
                  <span>20 ק&quot;מ</span>
                </div>
              </div>

              {/* Trigger button */}
              <button
                onClick={triggerEmergency}
                disabled={!emergencyLocation || isLoading}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 animate-pulse-emergency"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    משדר...
                  </span>
                ) : (
                  '🚨 שלח התראת חירום'
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-300">❌ {error}</p>
                </div>
              )}
            </div>

            {/* Results Summary */}
            {result && (
              <div className="glass rounded-2xl p-6 animate-slide-in-up">
                <h3 className="font-bold text-lg mb-4">📊 תוצאות הסימולציה</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatBox label="נמצאו בטווח" value={result.totalNearby} color="cyan" />
                  <StatBox label="קיבלו התראה" value={result.totalNotified} color="blue" />
                  <StatBox label="📡 LoRa" value={loraCount} color="cyan" />
                  <StatBox label="📱 SMS" value={smsCount} color="amber" />
                  <StatBox label="✅ הגיבו" value={respondedCount} color="emerald" />
                  <StatBox label="❌ לא הגיבו" value={volunteers.length - respondedCount} color="red" />
                </div>
              </div>
            )}

            {/* No volunteers found */}
            {result && result.totalNotified === 0 && (
              <div className="glass rounded-2xl p-6 animate-slide-in-up">
                <p className="text-amber-300 font-bold mb-2">⚠️ לא נמצאו מתנדבים</p>
                <p className="text-sm text-slate-400">
                  נסה להגדיל את הרדיוס, או לחץ באזורי הרכיבה:
                </p>
                <ul className="text-xs text-cyan-400 mt-2 space-y-1">
                  <li>📍 יער בן שמן (מרכז): 31.95°N 34.94°E</li>
                  <li>📍 הכרמל (צפון): 32.73°N 35.01°E</li>
                  <li>📍 סינגל בארי (דרום): 31.42°N 34.49°E</li>
                </ul>
              </div>
            )}

            {/* Volunteer List */}
            {volunteers.length > 0 && (
              <div className="glass rounded-2xl p-6 animate-slide-in-up delay-200">
                <h3 className="font-bold text-lg mb-4">👥 מתנדבים שקיבלו התראה</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {volunteers.map((vol, i) => (
                    <VolunteerCard key={vol.volunteerId} volunteer={vol} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  };

  return (
    <div className="glass-light rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function VolunteerCard({ volunteer: vol, index }: { volunteer: NotifiedVolunteer; index: number }) {
  const channelLabel = vol.channel === 'both' ? 'LoRa + SMS' : vol.channel === 'lora' ? 'LoRa' : 'SMS';
  const channelBadge = vol.channel === 'lora' || vol.channel === 'both' ? 'badge-lora' : 'badge-sms';

  return (
    <div
      className="glass-light rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold">{vol.name}</span>
          <span className={`badge ${channelBadge} text-xs`}>{channelLabel}</span>
        </div>
        <span className={vol.responded ? 'text-emerald-400' : 'text-red-400'}>
          {vol.responded ? '✅' : '❌'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
        <div>📏 {vol.distanceKm} ק&quot;מ</div>
        <div>⏱️ {vol.estimatedTimeMin} דקות</div>
        <div>🔋 {vol.batteryLevel}%</div>
      </div>
      <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
        <span>{vol.hasDefibrillator ? '🫀 AED' : ''} {vol.hasLora ? `📡 ${vol.loraId}` : ''}</span>
        <span className="text-emerald-400 font-medium">+{vol.pointsAwarded} נקודות</span>
      </div>
    </div>
  );
}
