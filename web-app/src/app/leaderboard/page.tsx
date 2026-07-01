'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: number;
  first_name: string;
  last_name: string;
  has_lora: boolean;
  has_defibrillator: boolean;
  total_points: number;
  responses: number;
  avg_response_s: number;
  badges: string[];
  rank: string;
}

const BADGE_ICONS: Record<string, string> = {
  'מציל חיים': '🥇',
  'ברק': '⚡',
  'שומר הרשת': '📡',
  'מוכן תמיד': '🔋',
  'אלוף ההתנדבות': '🏆',
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/gamification?limit=20');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} שניות`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')} דקות`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300/10 to-slate-400/5 border-slate-400/20';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700/15 to-orange-700/5 border-amber-700/20';
    return 'bg-white/[0.02] border-white/5';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-3xl mb-4 shadow-lg shadow-yellow-500/25">
            🏆
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">לוח הישגים</h1>
          <p className="text-slate-400">
            המתנדבים המצטיינים שלנו — לפי ניקוד, זמני תגובה, וזמינות
          </p>
        </div>

        {/* Points explanation */}
        <div className="glass-light rounded-2xl p-6 mb-8">
          <h3 className="font-bold mb-4 text-lg">איך צוברים נקודות?</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <PointExplainer label="תגובה לחירום" points={10} />
            <PointExplainer label="תגובה מהירה (<5 דק')" points={5} extra="בונוס" />
            <PointExplainer label="תגובה מבזקת (<3 דק')" points={10} extra="בונוס" />
            <PointExplainer label="זמינות LoRa" points={3} />
            <PointExplainer label="סוללה >80%" points={2} />
          </div>
        </div>

        {/* Badge legend */}
        <div className="glass-light rounded-2xl p-6 mb-8">
          <h3 className="font-bold mb-4">תגים והישגים</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(BADGE_ICONS).map(([name, icon]) => (
              <div key={name} className="badge badge-score flex items-center gap-1.5 px-3 py-1.5">
                <span>{icon}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">טוען לוח הישגים...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">אין נתונים עדיין</h3>
            <p className="text-slate-400">הפעל סימולציית חירום כדי לצבור נקודות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => {
              const rank = parseInt(entry.rank);
              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.01] ${getRankStyle(rank)}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl font-bold">
                      {getRankEmoji(rank)}
                    </div>

                    {/* Name & badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg truncate">
                          {entry.first_name} {entry.last_name || ''}
                        </h3>
                        {entry.has_lora && (
                          <span className="badge badge-lora text-xs">📡 LoRa</span>
                        )}
                        {entry.has_defibrillator && (
                          <span className="badge badge-defi text-xs">🫀 AED</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {entry.badges.map((badge, i) => (
                          <span key={i} className="text-xs text-slate-400">
                            {BADGE_ICONS[badge] || '🏅'} {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-center">
                      <div>
                        <div className="text-xs text-slate-500">תגובות</div>
                        <div className="font-bold text-lg">{entry.responses}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">זמן ממוצע</div>
                        <div className="font-medium text-sm text-slate-300">
                          {formatResponseTime(entry.avg_response_s)}
                        </div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex-shrink-0 text-left">
                      <div className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {entry.total_points}
                      </div>
                      <div className="text-xs text-slate-500">נקודות</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PointExplainer({ label, points, extra }: { label: string; points: number; extra?: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold text-cyan-400">+{points}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {extra && <div className="text-[10px] text-yellow-400">{extra}</div>}
    </div>
  );
}
