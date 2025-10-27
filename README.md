## Ride Estimate App

An India-first ride comparison experience that helps you balance fares, travel time, and comfort across Uber, Ola, and Rapido at a glance.

### Highlights
- New dark, cinematic interface engineered for Indian metros with quick route presets.
- Smart insights that automatically surface the cheapest, fastest, and most premium choices.
- Anonymous user recognition backed by Vercel Postgres, keyed off the visitor’s IP (uses the Vercel Edge geo headers when available).
- Built with Next.js App Router, React Hook Form, and Tailwind CSS (v4).

---

## Local Development

1. Install dependencies (already done if you ran `npm install` after pulling the repo):
   ```bash
   npm install
   ```

2. (Optional but recommended) provision a Vercel Postgres database and grab the `POSTGRES_URL` string from the Vercel dashboard. This enables IP-based identification; without it the UI falls back gracefully.

3. Create a `.env.local` file in the project root and add:
   ```
   POSTGRES_URL="postgres://..."
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Visit [http://localhost:3000](http://localhost:3000). The hero card, ride search form, and results carousel are fully client side; the `/api/user` route runs on the server to talk to Postgres.

---

## Database Schema

The API route auto-migrates the following table the first time it runs. You can also execute it manually inside the Vercel Postgres SQL editor:

```sql
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
```

`GET /api/user` will upsert a record using the IP and geo headers and respond with an object such as:

```json
{
  "ok": true,
  "ip": "203.0.113.42",
  "visits": 3,
  "firstSeen": "2024-07-10T06:21:12.482Z",
  "lastSeen": "2024-07-11T05:54:03.192Z",
  "city": "Bengaluru",
  "region": "Karnataka",
  "country": "IN"
}
```

If the database is unreachable you still get a soft success with `ok: false` and a message that is surfaced in the UI.

---

## Mocked Ride Data

The estimator currently ships with curated sample responses in `src/app/ride-estimator.tsx`. They reflect typical Bengaluru/Mumbai fares in INR and power:

- Quick route presets for airport runs and tech corridors.
- Insight cards that call out best fare, fastest arrival, and premium upgrades.
- The sorted ride list with brand-tinted cards.

Swap the `mockEstimates` array with real integrations (or plug in classes that extend `BaseRideService`) once your provider APIs are ready.

---

## Deployment Tips

- Deploy on Vercel for the smoothest experience—edge headers for location and IP are available out of the box.
- Add `POSTGRES_URL` (and optionally `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` if you need them) to the project’s Environment Variables.
- Promote the same SQL schema shown above before shipping to production.

Enjoy the ride planning! Feel free to tune the palettes or extend the providers as you wire up real-time quotes.
