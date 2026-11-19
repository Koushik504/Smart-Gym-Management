import { authenticate } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { email, password } = loginSchema.parse(await request.json());
    return json(await authenticate(email, password));
  } catch (error) {
    return fail(error);
  }
}
