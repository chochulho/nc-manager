import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ncAttachments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Serves blob files through authenticated proxy (works with both public/private stores)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const [attachment] = await db
    .select()
    .from(ncAttachments)
    .where(and(eq(ncAttachments.id, id), eq(ncAttachments.orgId, session.user.organizationId)));

  if (!attachment) return new NextResponse("Not found", { status: 404 });

  const fetchHeaders: HeadersInit = {};
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) fetchHeaders.Authorization = `Bearer ${token}`;

  const blobRes = await fetch(attachment.storageKey, { headers: fetchHeaders });
  if (!blobRes.ok) return new NextResponse("Failed to fetch file", { status: 502 });

  const headers = new Headers();
  headers.set("Content-Type", attachment.mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");
  if (attachment.sizeBytes) headers.set("Content-Length", String(attachment.sizeBytes));

  return new NextResponse(blobRes.body, { headers });
}
