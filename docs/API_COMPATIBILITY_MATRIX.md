# EAYNI — API Compatibility Matrix

Source of truth: `Cient.postman_collection.json` plus **live verification on 2026-10-12** against `https://api.eayni.info/client` (`{{CLIENT_URL}}`) and `https://api.eayni.info/services` (`{{SERVICE_URL}}`).
The collection documents request shapes only; response shapes below marked ✔ were captured from the live API and are locked by `src/app/core/utils/live-shapes.spec.ts`. Responses are normalized in `src/app/core/utils/normalize.ts` and the raw payload is kept on `raw`.

**Localization:** the API filters fields by `Accept-Language` — an `en` request returns only `*_en` fields (and vice-versa). `/public/items` and `/public/all-cities` return both languages. The app clears its public cache on language switch.

Legend — **Used**: wired into a screen · **Available**: service method exists, no screen yet · **Server-only**: not meant to be called by the client · **Missing**: needed by a feature but absent from the API.

## Authentication

| Endpoint | Method | App usage | Service | Notes |
|---|---|---|---|---|
| `/auth/signin` ✔ | POST `{email, password}` | **Used** — Login page | `AuthService.signIn` | **Not in the collection; discovered live.** Zod validation: valid email, password ≥ 6. Wrong credentials → HTTP 403 `{message: "Sorry user or password incorrect"}`. Success returns `accessToken` (no refresh token observed). |
| `/auth/signup` ✔ | POST `{name, email, password, phone, countryCode?}` | **Used** — Register page | `AuthService.signUp` | **Not in the collection; discovered live.** Returns `{ user, accessToken }`. `phone` is required by the Mongoose schema; duplicate email → `{message: "Sorry user already exist…", error: true}`. Note: the backend does not validate email format on signup. |
| `/auth/phone-signin` | POST `{phone, countryCode}` | Available (OTP flow kept in `AuthService`, no UI) | `AuthService.requestCode` | Replaced in the UI by email/password at the client's request. |
| `/auth/phone-verify` | POST `{phone, code}` | Available | `AuthService.verifyCode` | `accessToken` confirmed by the collection's test script. |
| `/auth/refresh-token` | POST `{refreshToken, fcm}` | **Used** — interceptor, single-flight on 401 | `AuthService.refresh` | Only effective if a refresh token is issued; otherwise a 401 signs the user out. |

## Public (no token)

| Endpoint | Method | App usage | Service |
|---|---|---|---|
| `/public/country` ✔ | GET → `[{ name_ar, name_en, code:'KSA', dial:'+966', image, active }]` | **Used** — register country picker | `PublicApi.countries` |
| `/public/items` ✔ | GET → `[{ _id, category:{ name_ar, name_en, image, countable }, items:[{ _id, name_ar, name_en, image, reward, countable, active }] }]` (6 groups: clothes, devices, paper, accessories, metals, utensils) | **Used** — wizard (group → sub-item + qty + reward pts), home, edit, assistant | `PublicApi.categories` |
| `/public/regions` ✔ | GET → `[{ _id, name_xx }]` (single language) | Available | `PublicApi.regions` |
| `/public/regions/:region/cities` ✔ | GET → `[{ _id, name_xx }]` | Available (fallback) | `PublicApi.cities` |
| `/public/all-cities` ✔ | GET → `[{ _id, name_ar, name_en, count, child:[cities] }]` | **Used** — pickup step (both languages in one call) | `PublicApi.regionsWithCities` |
| `/public/cancellation-reasons` ✔ | GET → `{ _id, value:{ reasons_ar:[…] } }` | **Used** — cancel dialog | `PublicApi.cancellationReasons` |
| `/public/partners?page=` ✔ | GET → mongoose-paginate `{ docs:[{ _id, name_xx, image }], hasNextPage, totalPages… }` | **Used** — Partners page | `PublicApi.partners` |
| `/public/sponsors?type=` ✔ | GET → paginated `{ docs:[{ …, sponserType:'Golden'|'Silver' }] }` | **Used** — Partners page | `PublicApi.sponsors` |
| `/public/bunners` ✔ | GET → `[{ _id, image }]` | **Used** — home banners | `PublicApi.banners` |
| `/public/ad` ✔ | GET → `{ url }` (image) | **Used** — home popup, once per day | `PublicApi.ad` |
| `/public/social-services?page=` ✔ | GET → paginated `{ docs:[{ _id, image, title_xx, content_xx }] }` | **Used** — home "Community initiatives" | `PublicApi.campaigns` |
| `/public/page?page=about\|terms\|privacy` ✔ | GET → `{ _id, image, title_xx, content_xx }` (markdown) or `null` (privacy is unpublished) | **Used** — About / Terms / Privacy | `PublicApi.page` |
| `/public/contacts` ✔ | GET → `{ value:{ socialmedia:[{ name, url, image }], phone, email, website, address } }` | **Used** — Contact page | `PublicApi.contacts` |
| `/public/contact/submit` | POST | **Used** — Contact form | `PublicApi.submitContact` |
| `/public/news`, `/public/clients`, `/public/positive-reviews` | GET | Not used (collection marks them "only website") | — |
| `/public/order/submit` | POST | Not used — guest orders bypass the account; the app requires sign-in so orders appear in history and earn points | — |
| `/public/delete/account/` | DELETE | Not used — `/account` DELETE is used instead | — |
| `/public/payment/callback` | POST | **Server-only** (payment provider callback) | — |
| `/health` ✔ | GET → `{ status:'UP' }` | Available | `PublicApi.health` |
| `/submit` | GET | Unknown purpose, not used | — |

## Account (bearer)

| Endpoint | Method | App usage | Service |
|---|---|---|---|
| `/account/me` ✔ | GET → `{ data:{ _id, name, email, phone, avatar, is_phone_verified, email_verified, active, type, language, country:'KSA', location:{ type:'Point', coordinates:[lng,lat] }, createdAt } }` | **Used** — after sign-in, profile | `AuthService.loadMe`, `AccountApi.me` |
| `/account/profile` | PUT `{name,email,fcm,os,app_version,language,location,avatar}` | **Used** — Edit profile, push token registration | `AccountApi.updateProfile` |
| `/account` ✔ | DELETE → soft delete (`active:false`, removed after 14 days) | **Used** — Delete account | `AccountApi.deleteAccount` |
| `/account/notifications` ✔ | GET → paginated `{ docs }` | **Used** — Notifications page, unread badge | `AccountApi.notifications` |
| `/account/drivers` ✔ | GET → `[]` for a client (no positions) | Available | `AccountApi.drivers` |
| `/account/containers?lat&long` ✔ | GET → paginated `{ docs:[{ _id, name_xx, type, country, image, active, allowedRegions: MultiPolygon }] }` — **coverage zones, not pins** | **Used** — Containers map (zones + in-zone check) | `AccountApi.containers` |
| `/account/containers/activity` ✔ | GET → paginated | Available | `AccountApi.containerActivity` |
| `/account/containers/:id/:action` (`empty`/`maintenance`/`requested`) | POST | **Used** — container action sheet | `AccountApi.containerAction` |
| `/account/rewards` ✔ | GET → paginated `{ docs:[{ _id, name_ar, name_en, points:'1000', image, active }] }` | **Used** — Rewards | `AccountApi.rewards` |
| `/account/rewards/:id/redeem` | POST | **Used** — Rewards | `AccountApi.redeem` |
| `/account/points` ✔ | GET → `{ transactions:{ docs… }, totalCredit, totalDebit, availableCredit }` | **Used** — Home, Impact, Rewards (`availableCredit` = balance) | `AccountApi.points` |

## Orders (bearer)

| Endpoint | Method | App usage | Service |
|---|---|---|---|
| `/order/?status=` ✔ | GET → paginated `{ docs:[Order] }` | **Used** — history (all pages fetched, filtered client-side) | `OrderApi.list` |
| `/order/check` ✔ | GET → `{ runningOrder: Order\|null, requestForRateOrder: Order\|null }` | **Used** — home active card, tracking poll, pending-rating prompt | `OrderApi.check` |
| `/order/submit` | POST | **Used** — donation wizard | `OrderApi.submit` |
| `/order/:id` | PUT | **Used** — Edit request modal | `OrderApi.update` |
| `/order/:id` | DELETE `{reason}` | **Used** — Cancel request | `OrderApi.cancel` |
| `/order/:id/rate` | POST `{stars, review}` | **Used** — Rate sheet | `OrderApi.rate` |
| `/order/geo/address` ✔ | POST `{type:'Point', coordinates:[lng, lat]}` → `{ address }` | **Used** — reverse geocode on pin drop. Verified: `[46.6753, 24.7136]` → Riyadh address; `[lat, lng]` → wrong country | `OrderApi.geocode` |
| `/order/:id/chat` | GET / POST `{text}` | **Used** — order chat (polled) | `OrderApi.chatHistory`, `sendChat` |

## Services ({{SERVICE_URL}})

| Endpoint | Method | App usage | Service |
|---|---|---|---|
| `/upload?path=eayni` ✔ | POST multipart `file` → `{ message, s3Result:[…], files:[{ url, contentType }] }`; CORS `*` | **Used** — item photos, avatar | `UploadApi.upload` |
| `/fcm` | POST | **Server-only** — push relay; never called from the app | — |

## Known status codes

| Code | Source | Journey stage |
|---|---|---|
| `order.client.send` | collection (chat query param) | 1 — Request submitted |
| `order.driver.completed` | collection (orders filter) | 7 — Request completed |
| any other | **inferred** from `order.<actor>.<action>` naming (see `order-status.ts`) | shown with the raw code underneath |

## Confirmed vs. still-open details

| Topic | Status |
|---|---|
| Response envelope | ✔ Bare arrays / mongoose-paginate objects; only `/account/me` wraps in `{ data }` |
| `location` ordering | ✔ GeoJSON **[lng, lat]** (`environment.locationOrder = 'lnglat'`) — user records store a GeoJSON Point and the geocoder only resolves [lng, lat] |
| `/order/check` shape | ✔ `{ runningOrder, requestForRateOrder }` |
| Order document shape (`history`, `driver`, `code`, `images`) | ⏳ The test account had no orders; the normalizer accepts the collection fields and common names. Verify with a real order. |
| Full order status enum | ⏳ Still only `order.client.send` / `order.driver.completed` confirmed |
| `{{SERVICE_URL}}` + upload response | ✔ `https://api.eayni.info/services`; `files[].url` on S3 (`eayni-assets`) |
