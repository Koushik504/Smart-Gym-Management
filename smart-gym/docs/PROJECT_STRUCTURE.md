# Project layout and file map

## Workspace
```text
gym_/
  README.md
  start.ps1
  Smart-Gym.code-workspace
  presentation/
    00_START_HERE.md
    01_DEMO_GUIDE.md
    02_CODE_WALKTHROUGH.md
    03_VIVA_QUESTIONS.md
    04_PROJECT_REPORT.md
    05_DATABASE_DEMO.sql
    06_CHECKLIST.md
  smart-gym/
    README.md
    app/
    components/
    lib/
    database/
    prisma/
    scripts/
    tests/
    docs/
    public/
    package.json
    package-lock.json
    next.config.ts
    tsconfig.json
```

## Application folders
| Folder | Contents | Start here |
| --- | --- | --- |
| app/ | Login, protected pages and Next.js API Route Handlers | app/(workspace)/my-account/page.tsx |
| app/api/auth/ | Login, logout and current user | auth/login/route.ts |
| app/api/admin/ | Admin management and database operations | admin/members/route.ts |
| app/api/<feature>/ | Shared, role-scoped reads/workout operations | members/route.ts |
| components/ | Navigation, forms, tables, profiles and charts | [Component map](../components/README.md) |
| lib/ | Database access, auth, validation, business operations and analytics | [Logic map](../lib/README.md) |
| database/mysql/ | 001 tables, 002 advanced objects, 003 routines, 004 member accounts | [Database map](../database/README.md) |
| database/mongodb/ | Collection validation and indexes | setup.ts |
| database/queries/ | SQL and mongosh teaching examples | demonstrations.sql |
| prisma/ | Canonical relational model | schema.prisma |
| scripts/ | Startup checks, backup, migrations, audit and seeds | [Script map](../scripts/README.md) |
| tests/ | Unit, integration and browser tests | [Test map](../tests/README.md) |
| docs/ | Technical references, test JSON evidence and screenshots | [Documentation index](INDEX.md) |

Each API folder exposes only supported methods. Admin routes have explicit role checks; shared handlers and services enforce account/member ownership. The [code walkthrough](../../presentation/02_CODE_WALKTHROUGH.md) gives the request path to explain.

## Files outside the presentation view
The presentation workspace hides installed dependencies, build output, private configuration, backups, temporary results and local database/runtime directories. It does not delete or relocate them.

The active SQL database is smart_gym on port 3306, with MongoDB on 27017. Prior database directories and rollback credentials remain private. The current .next production build, node_modules, migration files and test output paths remain unchanged, so the running application does not need rebuilding just because documentation moved.
