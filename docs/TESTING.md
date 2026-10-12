# EAYNI — Testing Guide

## Automated

```bash
pnpm lint            # ESLint (TS + templates)
pnpm test            # Vitest, single run (34 specs)
pnpm build           # production build
```

## Local end-to-end with the mock API (no backend needed)

```bash
pnpm mock-api        # http://localhost:4300  — login saud@example.com / secret123 (or register)
pnpm start:mock      # http://localhost:4200  (environment.mock.ts)
```

The mock implements every collection route with the live response shapes. It is development tooling only and is never part of a build.

**Never point `environment.mock.ts` at production.** The smoke test registers accounts and submits orders; it now blocks every non-local host at the network layer and prints `BLOCKED NON-LOCAL REQUESTS` if the environment is wrong.

Scripted smoke test (headless Chrome, RTL, emulated GPS at Riyadh): `node mock-server/smoke-test.mjs` (set `LIGHT=1` for the light theme). It drives sign-in → donation → tracking → every screen, saves screenshots to `smoke-shots/` and prints console errors. Last run: 0 errors in both themes. Reference captures: `docs/screenshots/dark/` (mock, dark theme) and `docs/screenshots/live-api/` (guest screens rendered against the real API).

## Against the real backend

1. `clientApiUrl` (`https://api.eayni.info/client`) and `serviceApiUrl` (`https://api.eayni.info/services`) are pre-configured.
2. `pnpm start`, register or sign in with email + password, and walk the checklist:

| Area | Check |
|---|---|
| Auth | Register (name/email/phone/password) → lands on home; sign-in; wrong password shows the backend message; token persisted across reload; sign-out clears state |
| Donation | Categories from `/public/items`; photos upload and URLs come back; pin location + reverse geocode; region/city lists; `POST /order/submit` returns an order with `_id` |
| History | `GET /order/` lists all statuses; filters/search; detail timeline shows raw status when inferred |
| Active request | Success page, home card and detail show the 48-hour contact message; status chip reflects `/order/check` on entering the screen |
| Actions | Cancel with reason; rate; edit (PUT); re-donate prefill |
| Loyalty | Points balance; rewards list; redeem |
| Bins | `/account/containers?lat&long` markers; report actions |
| Profile | Update name/email/avatar; delete account |
| i18n | Toggle AR/EN on every screen; numerals; mirrored chevrons |
| Theme | System/light/dark on every screen |

3. Confirm the five "undocumented details" in `docs/API_COMPATIBILITY_MATRIX.md`; adjust `normalize.ts` / `environment.locationOrder` if needed.

## Native

```bash
pnpm build && npx cap add ios && npx cap add android && npx cap sync
```

Add platform permissions: location (when-in-use), camera/photos, push. Push requires Firebase config and `features.pushNotifications: true`.
