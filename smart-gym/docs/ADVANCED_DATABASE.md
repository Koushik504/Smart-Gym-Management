# Advanced database implementation

Six advanced concepts are implemented in application workflows, not just illustrative snippets.

| Concept | Implementation | Application demonstration | Verification |
| --- | --- | --- | --- |
| Transactions | sg_renew_membership; Prisma settlement, plan edits, staff creation, maintenance | Enroll/renew, settle pending payment, record service | Concurrent renewal, rollback after failed payment and persistence integration checks |
| Views | sg_active_memberships, sg_monthly_revenue, sg_trainer_workload, sg_attendance_summary | Dashboard paid revenue; workload and SQL demonstration | SELECTs and information_schema inspection |
| Stored procedure | sg_renew_membership | Memberships → Add enrollment | API calls, duplicate UUID retry, invalid method rollback, serialized concurrent renewals |
| Triggers | payment insert validation/audit, payment update immutability/audit, subscription status audit | Wrong-price payment rejected; settle payment/cancel subscription creates audit | Trigger failure rollback, insert/update audit checks |
| Indexing | Date, owner/active, expiry/status, payment status/date, Mongo member/date and activity/type/date | Attendance date filtering, renewal history, scoped workout history | EXPLAIN in db:demo and real query execution; no claimed benchmark |
| MongoDB aggregation | $match, $unwind, $group, $sum, $cond, $multiply, $dateToString, $sort, $first/$last | Analytics → workout frequency, completion, volume, measurement summary, delivered activity | Real seeded/test logs aggregated; expected volume asserted |

## Renewal and ACID

The stored procedure starts a transaction, locks the member row with FOR UPDATE, rejects inactive/missing members, checks idempotency, reads an active package with a shared lock, computes the next non-overlapping inclusive period, inserts a subscription at the current agreed price, creates exactly one payment and writes an outbox event. Triggers validate and audit the payment. An EXIT HANDLER rolls back and re-signals SQL exceptions. The row lock serializes concurrent renewals of the same member. A unique request key protects a repeated form submission; the unique payment subscription reference prevents a second payment record for the same subscription.

Atomicity: the subscription, payment, audit and outbox commit together. Consistency: MySQL CHECK, unique and FK constraints plus triggers validate invariants. Isolation: explicit member locking protects the renewal sequence under InnoDB; other application transactions use Prisma's supported transaction behavior. Durability: committed InnoDB records persist in the local server's data files/redo logs. No crash/power-loss or load durability experiment is claimed.

Periods use UTC calendar days and inclusive ends. Duration 30 starting 1 November ends 30 November, and renewal starts 1 December. A pending payment reserves its period without allowing check-in. An administrator can settle it or cancel its subscription; cancellation does not refund a paid record. A renewed period can be scheduled in the future. Subscription status stores ACTIVE/CANCELLED; expiry and scheduled states are derived from dates to avoid stale persisted status.

The agreed subscription price is immutable through the application. Package price edits affect future purchases. Payment validation compares against subscription.price, not today's package.price, so past transactions remain valid. The application does not expose historical payment deletion or arbitrary amount edits.

## Views and indexes

sg_active_memberships includes paid, current, non-cancelled subscriptions of registered members. sg_monthly_revenue aggregates paid amounts by paidAt month. sg_trainer_workload counts active registered members per trainer. sg_attendance_summary left-joins all members to count visits and latest date. Explicit joins/grouping make the SQL concepts visible.

| Index | Reason |
| --- | --- |
| Member(trainerId, active) | Trainer authorization/list scope and current workload |
| Member(joinedAt) | Growth by registration period |
| Subscription(memberId, status, endsAt) | Latest membership/renewal and member history |
| Subscription(endsAt, status) | Expiry inspection |
| Payment(status, paidAt) | Paid revenue time range and pending status |
| Attendance PK(memberId, date) | Unique daily check-in and member history |
| Attendance(date) | Today's attendance and date-filtered trends |
| Equipment(status, nextService) | Availability/service reporting; query plans may still scan OR conditions on small datasets |
| Maintenance(equipmentId, performedAt) | Equipment service history |
| Audit(entity, entityId, createdAt) | Locate historical changes to a record |
| Outbox(processedAt, createdAt) | Oldest undelivered transactional activity |
| Session(expiresAt) | Expiry housekeeping |
| Mongo workout_logs(memberId, date descending) | Scoped workout history and date window |
| Mongo workout_logs(date descending, status) | Global recent session reports |
| Mongo member_progress(memberId, date descending) | Progress history and latest/earliest measurements |
| Mongo activity_events(memberId, timestamp descending), (type, timestamp descending) | Member and event-type analysis |

Foreign keys/unique constraints have supporting indexes in the generated DDL. Indexes cost storage and write work; this is not a claim that every analytics GROUP BY is index-only. `npm run db:demo` shows an actual EXPLAIN.

## SQL demonstrations

`database/queries/demonstrations.sql`, executable through `npm run db:demo`, demonstrates CREATE/ALTER/INSERT/UPDATE/DELETE/SELECT/DROP using a disposable sg_demo_sandbox object, then JOIN/GROUP BY/HAVING/ORDER BY/COUNT/SUM/AVG/subquery examples on application tables and an explicit rolled-back insert. It never drops application tables. The migration runner is for versioned DDL, while this demonstration runner is an explicit teaching action. If a same-named demonstration table already exists, CREATE fails; the script does not overwrite an unknown object.

## MongoDB model and retrieval

`workout_logs`: ObjectId; integer memberId from SQL; UTC date; durationMinutes; COMPLETED/PARTIAL; notes; entries[] of exerciseId, sets, reps, weight and completed. Documents allow varying exercise counts and future metadata. The API validates SQL member ownership and exercise references before acknowledging a write.

`member_progress`: ObjectId, memberId, date, weightKg, waistCm, goal and notes. Time-series history uses multiple indexed documents. Measurement summaries sort chronologically then group using first/last values, retaining history without overwriting earlier measurements.

`activity_events`: unique string _id copied from the SQL outbox UUID, memberId where applicable, type, timestamp and flexible metadata. It is an application-managed activity journal: writes occur through the delivery worker, read analysis through aggregations. It intentionally has no user-facing arbitrary edit/delete form; event mutation would undermine its history. Workout/progress documents have user-facing CRUD.

Strict MongoDB JSON Schema validators reject missing required fields, wrong date types, invalid status enums and negative/out-of-range measurements/entries. Zod also validates HTTP inputs. No embeddings are generated because semantic search is not needed for this data model. The read-only mongosh examples are in `database/queries/aggregations.mongosh.js`; actual application pipelines are in lib/analytics.ts and use authorized member IDs from MySQL.

## Cross-database consistency and failures

MySQL and MongoDB do **not** participate in a shared transaction. Transactional activity first commits to sg_outbox in MySQL. `npm run outbox` or Analytics → Deliver pending events sends up to 100 pending rows. MongoDB upsert uses the event UUID as _id and $setOnInsert, so replay does not duplicate events. If MongoDB succeeds but the SQL acknowledgment fails, retry finds the same document. If delivery fails, the SQL row remains pending with attempts/lastError. No rollback of an already-committed membership is pretended.

The local demo uses explicit/manual delivery, not an always-running scheduler. Multiple workers can perform duplicate delivery attempts; document idempotency preserves a single event. Automatic backoff, dead-letter handling and stronger worker leasing are future enhancements. Workout/measurement CRUD writes only MongoDB after SQL reference/ownership checks. It returns an error if MongoDB is unavailable. SQL dashboard operations remain independently available, and reports show a MongoDB-specific unavailable state. Database membership changes can race a reference check; deactivation preserves records and the next request rechecks authorization. There is no automatic distributed referential-integrity guarantee.
