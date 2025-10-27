import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

type UserRow = {
  ip: string;
  visit_count: number;
  first_seen: string;
  last_seen: string;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: string | null;
  lng: string | null;
};

const createTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS ride_users (
      ip TEXT PRIMARY KEY,
      visit_count INTEGER NOT NULL DEFAULT 1,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      city TEXT,
      region TEXT,
      country TEXT,
      lat TEXT,
      lng TEXT
    );
  `;
};

const normaliseIp = (request: NextRequest) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return request.ip ?? null;
};

export async function GET(request: NextRequest) {
  const ip = normaliseIp(request) ?? 'unknown';

  const city = request.headers.get('x-vercel-ip-city');
  const region = request.headers.get('x-vercel-ip-country-region');
  const country = request.headers.get('x-vercel-ip-country');
  const lat = request.headers.get('x-vercel-ip-latitude');
  const lng = request.headers.get('x-vercel-ip-longitude');

  try {
    await createTable();

    const result = await sql<UserRow>`
      INSERT INTO ride_users (ip, visit_count, city, region, country, lat, lng)
      VALUES (${ip}, 1, ${city}, ${region}, ${country}, ${lat}, ${lng})
      ON CONFLICT (ip) DO UPDATE
      SET visit_count = ride_users.visit_count + 1,
          last_seen = NOW(),
          city = COALESCE(excluded.city, ride_users.city),
          region = COALESCE(excluded.region, ride_users.region),
          country = COALESCE(excluded.country, ride_users.country),
          lat = COALESCE(excluded.lat, ride_users.lat),
          lng = COALESCE(excluded.lng, ride_users.lng)
      RETURNING ip, visit_count, first_seen, last_seen, city, region, country, lat, lng;
    `;

    const user = result.rows[0];

    return NextResponse.json({
      ok: true,
      ip: user.ip,
      visits: user.visit_count,
      firstSeen: user.first_seen,
      lastSeen: user.last_seen,
      city: user.city,
      region: user.region,
      country: user.country,
      lat: user.lat,
      lng: user.lng,
    });
  } catch (error) {
    console.error('Failed to update ride_users table', error);
    return NextResponse.json(
      {
        ok: false,
        ip,
        message:
          'Ride history persistence is offline. Configure Vercel Postgres by setting the POSTGRES_URL environment variable.',
      },
      { status: 200 },
    );
  }
}
