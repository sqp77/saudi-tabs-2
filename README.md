# EAYNI — Smart Recycling & Donation App (عيني)

Ionic 9 · Angular 22 (standalone, zoneless, signals) · Capacitor 8 · Leaflet · Vitest

Auth: email + password (`/auth/signin`, `/auth/signup`). Phone OTP endpoints remain available in `AuthService`.

Arabic-first (RTL) with full English (LTR), light/dark themes, and a Saudi-inspired green identity.

## Quick start

```bash
pnpm install
pnpm mock-api      # optional: local mock of the EAYNI API on :4300 (saud@example.com / secret123)
pnpm start:mock    # app on :4200 against the mock
# or, against the real backend (client + services URLs are pre-configured):
pnpm start
```

Scripts: `build`, `build:dev`, `test`, `test:watch`, `lint`, `cap:sync`.

## Configuration

`src/environments/environment.ts` (dev) / `environment.prod.ts` (release):

| Key | Purpose |
|---|---|
| `clientApiUrl` | `{{CLIENT_URL}}` from the Postman collection |
| `serviceApiUrl` | `{{SERVICE_URL}}` (S3 upload) |
| `locationOrder` | `'lnglat'` (default, verified GeoJSON) or `'latlng'` |
| `mapTiles` | Tile server (OpenStreetMap by default; use a production provider for release) |
| `features.*` | `rewards`, `containers`, `chat`, `assistant`, `pushNotifications` |
| `polling.*` | Active-order / chat refresh intervals |

No API keys or secrets are stored in the app.

## Documentation

* `docs/TECHNICAL_ASSESSMENT.md` — what existed, architecture, decisions, fixes, verification
* `docs/API_COMPATIBILITY_MATRIX.md` — every endpoint and where it is used
* `docs/BACKEND_REQUIREMENTS.md` — what the backend must add (live GPS, slots, push…)
* `docs/ROADMAP.md` — phase status and next sprint
* `docs/TESTING.md` — how to test (mock, real backend, native)

## Feature map

Open EAYNI → Create donation (category groups · sub-items · photos · instructions · GPS pin · region/city) → Confirm → "We will contact you within 48 hours" → Request detail (status, journey timeline, chat, edit/cancel) → Complete (receipt, rating) → Impact (measured counts, badges, goals, eco points & rewards).
