import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Debug endpoint to diagnose auth/session issues.
 * Remove this in production after diagnosing.
 * GET /api/debug/session
 */
export async function GET() {
  const result: Record<string, unknown> = {};

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Check Supabase auth user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    result.supabaseUser = user
      ? { id: user.id, email: user.email, role: user.role }
      : null;
    result.supabaseUserError = userError?.message ?? null;

    if (!user) {
      return NextResponse.json({ ...result, diagnosis: "NOT_AUTHENTICATED" });
    }

    // 2. Check org_members with .maybeSingle()
    const { data: membership, error: memberError } = await supabase
      .from("org_members")
      .select("org_id, role, status, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    result.membership = membership ?? null;
    result.membershipError = memberError?.message ?? null;

    // 3. Check ALL org_members rows (without status filter) to see if row exists but wrong status
    const { data: allMemberships, error: allMemberError } = await supabase
      .from("org_members")
      .select("org_id, role, status")
      .eq("user_id", user.id);

    result.allMemberships = allMemberships ?? [];
    result.allMembershipsError = allMemberError?.message ?? null;

    // 4. Check admin env
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .replace(/[\r\n]+/g, ",")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    result.adminEmails = adminEmails;
    result.isAdminByEnv = adminEmails.includes((user.email ?? "").toLowerCase());
    result.isAdminByRole = membership?.role === "owner";

    // 5. If admin with no orgId, check organizations table
    const isAdmin = result.isAdminByEnv || result.isAdminByRole;
    if (isAdmin && !membership?.org_id) {
      const adminClient = createSupabaseAdminClient();
      const { data: orgs, error: orgsError } = await adminClient
        .from("organizations")
        .select("id, name, created_at")
        .order("created_at", { ascending: true })
        .limit(5);

      result.organizations = orgs ?? [];
      result.organizationsError = orgsError?.message ?? null;
      result.serviceRoleKeyPresent = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    }

    // 6. Diagnosis
    const orgId = membership?.org_id ?? null;
    let diagnosis = "";
    if (orgId) {
      diagnosis = "OK - has org membership";
    } else if (isAdmin) {
      const orgsData = result.organizations as Array<{ id: string }> | undefined;
      if (orgsData && orgsData.length > 0) {
        diagnosis = "OK - admin fallback will use first org";
      } else {
        diagnosis = "PROBLEM - admin has no org in organizations table";
      }
    } else {
      diagnosis = "PROBLEM - not in org_members and not admin";
    }
    result.diagnosis = diagnosis;

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
