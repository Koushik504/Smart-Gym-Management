import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MemberProfile } from "@/components/member-profile";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "USER" || !user.member) redirect("/dashboard");
  return <MemberProfile id={String(user.member.id)} personal />;
}
