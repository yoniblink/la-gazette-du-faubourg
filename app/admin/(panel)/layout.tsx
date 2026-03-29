import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/admin/login");
  }
  return <AdminShell userEmail={session.user.email}>{children}</AdminShell>;
}
