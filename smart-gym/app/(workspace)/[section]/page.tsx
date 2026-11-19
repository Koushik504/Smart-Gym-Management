import { notFound, redirect } from "next/navigation";
import { configs } from "@/components/resource-config";
import { ResourceView } from "@/components/resource-view";
import { Reports } from "@/components/reports";
import { currentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params,
    user = await currentUser();
  if (!user) redirect("/login");
  if (
    user.role === "USER" &&
    (section === "reports" ||
      section === "members" ||
      !canAccess(user.role, section, "read"))
  )
    redirect("/my-account");
  if (section === "reports") return <Reports admin={user.role === "ADMIN"} />;
  if (section === "payments") {
    if (user.role === "TRAINER") redirect("/dashboard");
    return <ResourceView resource="payments" role={user.role} />;
  }
  const config = configs[section];
  if (!config) notFound();
  if (config.admin && section !== "members" && user.role === "TRAINER")
    redirect("/dashboard");
  return <ResourceView resource={section} role={user.role} />;
}
