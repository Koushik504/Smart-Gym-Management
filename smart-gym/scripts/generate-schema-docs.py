"""Generate the scalar dictionary and relational schema from the checked-in Prisma model."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
schema = (root / 'prisma/schema.prisma').read_text(encoding='utf8')
models = re.findall(r'model (\w+) \{(.*?)\n\}', schema, re.S)
enums = dict(re.findall(r'enum (\w+) \{(.*?)\n\}', schema, re.S))
scalars = {'Int','String','Boolean','DateTime','Decimal','Json','BigInt','Float'} | set(enums)
meanings = {
 'id':'Stable generated primary identifier', 'name':'Display name', 'email':'Unique normalized contact/login email',
 'passwordHash':'bcrypt hash, never plaintext', 'role':'Authorization role', 'active':'Registration/account/catalog availability flag',
 'createdAt':'Creation timestamp', 'userId':'User account reference', 'tokenHash':'SHA-256 hash of opaque browser token',
 'expiresAt':'Session expiry timestamp', 'key':'SHA-256 normalized email key for throttling', 'count':'Attempt counter',
 'windowStart':'Start of the 15-minute rate-limit window', 'specialty':'Trainer coaching specialty', 'phone':'Optional unique phone contact',
 'goal':'Fitness/training goal', 'joinedAt':'Member registration timestamp', 'trainerId':'Assigned/owning trainer reference',
 'price':'Agreed or current price in INR; subscription keeps a historical snapshot', 'durationDays':'Inclusive membership duration in days',
 'memberId':'Stable MySQL member reference', 'packageId':'Membership package reference', 'startsAt':'First inclusive UTC membership date',
 'endsAt':'Last inclusive UTC membership date', 'status':'Constrained business state (see enum)',
 'requestKey':'Unique client-generated renewal UUID for duplicate-request protection', 'subscriptionId':'Unique subscription being paid',
 'amount':'Recorded agreed payment amount in INR', 'method':'CASH, CARD, UPI or BANK', 'paidAt':'Settlement timestamp; required exactly when PAID',
 'date':'UTC attendance date; weak-entity discriminator', 'checkIn':'Check-in timestamp', 'checkOut':'Optional checkout timestamp after check-in',
 'quantity':'Nonnegative inventory count', 'nextService':'Next maintenance due date', 'equipmentId':'Equipment reference',
 'performedAt':'Maintenance service date', 'description':'Service work description', 'cost':'Nonnegative maintenance cost in INR',
 'muscleGroup':'Target muscle group', 'defaultSets':'Positive default set count', 'defaultReps':'Positive default repetitions',
 'durationWeeks':'Positive workout program length in weeks', 'planId':'Workout plan reference', 'exerciseId':'Catalog exercise reference',
 'sets':'Prescribed positive sets', 'reps':'Prescribed positive repetitions', 'assignedAt':'Plan-assignment timestamp',
 'entity':'Audited entity type', 'entityId':'Historical primary identifier of the audited record', 'action':'Audited operation',
 'details':'JSON snapshot of important old/new values', 'type':'Activity event type', 'metadata':'Flexible activity metadata; no credential copies',
 'processedAt':'Successful MongoDB delivery timestamp, null while pending', 'attempts':'Delivery attempt count', 'lastError':'Redacted retry failure summary'
}
diagram = '''erDiagram
  sg_users ||--o{ sg_sessions : authenticates
  sg_users ||--o| sg_trainers : has_profile
  sg_users o|--o| sg_members : member_login
  sg_trainers o|--o{ sg_members : coaches
  sg_trainers ||--o{ sg_workout_plans : owns
  sg_members ||--o{ sg_subscriptions : enrolls
  sg_packages ||--o{ sg_subscriptions : prices
  sg_subscriptions ||--o| sg_payments : records
  sg_members ||--o{ sg_attendance : identifies
  sg_members ||--o{ sg_assignments : receives
  sg_workout_plans ||--o{ sg_assignments : assigned_to
  sg_workout_plans ||--o{ sg_plan_exercises : contains
  sg_exercises ||--o{ sg_plan_exercises : prescribes
  sg_equipment o|--o{ sg_exercises : supports
  sg_equipment ||--o{ sg_maintenance : serviced
'''
tables=[]
for model,body in models:
    table=re.search(r'@@map\("([^"]+)"\)',body).group(1)
    fields=[]
    for line in body.splitlines():
        parts=line.strip().split(maxsplit=2)
        if len(parts)<2 or parts[0].startswith('@'): continue
        field,kind=parts[:2]
        if kind.rstrip('?[]') not in scalars: continue
        attrs=parts[2] if len(parts)>2 else ''
        fields.append((field,kind,attrs))
    tables.append((model,table,body,fields))
    diagram += f'  {table} {{\n'
    references=set(x.strip() for x in re.findall(r'fields: \[([^]]+)\]',body))
    for field,kind,attrs in fields:
        marker=' PK' if '@id' in attrs or re.search(r'@@id\([^)]*\b'+field+r'\b',body) else ' UK' if '@unique' in attrs else ''
        if field in references: marker += ', FK' if marker else ' FK'
        diagram += f'    {kind.rstrip("?").lower()} {field}{marker}\n'
    diagram += '  }\n'

(root/'docs/ER_DIAGRAM.mmd').write_text(diagram,encoding='utf8')
lines=['# Database design, relational schema and data dictionary','',
 'Canonical source: `prisma/schema.prisma`. Ordered MySQL implementation: `database/mysql/001_schema.sql` (tables), `002_advanced.sql` (constraints/views/triggers/renewal), `003_api_routines.sql` (read-only functions/procedures), `004_member_accounts.sql` (member logins). This dictionary is generated from the current scalar fields. Physical table names use the sg_ prefix. Current database: smart_gym on MySQL port 3306; MongoDB uses port 27017. See [API permissions](API.md) and [verified database move](MYSQL_MOVE_RESULTS.json).','',
 '## ER diagram','','```mermaid',diagram.strip(),'```','',
 '## Relationships and cardinalities','',
 '- A User has zero or one Trainer profile or a linked Member profile. A Member can exist without a login; nullable UNIQUE userId links at most one account to a member, with ON DELETE SET NULL. USER accounts require an active linked member to authenticate. Staff profiles and regular member profiles have separate roles. One User has many Sessions.',
 '- A Trainer coaches zero or many Members; a Member has zero or one current Trainer. A Trainer owns many WorkoutPlans; a plan has one owner.',
 '- A Member has many Subscriptions; each Subscription references one Package. A Subscription has at most one Payment by a UNIQUE FK. The application/procedure creates the payment with the subscription in a single transaction.',
 '- Attendance is a weak entity identified by (memberId, date). It depends on one Member; records restrict deletion to preserve history.',
 '- Members and WorkoutPlans are many-to-many through Assignment. WorkoutPlans and Exercises are many-to-many through PlanExercise, which carries sets and reps.',
 '- Exercise optionally references one Equipment inventory entry; Equipment supports many exercises and has many Maintenance records.',
 '- Audit holds historical entity IDs and JSON snapshots without a cascading FK. Outbox memberId is a durable activity reference, not a cascading FK; activity survives operational changes. LoginAttempt is a security-support table keyed by a hashed email value.',
 '- MongoDB uses the same integer memberId and exerciseId references. These are application-validated references, not cross-engine foreign keys. MongoDB logs/measurements are one-to-many per SQL member.',
 '', '## Relational schema','']
for model,table,body,fields in tables:
    pk=[f for f,k,a in fields if '@id' in a]
    match=re.search(r'@@id\(\[([^]]+)\]',body)
    if match: pk=[x.strip() for x in match[1].split(',')]
    fks=re.findall(r'@relation\(fields: \[([^]]+)\], references: \[([^]]+)\](?:, onDelete: (\w+))?',body)
    lines.append(f'**{table}** (`{model}`): '+', '.join(f'**{f}**' if f in pk else f for f,k,a in fields)+'.')
    lines.append('')
    lines.append('Primary key: '+', '.join(pk)+'. '+('Foreign-key columns: '+', '.join(x[0] for x in fks)+'.' if fks else 'No relational foreign key.'))
    lines.append('')
lines += ['## Normalization','',
 '1NF: MySQL columns contain scalar values; variable exercise lists are represented by PlanExercise rows rather than comma-separated IDs. Flexible workout entry arrays intentionally use MongoDB document embedding.',
 '2NF: PlanExercise depends on the complete (planId, exerciseId) key; its sets/reps describe that exact prescription. Attendance fields depend on the complete (memberId, date) key. Assignment time depends on the member-plan pairing.',
 '3NF: User credentials/identity, Trainer specialty, Member contact, Package pricing, Subscription period/history, Payment settlement and Equipment/Maintenance are separated by their functional dependencies. Derived member status, expiry and revenue are queried rather than copied onto Member.',
 'The Subscription price snapshot records a historical agreed fact, not a duplicate of the currently editable package price. Audit and outbox metadata are deliberate historical/event records with different lifecycles. Unique payment.subscriptionId enforces one payment per subscription; completeness of that pair is an application transaction invariant, not an FK guarantee that every direct SQL subscription insert has a payment.',
 '', '## Full scalar data dictionary','',
 'DateTime defaults to MySQL DATETIME(3), Boolean to BOOLEAN/TINYINT(1), Int to INTEGER, Json to JSON. Explicit @db attributes below override defaults. All columns are NOT NULL unless marked optional; optional relationships use nullable FK columns. Prisma relation objects/lists are not extra stored columns.','']
for model,table,body,fields in tables:
    lines += [f'### {table}','', '| Column | Logical / explicit SQL type | Nullable | Constraints/defaults | Meaning |', '| --- | --- | --- | --- | --- |']
    fk_fields=set(x.strip() for x in re.findall(r'fields: \[([^]]+)\]',body))
    for field,kind,attrs in fields:
        constraints=attrs.replace('|','\\|') or '—'
        if field in fk_fields: constraints='FK; '+constraints
        lines.append(f'| {field} | {kind.rstrip("?")} | {"Yes" if kind.endswith("?") else "No"} | `{constraints}` | {meanings.get(field,"Stored business attribute")} |')
    composites=[line.strip() for line in body.splitlines() if line.strip().startswith(('@@id','@@index','@@unique'))]
    if composites: lines += ['', 'Composite keys/indexes: '+ '; '.join('`'+x+'`' for x in composites)+'.']
    lines.append('')
lines += ['### sg_migrations (migration-runner support table)','', '| Column | Type | Constraints | Meaning |', '| --- | --- | --- | --- |', '| name | VARCHAR(150) | PRIMARY KEY, NOT NULL | Applied filename |', '| checksum | CHAR(64) | NOT NULL | SHA-256 of the applied SQL |', '| appliedAt | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Successful migration completion |','',
 '## Enum values','']
for key,values in enums.items():lines += [f'- {key}: '+', '.join(values.split())+'.']
lines += ['', '## Integrity and deletion policies','',
 'RESTRICT relationships retain members with financial/attendance/assignment history and equipment with dependent exercises/services. PlanExercise rows cascade only when an unassigned plan is deleted. Sessions cascade when a user is deleted, though no user-deletion form is exposed. Operational member deletion means deactivation, package deletion means availability=false, and equipment deletion means RETIRED. Assignment and MongoDB session/measurement deletion are explicit user actions. Database-level CHECKs protect positive prices/durations/counts, nonnegative costs/quantities, payment state timestamps, valid payment methods and attendance time order. See ADVANCED_DATABASE.md for every index and its purpose.',
 '', '## MongoDB collections','',
 'The exact JSON Schema validators and compound indexes are in `database/mongodb/setup.ts`. `workout_logs` embeds variable exercise entries, `member_progress` stores time-ordered measurements/goals, and `activity_events` stores flexible event metadata with the SQL outbox UUID as its unique string _id. A normal workout/progress _id is an ObjectId. Retrieval uses authorized memberId sets and date ranges, then name enrichment from SQL. No password, email/contact table or financial ledger is duplicated in MongoDB.']
(root/'docs/DATABASE_DESIGN.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(f'Generated ER diagram and dictionary for {len(tables)} application tables plus sg_migrations')
