# EAYNI — Missing Backend Capabilities

Everything below is **not** in the current API. The app degrades honestly where these are missing (it never simulates data) and is structured so each item can be switched on with a small change.

## (Deferred) Live driver tracking — removed from the app at client request on 2026-10-12; kept here for reference if it is reconsidered

| Need | Why | Suggested contract | App hook |
|---|---|---|---|
| Driver position for an active order | Uber-style map | `GET /order/:id/driver/location → { location: [lat,lng], heading, updatedAt }` **or** embed `driver.location` in `GET /order/check` | `normalizeDriver` already reads `driver.location`; `OrderTrackPage.driverPos` renders the marker when present. |
| Push of position updates | Smooth marker movement without polling | Socket.IO / SSE channel `order:<id>` emitting the same payload | Replace the `setInterval` in `OrderTrackPage.ngOnInit` with a subscription; `MapComponent` already animates marker moves. |
| Route + ETA | "Estimated arrival" | Server-side call to a routing provider (Google Directions / OSRM) returning `{ polyline, durationSec, distanceM }` | `MapComponent.polyline` input and the ETA row in the tracking sheet are ready; today a straight line and "ETA unavailable" are shown. |
| Status history | Timestamps on the journey timeline | `history: [{ status, createdAt }]` on every order | `normalizeHistory` consumes it when present. |
| Full status enum | Correct stage mapping | Document all `order.*` codes | Add them to `CONFIRMED` in `order-status.ts`. |

Security: the driver-location endpoint must authorize on `order.client === token.userId` and only for non-terminal orders.

## P1 — Scheduling (Phase 10)

| Need | Suggested contract |
|---|---|
| Available pickup windows | `GET /order/slots?city=&date=` → `[{ start, end, available }]` |
| Preferred slot on submit/update | `scheduledAt` / `slotId` fields on `POST /order/submit` and `PUT /order/:id` |
| Reschedule | same `PUT` or `POST /order/:id/reschedule` |

The wizard currently omits a date step because showing unsupported windows would be fake availability.

## P1 — Push notifications (Phase 8)

* `PUT /account/profile { fcm, os, app_version }` already accepts the token (implemented in `PushService`).
* Backend must send through `{{SERVICE_URL}}/fcm` on: request accepted, driver assigned, driver approaching, arrived, collected, completed, achievement/campaign.
* Payload should include `data.orderId` so taps deep-link to `/orders/:id` (handled in `NotificationsPage.open`).
* Native setup still required: Firebase project, `google-services.json` / APNs key, then set `features.pushNotifications: true`.

## P2 — Loyalty & gamification (Phase 7)

* Points balance and rewards exist. Missing: **points history endpoint shape** (the app tolerates `history/transactions` arrays) and **rules** (points per completed order). Badges are computed client-side from completed orders and are non-monetary by design.
* Optional: `GET /account/achievements` to make badges server-authoritative.

## P2 — Impact data (Phase 6)

* `weight` per completed order (measured at sorting) → enables the "Measured kg" tile automatically.
* Community totals: `GET /public/stats → { orders, items, weightKg, campaigns[] }` for the Community card.
* Any CO₂ / water figures must come with a documented methodology; the UI labels estimates separately from measured values.

## P2 — Saved addresses

* No address book endpoint; saved places are on-device (`SavedPlacesService`). Suggested: `GET/POST/DELETE /account/addresses`.

## P3 — AI assistant (Phase 9)

* Rule-based on-device assistant ships now. For an LLM-backed version add a backend proxy (`POST /assistant/chat`) that holds the API key, applies rate limits and strips PII; set `environment.assistant.proxyUrl`. Never ship LLM keys in the app.

## P1 — Auth hardening (found during live verification)

* `POST /auth/signup` accepts an invalid email (`not-an-email`) and a 1-character password while `/auth/signin` enforces email format + 6 chars → align validation (Zod) on signup.
* No password-reset endpoint exists although the duplicate-email error says "try to reset your password" → add `POST /auth/forgot-password` + reset; the app will add the "Forgot password?" link once it exists.
* `/auth/signin` returns no refresh token → either issue one (the app already handles `/auth/refresh-token`) or document the access-token lifetime.
* Undocumented endpoints `/auth/signin` and `/auth/signup` should be added to the Postman collection.

## P3 — Misc

* `GET /order/:id` single-order fetch (today the app reads from the list / check).
* `/public/page?page=privacy` returns `null` — publish the privacy policy (the app shows "not available" meanwhile).
* Read-state for notifications (`PUT /account/notifications/:id/read`).
* Chat realtime channel (currently polled every 8 s).
