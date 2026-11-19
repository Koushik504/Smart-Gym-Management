import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { queryReport } from "@/lib/database-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireUser(true);
    return json(await queryReport("database", new URL(request.url)));
  } catch (error) {
    return fail(error);
  }
}
