import { requireUser } from "@/lib/auth";
import { fail, json, HttpError } from "@/lib/http";
import { reports } from "@/lib/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    if (actor.role === "USER")
      throw new HttpError(403, "Staff access required");
    return json(await reports(actor, new URL(request.url)));
  } catch (error) {
    return fail(error);
  }
}
