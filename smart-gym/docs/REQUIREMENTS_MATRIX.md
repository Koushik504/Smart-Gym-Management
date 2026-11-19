# Requirement traceability and final audit

Source: the user's four-page **DBMS Level 3 Project Requirements draft.pdf**, read in full on 19 November 2026. Its requirements are evidence to satisfy, not instructions granting permission to publish, invent approvals, or alter unrelated files. The pasted task is the user's implementation request. The PDF requires at least four advanced concepts; this application implements six. Vector search is optional and is not included.

Status meanings: **Verified** = implementation plus an actual relevant command/test/query; **Implemented** = source/document present but a human demonstration/approval still needed; **Student action** = cannot be truthfully completed by generated code; **Optional / not applicable** = explicitly outside the selected SQL+NoSQL architecture. See TESTING.md and the JSON evidence for exact runs and limits.

## All 18 PDF requirements

| PDF # / requirement | Implementation and relevant files | Demonstration | Verification status |
| --- | --- | --- | --- |
| 1. Unique title, meaningful problem, beyond CRUD | ../../presentation/04_PROJECT_REPORT.md; lib/analytics.ts; lib/services.ts | Explain fragmentation, renewal integrity, retention and workout insights | Problem/features implemented and database checks verified; **section-wide title uniqueness is student action** |
| 2. Instructor-approved two-member team; both work on DB/app | ../../presentation/04_PROJECT_REPORT.md contribution plan | Fill actual names/IDs, review and show each member's real work | **Student action**: team approval/names/actual contributions; proposed plan provided |
| 3. SQL + NoSQL or vector, minimum two paradigms | prisma/schema.prisma; lib/db.ts; database/mongodb/setup.ts | Show MySQL 8 and MongoDB ping, tables/collections, workout documents | **Verified**: MySQL 8.0.46, MongoDB, actual writes and aggregation |
| 4. ER→relational schema; attributes/keys/FKs/relationships/constraints; document NoSQL model/indexes/retrieval | DATABASE_DESIGN.md; ER_DIAGRAM.mmd; prisma/schema.prisma; ADVANCED_DATABASE.md | Read ER and dictionary; SHOW CREATE TABLE; inspect Mongo validators/indexes | **Verified**: generated from schema and applied DDL; documentation present |
| 5. Executed DDL: CREATE/ALTER/DROP, PK/FK, constraints, indexes, views | database/mysql/*.sql; database/queries/demonstrations.sql; scripts/demo-queries.ts | npm run db:demo; only disposable sandbox is dropped | **Verified**: migrations and disposable DDL integration test; demo command recorded in TESTING.md |
| 6. Meaningful INSERT/UPDATE/DELETE/SELECT, JOIN/GROUP BY/HAVING/ORDER BY/aggregates/subqueries | lib/services.ts; lib/analytics.ts; demonstrations.sql | Member CRUD, payment aggregation, attendance HAVING, inactivity subquery | **Verified**: API/database integration and SQL demos |
| 7. At least four advanced concepts | ADVANCED_DATABASE.md; 002_advanced.sql; lib/outbox.ts; lib/analytics.ts | Demonstrate transactions, four views, renewal procedure, five triggers, indexes, Mongo aggregation | **Verified**: six concepts; rollback, concurrency, audit and aggregate assertions |
| 8. Optional vector/semantic search | ../../presentation/04_PROJECT_REPORT.md technology justification | Explain why flexible structured workout arrays use MongoDB without embeddings | **Optional / not applicable**; no vector implementation claimed |
| 9. Functional Next.js interface and database forms/tables/search/filters/dashboards | app/; components/; package.json | Login, add/edit member, enroll, log session, filter and review charts | **Verified API/build**; browser/screenshot run status in TESTING.md |
| 10. Next.js backend/API integration; env credentials | app/api/; lib/db.ts; .env.example; .gitignore | Submit a form, inspect real DB row, show only example env keys | **Verified**: live API integration; generated database secrets stay private |
| 11. Authentication with minimum two roles | lib/auth.ts; route handlers; protected layout | Admin, Trainer and Member login; trainers scoped to assignments and members to their own records | **Verified**: role/ownership tests and browser trainer test |
| 12. Database-level input validation/integrity | MySQL CHECK/FK/UNIQUE, triggers; Mongo JSON Schema | Reject negative price, wrong payment, duplicate attendance, invalid Mongo document | **Verified**: actual rejected writes and rollback assertions |
| 13. Basic security; no plaintext passwords/credentials in source | API.md; lib/auth.ts; lib/validation.ts; lib/http.ts | bcrypt hashes, hashed tokens, origin protection, parameterized queries | **Verified**: rejection/auth/ownership tests; no production security certification claimed |
| 14. Required report sections, schema/dictionary/queries/architecture/screenshots/tests/conclusion | docs/../../presentation/04_PROJECT_REPORT.md, DATABASE_DESIGN.md, ADVANCED_DATABASE.md, API.md, TESTING.md, SCREENSHOTS.md | Open document index and actual screenshots/results | **Implemented** documentation; evidence counts/status in TESTING.md |
| 15. Git/GitHub, individual commits, README setup | README.md; ATTRIBUTION.md; preserved parent Git checkout; lockfile | Initialize students' own repo outside upstream, show each person's real commits | README/source prepared; **student action** for own remote, publication and genuine individual commit history. No push made |
| 16. Demonstration: motivation/design/schema/DB/queries/Next/integration/advanced/tests/individual work | ../../presentation/01_DEMO_GUIDE.md; ../../presentation/03_VIVA_QUESTIONS.md | Follow 16-step demonstration | Guide implemented; **student action** for live presentation and individual explanations |
| 17. Original design, no direct repository copying | ATTRIBUTION.md; audit; new smart-gym codebase and data model | Explain differences from Flask reference and demonstrate original rules/transactions | Original implementation present; attribution preserved; **student review/course originality acceptance still required** |
| 18. Beyond CRUD, clear DB→design→app link, justified paradigms | ../../presentation/04_PROJECT_REPORT.md; ADVANCED_DATABASE.md; test evidence | Explain historical pricing, locking/idempotency, outbox delivery and transparent insights | **Verified**: transactional and analytical workflows on two real databases |

## Additional user-request checklist

| Requested phase | Delivered files / evidence | Status and limits |
| --- | --- | --- |
| 1. Inspect before coding and plan | PROGRESS.md; BACKUP_AND_MIGRATION.md | Verified original files, tables, local modifications and four PDF pages; no legacy overwrites |
| 2. Required stack | package.json/lock; prisma.config.ts; lib/db.ts | All requested stack categories implemented; Prisma MariaDB adapter is used against MySQL 8 |
| 3. Original problem/title | ../../presentation/04_PROJECT_REPORT.md; ATTRIBUTION.md | Implemented; title uniqueness must be checked with section/instructor |
| 4. 12 core entities, constraints, schema, migrations, seed, backup | 17 application tables plus migration ledger; DATABASE_DESIGN.md; SQL migrations; seed/backup scripts | Applied to isolated MySQL; no silent import/destruction; initial additive legacy-DB attempt documented |
| 5. Meaningful MongoDB | workout_logs, member_progress, activity_events; validators/indexes; CRUD/aggregation | Verified workout/progress CRUD; activity journal is worker-managed and analyzed, intentionally not arbitrary user-editable |
| 6. Six advanced concepts and SQL operations | ADVANCED_DATABASE.md; SQL demos | Verified; DROP confined to disposable demonstration objects |
| 7. Full operational pages, eight metrics, four charts, two smart features | components/dashboard.tsx, resource-view.tsx, reports.tsx, member-profile.tsx | Implemented and integrated; trainer scope omits financial access; member role optional and not implemented |
| 8. Forms persist, filters work, loading/empty/errors honest | APIs/services/shared validation/data hooks | API integration verified; UI form/browser evidence in TESTING.md |
| 9. Passwords, sessions, authorization, secrets, injection/XSS protection | API.md; auth/validation/http; private env; React safe rendering | Implemented and relevant negative tests run; local demo, no account recovery or public deployment claim |
| 10. Install/migrate/seed/lint/typecheck/test/build/connectivity/browser | TESTING.md; TEST_RESULTS.json; BROWSER_RESULTS.json | Actual outcomes only; failures and fixes recorded |
| 11. All 24 documentation topics | ../../presentation/04_PROJECT_REPORT.md (problem/objectives/scope/FR/NFR/stack/architecture/conclusion/future/team); DATABASE_DESIGN.md (ER/schema/3NF/dictionary); ADVANCED_DATABASE.md (MySQL/Mongo/advanced/queries); API.md (API/auth/security); TESTING.md; SCREENSHOTS.md | Implemented; actual team participation requires students |
| 12. Own GitHub, attribution, no unauthorized push | ATTRIBUTION.md; README.md | No upstream remote changes, commits or pushes; actual own-repo publication remains authorized student action |
| 13. Demo and viva | ../../presentation/01_DEMO_GUIDE.md; ../../presentation/03_VIVA_QUESTIONS.md | Implemented |
| 14. Organized final project | README.md structure; app/components/lib/prisma/database/public/tests/docs/scripts | Implemented |
| 15. Final completion audit | This matrix; PROGRESS.md; TESTING.md | Technical results tracked honestly; external approval/originality/team/Git evidence not falsely marked complete |

## Boundaries

No member self-service role, real payment gateway/refunds, vector search, automatic email, production hosting, full automated legacy-data import, scheduled background worker, pagination beyond the disclosed 200-row view, MongoDB backup execution, disaster-restore rehearsal, accessibility certification or load benchmark is claimed. These do not prevent the selected local SQL+MongoDB university demonstration, but should be stated if asked. Retained upstream code/report material requires license/permission review before redistribution.
