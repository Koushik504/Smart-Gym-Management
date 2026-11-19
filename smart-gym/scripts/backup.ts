import "dotenv/config";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { mkdir, stat, rename } from "node:fs/promises";
import { resolve } from "node:path";
const url = new URL(process.env.DATABASE_URL!);
await mkdir("backups", { recursive: true });
const target = resolve(
  "backups",
  `mysql-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`,
);
const exe =
  process.env.MYSQLDUMP_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe"
    : "mysqldump");
const child = spawn(
  exe,
  [
    "--single-transaction",
    "--routines",
    "--triggers",
    "--no-tablespaces",
    "--set-gtid-purged=OFF",
    `--host=${url.hostname}`,
    `--port=${url.port || 3306}`,
    `--user=${decodeURIComponent(url.username)}`,
    url.pathname.slice(1),
  ],
  {
    env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
    windowsHide: true,
  },
);
const file = createWriteStream(target + ".partial");
const streamDone = pipeline(child.stdout, file);
child.stderr.on("data", (b) => process.stderr.write(b));
await Promise.all([
  streamDone,
  new Promise<void>((ok, bad) => {
    child.on("error", bad);
    child.on("exit", (c) =>
      c === 0 ? ok() : bad(new Error(`mysqldump exited ${c}`)),
    );
  }),
]);
await rename(target + ".partial", target);
console.log(
  "Private backup created:",
  target,
  "bytes:",
  (await stat(target)).size,
);
