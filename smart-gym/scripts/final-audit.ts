import "dotenv/config";
import { writeFile, readFile } from "node:fs/promises";
import type { RowDataPacket } from "mysql2/promise";
import { sql, mongo, closeDatabases } from "../lib/db";
try {
  const [server] = await sql().query<RowDataPacket[]>(
    "SELECT DATABASE() AS databaseName, @@port AS mysqlPort",
  );
  const [tables] = await sql().execute<RowDataPacket[]>(
    "SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME LIKE 'sg_%' ORDER BY TABLE_NAME",
  );
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const [rows] = await sql().query<RowDataPacket[]>(
      "SELECT COUNT(*) records FROM ??",
      [table.name],
    );
    counts[table.name] = Number(rows[0].records);
  }
  const [views] = await sql().execute<RowDataPacket[]>(
    "SELECT TABLE_NAME name FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'sg_%' ORDER BY TABLE_NAME",
  );
  const [triggers] = await sql().execute<RowDataPacket[]>(
    "SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME LIKE 'sg_%' ORDER BY TRIGGER_NAME",
  );
  const [routines] = await sql().execute<RowDataPacket[]>(
    "SELECT ROUTINE_NAME name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE() AND ROUTINE_NAME LIKE 'sg_%'",
  );
  const database = await mongo();
  const collections = [];
  for (const name of ["workout_logs", "member_progress", "activity_events"])
    collections.push({
      name,
      count: await database.collection(name).countDocuments(),
      indexes: await database.collection(name).indexes(),
    });
  const integration = JSON.parse(
    await readFile("docs/TEST_RESULTS.json", "utf8"),
  );
  const browser = JSON.parse(
    await readFile("docs/BROWSER_RESULTS.json", "utf8"),
  );
  const result = {
    checkedUtc: new Date().toISOString(),
    database: server[0].databaseName,
    mysqlPort: Number(server[0].mysqlPort),
    tableCounts: counts,
    views: views.map((r) => r.name),
    triggers: triggers.map((r) => r.name),
    routines: routines.map((r) => r.name),
    mongoCollections: collections,
    integration: {
      passed: integration.passed,
      failed: integration.failed,
      timestamp: integration.timestamp,
    },
    browser: browser.stats,
    studentActions: [
      "Approved two-member team and actual names",
      "Section title uniqueness",
      "Real individual work and Git history",
      "Course originality/attribution review",
      "Authorized own-repository publication",
      "Live presentation",
    ],
  };
  await writeFile("docs/FINAL_AUDIT.json", JSON.stringify(result, null, 2));
  console.log(
    "Final audit saved: tables",
    tables.length,
    "views",
    views.length,
    "triggers",
    triggers.length,
    "procedures",
    routines.length,
    "integration",
    integration.passed,
    "browser",
    browser.stats.expected,
  );
} finally {
  await closeDatabases();
}
