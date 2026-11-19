import { spawnSync } from "node:child_process";
const cli = process.env.npm_execpath;
if (!cli) throw new Error("Run through npm run db:setup");
for (const script of [
  "db:backup",
  "db:migrate",
  "db:seed",
  "db:seed-member",
  "db:check",
]) {
  const result = spawnSync(process.execPath, [cli, "run", script], {
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
