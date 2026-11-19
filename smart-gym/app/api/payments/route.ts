import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { payments } from "@/lib/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return json(await payments(await requireUser(), new URL(request.url)));
  } catch (error) {
    return fail(error);
  }
}
