# API and role permissions

Base URL: **http://127.0.0.1:3100**. All data comes from the live MySQL/MongoDB databases.

Current SQL connection: **`smart_gym` on `127.0.0.1:3306`** (MySQL80 Windows service). Current app records were moved from 3308 with IDs/history preserved; MongoDB remains unchanged. The server reads its private `.env` connection. To inspect the same records from your MySQL command-line client, connect on port 3306 using `mysql -h 127.0.0.1 -P 3306 -u root -p`, enter your administrator password interactively, then run:

```sql
USE smart_gym;
SELECT id, name, email FROM sg_members;
SELECT id, amount, method, status FROM sg_payments;
```

These are the app's current tables; the separate original `gymmembership_workouttracker` database with five members was preserved. The application uses a generated database-only account rather than storing the administrator password. See [move verification](MYSQL_MOVE_RESULTS.json).

The route structure follows [CricketLens](https://github.com/Koushik283/cricketlens): shared feature reads at `/api/<feature>` and administration at `/api/admin/<feature>`. For example, `GET /api/members` reads permitted records, while `POST /api/admin/members` creates a member. Admin route files export named HTTP functions and explicitly call `requireAdmin()` before their database service. Shared trainer/member operations also enforce roles and ownership in the service layer.

## Role differences

| Feature | Admin | Trainer | Regular user (`USER`) |
| --- | --- | --- | --- |
| Member profiles and accounts | Add, edit, assign trainer, set password, deactivate | Read assigned members | Read own profile only |
| Memberships and payments | Enroll, renew, cancel, settle; read all history | No financial access | Read own history only |
| Attendance | Check in/out; read all | Assigned members only | Read own attendance only |
| Workout plans and assignments | Manage all | Own plans and assigned members | Read assigned plans only |
| Workouts and progress | Manage all | Assigned members only | Create, edit and delete own logs |
| Exercise catalog | Manage | Create, edit and read | Read only |
| Trainers, packages, equipment and maintenance | Manage | No management access | No management access |
| Database reports and routines | Full access | Denied | Denied |

Regular users sign in to `/my-account` and see personal navigation. They cannot add members, select a role, enroll themselves, mark payments paid, manage gym resources or access someone else's records. Trainer permissions remain separate from regular member permissions.

Admin Add/Edit member has an optional **Member login password (12+ characters)** field. Providing it creates a linked `USER` login or changes that member's password. Password changes invalidate existing sessions. Deactivating a member invalidates sessions and blocks new logins. No public registration endpoint exists.

## Setup and demonstration logins

For an existing installation:

```powershell
npm.cmd run db:backup
npm.cmd run db:migrate
npm.cmd run db:generate
npm.cmd run db:seed-member
npm.cmd run build
npm.cmd start
```

Migration `004_member_accounts.sql` adds the `USER` enum and unique nullable `sg_members.userId` relation without resetting existing records. `db:setup` includes the member demonstration seed. `db:seed-member` links `member@smartgym.local` to the existing populated synthetic SQL profile Rohan Kapoor (contact email `member2@smartgym.local`). Memberships, payments, attendance, trainer and plans are queried from that profile's existing MySQL rows; workouts and measurements use its existing MongoDB documents. The seed creates no history or payments and never resets a password. It can repair only the original empty Demo Member link after verifying it has no SQL history, trainer or activity documents; it preserves the placeholder row and invalidates old sessions. Repeat runs keep the link unchanged. Other account links and members are never chosen automatically. If the known synthetic profile is absent, enable login through Admin > Members > Edit on the intended existing member.

| Role | Synthetic local email | Initial demonstration password |
| --- | --- | --- |
| Admin | admin@smartgym.local | LocalAdmin!2026 |
| Trainer | aarav@smartgym.local | LocalTrainer!2026 |
| User/member | member@smartgym.local | LocalMember!2026 |

Actual first-seed passwords may differ if the corresponding `SEED_*_PASSWORD` was configured. Changing seed variables afterward does not change existing accounts.

## Authentication and requests

Use `Content-Type: application/json`. Login issues the HttpOnly `smart_gym_session` cookie. Every POST/PATCH/DELETE requires `Origin` exactly matching `APP_ORIGIN`, including login/logout and read-only routine POSTs. Browser requests send it automatically; set it explicitly in Postman or scripts. Enable `COOKIE_SECURE=true` for HTTPS deployments.

Import [the Postman collection](Smart-Gym.postman_collection.json), set `adminPassword`, and run the admin Login first. Its cookie jar retains the session. The synthetic member workflow writes a new demonstration record and then deactivates it; run that folder only when wanted. Use its separate member-login folder to inspect personal APIs. The collection is a manual client artifact, not the source of application data.

```powershell
$base = 'http://127.0.0.1:3100'
$headers = @{ Origin = $base }
$login = @{ email = 'admin@smartgym.local'; password = 'LocalAdmin!2026' } | ConvertTo-Json
Invoke-RestMethod "$base/api/auth/login" -Method Post -Headers $headers -ContentType 'application/json' -Body $login -SessionVariable gymSession
$members = Invoke-RestMethod "$base/api/members" -WebSession $gymSession
$body = @{ procedure = 'sg_member_summary'; memberId = $members[0].id } | ConvertTo-Json
Invoke-RestMethod "$base/api/admin/stored-procedures" -Method Post -Headers $headers -ContentType 'application/json' -Body $body -WebSession $gymSession
Invoke-RestMethod "$base/api/auth/logout" -Method Post -Headers $headers -WebSession $gymSession
```

## Shared endpoints

| Route | Methods | Access |
| --- | --- | --- |
| /api/auth/login | POST | Email/password; returns name/role and sets cookie |
| /api/auth/logout | POST | Invalidates current server session |
| /api/auth/me, /api/me | GET | Safe current user profile; no password hash |
| /api/members | GET | Admin all; trainer assigned; user own linked profile |
| /api/members/:id | GET | Admin, assigned trainer or that member only |
| /api/lookups | GET | Role-scoped form options; user gets own member and assigned plans |
| /api/subscriptions, /api/payments | GET | Admin all; user own history; trainer denied |
| /api/trainers, /api/packages, /api/equipment, /api/maintenance | GET | Admin only |
| /api/attendance | GET, POST | Admin/trainer check-in; users read own records only |
| /api/attendance/:memberId_YYYY-MM-DD | PATCH | Admin/assigned trainer check-out; users denied |
| /api/exercises | GET, POST | All read; admin/trainer create |
| /api/exercises/:id | PATCH, DELETE | Admin/trainer edit; admin delete only |
| /api/plans | GET, POST | Admin all; trainer own; user reads assigned plans only |
| /api/plans/:id | PATCH, DELETE | Admin or owning trainer |
| /api/assignments | GET, POST | Admin/trainer assign; user reads own assignments |
| /api/assignments/:memberId-planId | DELETE | Admin or authorized trainer |
| /api/workouts, /api/progress | GET, POST | Admin all; trainer assigned; user own logs |
| /api/workouts/:ObjectId, /api/progress/:ObjectId | PATCH, DELETE | Persisted member ownership checked; member reference immutable |
| /api/dashboard, /api/reports | GET | Admin/trainer scoped metrics; users use personal pages |
| /api/health | GET | Admin; MySQL/MongoDB status; 200 healthy, 503 degraded |

## Admin endpoints

All these routes require an admin session; a trainer or regular user receives 403 for supported operations. Legacy management writes such as `POST /api/members` are unavailable; use the admin route.

| Collection | Methods | Detail methods |
| --- | --- | --- |
| /api/admin/members | GET, POST | PATCH, DELETE /:id; delete deactivates and retains history |
| /api/admin/trainers | GET, POST | PATCH /:id; optional password invalidates trainer sessions |
| /api/admin/packages | GET, POST | PATCH, DELETE /:id; delete deactivates |
| /api/admin/subscriptions | GET, POST | DELETE /:id cancels; payment retained; no refund |
| /api/admin/payments | GET | PATCH /:id settles a pending payment once |
| /api/admin/equipment | GET, POST | PATCH, DELETE /:id; delete retires |
| /api/admin/maintenance | GET, POST | Service history and inventory update atomically |
| /api/admin/attendance | GET, POST | PATCH /:memberId_YYYY-MM-DD |
| /api/admin/exercises | GET, POST | PATCH, DELETE /:id |
| /api/admin/plans | GET, POST | PATCH, DELETE /:id |
| /api/admin/assignments | GET, POST | DELETE /:memberId-planId |
| /api/admin/workouts, /api/admin/progress | GET, POST | PATCH, DELETE /:ObjectId |
| /api/admin/outbox | POST | Delivers up to 100 pending activity events |
| /api/admin/stored-procedures | GET, POST | Lists or executes fixed read-only procedures |
| /api/admin/stored-functions | GET, POST | Lists or evaluates fixed SQL functions |
| /api/admin/database-reports | GET | Fixed SQL view/audit reports selected by `report` |
| /api/admin/analytics | GET | CTE/window and package analytics selected by `report` |

## SQL routine and report payloads

`POST /api/admin/stored-procedures` accepts one of these separate request bodies:

```json
{"procedure":"sg_member_summary","memberId":1}
{"procedure":"sg_trainer_members","trainerId":1}
{"procedure":"sg_top_attendance","limit":10}
```

Responses use `{ "procedure": "...", "rows": [...] }`. Trainer members are capped at 200. Top attendance counts the last 30 UTC calendar days; limit is 1-100, default 10.

`POST /api/admin/stored-functions` accepts one of:

```json
{"functionName":"sg_membership_end","memberId":1}
{"functionName":"sg_is_member_active","memberId":1}
{"functionName":"sg_attendance_rate","memberId":1,"days":30}
```

Responses include submitted parameters and `result`. Membership end is the latest non-cancelled paid subscription end, including future renewals, or null. Active membership returns 1 only for a paid current subscription on an active member. Attendance rate is visits / calendar days times 100, rounded to two decimals, including today in UTC. Days is 1-365, default 30. GET on either routine endpoint lists its catalog. Unknown member/trainer returns 404; invalid names, IDs or ranges return 422. Routine names select fixed parameterized SQL; submitted SQL is never executed.

`GET /api/admin/database-reports?report=...` supports `active-memberships` (default), `monthly-revenue`, `trainer-workload`, `attendance-summary`, and `payment-audit` (including subscription status audit events).

`GET /api/admin/analytics?report=...` supports `attendance-leaderboard` (default; CTE plus DENSE_RANK), `package-performance`, and `inactive-members` (active registrations with no visits or last visit more than 14 days ago). Reports return `{ "report": "...", "rows": [...], "limit": 200 }`. Revenue includes paid payments only and remains recorded after cancellation, matching the no-refund rule.

## Gym request examples

Admin creates a member and optional login using `POST /api/admin/members`:

```json
{"name":"Synthetic Member","email":"new@smartgym.local","goal":"Strength","trainerId":1,"phone":null,"password":"ChooseMember!2026"}
```

The same fields update a member with PATCH; omit password to retain the existing login password. Users cannot submit a role or link themselves to another member.

Admin enrolls/renews with `POST /api/admin/subscriptions`:

```json
{"memberId":1,"packageId":1,"method":"UPI","status":"PENDING","requestKey":"d6dbd386-56fc-45f3-909d-c3237d0aa385"}
```

Generate a fresh UUID per enrollment form. Repeating the same request/key returns its existing subscription. Reusing a key with different values is rejected. After a payment status change, inspect history before retrying an older enrollment. The procedure commits subscription, payment and outbox together and serializes renewals per member.

A user records a workout using `POST /api/workouts`, with their own member ID:

```json
{"memberId":1,"date":"2026-11-19","durationMinutes":45,"status":"COMPLETED","notes":"My session","entries":[{"exerciseId":1,"sets":3,"reps":12,"weight":20,"completed":true}]}
```

The server verifies the session's linked member. The personal form supplies that ID automatically. A different member's ID is rejected for reads, creates, updates and deletes.

## Responses, freshness and security

Lists support applicable `q`, `from`, `to`, `memberId` and `status` filters, and return up to 200 rows. Ownership is checked before applying a submitted member filter. GETs query live databases with private/no-store response headers. Open pages refresh every 15 visible seconds, on focus/reconnection/manual refresh and successful writes, with cross-tab notifications.

Creates return 201 only after database success. Errors use `{ "error": "message" }`: 400 malformed JSON, 401 no valid session, 403 forbidden role/ownership/origin, 404 absent record, 405 unsupported operation, 409 unique/conflicting writes, 422 invalid input/business rule, 429 login throttling, 503 unavailable service. Next.js may return an empty 405 body. Network timeouts can hide a committed response; inspect history before retrying non-idempotent writes.

Passwords use bcrypt cost 12 with a 72 UTF-8 byte cap; new trainer/member passwords require 12+ characters. Opaque session tokens are hashed in MySQL, expire after eight hours, and use HttpOnly/SameSite=Lax cookies. The current active role and member link are checked server-side. Member lists, financial history, plans, attendance, MongoDB documents and form options are scoped from the stored account link. Database credentials, SQL errors and password hashes are never sent to clients. Parameterized SQL and typed Mongo filters prevent submitted SQL/operators from becoming queries. No arbitrary SQL console exists.
