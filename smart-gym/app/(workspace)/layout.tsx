import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Workspace({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await currentUser();
  } catch {
    return (
      <main className="setup-error">
        <h1>Database connection unavailable</h1>
        <p>
          Check DATABASE_URL, start MySQL, and run npm run db:migrate. Then
          reload this page.
        </p>
      </main>
    );
  }
  if (!user) redirect("/login");
  return <Shell user={{ name: user.name, role: user.role }}>{children}</Shell>;
}
