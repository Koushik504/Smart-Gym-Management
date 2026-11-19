# Actual verification results

## Move existing Smart Gym records to MySQL 3306 (19 November 2026)

The user's MySQL client password successfully authenticated to the MySQL80 Windows service at 127.0.0.1:3306. The user explicitly selected keeping current Smart Gym records. The app was stopped, its populated port-3308 database and private connection settings were backed up, and `smart_gym` was created on 3306 without replacing any existing database. A generated database-only application account was provisioned; the administrator password was never persisted. All 18 base tables, four views, seven routines and five triggers were copied. Every table's row count and canonical content SHA-256 matched before cutover; JSON columns compare parsed values with canonical keys and numeric representation. The first raw-text comparison detected differing JSON audit serialization and correctly withheld cutover until semantic equality was verified. No financial/member data was invented or changed to force a match. Existing accounts, member IDs, session tokens and MongoDB relationships were preserved. The original five-member gym database is unchanged, and the source on 3308 remains for rollback. See [MYSQL_MOVE_RESULTS.json](MYSQL_MOVE_RESULTS.json).

The private app `.env` was switched to `127.0.0.1:3306/smart_gym`, and the production server was restarted. The database check reports MySQL 8.0.46, database smart_gym and port 3306; MongoDB ping succeeds. All **39 API integration tests** passed against the new server, including direct SQL writes, renewal/rollback, views/routines/triggers, authorization, personal records, outbox delivery and logout. The connectivity test now asserts the actual SQL port and database match DATABASE_URL. **13 unit tests**, lint and TypeScript checking passed. The complete browser suite also passed **8/8**, including live SQL reads/writes, member records and desktop/mobile session-clearing checks. After fixture cleanup the final connectivity check confirmed **5 users and 25 members** remain. See [TEST_RESULTS.json](TEST_RESULTS.json) and [BROWSER_RESULTS.json](BROWSER_RESULTS.json). Re-running all four applied migrations succeeds with checksums intact, without changing the system server's binary-log/trust settings. The provisioner detects 3306 and skips the previous isolated instance. A new target-database backup also succeeded. No runtime application code change or rebuild was required for the server-side connection switch; the existing production build loads the private environment on startup. The updated app remains running at http://127.0.0.1:3100. Earlier results below describe previous configurations.

## Logout reachability and session clearing (19 November 2026)

Reproduced the reported logout failure at **1366x640**: the sidebar's accumulated navigation/note height pushed its sign-out button entirely outside the viewport (Playwright viewport ratio 0). The original sidebar had no scrolling region to reach it. The fix confines navigation to a scrollable flex child and keeps the account section and a labelled, full-width Sign out button fixed at the bottom. The button shows a busy state, prevents repeated submissions, displays errors next to the action, and performs a full navigation to `/login` after the logout API succeeds.

Production build and lint passed. The complete browser suite passed **8/8**, including logout regressions at **1366x768**, **1366x640** and **390x640**. Each requires the complete button to be in the viewport, clicks it, expects HTTP 200, checks the browser session cookie is removed, verifies the former token now returns 401, and confirms the protected account page redirects to login. Existing admin/trainer/member workflows, SQL-backed data and cross-tab refresh tests also passed. See [BROWSER_RESULTS.json](BROWSER_RESULTS.json) and `screenshots/logout-1366x640.png` / `screenshots/logout-390x640.png`. Desktop/mobile captures were visually reviewed. The updated production server is running on port 3100; existing tabs need a page refresh to load the rebuilt interface. Existing verification sections below describe earlier runs.

## Empty member account diagnosis and SQL linkage repair (19 November 2026)

Read-only diagnostics confirmed that the configured MySQL database is `smart_gym` on local port 3308 and its APIs were already querying persisted records. The original `member@smartgym.local` demonstration login pointed to member 44, a new Demo Member with zero subscriptions/payments/attendance/assignments and no workout/progress documents. The database contained 24 older synthetic demonstration members with real persisted relational history. No MySQL password was requested or changed.

After a private SQL backup, `db:seed-member` linked the existing demonstration login to the known seeded Rohan Kapoor profile (member 2), preserving its existing SQL rows, MongoDB documents, login password and the old empty placeholder row. The repair invalidated previous sessions. A repeat run made no change. The provisioning script now uses this populated demonstration profile on fresh setup and refuses to repurpose another linked account or a placeholder with history/documents. It creates no new payments, membership, attendance or history to fill the interface.

Actual post-repair API results: own member 1, subscriptions 1, payments 1, attendance 7, assigned plans 1, workouts 6 and progress entries 3. The trainer relationship is also present. The production build, lint, TypeScript and all **39 API integration tests** passed. The full browser suite passed **5/5** in **53.4 seconds**. The new `member-sql-data.spec.ts` compares the profile/member IDs, subscription IDs, payment amounts/status/package, attendance count and plan IDs directly with MySQL queries, verifies non-empty MongoDB history, checks another member remains forbidden, and captures the populated payments/profile screens. See [BROWSER_RESULTS.json](BROWSER_RESULTS.json), `screenshots/10-member-sql-payments.png` and `screenshots/11-member-sql-profile.png`. The read-only empty state now tells regular users that gym staff manage missing linked records rather than inviting them to add financial/attendance records. The production server remains on port 3100; sign in again using the unchanged member demonstration credentials.

## Admin and regular member separation (19 November 2026)

Management writes now use explicit `/api/admin/<feature>` routes, with named handlers and an admin check in every route. Shared reads and workout operations enforce a role policy and persisted member ownership. Migration `004_member_accounts.sql` adds regular `USER` accounts and a unique member/account relation; it was applied after a private SQL backup. Existing staff and demonstration records were preserved. A separate `member@smartgym.local` demonstration account was added without paid membership or staff access.

The optimized production build, lint, TypeScript checking and **13 unit tests** passed. The live API suite passed **39/39**, including regular user login, own-only list/detail/financial/attendance/plan reads, forbidden management writes, invalid direct access to other members and MongoDB documents, personal workout CRUD, and deactivation blocking sessions and subsequent login. Existing admin/trainer CRUD, SQL routines, transactions and outbox checks also passed. See [TEST_RESULTS.json](TEST_RESULTS.json).

The complete browser suite passed **4/4** in **47.2 seconds**. The new member-access test creates a member login through the admin form and asserts the request uses `/api/admin/members`, verifies the regular user's personal landing/navigation and management-page redirects, checks enrollment/payment controls are absent, saves a personal measurement without a member selector, and checks its persisted member ID and author in MongoDB. Browser fixtures were removed by their returned IDs. See [BROWSER_RESULTS.json](BROWSER_RESULTS.json) and `screenshots/09-member-progress.png`. An initial new-test attempt was interrupted because its exact label selector omitted the rendered `optional` label text; the corrected selector and full suite passed. The production server remains running on port 3100. Earlier sections below are historical results from previous implementations.

## Dedicated API routes and database APIs (19 November 2026)

Implemented separate feature routes, `/api/auth/me`, admin-only database health, stored-procedure/function APIs, five SQL view/audit reports and three analytics reports. Migration `003_api_routines.sql` was applied after a private SQL backup; a repeat run recognized all three migrations without resetting data. Fixed MySQL 8 cold-start authentication: the Prisma MariaDB adapter now permits RSA public-key retrieval on loopback connections only. The initial connectivity check failed with the driver's missing RSA key error; the corrected check successfully queried MySQL 8.0.46 and pinged MongoDB.

Lint, standalone TypeScript checking, all **12 unit tests**, and the optimized production build passed. The final integration run against the production server at `http://127.0.0.1:3100` passed **37/37**, including every feature's read route, real CRUD/transactions, all new SQL routines/reports, malformed JSON, invalid operation names/IDs/ranges, prototype-shaped report names, anonymous/trainer access denial, and origin protection. New attendance function results were asserted against a real synthetic check-in. The fixtures created by the integration run were cleaned by their returned IDs. See [TEST_RESULTS.json](TEST_RESULTS.json) for the actual cases and timestamp. An earlier run had one test-helper failure from parsing Next.js's empty 405 response as JSON; the corrected assertion checks its HTTP status directly.

The full browser suite then passed **3/3** in **40.1 seconds**, verifying admin forms and database persistence, trainer restrictions, responsive pages, external SQL refresh and cross-tab updates against the production server. See [BROWSER_RESULTS.json](BROWSER_RESULTS.json). The production server was left running on port 3100.

The API contract, PowerShell examples, SQL operation names and setup instructions are in [API.md](API.md). The [Postman collection](Smart-Gym.postman_collection.json) was supplied as a manual client artifact; it was not executed in Postman. Existing historical results below describe earlier runs.

## Supplemental live-read/write verification (19 November 2026)

The user requested fresh API reads and direct admin database writes while preserving existing demonstration records. The client now forces no-store fetches, resource APIs disable private/shared response caching, visible pages requery every 15 seconds, and focus/online/manual refresh also fetch current records. Confirmed mutations notify mounted views and other open tabs. MySQL/Prisma and MongoDB driver operations remain the source of each response; no processed report file is served as operational data.

Follow-up lint, TypeScript and production build passed. A focused Playwright test (`tests/browser/live-data.spec.ts`) passed **1/1**, zero failures/skips, in **31.8 seconds total**, against a temporary production server on port 3101. It inserted a member directly through the MySQL driver/Prisma without going through an API, observed that row on the already-open page's polling cycle, changed the SQL row and verified focus refresh, saved an admin form and asserted the actual SQL values, observed the updated heading in a separate profile tab through cross-tab notification, and verified manual refresh of a further SQL change. It also asserted private/no-store response headers. Its isolated synthetic fixture was cleaned by its returned ID. Machine-readable evidence: [LIVE_DATA_RESULTS.json](LIVE_DATA_RESULTS.json).

Initial attempts on the user's development server timed out during first-time dashboard/profile compilation and hot reload, before completing the cross-tab assertions. The final production-server test passed. The temporary test server was stopped afterward; the user's port-3100 server and existing records were preserved. Earlier full-project results below remain historical evidence from the original implementation run, separate from this focused follow-up.

Final verification date: **19 November 2026 (Asia/Kolkata)**. Local URL: http://127.0.0.1:3100. Next.js **16.4.6**, Node **22.19.0**, Prisma **7.10.1**, actual primary database server **MySQL 8.0.46** on the isolated port-3308 instance, plus the running local MongoDB service. The final API/browser runs used the optimized **production server**, not a mock backend. All data used was synthetic.

## Commands actually run

| Command / check | Actual outcome |
| --- | --- |
| npm install | Passed after a registry idle-timeout retry; lockfile generated |
| Prisma dependency upgrade | Upgraded to patched Prisma/client/adapter 7.10.1; regenerated client |
| npm run db:generate | Passed |
| npm run db:setup | Passed on isolated instance: backup → migrations → seed → checks |
| MySQL connectivity | SELECT VERSION(): 8.0.46; application reads/writes verified |
| MongoDB connectivity | ping returned ok:1; real CRUD/aggregation and document validation verified |
| npm run db:migrate (repeat) | Both migrations recognized as already applied; checksum ledger preserved; Mongo setup repeated successfully |
| npm run db:backup (populated DB) | Passed; complete SQL backup with routines/triggers, 64,689 bytes at that run; file ignored/private |
| npm run db:demo | All statements executed: sandbox CREATE/ALTER/INSERT/UPDATE/DELETE/SELECT/DROP; real JOIN/GROUP BY/HAVING/ORDER BY/COUNT/SUM/AVG/subquery/views/EXPLAIN and ROLLBACK |
| npm run lint | Passed without warnings/errors after fixes |
| npm run typecheck | Passed |
| npm test | **12 passed, 0 failed** |
| npm run build | Passed: compiled, TypeScript, prerendered public pages and built dynamic authenticated/API routes |
| npm start | Passed; production server ready at port 3100 |
| npm run test:integration | **31 passed, 0 failed**; exact cases/timestamp in TEST_RESULTS.json |
| npm run test:browser | **2 passed, 0 failed**, 0 skipped/flaky; 27.2 seconds in final run; exact report in BROWSER_RESULTS.json |
| Visual review | Actual dashboard, analytics and mobile captures reviewed; eight screenshots indexed in SCREENSHOTS.md |
| npm audit --json (final) | **0 vulnerabilities**, including 0 high/critical |
| Git ignore review | Private .env, node_modules and backups ignored; .env.example available for source control |

The source was formatted with Prettier before final lint/type/build. No commands pushed changes or fabricated Git history. Generated screenshots and JSON evidence belong to this Next.js app; parent-folder Flask verification is not reused as evidence.

## Coverage of the user's 21 requested checks

| # | Check | Evidence |
| --- | --- | --- |
| 1 | Startup | Successful production start and browser navigation |
| 2 | MySQL | Connectivity test, actual transactions and final audit |
| 3 | MongoDB | Ping, CRUD, validator rejection, aggregation and outbox delivery |
| 4 | Authentication | Valid/invalid passwords, sessions, logout; browser login |
| 5 | Role authorization | Trainer financial/create restrictions, scoped assigned members, unassigned member denied, admin page redirect |
| 6 | Member creation | API test and real browser form save |
| 7 | Member editing | API persistence assertion and browser form edit |
| 8 | Deactivation | API verifies inactive flag while payments/history remain |
| 9 | Trainer assignment | Member update/ownership scope and workout assignment checks |
| 10 | Renewal | Procedure enrollment, same-key retry and concurrent non-overlap |
| 11 | Payment transactions | Pending→paid, repeat settlement conflict, historical-price retention, audit assertions |
| 12 | Attendance | Eligibility, one/day conflict, checkout and time-order CHECK rejection |
| 13 | Workout logs | Mongo create/update/list/filter/delete, exercise reference/ownership checks |
| 14 | Aggregation | Expected workout frequency and completed volume asserted; real measurement/activity summaries rendered |
| 15 | Dashboard | Member total compared to database; actual charts rendered |
| 16 | Search/filter | Name search, member/date filters, scoped histories, injection-shaped input rejection |
| 17 | Views | View metadata, active membership assertion, revenue/workload reports and SQL demo |
| 18 | Procedures | Real sg_renew_membership execution, idempotency and concurrency |
| 19 | Triggers | Wrong-price rejection, payment insert/update audit, cancellation status audit |
| 20 | Constraints | Negative price, duplicate contact/check-in, time order, FK restriction, Mongo schema rejection |
| 21 | Rollback | Procedure error leaves counts unchanged; transaction inserts subscription then rejected payment and verifies subscription rollback |

Additional checks: trainer account creation/edit/password hashing; password reset invalidates active sessions; trainer financial fields redacted; plan/exercise updates and reference-safe deletion; equipment service history and retirement; durable outbox replay without duplicates; **simulated MongoDB delivery outage** using an unreachable URI in a separate worker process, followed by successful retry with the real URI. Existing database services were not stopped for the outage simulation.

## Browser scenario details

Admin scenario visits all 13 management/report views, creates and edits a member through the actual dialog, searches persisted results, captures dashboard/member/workout/analytics screens, checks mobile navigation and document overflow at 390px, and records no page-level JavaScript errors. Trainer scenario verifies hidden admin navigation, forbidden admin-page redirect, scoped member display and logout. Browser fixtures are cleaned by their exact synthetic email/name and returned database ID. API fixtures are cleaned by IDs created during that run, including related Mongo documents and test audit/outbox records.

## Failures encountered and corrected

1. npm download idle timeout: retried with longer timeout and reduced concurrent sockets; succeeded.
2. Old Prisma tooling dependency advisories: upgraded to 7.10.1; final audit zero.
3. Windows sandbox account lookup prevented tsx from starting: reran necessary runtime commands with required permissions.
4. Legacy account could not export routine definitions or create triggers under binary logging: preserved its data/settings and provisioned an isolated local instance. The partial additive sg_ objects in the legacy DB are documented and unused; legacy tables/rows are unchanged.
5. Backup stream finish listener was attached too late: replaced with pipeline and concurrent completion waiting; populated backup passed. Setup now stops at the first failed command.
6. Initial lint/type issues: removed synchronous effect state resets in the data hook, used router navigation, typed Mongo entries and corrected the dynamic JSON type boundary. Final checks passed.
7. Turbopack waited on OneDrive metadata churn: dev script uses webpack; final browser tests use the production build. Development CSP handles React debugging without relaxing production eval policy.
8. Browser locators initially included avatar initials and Next.js's accessibility announcer: corrected text matching and scoped error checks to main application content. Final full suite passed.
9. Initial chart captures occurred during animation: disabled chart animations for deterministic charts and captured the final production UI again.

## Limits and unexecuted work

No blocked technical test remains for the selected local implementation. This is not a claim of load testing, production deployment, penetration testing, broad accessibility/device certification, MongoDB backup execution, or a full disaster-restore rehearsal. The read-only mongosh example file was supplied; equivalent official-driver application pipelines were executed, rather than claiming a separate mongosh CLI run. MySQL backups were executed; MongoDB backup/restore instructions are documented only.

Team approval, title uniqueness, actual student contributions/Git commits, course-policy review, license/permission review for retained upstream redistribution, own-repository publication and the live presentation remain human actions. They are explicitly distinguished from verified technical requirements in REQUIREMENTS_MATRIX.md.
