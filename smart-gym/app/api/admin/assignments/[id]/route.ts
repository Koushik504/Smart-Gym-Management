import { requireAdmin } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import type { IdContext } from "@/lib/api-handlers";
import { deleteResource } from "@/lib/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function DELETE(request: Request, context: IdContext) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    return json(await deleteResource("assignments", admin, id));
  } catch (error) {
    return fail(error);
  }
}
