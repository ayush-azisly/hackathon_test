# 🌍 PlanetPulse — Carbon Footprint Tracker

**Hackathon ID:** `XXX_123`

**Track:** PlanetPulse (Climate Tech) — a carbon footprint tracker that turns daily choices into a visible carbon footprint.

**Live URL:** https://planetpulse-delta.vercel.app

**Standard API implemented:** the app exposes a full REST API (documented below) alongside the UI. All five features are usable through both.

## Features

1. **Log an activity** — type + quantity (e.g. car travel, 10 km), with an optional date.
2. **CO₂ calculation** — fixed factors per the brief: car 0.20 kg/km · bus 0.08 kg/km · flight 0.25 kg/km · electricity 0.80 kg/kWh · veg meal 0.5 kg · non-veg meal 2.0 kg.
3. **Dashboard** — total footprint plus a per-category bar breakdown.
4. **Weekly target** — set a weekly CO₂ budget; progress bar, mid-week pace projection, and a flag + nudge when exceeded.
5. **History & filter** — all logged activities, filterable by type and date range, with delete.

See [DECISIONS.md](./DECISIONS.md) for the three Decision Point write-ups.

## Tech

- **Next.js 14** (App Router, TypeScript) — UI and API routes in one deployable app
- **Tailwind CSS** — styling
- **Upstash Redis** for storage in production (Vercel), with a JSON-file fallback (`data/db.json`) for local dev — no setup needed to run locally
- No authentication (per the rules) — everything is open to graders. No test credentials required.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

## API

All endpoints return JSON. Activity types: `car`, `bus`, `flight`, `electricity`, `veg_meal`, `non_veg_meal`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/activities` | Log an activity. Body: `{ "type": "car", "quantity": 10, "date": "2026-09-05", "confirmAbsurd": false }` (`date` optional, defaults to today). Returns `201` with the created activity incl. computed `co2Kg`. |
| `GET` | `/api/activities` | List activities, newest first. Optional query params: `type`, `from`, `to` (dates `YYYY-MM-DD`, inclusive). |
| `DELETE` | `/api/activities/:id` | Delete an activity. |
| `GET` | `/api/target` | Get the weekly target: `{ "weeklyTargetKg": 50 }` (or `null`). |
| `PUT` | `/api/target` | Set it. Body: `{ "weeklyTargetKg": 50 }` (`null` clears). |
| `GET` | `/api/summary` | Total footprint, per-category breakdown, and current-week stats (`totalKg`, `targetKg`, `targetExceeded`, `projectedTotalKg`, `onTrack`). |

### Absurd input (DP2) at the API level

Implausibly large quantities (e.g. a 500,000 km car trip) get `422` with `code: "NEEDS_CONFIRMATION"`; re-send with `"confirmAbsurd": true` to log anyway. Physically impossible quantities (beyond a hard cap) are rejected with `code: "IMPOSSIBLE_QUANTITY"`. Non-positive or non-numeric quantities are `400`.

### Example

```bash
curl -X POST http://localhost:3000/api/activities \
  -H 'Content-Type: application/json' \
  -d '{"type":"car","quantity":10}'
# → {"activity":{"type":"car","quantity":10,"co2Kg":2,...}}
```
