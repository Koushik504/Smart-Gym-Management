import { MemberProfile } from "@/components/member-profile";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if ((await currentUser())?.role === "USER") redirect("/my-account");
  return <MemberProfile id={id} />;
}
