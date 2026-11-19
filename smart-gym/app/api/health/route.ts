import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { db, mongo } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireUser(true);
    const checks = await Promise.allSettled([
      db.$queryRaw`SELECT 1`,
      mongo().then((client) => client.command({ ping: 1 })),
    ]);
    const mysql = checks[0].status === "fulfilled" ? "up" : "down";
    const mongodb = checks[1].status === "fulfilled" ? "up" : "down";
    const ok = mysql === "up" && mongodb === "up";
    return json(
      { status: ok ? "ok" : "degraded", mysql, mongodb },
      ok ? 200 : 503,
    );
  } catch (error) {
    return fail(error);
  }
}
