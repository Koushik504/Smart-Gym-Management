import { requireAdmin } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import type { IdContext } from "@/lib/api-handlers";
import { updateResource, deleteResource } from "@/lib/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, context: IdContext) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    return json(
      await updateResource("exercises", admin, id, await request.json()),
    );
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request, context: IdContext) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    return json(await deleteResource("exercises", admin, id));
  } catch (error) {
    return fail(error);
  }
}
