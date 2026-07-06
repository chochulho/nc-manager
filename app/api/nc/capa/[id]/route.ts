import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas, capaActions } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eq, and } from "drizzle-orm";
import { sendCapaAssignmentEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_BASE_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
  : "https://nc-manager.vercel.app";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [capa] = await db
    .select()
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actions = await db
    .select()
    .from(capaActions)
    .where(eq(capaActions.capaId, id))
    .orderBy(capaActions.createdAt);

  return NextResponse.json({ ...capa, actions });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [existing] = await db
    .select({ id: capas.id, championUserId: capas.championUserId })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const updates: Record<string, unknown> = { ...body, updatedAt: now };

  if (typeof updates.effectivenessReviewDueAt === "string") {
    updates.effectivenessReviewDueAt = new Date(updates.effectivenessReviewDueAt);
  }

  if (body.status === "closed" && !body.closedAt) {
    updates.closedAt = now;
  }
  if (body.effectivenessVerdict && !body.effectivenessReviewedAt) {
    updates.effectivenessReviewedAt = now;
  }

  let updated;
  try {
    [updated] = await db
      .update(capas)
      .set(updates as Parameters<typeof db.update>[0] extends never ? never : any)
      .where(eq(capas.id, id))
      .returning();
  } catch (err) {
    console.error("[CAPA PATCH] DB update failed:", err);
    return NextResponse.json({ error: "DB update failed", details: String(err) }, { status: 500 });
  }

  if (!updated) return NextResponse.json({ error: "Not found after update" }, { status: 404 });

  // champion 변경 시 알림
  const newChampion = body.championUserId;
  if (newChampion && newChampion !== existing.championUserId && newChampion !== session.user.id) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: userData } = await supabase.auth.admin.getUserById(newChampion);
      const championEmail = userData?.user?.email;
      const championName = userData?.user?.user_metadata?.full_name ?? "담당자";
      if (championEmail) {
        await sendCapaAssignmentEmail({
          to: championEmail,
          recipientName: championName,
          orgName: session.user.organizationName ?? "",
          capaNumber: updated.capaNumber,
          title: updated.title,
          assignerName: session.user.name ?? "관리자",
          capaUrl: `${APP_URL}/capa/${id}`,
        });
      }
    } catch { /* 이메일 실패는 API 응답에 영향 없음 */ }
  }

  return NextResponse.json(updated);
}
