import "dotenv/config";
import { db, mongo, closeDatabases } from "../lib/db";
try {
  console.log(
    "MySQL",
    await db.$queryRaw`SELECT VERSION() AS version, DATABASE() AS databaseName, @@port AS port`,
  );
  console.log("MongoDB ping", await (await mongo()).command({ ping: 1 }));
  console.log(
    "Users",
    await db.user.count(),
    "Members",
    await db.member.count(),
  );
  console.log(
    "SQL views",
    await db.$queryRaw`SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'sg_%'`,
  );
} finally {
  await closeDatabases();
}
