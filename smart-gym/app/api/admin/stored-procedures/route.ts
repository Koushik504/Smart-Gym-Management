import { requireUser } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { executeProcedure } from "@/lib/database-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireUser(true);
    return json([
      {
        procedure: "sg_member_summary",
        parameters: { memberId: "positive integer" },
      },
      {
        procedure: "sg_trainer_members",
        parameters: { trainerId: "positive integer" },
      },
      {
        procedure: "sg_top_attendance",
        parameters: { limit: "1–100; default 10" },
      },
    ]);
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser(true);
    return json(await executeProcedure(await request.json()));
  } catch (error) {
    return fail(error);
  }
}
