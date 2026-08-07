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
    /**
     * NC Manager 제품 사용권한 여부 (qmintel 멤버×제품 매트릭스).
     * - ADMIN/isAdmin/superadmin → 항상 true (전권)
     * - 일반 MEMBER → org_member_products에 'nc-manager' grant가 있어야 true
     * false면 (app) 레이아웃에서 접근 차단.
     */
    entitled: boolean;
  };
}

// qmintel 멤버×제품 매트릭스의 이 앱 슬러그 (계약 §1)
const PRODUCT_SLUG = "nc-manager";

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
 * org_members 테이블에서 사용자의 조직 멤버십을 조회한다.
 * organizations(name) 조인이 실패할 경우 조인 없이 재시도한다.
 */
async function getMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<{ org_id: string; role: string; orgName: string | null } | null> {
  // 1차 시도: organizations 조인 포함
  const { data: full, error: fullErr } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!fullErr && full?.org_id) {
    const orgName = (full.organizations as { name?: string } | null)?.name ?? null;
    return { org_id: full.org_id, role: full.role, orgName };
  }

  if (fullErr) {
    console.error("[auth] org_members join query error:", fullErr.message, fullErr.code);
  }

  // 2차 시도: 조인 없이 org_id, role만 조회
  const { data: simple, error: simpleErr } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (simpleErr) {
    console.error("[auth] org_members simple query error:", simpleErr.message, simpleErr.code);
  }

  if (simple?.org_id) {
    return { org_id: simple.org_id, role: simple.role, orgName: null };
  }

  return null;
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

  // Get org membership (with robust fallback if join fails)
  const membership = await getMembership(supabase, user.id);

  const orgId = membership?.org_id ?? null;
  const orgName = membership?.orgName ?? null;
  const orgRole = mapRole(membership?.role ?? null);

  // isAdmin: ADMIN_EMAILS 목록 OR quality-hub org_members에서 owner 역할
  const isAdmin = checkIsAdmin(user.email) || membership?.role === "owner";

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
      console.error("[auth] organizations query error:", orgError.message, orgError.code);
    } else {
      console.log("[auth] admin fallback: found", orgs?.length ?? 0, "orgs for", user.email);
    }

    const firstOrg = orgs?.[0] ?? null;
    if (firstOrg) {
      resolvedOrgId = firstOrg.id;
      resolvedOrgName = firstOrg.name;
      console.log("[auth] admin fallback resolved orgId:", resolvedOrgId);
    } else {
      console.warn("[auth] no organizations found for admin:", user.email, "→ organizationId will be null");
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

  // ── 제품 사용권한(nc-manager) 강제 ────────────────────────────────
  // 관리자/슈퍼어드민은 전권. 일반 멤버는 qmintel 멤버×제품 매트릭스에서
  // 'nc-manager' grant를 받아야 접근 가능(quality-hub와 공유하는 Supabase의
  // org_member_products / get_my_product_slugs() 직접 조회 — push 불필요).
  let entitled = resolvedOrgRole === "ADMIN";
  if (!entitled) {
    const { data: slugs, error: entErr } = await supabase.rpc("get_my_product_slugs");
    if (entErr) {
      // 조회 실패(예: RPC 미배포) 시 하위호환으로 허용 — 강제 오작동으로 잠기지 않도록.
      console.error("[auth] get_my_product_slugs error:", entErr.message);
      entitled = true;
    } else {
      entitled = Array.isArray(slugs) && (slugs as string[]).includes(PRODUCT_SLUG);
    }
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
      entitled,
    },
  };
}

// Alias for backwards compat
export const getSession = auth;
