import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncDefectNotifications, ncAttachments } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eq, and, desc, inArray } from "drizzle-orm";
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
      attachmentFilenames: ncDefectNotifications.attachmentFilenames,
      sentAt: ncDefectNotifications.sentAt,
      sentByUserId: ncDefectNotifications.sentByUserId,
    })
    .from(ncDefectNotifications)
    .where(
      and(
        eq(ncDefectNotifications.orgId, session.user.organizationId),
        eq(ncDefectNotifications.entityType, entityType as "internal_nc" | "part_nc" | "customer_complaint"),
        eq(ncDefectNotifications.entityId, entityId),
      )
    )
    .orderBy(desc(ncDefectNotifications.sentAt));

  // Enrich with user info from Supabase
  const supabase = createSupabaseAdminClient();
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const { data: userData } = await supabase.auth.admin.getUserById(row.sentByUserId);
      return {
        ...row,
        sentByUser: {
          id: row.sentByUserId,
          name: userData?.user?.user_metadata?.full_name ?? null,
          email: userData?.user?.email ?? "",
        },
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { entityType, entityId, subject, body: msgBody, recipientEmails, attachmentIds } = body as {
    entityType: "internal_nc" | "part_nc" | "customer_complaint";
    entityId: string;
    subject: string;
    body: string;
    recipientEmails: string[];
    attachmentIds?: string[];
  };

  if (!entityType || !entityId || !subject?.trim() || !msgBody?.trim() || !recipientEmails?.length) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  const invalidEmails = recipientEmails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalidEmails.length) {
    return NextResponse.json({ error: `올바르지 않은 이메일: ${invalidEmails.join(", ")}` }, { status: 400 });
  }

  let attachments: { filename: string; path: string }[] | undefined;
  if (attachmentIds?.length) {
    const rows = await db
      .select({ filename: ncAttachments.filename, storageKey: ncAttachments.storageKey })
      .from(ncAttachments)
      .where(
        and(
          eq(ncAttachments.orgId, session.user.organizationId),
          eq(ncAttachments.entityType, entityType),
          eq(ncAttachments.entityId, entityId),
          inArray(ncAttachments.id, attachmentIds),
        )
      );
    attachments = rows.map((r) => ({ filename: r.filename, path: r.storageKey }));
  }

  try {
    await sendDefectNotificationEmail({
      to: recipientEmails,
      subject,
      body: msgBody,
      senderName: session.user.name ?? session.user.email ?? "담당자",
      orgName: session.user.organizationName ?? "",
      attachments,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "이메일 발송에 실패했습니다." },
      { status: 502 }
    );
  }

  const [inserted] = await db
    .insert(ncDefectNotifications)
    .values({
      orgId: session.user.organizationId,
      entityType,
      entityId,
      subject,
      body: msgBody,
      recipientEmails,
      attachmentFilenames: attachments?.map((a) => a.filename) ?? null,
      sentByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
