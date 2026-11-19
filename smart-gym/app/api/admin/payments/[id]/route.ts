import { requireAdmin } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { settlePayment } from "@/lib/services";
import { positiveId } from "@/lib/validation";
import type { IdContext } from "@/lib/api-handlers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, context: IdContext) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    return json(
      await settlePayment(admin, positiveId((await context.params).id)),
    );
  } catch (error) {
    return fail(error);
  }
}
