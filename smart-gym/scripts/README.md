# Operational scripts
Run npm commands from smart-gym/.

| Command/file | Purpose |
| --- | --- |
| npm.cmd run db:check | Read-only SQL and MongoDB connectivity check |
| npm.cmd run db:audit | Save current schema/counts and existing test results to docs/FINAL_AUDIT.json |
| npm.cmd run db:backup | Export a private SQL backup |
| npm.cmd run db:migrate | Verify checksums and apply pending migrations |
| npm.cmd run db:setup | Fail-fast backup, migration, seed and check |
| npm.cmd run db:seed / db:seed-member | Initial synthetic records / populated demo-account link |
| npm.cmd run db:demo | Teaching queries, including a disposable sandbox table |
| npm.cmd run outbox | Deliver a bounded batch of pending activity events |
| provision-local.ps1 | Detect current server; isolated fallback only when configured |
| generate-schema-docs.py | Generate the current ER diagram and dictionary from Prisma |
| final-audit.ts | Record actual SQL/MongoDB structure and saved test evidence |

For the presentation, start with db:check and the read-only SQL script under presentation/. Backups remain private. The app runs on port 3100 and is launched by the root start.ps1.
