import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadComplaintImportContext, parseComplaintImportWorkbook } from "@/lib/nc/complaint-import";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일을 선택하세요." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ctx = await loadComplaintImportContext(session.user.organizationId);

  let rows;
  try {
    rows = parseComplaintImportWorkbook(buffer, ctx);
  } catch {
    return NextResponse.json({ error: "엑셀 파일을 읽을 수 없습니다. 양식을 확인해 주세요." }, { status: 400 });
  }

  const okCount = rows.filter((r) => r.ok).length;

  return NextResponse.json({
    total: rows.length,
    okCount,
    errorCount: rows.length - okCount,
    rows: rows.map((r) => ({ rowNumber: r.rowNumber, ok: r.ok, errors: r.errors, preview: r.preview })),
  });
}
