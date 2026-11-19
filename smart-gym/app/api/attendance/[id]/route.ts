import { requireUser } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { checkout } from "@/lib/services";
import type { IdContext } from "@/lib/api-handlers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, context: IdContext) {
  try {
    checkOrigin(request);
    const actor = await requireUser();
    const { id } = await context.params;
    return json(await checkout(actor, id));
  } catch (error) {
    return fail(error);
  }
}
