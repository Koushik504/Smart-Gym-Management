# Smart Gym Management and Workout Analytics System

An original Next.js application for gym operations, transactional membership renewal, attendance-based retention insights, and flexible workout analytics. This implementation is in `smart-gym/` and runs on **port 3100**. The superseded Flask source and one-off diagnostics were removed from the working tree after a verified private archive was saved under `backups/cleanup-*`; see [cleanup details](docs/CLEANUP.md).

## Verified stack

Next.js 16.4.6 App Router, React 19, TypeScript, Tailwind 4, Recharts, Lucide icons, Zod 4, Prisma 7 with its MariaDB driver adapter connecting to **MySQL 8.0.46**, mysql2 for the renewal stored procedure, and the official MongoDB 6 Node driver. The adapter name does not change the primary database: the running server is MySQL 8. MongoDB stores workout sessions, measurements and activity documents. No payment gateway, cloud account, vector service, or paid API is needed.

## Run this configured Windows workspace

The current application database is **`smart_gym` on `127.0.0.1:3306`**, using the existing **MySQL80 Windows service**. All current records were copied and verified from port 3308, including accounts, IDs, sessions, payments, attendance, routines and triggers. MongoDB stays unchanged on port 27017. Private `.env` now targets 3306 with a dedicated database account; the administrator password was used only for the move. The port-3308 source and private backup are retained for rollback. See [migration evidence](docs/MYSQL_MOVE_RESULTS.json).

Use Node **22.19 or later in the Node 22 line** (Prisma 7 requires Node 22.12+, or supported Node 20.19+/24+). In PowerShell use `npm.cmd` to avoid the unsigned npm.ps1 execution-policy issue.

```powershell
cd C:\Users\mulinti\OneDrive\Desktop\gym_\smart-gym
powershell -ExecutionPolicy Bypass -File scripts/provision-local.ps1
npm.cmd ci --cache ../.local/npm-cache
npm.cmd run db:generate
npm.cmd run db:setup
npm.cmd run dev
```

Open **http://127.0.0.1:3100**. Use this exact host because mutation origins must match APP_ORIGIN. The provisioner detects the configured server on port 3306 and preserves that connection; it does not start the old workspace instance for this setup. MongoDB must be running on 27017 (check `Get-Service MongoDB`). `db:setup` stops on the first failure and backs up before migrations and seed/check commands. Seed is synthetic, date-relative, and skips populated user/log collections. It never resets a database.

| Local role | Email | Seed password from private .env |
| --- | --- | --- |
| Admin | admin@smartgym.local | SEED_ADMIN_PASSWORD (provisioned local value: `LocalAdmin!2026`) |
| Trainer | aarav@smartgym.local | SEED_TRAINER_PASSWORD (provisioned local value: `LocalTrainer!2026`) |
| User/member | member@smartgym.local | SEED_MEMBER_PASSWORD (initial local demo default: `LocalMember!2026`) |

Regular users have a separate member area at `/my-account`: own profile, membership/payment history, attendance, assigned plans, workouts and measurements. They cannot add/edit members, enroll, settle payments or manage gym resources. Admins create member logins with the optional **Member login password (12+ characters)** on Add/Edit member; password changes invalidate sessions and deactivation blocks login. Trainers retain access only to assigned members and their own plans. See the [role matrix and current API routes](docs/API.md).

For an existing installation, run `npm.cmd run db:backup`, `npm.cmd run db:migrate`, `npm.cmd run db:generate`, and `npm.cmd run db:seed-member`, then rebuild/restart. Migration `004_member_accounts.sql` preserves existing staff/accounts/data and adds the member login link. The demonstration login points to the existing synthetic SQL profile **Rohan Kapoor** (`member2@smartgym.local` contact email), so its persisted membership, payment, attendance, trainer and plan appear immediately. Sign in using **member@smartgym.local**, whose password is unchanged. The seed repairs only the original completely empty Demo Member link, retains that placeholder row, never resets passwords, and never creates or copies financial/history records. Fresh `db:setup` includes it automatically. For other existing members, use Admin > Members > Edit and set a login password on the intended profile.

These are intentionally public **synthetic local demonstration credentials**, not database credentials. Set your own seed passwords before seeding a fresh installation. Changing SEED variables after seeding does not reset users. Trainer passwords can be changed by an admin in Trainers; this invalidates that trainer's sessions. Database passwords are generated privately and are never documented or committed.

For a production-mode local run, stop the dev server, then:

```powershell
npm.cmd run build
npm.cmd start
```

The MySQL80 and MongoDB Windows services continue running after the app stops. Ensure those services are running after Windows restarts, then use `npm.cmd start` or `npm.cmd run dev`. The provisioner still supports the old isolated port-3308 setup only when the private configuration explicitly selects it.

## Fresh setup using your own MySQL/MongoDB

1. Install Node, MySQL 8.0.16+ (enforced CHECK support) and MongoDB. The isolated Windows provisioner expects MySQL at `C:\Program Files\MySQL\MySQL Server 8.0\bin` and the preserved parent's Python environment with pymysql for account provisioning. If using another installation, configure databases/accounts yourself instead.
2. Create an **empty dedicated database** and an application/migration account with rights on that database. Use MySQL Workbench or `mysql -u YOUR_ADMIN -p` and execute:

```sql
CREATE DATABASE smart_gym CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smart_gym_user'@'127.0.0.1' IDENTIFIED BY 'CHOOSE_A_PRIVATE_PASSWORD';
GRANT ALL PRIVILEGES ON smart_gym.* TO 'smart_gym_user'@'127.0.0.1';
-- On a dedicated DEVELOPMENT server using binary logging, a DBA must allow
-- trusted trigger creators before running migrations:
SET GLOBAL log_bin_trust_function_creators = 1;
```

3. Copy `.env.example` to `.env`, set DATABASE_URL (URL-encode user/password), MONGODB_URI, MONGODB_DB and seed passwords. MongoDB credentials, if enabled, need collection creation/collMod/index/read/write permissions in this database. Keep the URI private. The local URI assumes a localhost-only demonstration MongoDB service.
4. Run npm install/ci, db:generate, db:setup, then dev as above. For backup portability, set MYSQLDUMP_PATH if mysqldump is not in the default Windows location/PATH.

For HTTPS deployment, set APP_ORIGIN to the real origin and COOKIE_SECURE=true. Public deployment, account recovery, email delivery and infrastructure hardening are outside the local university demonstration scope.

## Features and business rules

For working API examples, see [API documentation](docs/API.md) and import the [Postman collection](docs/Smart-Gym.postman_collection.json). Each gym feature now has dedicated `app/api/<feature>/route.ts` files. Admin APIs expose read-only stored procedures, SQL functions, views, CTE analytics and live database health checks, following the organization of [CricketLens](https://github.com/Koushik283/cricketlens). The implementation uses this project's own gym schema and existing authorization rules.

After pulling the API changes on an existing installation, run `npm.cmd run db:backup` followed by `npm.cmd run db:migrate` to add `003_api_routines.sql`. The local database connection also retrieves MySQL's authentication RSA key on loopback hosts, so the first login after a server restart works; see the [connector option documentation](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options). Remote connections do not enable this option automatically.

### Live database reads and writes

Operational pages request current records from authenticated Next.js APIs. `GET /api/members` executes `db.member.findMany` against MySQL; `POST /api/members` and `PATCH /api/members/:id` create/update actual SQL rows. Other resources use the corresponding service queries or MongoDB driver operations. Dashboard aggregates are calculated from current database rows on each request. Neither stored test results nor seed arrays supply operational page responses. The existing synthetic records are ordinary persisted database records and are retained unless explicitly changed.

Browser requests use `cache: no-store`; API responses use `Cache-Control: private, no-store, max-age=0, must-revalidate`. Open views requery every 15 seconds while visible, on focus/reconnection, and immediately following successful data mutations. Successful changes notify other open tabs too. Management pages provide a manual Refresh button and last-refreshed time. External Workbench/SQL edits appear on the next poll, focus refresh or manual refresh; this is periodic querying, not a continuous database subscription. Failed reads display an error instead of presenting old values as current. Database connection pools are reused, but query results are not cached by the application.

The Next.js server alone reads DATABASE_URL and MONGODB_URI from the private `.env`. Database credentials never travel to the browser. Every mutation is checked for authentication, role/ownership and validation before its database operation.

- Admin and Trainer logins; bcrypt 12 password hashing; opaque database-backed sessions with hashed tokens; persisted login throttling; origin protection and server-enforced ownership.
- Member create/search/edit/deactivate and trainer assignment. Deactivation retains attendance, subscriptions and financial history. Admin-only trainer creation/edit/password changes and workload reports.
- Package management; enroll/renew through a locking, idempotent stored procedure. Exactly one payment per subscription, agreed-price snapshot, paid/pending tracking, settlement and audit triggers. Reserved pending periods block overlap but do not grant gym access. Cancellation preserves paid revenue; refunds are outside scope.
- Check-in requires a paid current membership, checks active registration and allows only today's UTC date. Composite member/date key prevents duplicate daily check-ins. Check-out must follow check-in.
- Exercise catalog, plans with exercises/sets/reps, assignments, MongoDB session CRUD and measurement CRUD. Trainers can access only assigned members and their own plans.
- Equipment quantity/status/service dates, maintenance history and atomic service/status updates.
- Real revenue, attendance, growth, package distribution, expiry and workload reports. Transparent retention and workout recommendations; no mock AI predictions.
- MongoDB aggregation for frequency, duration, completion and exercise volume; persisted MySQL outbox and idempotent MongoDB activity delivery. No cross-database atomicity claim.
- Responsive tables, search/status/date/member filters, error/empty/loading states and CSV export of the displayed view (up to 200 records). Larger-scale pagination is future work.

## Structure

```text
smart-gym/
  app/                 # App Router pages, protected layout, JSON Route Handlers
    (workspace)/       # dashboard, dynamic management/report pages, member profile
    api/               # authentication and resource endpoints
  components/          # shell, charts, operational forms, reports, profiles
  lib/                 # authentication, validation, authorization, services, analytics
  prisma/              # canonical relational model
  database/mysql/      # generated DDL + advanced-object migrations
  database/mongodb/    # document validation and index setup
  database/queries/    # safe SQL demonstrations and Mongo pipelines
  scripts/             # provision, backup, migration, seed, diagnostics, outbox
  tests/               # unit, API/database integration, Playwright browser tests
  public/              # reserved static asset directory
  docs/                # report, schema/dictionary/ER, traceability, actual test evidence
  README.md
  PROGRESS.md
  DEMO_GUIDE.md
  VIVA_QUESTIONS.md
```

## Verification

With the local app running and both databases available:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:browser
npm.cmd run build
npm.cmd audit
```

Browser tests use installed Microsoft Edge. If unavailable, install Edge or adjust Playwright's channel to your installed browser. Integration tests create named synthetic fixtures and remove their own IDs; run them against a demonstration database, not customer data. See [actual results](docs/TESTING.md), [API integration results](docs/TEST_RESULTS.json) and [browser results](docs/BROWSER_RESULTS.json). Do not interpret older parent-folder Flask test results as results for this application.

## University evidence and originality

Start with [the project report](../presentation/04_PROJECT_REPORT.md), [database design](docs/DATABASE_DESIGN.md), [PDF traceability](docs/REQUIREMENTS_MATRIX.md), [demo guide](../presentation/01_DEMO_GUIDE.md) and [viva answers](../presentation/03_VIVA_QUESTIONS.md). Review [preservation/backup notes](docs/BACKUP_AND_MIGRATION.md) before any data changes. Team names, instructor approval, section title uniqueness, individual Git history and the live presentation remain student responsibilities.

The reference repository is [GUNADEEP19/GymManagement](https://github.com/GUNADEEP19/GymManagement), credited to CHENNUPATI GUNADEEP and C S DEEPAK. Original source and SQL scripts are preserved in the private cleanup archive and existing Git history. The new TypeScript application is independently implemented; no original repository push has been made. The upstream README states educational purposes but no explicit redistribution license was found in the inspected tree. See [ATTRIBUTION.md](ATTRIBUTION.md) before publishing retained upstream material.

To publish your own implementation, copy `smart-gym/` into a new folder outside the reference checkout, excluding node_modules, .next, .env*, backups and test traces (retain .env.example), then initialize your own Git repository. Inspect staged files for credentials and use your own remote. Do not replace or push the parent checkout's existing upstream remote. No Git commits or pushes were made for you.
