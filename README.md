## Ride Estimate App

An India-first ride comparison experience that helps you balance fares, travel time, and comfort across Uber, Ola, and Rapido at a glance.

### Highlights
- New dark, cinematic interface engineered for Indian metros with quick route presets.
- Multi-stop pickup planning with intelligent recommendations tuned to Bengaluru, Mumbai, and Delhi.
- Smart insights that automatically surface the cheapest, fastest, and most premium choices.
- Anonymous user recognition backed by Vercel Postgres, keyed off the visitor’s IP (uses the Vercel Edge geo headers when available).
- Server-side aggregation against Uber, Ola, and Rapido APIs (with graceful simulation fallback when keys are missing).
- Built with Next.js App Router, React Hook Form, and Tailwind CSS (v4).

---

## Local Development

1. Install dependencies (already done if you ran `npm install` after pulling the repo):
   ```bash
   npm install
   ```

2. (Optional but recommended) provision a Vercel Postgres database and grab the `DB_POSTGRES_URL` string from the Vercel dashboard. This enables IP-based identification; without it the UI falls back gracefully.

3. (Optional) add ride provider credentials so the backend can call real APIs. The app falls back to realistic simulations if any key is missing.
   - `UBER_SERVER_TOKEN` *(or set `UBER_BASE_URL` / `UBER_SERVER_TOKEN` if you are proxying via your own gateway)*
   - `OLA_API_KEY`
   - `RAPIDO_API_KEY`

4. Create a `.env.local` file in the project root and add the values you collected:
   ```
   DB_POSTGRES_URL="postgres://..."
   UBER_SERVER_TOKEN="token-from-uber"
   OLA_API_KEY="ola-key"
   RAPIDO_API_KEY="rapido-key"
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Visit [http://localhost:3000](http://localhost:3000). The hero card, ride search form, and results carousel are fully client side; the `/api` routes run on the server to talk to Postgres and ride providers.

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

## Ride Provider Aggregation

`POST /api/estimates` orchestrates quote lookups across Uber, Ola, and Rapido.

- Each provider is implemented as a class extending `BaseRideService` (`src/services/*RideService.ts`).
- When credentials are present the real API endpoints are called. When they are missing or fail, the simulator in `src/services/pricing.ts` produces realistic INR fares based on the distance, duration, and number of pickups.
- The aggregator stitches all responses into one array, which the client sorts by price.

The recommender data used to power pickup/drop-off suggestions lives in `src/data/locations.ts`. Update this file to expand supported cities or add more curated routes.

---

## Deployment Tips

- Deploy on Vercel for the smoothest experience—edge headers for location and IP are available out of the box.
- Add `DB_POSTGRES_URL` (and optionally `POSTGRES_PRISMA_URL` / `DB_POSTGRES_URL_NON_POOLING` if you need them) to the project’s Environment Variables.
- Populate `UBER_SERVER_TOKEN`, `OLA_API_KEY`, and `RAPIDO_API_KEY` secrets so the aggregator can hit live pricing endpoints. Without them the simulator will continue to serve realistic fares.
- Promote the same SQL schema shown above before shipping to production.

Enjoy the ride planning! Feel free to tune the palettes or extend the providers as you wire up real-time quotes.
