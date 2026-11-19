import { logout } from "@/lib/auth";
import { checkOrigin, fail, json } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await logout();
    return json({ loggedOut: true });
  } catch (error) {
    return fail(error);
  }
}
