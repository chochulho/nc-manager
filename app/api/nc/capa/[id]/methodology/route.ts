import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { capas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isRecordAdmin, logAdminAction } from "@/lib/nc/admin-registry";

const ALLOWED = ["8d", "simple_capa"] as const;
type Methodology = (typeof ALLOWED)[number];

type WhyRow = { why: string; because: string };

// Simple CAPA 근본원인(문자열) → 8D 5Why 배열
function toWhyRows(value: unknown): WhyRow[] {
  const rows: WhyRow[] = Array.from({ length: 5 }, () => ({ why: "", because: "" }));
  if (typeof value === "string" && value.trim()) rows[0].because = value;
  return rows;
}

// 8D 5Why 배열 → Simple CAPA 근본원인(문자열)
function toRootCauseText(value: unknown): string | null {
  if (typeof value === "string") return value || null;
  if (!Array.isArray(value)) return null;
  const lines = (value as WhyRow[])
    .filter((r) => r && (r.why || r.because))
    .map((r, i) => `Why ${i + 1}: ${r.why || "—"}${r.because ? ` → ${r.because}` : ""}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRecordAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const methodology = body.methodology as Methodology;
  if (!ALLOWED.includes(methodology)) {
    return NextResponse.json({ error: "Invalid methodology" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: capas.id, methodology: capas.methodology, d4RootCause: capas.d4RootCause })
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.methodology === methodology) {
    return NextResponse.json({ error: "이미 같은 방법론입니다" }, { status: 409 });
  }

  // 근본원인 형식만 변환한다. D1/D5/D6/D8 등 8D 전용 필드는 그대로 두어 다시 8D로 돌아오면 복원된다.
  const d4RootCause = methodology === "8d"
    ? (Array.isArray(existing.d4RootCause) ? existing.d4RootCause : toWhyRows(existing.d4RootCause))
    : toRootCauseText(existing.d4RootCause);

  const [updated] = await db
    .update(capas)
    .set({ methodology, d4RootCause, updatedAt: new Date() })
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)))
    .returning();

  await logAdminAction(session.user.organizationId, "capa", id, session.user.id, "methodology_changed", {
    from: existing.methodology,
    to: methodology,
  });

  return NextResponse.json(updated);
}
