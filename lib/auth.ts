import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  };
}

// Map Supabase role to NC Manager role
function mapRole(role: string | null): "ADMIN" | "MEMBER" {
  if (role === "owner" || role === "admin") return "ADMIN";
  return "MEMBER";
}

// Check if email is in ADMIN_EMAILS env var
function checkIsAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
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

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email.split("@")[0],
      image: user.user_metadata?.avatar_url ?? null,
      isAdmin,
      organizationId: orgId,
      orgRole: isAdmin ? "ADMIN" : orgRole,
      organizationName: orgName,
    },
  };
}

// Alias for backwards compat
export const getSession = auth;
