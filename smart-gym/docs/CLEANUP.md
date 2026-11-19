# Workspace cleanup

## Repeated cleanup on 20 November 2026

Several legacy files reappeared after the first cleanup. Their hashes matched the archived versions. Removed 35 obsolete targets, including the reappeared Flask source/templates/SQL scripts, one-off diagnostics, stale generated caches, the retired report folder, old implementation-history folder and unused course-reference PDF. Before removal, 56 source/reference files were archived and verified under `backups/cleanup-20261119T183911Z/obsolete-files.zip`, with the complete removal manifest beside it. References to deleted legacy folders were removed from the current documentation. The seven numbered presentation materials, current report, current app/source/tests, actual .env, .env.example, production build, dependencies, live databases and database backups were preserved. This is the current working-tree state; the earlier notes below describe the first cleanup.

## Initial cleanup

On 19 November 2026 the user requested deletion of old unused files. Removed **34 obsolete files/directories** from the working tree. Before deletion, **57 legacy files** were archived and verified against SHA-256 hashes in the private ignored backup directory:

`backups/cleanup-20261119T181342Z/`

The directory contains `legacy-and-diagnostics.zip` and `manifest.json`, including archived paths, hashes and removed targets. The archive contains historical private configuration and must remain private.

Removed superseded material includes the Flask application/templates/requirements, its legacy environment example/configuration and verifier, old setup instructions, original SQL reference scripts/ER images, the placeholder Python Azure workflow, unused report-building inputs, one-off MySQL migration diagnostics, temporary API diagnostics/PDF renders, test traces, an old Next.js build cache and the downloaded CricketLens reference clone. Cached generated output can be recreated; its contents were not duplicated into the archive.

The root README and `start.ps1` now launch the current application in `smart-gym/`. VS Code F5 and the default build task also point to Smart Gym. Original versions of these root files and editor configurations were included in the archive before replacement. Attribution was retained and updated to describe the archive.

Preserved: current app source/tests/docs, private `smart-gym/.env`, installed `node_modules`, the running `.next` build, all database backups, the MySQL80 database on port 3306, MongoDB, prior local database directories and rollback credentials, Python/runtime dependencies still used by the isolated provisioner, the report and course guidelines, and Git history.

The application remained running during cleanup. The new root launcher detects it at http://127.0.0.1:3100 rather than starting a duplicate server. No database records or current app credentials were deleted.

Post-cleanup verification passed: TypeScript, ESLint, editor JSON parsing, the root launcher, HTTP 200 from the login page, MySQL connectivity to `smart_gym` on port 3306, and MongoDB ping. The current production build and private environment file remain present. No application build or database reset was performed.
