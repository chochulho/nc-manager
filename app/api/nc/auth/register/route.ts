import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, organizations, orgInvitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { name, email, password, companyName, plantName, inviteToken } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력하세요." }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(email.toLowerCase());
  const hashed = await bcrypt.hash(password, 12);

  // 초대 토큰으로 기존 조직 합류
  if (inviteToken) {
    const [invitation] = await db
      .select()
      .from(orgInvitations)
      .where(and(eq(orgInvitations.token, inviteToken), eq(orgInvitations.status, "PENDING")))
      .limit(1);

    if (!invitation || invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "유효하지 않거나 만료된 초대입니다." }, { status: 400 });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashed,
        isAdmin,
        orgRole: "MEMBER",
        organizationId: invitation.organizationId,
      })
      .returning({ id: users.id, email: users.email });

    await db
      .update(orgInvitations)
      .set({ status: "ACCEPTED" })
      .where(eq(orgInvitations.id, invitation.id));

    return NextResponse.json(newUser, { status: 201 });
  }

  // 일반 가입 — 새 조직 생성
  if (!companyName) {
    return NextResponse.json({ error: "회사명을 입력하세요." }, { status: 400 });
  }

  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    name,
    email,
    password: hashed,
    isAdmin,
    orgRole: "ADMIN",
  });

  await db.insert(organizations).values({
    id: orgId,
    name: companyName,
    plantName: plantName ?? null,
    createdById: userId,
  });

  const [updated] = await db
    .update(users)
    .set({ organizationId: orgId })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name });

  return NextResponse.json(updated, { status: 201 });
}
