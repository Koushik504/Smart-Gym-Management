# Verification
| Test | Purpose | Latest recorded result |
| --- | --- | --- |
| unit.test.ts | Validation and deterministic rules | 13 passed |
| integration.ts | Actual SQL/MongoDB writes, transactions, authorization and rollback | 39 passed |
| browser/app.spec.ts | Admin/trainer workflows and responsive pages | Included below |
| browser/live-data.spec.ts | External SQL changes and cross-tab refresh | Included below |
| browser/member-access.spec.ts | Admin member provisioning and personal permissions | Included below |
| browser/member-sql-data.spec.ts | Displayed records compared with actual SQL/MongoDB data | Included below |
| browser/logout.spec.ts | Visible desktop/mobile logout and revoked session | 8 browser tests passed in total |

Commands: npm.cmd test, npm.cmd run test:integration, npm.cmd run test:browser.
Integration/browser suites use named synthetic fixtures and clean their own IDs. They write test data; the demo's SQL walkthrough is read-only. Latest saved results are from 19 November 2026; consult [docs/TESTING.md](../docs/TESTING.md) for run history and actual JSON evidence.
