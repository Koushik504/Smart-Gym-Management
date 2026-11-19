# Database implementation
Current MySQL: **smart_gym**, **127.0.0.1:3306**. MongoDB: **smart_gym**, port **27017**.

| Location | Purpose |
| --- | --- |
| mysql/001_schema.sql | Base relational tables, keys and indexes |
| mysql/002_advanced.sql | CHECKs, four views, five triggers and transactional renewal |
| mysql/003_api_routines.sql | Three read-only procedures and three functions |
| mysql/004_member_accounts.sql | USER role and unique optional member login link |
| mongodb/setup.ts | Collection validators and compound indexes |
| queries/ | Broader SQL and mongosh teaching examples |
| ../prisma/schema.prisma | Canonical relational model |

The numbered migrations are applied once through the checksum ledger. During the presentation use [the read-only SQL walkthrough](../../presentation/05_DATABASE_DEMO.sql), rather than re-importing setup files into the populated database. ER diagram/dictionary: [docs/DATABASE_DESIGN.md](../docs/DATABASE_DESIGN.md).
