// API Route: Gamification — Leaderboard and Individual Stats
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

// GET /api/gamification — Get leaderboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const volunteerId = searchParams.get('volunteerId');

    // If specific volunteer requested
    if (volunteerId) {
      const result = await pool.query(
        `SELECT v.id, v.first_name, v.last_name, v.has_lora, v.has_defibrillator,
                vs.total_points, vs.responses, vs.avg_response_s, vs.badges
         FROM volunteers v
         JOIN volunteer_scores vs ON v.id = vs.volunteer_id
         WHERE v.id = $1`,
        [volunteerId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'מתנדב לא נמצא' }, { status: 404 });
      }

      return NextResponse.json({ volunteer: result.rows[0] });
    }

    // Get leaderboard
    const result = await pool.query(
      `SELECT v.id, v.first_name, v.last_name, v.has_lora, v.has_defibrillator,
              vs.total_points, vs.responses, vs.avg_response_s, vs.badges,
              RANK() OVER (ORDER BY vs.total_points DESC) as rank
       FROM volunteers v
       JOIN volunteer_scores vs ON v.id = vs.volunteer_id
       ORDER BY vs.total_points DESC
       LIMIT $1`,
      [limit]
    );

    // Check for top 3 badge
    for (const vol of result.rows) {
      if (parseInt(vol.rank) <= 3 && !vol.badges.includes('אלוף ההתנדבות')) {
        vol.badges.push('אלוף ההתנדבות');
      }
    }

    return NextResponse.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('GET /api/gamification error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
