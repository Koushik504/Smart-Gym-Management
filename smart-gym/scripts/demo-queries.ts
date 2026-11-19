import "dotenv/config";
import { readFile } from "node:fs/promises";
import { sql, closeDatabases } from "../lib/db";
import { statements } from "../lib/migration-statements";
try {
  const source = await readFile("database/queries/demonstrations.sql", "utf8");
  for (const statement of statements(source)) {
    const [result] = await sql().query(statement);
    console.log(statement.split("\n")[0].slice(0, 120));
    if (Array.isArray(result)) console.table(result.slice(0, 5));
  }
  console.log(
    "All SQL demonstration statements executed; only disposable sg_demo_sandbox was dropped.",
  );
} finally {
  await closeDatabases();
}
