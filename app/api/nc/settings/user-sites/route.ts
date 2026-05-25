/**
 * 사용자-사업장 접근 권한 API
 * org ADMIN만 사용 가능
 *
 * GET    ?userId=xxx        → 특정 유저의 허용 site ID 목록
 * POST   { userId, siteId } → 접근 권한 추가
 * DELETE { userId, siteId } → 접근 권한 제거
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncUserSites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── GET ?userId=xxx ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return unauthorized();
  if (session.user.orgRole !== "ADMIN" && !session.user.isAdmin) return forbidden();

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId 파라미터가 필요합니다." }, { status: 400 });

  const rows = await db
    .select({ siteId: ncUserSites.siteId })
    .from(ncUserSites)
    .where(
      and(
        eq(ncUserSites.userId, userId),
        eq(ncUserSites.orgId, session.user.organizationId),
      )
    );

  return NextResponse.json(rows.map((r) => r.siteId));
}

// ── POST { userId, siteId } ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return unauthorized();
  if (session.user.orgRole !== "ADMIN" && !session.user.isAdmin) return forbidden();

  const body = await req.json();
  const { userId, siteId } = body as { userId?: string; siteId?: string };
  if (!userId || !siteId) {
    return NextResponse.json({ error: "userId, siteId가 필요합니다." }, { status: 400 });
  }

  await db
    .insert(ncUserSites)
    .values({
      userId,
      orgId: session.user.organizationId,
      siteId,
    })
    .onConflictDoNothing();  // 중복 무시

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ── DELETE { userId, siteId } ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return unauthorized();
  if (session.user.orgRole !== "ADMIN" && !session.user.isAdmin) return forbidden();

  const body = await req.json();
  const { userId, siteId } = body as { userId?: string; siteId?: string };
  if (!userId || !siteId) {
    return NextResponse.json({ error: "userId, siteId가 필요합니다." }, { status: 400 });
  }

  await db
    .delete(ncUserSites)
    .where(
      and(
        eq(ncUserSites.userId, userId),
        eq(ncUserSites.orgId, session.user.organizationId),
        eq(ncUserSites.siteId, siteId),
      )
    );

  return NextResponse.json({ ok: true });
}
