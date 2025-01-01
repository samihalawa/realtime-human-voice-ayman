import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_DB_URL,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');

  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT p.*, mh.condition_description, mh.diagnosis_date, mh.treatment
      FROM patients p
      LEFT JOIN medical_history mh ON p.id = mh.patient_id
      WHERE p.first_name ILIKE $1 AND p.last_name ILIKE $2
    `, [firstName, lastName]);
    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "No patient found with that name." });
    }

    const patient = result.rows[0];
    const formattedResult = {
      name: `${patient.first_name} ${patient.last_name}`,
      date_of_birth: patient.date_of_birth,
      medical_history: result.rows.map(r => ({
        condition: r.condition_description,
        diagnosis_date: r.diagnosis_date,
        treatment: r.treatment
      })).filter(r => r.condition)
    };

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Error retrieving patient information' },
      { status: 500 }
    );
  }
} 