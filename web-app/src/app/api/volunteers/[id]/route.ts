// API Route: Individual Volunteer Management (Admin)
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/postgres';

// PUT /api/volunteers/[id] — Update a volunteer
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { firstName, lastName, mobileNumber, loraId, hasDefibrillator } = body;

    const hasLora = !!loraId && loraId.trim().length > 0;

    // Equipment check
    if (!hasDefibrillator && !hasLora) {
      return NextResponse.json(
        { error: 'יש להחזיק דפיברילטור נייד ו/או מכשיר LoRa' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE volunteers SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        mobile_number = COALESCE($3, mobile_number),
        lora_id = $4,
        has_defibrillator = COALESCE($5, has_defibrillator),
        has_lora = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [firstName, lastName, mobileNumber, loraId || null, hasDefibrillator, hasLora, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'מתנדב לא נמצא' }, { status: 404 });
    }

    return NextResponse.json({ volunteer: result.rows[0] });
  } catch (err) {
    console.error('PUT /api/volunteers/[id] error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}

// DELETE /api/volunteers/[id] — Delete a volunteer
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      'DELETE FROM volunteers WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'מתנדב לא נמצא' }, { status: 404 });
    }

    return NextResponse.json({ message: 'מתנדב נמחק בהצלחה' });
  } catch (err) {
    console.error('DELETE /api/volunteers/[id] error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
