import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import mysql, { RowDataPacket } from "mysql2/promise";
import { setupMongo } from "../database/mongodb/setup";
import { closeDatabases } from "../lib/db";
import { statements } from "../lib/migration-statements";
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
try {
  const files = await Promise.all(
    (await readdir("database/mysql"))
      .filter((name) => /^\d.*\.sql$/.test(name))
      .sort()
      .map(async (name) => {
        const source = await readFile(`database/mysql/${name}`, "utf8");
        return {
          name,
          source,
          checksum: createHash("sha256").update(source).digest("hex"),
        };
      }),
  );
  const [ledger] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sg_migrations'",
  );
  const [appliedRows] = ledger.length
    ? await connection.query<RowDataPacket[]>(
        "SELECT name,checksum FROM sg_migrations",
      )
    : [[] as RowDataPacket[]];
  const applied = new Map(
    appliedRows.map((row) => [row.name as string, row.checksum as string]),
  );
  for (const file of files) {
    if (applied.has(file.name) && applied.get(file.name) !== file.checksum)
      throw new Error(`Applied migration changed: ${file.name}`);
  }
  const hasPending = files.some((file) => !applied.has(file.name));
  const [settings] = await connection.query<RowDataPacket[]>(
    "SELECT @@log_bin AS binlog,@@log_bin_trust_function_creators AS trustCreators",
  );
  if (hasPending && settings[0].binlog && !settings[0].trustCreators)
    throw new Error(
      "Migration requires trigger creation permission under binary logging. Use the isolated local instance (scripts/provision-local.ps1), or have your DBA enable log_bin_trust_function_creators for this development server before migration. No DDL has been applied by this run.",
    );
  if (hasPending)
    await connection.query(
      "CREATE TABLE IF NOT EXISTS sg_migrations (name VARCHAR(150) PRIMARY KEY, checksum CHAR(64) NOT NULL, appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
  for (const { name, source, checksum } of files) {
    if (applied.has(name)) {
      console.log("Already applied", name);
      continue;
    }
    console.log("Applying", name);
    // MySQL DDL commits implicitly. A failed migration is NOT recorded as applied.
    // Inspect partial objects and restore the backup before retrying after DDL failure.
    for (const statement of statements(source))
      await connection.query(statement);
    await connection.execute(
      "INSERT INTO sg_migrations(name,checksum) VALUES(?,?)",
      [name, checksum],
    );
  }
  await setupMongo();
  console.log("MySQL migrations and MongoDB validators/indexes applied");
} finally {
  await connection.end();
  await closeDatabases();
}
