import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildComplaintImportTemplate } from "@/lib/nc/complaint-import";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buf = buildComplaintImportTemplate();

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("고객클레임_가져오기_양식.xlsx")}`,
    },
  });
}
