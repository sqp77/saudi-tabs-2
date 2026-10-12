# EAYNI — Technical Assessment (Phase 1)

Date: 2026-10-12

## What was delivered as "existing application"

| Item | Finding |
|---|---|
| Stack | Ionic 9.0.7 + Angular 22.1 (standalone, zoneless) + Capacitor 8, pnpm, Vitest |
| Screens | Ionic "tabs" starter (`home`, `destinations`, `favorites`, `profile`) with placeholder Arabic text about Saudi tourism — **no EAYNI functionality, no API calls, no auth, no models** |
| Theme | Empty `variables.scss`; default Ionic palette |
| i18n | `index.html` hard-coded to `lang="ar" dir="rtl"`; no translation layer |
| Tests | One default spec |
| Capacitor | `appId com.saudiexplorer.tabs`, no plugins beyond core |
| API docs | `Cient.postman_collection.json` — 45 requests across auth / public / account / order / services. Request bodies documented, **no responses**, base URLs undefined |

Conclusion: the codebase was a scaffold. Everything product-related has been built in this iteration while keeping the stack, tooling and build pipeline intact (no migration).

## Architecture now

```
src/app
├─ core/
│  ├─ api/          ApiClient (typed, envelope-tolerant) + PublicApi / AccountApi / OrderApi / UploadApi
│  ├─ auth/         AuthService (phone→OTP→tokens), TokenStore (Capacitor Preferences), interceptor (bearer, Accept-Language, single-flight refresh), guards
│  ├─ i18n/         Signal-based I18nService (ar default, RTL/LTR) + `t` pipe + ar/en dictionaries (identical key sets, unit-tested)
│  ├─ theme/        ThemeService (system/light/dark via `.ion-palette-dark`)
│  ├─ models/       Typed request/response models (responses permissive + `raw`)
│  ├─ services/     OrdersStore (signals), ImpactService, AchievementsService, LocationService, SavedPlacesService, DraftService, AssistantService, PushService, NetworkService, ToastService
│  └─ utils/        normalize.ts, order-status.ts, phone.ts, geo.ts, image.ts, category-icon.ts
├─ shared/components  MapComponent (Leaflet, pin mode, animated markers), StageTimeline, StatusChip, StatTile, OrderCard, EmptyState, Skeleton, SectionTitle
└─ features/        auth (welcome/phone/otp), tabs, home, donate (4-step wizard + success), orders (list/detail/chat/receipt + rate & edit modals), impact, rewards, containers, notifications, profile (+edit, places), assistant, info
```

Key decisions:

* **Zoneless Angular + signals** everywhere; the translate pipe is intentionally impure so views re-render on language change.
* **Leaflet + OpenStreetMap** tiles — no API key in the client. `environment.mapTiles` lets ops switch to a commercial tile server (OSM's public tiles are not for heavy production traffic).
* **Defensive normalization** instead of guessing a response schema; unknown shapes degrade to empty states, never crashes.
* **No live tracking** (removed at the client's request on 2026-10-12): after submission the app tells the donor that EAYNI will contact them within 48 hours; the request detail shows the verified status and journey timeline only.
* **Impact numbers** are item counts from completed orders (labelled "measured"); no kg/CO₂ estimates because the API has no weights or methodology.
* **Bundle**: only referenced Ionicons are registered (initial bundle 0.94 MB raw / 0.21 MB gzip).

## Problems found & fixed during development

| Problem | Fix |
|---|---|
| `@ionic/angular/standalone` entry no longer exists in Ionic 9 | Import from `@ionic/angular` (standalone is the default) |
| All ~1,300 Ionicons were bundled (1.7 MB initial) | Explicit icon registry (`core/config/icons.ts`) |
| Ionic dark palette overrode brand secondary/tertiary colors | Full color set defined under `html.ion-palette-dark` |
| `computed()` over non-signal fields never re-evaluated (phone validation) | Converted inputs to signals |
| `viewChild` on `ion-content` returned the component, not an ElementRef | Use `viewChild(IonContent)` |
| Mock environment imported itself through file replacement | Shared `environment.base.ts` |

## Live API verification (2026-10-12, `https://api.eayni.info/client`)

* All public endpoints probed and their real shapes captured (see matrix). Several differed from first assumptions and were corrected: items are **category groups with sub-items and per-unit `reward` points**; countries use `dial`; reasons/contacts are wrapped in `value`; pagination is mongoose-paginate; `/order/check` is `{ runningOrder, requestForRateOrder }`; points use `availableCredit`; containers are **coverage polygons**, not pins; coordinates are **GeoJSON [lng, lat]**.
* Two undocumented auth endpoints exist and are now the primary flow at the client's request: `POST /auth/signin {email, password}` and `POST /auth/signup {name, email, password, phone}`. Phone OTP remains available in `AuthService`.
* During discovery three throwaway accounts ended up on production: one from the signup probe (the backend accepted an invalid email) and two from smoke runs after `environment.mock.ts` had been pointed at the live URL (`new-1791799772226@example.com`, `new-1791799961640@example.com`). All three were deactivated through `DELETE /account` (removal within 14 days). The smoke test now blocks non-local hosts. One 1×1 test PNG was uploaded to confirm the upload response (`eayni/2026/10/12/MSmaiosMUGmvYHd7.png`).
* Guest screens were rendered in headless Chrome against the live API with zero console errors (6 categories, 5 initiatives, 3 banners, popup ad, About/Terms/Partners/Contact).
* Upload verified on `https://api.eayni.info/services/upload?path=eayni` (returns `files[].url`, CORS `*`).
* Not yet exercised on the live API: a real order lifecycle (submit, chat, rate, cancel) — needs the client's own account.

## Verification performed

* `pnpm lint` — clean.
* `pnpm test` — 48 unit tests (status mapping, normalizers incl. live-API fixtures, phone/geo/polygon/markdown utils, i18n parity, impact/achievements, email/password auth + interceptor + refresh, order API payloads).
* `pnpm build` — production build OK.
* Headless Chrome (390×844, RTL, geolocation emulated) against the **local mock API** (now mirroring live shapes): register → login → home → 4-step donation (pin map, reverse geocode, region/city) → submit → success → history → detail → chat → receipt → impact → rewards → bins → notifications → assistant → profile (dark/light) → contact. Zero console errors on the final run. Screenshots are in the PR/hand-over package.
* **Not verified**: the real backend (no base URL was provided), native iOS/Android builds, push delivery. See `docs/TESTING.md`.
