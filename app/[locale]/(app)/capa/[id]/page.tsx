import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { capas, capaActions, internalNCs, customerComplaints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isRecordAdmin } from "@/lib/nc/admin-registry";
import { CAPADetailClient } from "./capa-detail-client";

export default async function CAPADetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const { id } = await params;

  const [capa] = await db
    .select()
    .from(capas)
    .where(and(eq(capas.id, id), eq(capas.orgId, session.user.organizationId)));

  if (!capa) notFound();

  const actions = await db
    .select()
    .from(capaActions)
    .where(eq(capaActions.capaId, id))
    .orderBy(capaActions.createdAt);

  // 출처 엔티티 정보 조회
  let sourceNumber = "";
  let sourceTitle = "";
  if (capa.sourceType === "internal_nc") {
    const [nc] = await db
      .select({ ncNumber: internalNCs.ncNumber, title: internalNCs.title })
      .from(internalNCs)
      .where(eq(internalNCs.id, capa.sourceId));
    if (nc) { sourceNumber = nc.ncNumber; sourceTitle = nc.title; }
  } else if (capa.sourceType === "customer_complaint") {
    const [cc] = await db
      .select({ complaintNumber: customerComplaints.complaintNumber, title: customerComplaints.title })
      .from(customerComplaints)
      .where(eq(customerComplaints.id, capa.sourceId));
    if (cc) { sourceNumber = cc.complaintNumber; sourceTitle = cc.title; }
  }

  // 유효성 평가 담당자 선택을 위한 멤버 목록 조회
  const supabase = createSupabaseAdminClient();
  const { data: memberRows } = await supabase
    .from("org_members")
    .select("user_id, role, status")
    .eq("org_id", session.user.organizationId)
    .eq("status", "active");

  const members = await Promise.all(
    (memberRows ?? []).map(async (m) => {
      const { data: ud } = await supabase.auth.admin.getUserById(m.user_id);
      return {
        id: m.user_id as string,
        name: (ud?.user?.user_metadata?.full_name ?? ud?.user?.email ?? m.user_id) as string,
        email: (ud?.user?.email ?? "") as string,
      };
    })
  );

  return (
    <CAPADetailClient
      capa={capa as any}
      actions={actions}
      sourceNumber={sourceNumber}
      sourceTitle={sourceTitle}
      members={members}
      isOrgAdmin={isRecordAdmin(session)}
    />
  );
}
