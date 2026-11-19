import { Dashboard } from "@/components/dashboard";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Page() {
  if ((await currentUser())?.role === "USER") redirect("/my-account");
  return <Dashboard />;
}
