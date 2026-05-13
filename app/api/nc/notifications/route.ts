import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncDefectNotifications } from "@/lib/db/schema";
import { organizations } from "@/lib/db/schema/org";
import { users } from "@/lib/db/schema/auth";
import { eq, and, desc } from "drizzle-orm";
import { sendDefectNotificationEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: ncDefectNotifications.id,
      subject: ncDefectNotifications.subject,
      body: ncDefectNotifications.body,
      recipientEmails: ncDefectNotifications.recipientEmails,
      sentAt: ncDefectNotifications.sentAt,
      sentByUser: { id: users.id, name: users.name, email: users.email },
    })
    .from(ncDefectNotifications)
    .innerJoin(users, eq(users.id, ncDefectNotifications.sentByUserId))
    .where(
      and(
        eq(ncDefectNotifications.orgId, session.user.organizationId),
        eq(ncDefectNotifications.entityType, entityType as "internal_nc" | "customer_complaint"),
        eq(ncDefectNotifications.entityId, entityId),
      )
    )
    .orderBy(desc(ncDefectNotifications.sentAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { entityType, entityId, subject, body: msgBody, recipientEmails } = body as {
    entityType: "internal_nc" | "customer_complaint";
    entityId: string;
    subject: string;
    body: string;
    recipientEmails: string[];
  };

  if (!entityType || !entityId || !subject?.trim() || !msgBody?.trim() || !recipientEmails?.length) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  const invalidEmails = recipientEmails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalidEmails.length) {
    return NextResponse.json({ error: `올바르지 않은 이메일: ${invalidEmails.join(", ")}` }, { status: 400 });
  }

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, session.user.organizationId));

  await sendDefectNotificationEmail({
    to: recipientEmails,
    subject,
    body: msgBody,
    senderName: session.user.name ?? session.user.email ?? "담당자",
    orgName: org?.name ?? "",
  });

  const [inserted] = await db
    .insert(ncDefectNotifications)
    .values({
      orgId: session.user.organizationId,
      entityType,
      entityId,
      subject,
      body: msgBody,
      recipientEmails,
      sentByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
