// API Route: Volunteers — Registration & Management
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

// GET /api/volunteers — List all volunteers (for admin or simulator)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT v.*, vs.total_points, vs.responses, vs.avg_response_s, vs.badges
       FROM volunteers v
       LEFT JOIN volunteer_scores vs ON v.id = vs.volunteer_id
       ORDER BY v.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM volunteers');
    const total = parseInt(countResult.rows[0].count, 10);

    return NextResponse.json({
      volunteers: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/volunteers error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}

// POST /api/volunteers — Register a new volunteer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, mobileNumber, loraId } = body;

    // Validation
    if (!firstName || !firstName.trim()) {
      return NextResponse.json({ error: 'שם פרטי הוא שדה חובה' }, { status: 400 });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return NextResponse.json({ error: 'מספר נייד הוא שדה חובה' }, { status: 400 });
    }

    // Validate Israeli mobile number format
    const mobileRegex = /^05\d[- ]?\d{3}[- ]?\d{4}$/;
    if (!mobileRegex.test(mobileNumber.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'מספר נייד לא תקין. פורמט: 05X-XXX-XXXX' }, { status: 400 });
    }

    // Determine equipment
    const hasLora = !!loraId && loraId.trim().length > 0;
    const hasDefibrillator = true; // By default, registrants must have a defibrillator

    // Equipment check: must have defibrillator OR LoRa device
    if (!hasDefibrillator && !hasLora) {
      return NextResponse.json(
        { error: 'יש להחזיק דפיברילטור נייד ו/או מכשיר LoRa כדי להירשם' },
        { status: 400 }
      );
    }

    // Check for duplicate mobile number
    const existing = await pool.query(
      'SELECT id FROM volunteers WHERE mobile_number = $1',
      [mobileNumber.replace(/\s/g, '')]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'מספר נייד זה כבר רשום במערכת' }, { status: 409 });
    }

    // Insert volunteer
    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, mobile_number, lora_id, has_defibrillator, has_lora)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [firstName.trim(), lastName?.trim() || null, mobileNumber.replace(/\s/g, ''), loraId?.trim() || null, hasDefibrillator, hasLora]
    );

    const volunteer = result.rows[0];

    // Create initial gamification score
    await pool.query(
      `INSERT INTO volunteer_scores (volunteer_id, total_points, responses, avg_response_s, badges)
       VALUES ($1, 0, 0, 0, '{}')`,
      [volunteer.id]
    );

    return NextResponse.json({ volunteer, message: 'נרשמת בהצלחה! תודה שהצטרפת' }, { status: 201 });
  } catch (err) {
    console.error('POST /api/volunteers error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
