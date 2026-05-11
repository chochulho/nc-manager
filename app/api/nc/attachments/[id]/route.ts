import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAttachments } from "@/lib/db/schema";
import { del } from "@vercel/blob";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [attachment] = await db
    .select()
    .from(ncAttachments)
    .where(and(eq(ncAttachments.id, id), eq(ncAttachments.orgId, session.user.organizationId)));

  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(attachment.storageKey);
  }

  await db.delete(ncAttachments).where(eq(ncAttachments.id, id));

  return NextResponse.json({ ok: true });
}
