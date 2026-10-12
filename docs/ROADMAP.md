# EAYNI — Implementation Roadmap

| # | Phase | Status | Notes |
|---|---|---|---|
| 1 | System inspection & assessment | ✅ | `docs/TECHNICAL_ASSESSMENT.md`, `docs/API_COMPATIBILITY_MATRIX.md` |
| 2 | Premium redesign (AR default, RTL/LTR, dark/light, tokens) | ✅ | `src/theme/variables.scss`, `src/global.scss` |
| 3 | Smart donation wizard | ✅ | Category groups → sub-items + qty + expected reward points, photos (S3 via services API), instructions, GPS + pin map, region/city, saved places, review, submit, draft restore, re-donate |
| 4 | Live driver tracking | ⛔ Removed at client request (2026-10-12) | Replaced by a "we will contact you within 48 hours" message on success, home and request detail. Status chip + journey timeline remain on the detail page. The map/driver/polling code can be restored from git history if tracking is wanted later. |
| 5 | History & details | ✅ | Filters, search, detail, timeline, photos, driver, cancel w/ reasons, rate, edit, re-donate, receipt |
| 6 | Impact dashboard | ✅ (measured only) | Counts, categories, 12-month chart, streak, goal; estimates deliberately withheld |
| 7 | Gamification | ✅ (non-monetary) | Eco points from API, 6 client-computed badges, personal goal, share |
| 8 | Notifications | ◐ | In-app list + badge from API; push registration coded behind `features.pushNotifications` pending Firebase setup + backend sending |
| 9 | AI assistant | ✅ (on-device rules) | LLM proxy slot in config; no keys in app |
| 10 | Smart scheduling | ◐ | Saved places, instructions, repeat; date/slots need backend |
| 11 | Innovation extras | ✅ | Journey timeline, digital receipt, re-donation, saved locations, preparation checklist, arrival-ready UI; community stats & family profiles await backend |
| 12 | API architecture | ✅ | Typed client, interceptor, refresh, pagination, offline banner, empty/loading states |
| 13 | Performance/privacy/security | ✅ | Lazy routes, icon trimming, image compression, token storage via Preferences, no secrets in app, tracking behind auth guard |
| 14 | Testing | ◐ | Unit + headless E2E vs mock; real backend & device runs pending base URLs/credentials |
| 15 | Documentation | ✅ | This folder + README |

## Next sprint (needs backend / credentials)

1. Run a real order lifecycle with the client's account to confirm the order document shape and status enum.
3. Add slot endpoints → enable the date step in the wizard (`donate.page.ts` is structured for a 5th step).
4. Firebase project → `features.pushNotifications = true`, `npx cap add ios android`, `pnpm cap:sync`.
5. Replace OSM tiles with a production tile provider.
