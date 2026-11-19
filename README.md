# Smart Gym

The active application is in [`smart-gym/`](smart-gym/README.md): Next.js, MySQL and MongoDB.

**For the presentation on 20 November 2026, start with [presentation/00_START_HERE.md](presentation/00_START_HERE.md).** Open [Smart-Gym.code-workspace](Smart-Gym.code-workspace) in VS Code for a clean Explorer view.

| Folder | What belongs here |
| --- | --- |
| [presentation/](presentation/00_START_HERE.md) | Numbered demo guide, code walkthrough, viva, current report and SQL demo |
| [smart-gym/](smart-gym/README.md) | Current application source, APIs, databases, scripts and tests |
| [smart-gym/docs/](smart-gym/docs/INDEX.md) | Technical design, API contract, diagrams and actual test evidence |

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Open **http://127.0.0.1:3100**. MySQL uses `smart_gym` on **127.0.0.1:3306**; MongoDB uses port **27017**. Private connection settings are in `smart-gym/.env`.

You can also run `npm.cmd run dev` or `npm.cmd start` from `smart-gym/`. The root launcher detects an already-running app. VS Code F5 and the default build task now launch Smart Gym.

| Local demonstration role | Email | Initial password |
| --- | --- | --- |
| Admin | admin@smartgym.local | LocalAdmin!2026 |
| Member | member@smartgym.local | LocalMember!2026 |

Existing configured passwords take precedence. These are local demonstration accounts.

See [API and role documentation](smart-gym/docs/API.md), [database move verification](smart-gym/docs/MYSQL_MOVE_RESULTS.json), [cleanup details](smart-gym/docs/CLEANUP.md), and [attribution](smart-gym/ATTRIBUTION.md).

The superseded Flask app, SQL reference scripts, Python deployment setup, historical report and one-off diagnostics were removed from the working tree after verified private archives were saved under `smart-gym/backups/cleanup-*`. The current project report is [presentation/04_PROJECT_REPORT.md](presentation/04_PROJECT_REPORT.md). Database directories, rollback credentials, Git history, the current build and dependencies were preserved.
