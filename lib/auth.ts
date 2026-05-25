import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { ncUserSites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export interface AppSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    isAdmin: boolean;
    organizationId: string | null;
    orgRole: "ADMIN" | "MEMBER";
    organizationName: string | null;
    /**
     * 접근 가능한 사업장 ID 목록.
     * - null  → org ADMIN 또는 isAdmin (전체 사업장 접근 가능)
     * - []    → 사업장 미배정 (데이터 조회 차단)
     * - [id…] → 해당 사업장만 조회 가능
     */
    allowedSiteIds: string[] | null;
  };
}

// Map Supabase role to NC Manager role
function mapRole(role: string | null): "ADMIN" | "MEMBER" {
  if (role === "owner" || role === "admin") return "ADMIN";
  return "MEMBER";
}

// ADMIN_EMAILS 환경변수에 이메일이 포함되어 있는지 확인
// 개행 문자(\n, \r), 공백 등 모두 제거 후 비교
function checkIsAdmin(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS || "";
  const adminEmails = raw
    .replace(/[\r\n]+/g, ",")   // 개행을 쉼표로 변환
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * Get current authenticated user with org membership info.
 * Returns null if not authenticated.
 * Use this in API routes and server components.
 */
export async function auth(): Promise<AppSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !user.email) return null;

  // Get org membership from quality-hub's org_members table
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const orgId = membership?.org_id ?? null;
  const orgName = (membership?.organizations as { name?: string } | null)?.name ?? null;
  const orgRole = mapRole(membership?.role ?? null);

  // isAdmin: ADMIN_EMAILS 목록 OR quality-hub org_members에서 owner 역할
  const isAdmin =
    checkIsAdmin(user.email) || membership?.role === "owner";

  // ── 슈퍼어드민이지만 org가 없는 경우 ─────────────────────────────────
  // quality-hub 슈퍼어드민은 org_members에 없을 수 있음.
  // 이 경우 Supabase organizations 테이블에서 첫 번째 조직을 할당.
  let resolvedOrgId = orgId;
  let resolvedOrgName = orgName;

  if (isAdmin && !orgId) {
    const adminClient = createSupabaseAdminClient();
    const { data: orgs, error: orgError } = await adminClient
      .from("organizations")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1);

    if (orgError) {
      console.error("[auth] organizations query error:", orgError.message);
    }

    const firstOrg = orgs?.[0] ?? null;
    if (firstOrg) {
      resolvedOrgId = firstOrg.id;
      resolvedOrgName = firstOrg.name;
    }
  }

  // ── 사업장 접근 권한 조회 ────────────────────────────────────────────────
  // org ADMIN or isAdmin → null (전체 접근)
  // 일반 MEMBER → nc_user_sites 에서 허용된 site ID 목록 조회
  const resolvedOrgRole = isAdmin ? "ADMIN" : orgRole;
  let allowedSiteIds: string[] | null = null;

  if (resolvedOrgRole !== "ADMIN" && resolvedOrgId) {
    const userSiteRows = await db
      .select({ siteId: ncUserSites.siteId })
      .from(ncUserSites)
      .where(
        and(
          eq(ncUserSites.userId, user.id),
          eq(ncUserSites.orgId, resolvedOrgId),
        )
      );
    allowedSiteIds = userSiteRows.map((r) => r.siteId);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email.split("@")[0],
      image: user.user_metadata?.avatar_url ?? null,
      isAdmin,
      organizationId: resolvedOrgId,
      orgRole: resolvedOrgRole,
      organizationName: resolvedOrgName,
      allowedSiteIds,
    },
  };
}

// Alias for backwards compat
export const getSession = auth;
