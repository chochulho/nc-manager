import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAttachments } from "@/lib/db/schema";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const items = await db
    .select()
    .from(ncAttachments)
    .where(
      and(
        eq(ncAttachments.orgId, session.user.organizationId),
        eq(ncAttachments.entityType, entityType as "internal_nc" | "customer_complaint" | "capa"),
        eq(ncAttachments.entityId, entityId),
      )
    )
    .orderBy(ncAttachments.createdAt);

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "파일 스토리지가 설정되지 않았습니다. BLOB_READ_WRITE_TOKEN을 .env에 추가하세요." }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const entityType = formData.get("entityType") as string;
  const entityId = formData.get("entityId") as string;

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "파일, entityType, entityId가 필요합니다." }, { status: 400 });
  }

  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 20MB 이하여야 합니다." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `nc/${session.user.organizationId}/${entityType}/${entityId}/${safeName}`;

  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(path, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[attachment upload error]", msg);
    return NextResponse.json({ error: `스토리지 업로드 실패: ${msg}` }, { status: 500 });
  }

  const [attachment] = await db
    .insert(ncAttachments)
    .values({
      orgId: session.user.organizationId,
      entityType: entityType as "internal_nc" | "customer_complaint" | "capa",
      entityId,
      uploadedById: session.user.id,
      filename: file.name,
      storageKey: blob.url,
      mimeType: file.type,
      sizeBytes: file.size,
    })
    .returning();

  return NextResponse.json(attachment, { status: 201 });
}
