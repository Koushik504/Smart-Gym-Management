import { requireUser } from "@/lib/auth";
import { fail, json, HttpError } from "@/lib/http";
import { dashboard } from "@/lib/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const actor = await requireUser();
    if (actor.role === "USER")
      throw new HttpError(403, "Use your personal member account");
    return json(await dashboard(actor));
  } catch (error) {
    return fail(error);
  }
}
