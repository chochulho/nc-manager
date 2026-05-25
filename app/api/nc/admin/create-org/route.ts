import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/nc/admin/create-org
 * Creates a new organization in Supabase and adds the current admin as owner.
 * Admin-only endpoint.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgName = body.name?.trim();
  if (!orgName) {
    return NextResponse.json({ error: "조직 이름을 입력하세요" }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Create organization
  const { data: org, error: orgErr } = await adminClient
    .from("organizations")
    .insert({
      name: orgName,
      status: "active",
      plan_id: "enterprise",
      type: "corporate",
    })
    .select("id, name")
    .single();

  if (orgErr || !org) {
    console.error("[create-org] organizations insert error:", orgErr?.message);
    return NextResponse.json(
      { error: orgErr?.message ?? "조직 생성 실패" },
      { status: 500 }
    );
  }

  // 2. Add admin as owner in org_members
  const { error: memberErr } = await adminClient
    .from("org_members")
    .insert({
      org_id: org.id,
      user_id: session.user.id,
      role: "owner",
      status: "active",
    });

  if (memberErr) {
    console.error("[create-org] org_members insert error:", memberErr.message);
    // org created but membership failed — still return success with warning
    return NextResponse.json({
      org,
      warning: "조직은 생성됐지만 멤버 등록에 실패했습니다: " + memberErr.message,
    });
  }

  return NextResponse.json({ org, message: `${orgName} 조직 생성 완료` });
}
