# Interface components
| File | Responsibility |
| --- | --- |
| shell.tsx | Role-specific navigation and reachable sign-out |
| dashboard.tsx | Admin/trainer overview and shared loading/error states |
| resource-view.tsx | Resource lists, filters, forms and permitted actions |
| resource-config.ts | Form field definitions and resource labels |
| member-profile.tsx | SQL membership/trainer/attendance/plan plus MongoDB history |
| reports.tsx | Analytics screens and admin outbox delivery |
| charts.tsx | Charts drawn from returned records |
| mongo-summaries.tsx | Workout, measurement and activity summaries |
| data.ts | No-store API calls, periodic refresh and cross-tab updates |

Page routes live in app/(workspace)/. API enforcement lives in app/api/ and lib/; hidden UI controls alone do not grant or revoke access.
