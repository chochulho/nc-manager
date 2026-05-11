import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, organizations, orgInvitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isAdmin, orgRole, organizationId } = session.user;

  if (isAdmin) {
    const all = await db
      .select({ id: users.id, name: users.name, email: users.email, orgRole: users.orgRole, organizationId: users.organizationId, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.createdAt);
    return NextResponse.json(all);
  }

  if (orgRole !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!organizationId) return NextResponse.json({ error: "소속 조직이 없습니다." }, { status: 404 });

  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, orgRole: users.orgRole, organizationId: users.organizationId, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .orderBy(users.createdAt);

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgRole, isAdmin, organizationId } = session.user;
  if (orgRole !== "ADMIN" && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!organizationId) return NextResponse.json({ error: "소속 조직이 없습니다." }, { status: 400 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!org) return NextResponse.json({ error: "조직을 찾을 수 없습니다." }, { status: 404 });

  const [inviter] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.user.id)).limit(1);
  const [targetUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (targetUser) {
    if (targetUser.organizationId === organizationId) {
      return NextResponse.json({ error: "이미 조직 멤버입니다." }, { status: 409 });
    }
    if (targetUser.organizationId) {
      return NextResponse.json({ error: "다른 조직에 소속된 사용자입니다." }, { status: 403 });
    }
    const [updated] = await db
      .update(users)
      .set({ organizationId, orgRole: "MEMBER" })
      .where(eq(users.id, targetUser.id))
      .returning({ id: users.id, name: users.name, email: users.email, orgRole: users.orgRole });
    return NextResponse.json(updated, { status: 201 });
  }

  // 미가입 → 초대 이메일
  await db
    .update(orgInvitations)
    .set({ status: "CANCELLED" })
    .where(and(eq(orgInvitations.email, email), eq(orgInvitations.organizationId, organizationId), eq(orgInvitations.status, "PENDING")));

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(orgInvitations).values({
    email,
    organizationId,
    token,
    expiresAt,
    invitedById: session.user.id,
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  await sendInvitationEmail({
    to: email,
    inviterName: inviter?.name ?? "관리자",
    orgName: org.name,
    inviteUrl: `${baseUrl}/invite/${token}`,
  });

  return NextResponse.json({ message: "초대 이메일을 발송했습니다.", pending: true }, { status: 202 });
}
