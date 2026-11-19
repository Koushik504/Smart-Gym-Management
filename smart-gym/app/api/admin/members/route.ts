import { requireAdmin } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { listResource, createResource } from "@/lib/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    return json(await listResource("members", admin, new URL(request.url)));
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    return json(
      await createResource("members", admin, await request.json()),
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
