# Server and shared logic
| File | Responsibility |
| --- | --- |
| db.ts | Reused MySQL/Prisma/mysql2 and MongoDB connections |
| auth.ts | Password verification, SQL sessions and ownership checks |
| permissions.ts | Role capabilities shared with the interface |
| validation.ts | Zod request schemas and valid IDs/dates |
| http.ts | JSON responses, error mapping and origin checks |
| api-handlers.ts | Shared resource handlers and member details |
| services.ts | Gym operations, transactions and scoped SQL/MongoDB CRUD |
| database-api.ts | Fixed SQL routines, views and CTE reports |
| analytics.ts | SQL metrics and MongoDB aggregation |
| outbox.ts | Retryable, idempotent activity delivery |
| rules.ts | Date, retention and workout insight calculations |

Presentation flow: API → auth → validation → service → database. Credentials come from private environment configuration, not source literals.
