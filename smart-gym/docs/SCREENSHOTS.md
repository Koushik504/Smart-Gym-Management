# Actual application screenshots

Captured by the passing Playwright suite on **19 November 2026**, using installed Microsoft Edge against the local **production build**. Desktop viewport: 1440×1000. Mobile viewport: 390×844. These are full-page application captures of real query results from synthetic demonstration data, not design mockups.

| Capture | View |
| --- | --- |
| [01 — Login](screenshots/01-login-desktop.png) | Authentication screen |
| [02 — Dashboard](screenshots/02-dashboard-desktop.png) | Admin live metrics, revenue, membership mix, attendance and growth charts |
| [03 — Members](screenshots/03-members-desktop.png) | Member directory after browser form create/edit checks |
| [04 — Analytics](screenshots/04-analytics-desktop.png) | Retention, workout aggregation, measurement summary, activity analysis and workload |
| [05 — Workouts](screenshots/05-workouts-desktop.png) | MongoDB-backed session history |
| [06 — Mobile dashboard](screenshots/06-dashboard-mobile.png) | Stacked metrics/charts and responsive navigation |
| [07 — Mobile members](screenshots/07-members-mobile.png) | Responsive filters and internally scrollable table |
| [08 — Trainer members](screenshots/08-trainer-members.png) | Scoped trainer directory without admin actions |

Screenshots were taken during a test that creates a synthetic browser-verification member, then cleans up that fixture by its returned ID. Therefore later captures can show one more member/retention signal than the earlier dashboard or the database after cleanup. This is expected persisted test activity, not a fixed UI statistic. Table columns scroll inside their panels on narrow screens; document-wide horizontal overflow was checked at the mobile width. Images were visually reviewed for rendering, chart visibility, clipping and layout. Further device/browser/accessibility certification is not claimed.
