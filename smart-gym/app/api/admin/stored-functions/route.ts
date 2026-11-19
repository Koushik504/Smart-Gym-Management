import { requireUser } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { executeFunction } from "@/lib/database-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireUser(true);
    return json([
      {
        functionName: "sg_membership_end",
        parameters: { memberId: "positive integer" },
      },
      {
        functionName: "sg_is_member_active",
        parameters: { memberId: "positive integer" },
      },
      {
        functionName: "sg_attendance_rate",
        parameters: { memberId: "positive integer", days: "1–365; default 30" },
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
    return json(await executeFunction(await request.json()));
  } catch (error) {
    return fail(error);
  }
}
