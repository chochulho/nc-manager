import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.orgRole !== "ADMIN" && !session.user.isAdmin) redirect("/dashboard");
  if (!session.user.organizationId) redirect("/dashboard");

  const supabase = createSupabaseAdminClient();
  const { data: orgMembers } = await supabase
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", session.user.organizationId)
    .eq("status", "active")
    .order("created_at");

  const members = await Promise.all(
    (orgMembers ?? []).map(async (m) => {
      const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
      return {
        id: m.user_id,
        email: userData?.user?.email ?? "",
        name: userData?.user?.user_metadata?.full_name ?? null,
        orgRole: (m.role === "owner" || m.role === "admin" ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER",
        createdAt: new Date(m.created_at),
      };
    })
  );

  return <MembersClient initialMembers={members} />;
}
