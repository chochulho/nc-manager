import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isAdmin, orgRole, organizationId } = session.user;

  if (!isAdmin && orgRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();

  if (isAdmin) {
    // Global admin: return all org_members
    const { data, error } = await supabase
      .from("org_members")
      .select("user_id, role, status, created_at, organizations(id, name)")
      .eq("status", "active")
      .order("created_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with user emails from auth.users
    const members = await Promise.all(
      (data ?? []).map(async (m) => {
        const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
        return {
          id: m.user_id,
          email: userData?.user?.email ?? "",
          name: userData?.user?.user_metadata?.full_name ?? null,
          orgRole: m.role === "owner" || m.role === "admin" ? "ADMIN" : "MEMBER",
          organizationId: (m.organizations as { id?: string } | null)?.id ?? null,
          createdAt: m.created_at,
        };
      })
    );

    return NextResponse.json(members);
  }

  if (!organizationId) return NextResponse.json({ error: "소속 조직이 없습니다." }, { status: 404 });

  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, status, created_at")
    .eq("org_id", organizationId)
    .eq("status", "active")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = await Promise.all(
    (data ?? []).map(async (m) => {
      const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
      return {
        id: m.user_id,
        email: userData?.user?.email ?? "",
        name: userData?.user?.user_metadata?.full_name ?? null,
        orgRole: m.role === "owner" || m.role === "admin" ? "ADMIN" : "MEMBER",
        organizationId,
        createdAt: m.created_at,
      };
    })
  );

  return NextResponse.json(members);
}
