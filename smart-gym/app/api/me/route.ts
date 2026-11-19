import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return json(await requireUser());
  } catch (error) {
    return fail(error);
  }
}
