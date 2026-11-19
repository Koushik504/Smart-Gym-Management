# API folders
| Folder | Responsibility |
| --- | --- |
| auth/ | Login, logout and the current signed-in user |
| admin/ | Admin-only management, SQL procedures/functions and reports |
| members/, payments/, subscriptions/, attendance/ | Role-scoped relational reads |
| plans/, assignments/, exercises/ | Training catalog and assigned plans |
| workouts/, progress/ | Authorized MongoDB session/measurement operations |
| dashboard/, reports/, lookups/ | Current aggregates and form options |
| health/ | Admin-only SQL/MongoDB connectivity |
| [resource]/ | JSON 404 fallback for unknown resources |

Start with [admin/members/route.ts](admin/members/route.ts), then follow the call into [services.ts](../../lib/services.ts). Full contract: [API.md](../../docs/API.md).
