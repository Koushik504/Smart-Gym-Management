import { requireAdmin } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { deliverOutbox } from "@/lib/outbox";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    return json(await deliverOutbox());
  } catch (error) {
    return fail(error);
  }
}
