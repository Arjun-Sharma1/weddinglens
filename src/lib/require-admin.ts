import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Guard for admin pages/actions. Redirects to login when unauthenticated. */
export async function requireAdmin() {
  const session = await auth();
  if (!session) redirect("/admin/login");
  return session;
}
