import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { ncSites, ncUserSites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.orgRole !== "ADMIN" && !session.user.isAdmin) redirect("/dashboard");
  if (!session.user.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;
  const supabase = createSupabaseAdminClient();

  // ── Supabase: 조직 멤버 목록 ─────────────────────────────────────────────
  const { data: orgMembers } = await supabase
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", orgId)
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

  // ── Neon: 사업장 목록 ────────────────────────────────────────────────────
  const sites = await db
    .select({ id: ncSites.id, code: ncSites.code, name: ncSites.name })
    .from(ncSites)
    .where(and(eq(ncSites.orgId, orgId), eq(ncSites.isActive, true)))
    .orderBy(ncSites.code);

  // ── Neon: 사용자-사업장 매핑 (MEMBER만 의미 있음) ────────────────────────
  const userSiteRows = await db
    .select({ userId: ncUserSites.userId, siteId: ncUserSites.siteId })
    .from(ncUserSites)
    .where(eq(ncUserSites.orgId, orgId));

  // userId → siteId[] 맵
  const userSiteMap: Record<string, string[]> = {};
  for (const row of userSiteRows) {
    if (!userSiteMap[row.userId]) userSiteMap[row.userId] = [];
    userSiteMap[row.userId].push(row.siteId);
  }

  return (
    <MembersClient
      initialMembers={members}
      sites={sites}
      userSiteMap={userSiteMap}
    />
  );
}
