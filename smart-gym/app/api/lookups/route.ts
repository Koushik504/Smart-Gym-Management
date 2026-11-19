import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { lookups } from "@/lib/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return json(await lookups(await requireUser()));
  } catch (error) {
    return fail(error);
  }
}
