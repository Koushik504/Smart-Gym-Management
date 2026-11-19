import { json } from "@/lib/http";
export const dynamic = "force-dynamic";
const unknown = () => json({ error: "Unknown resource" }, 404);
export { unknown as GET, unknown as POST, unknown as PATCH, unknown as DELETE };
