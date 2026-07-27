import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { capas, internalNCs, partNCs, customerComplaints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NewQAlertForm } from "./new-q-alert-form";

export default async function NewQAlertPage({
  searchParams,
}: {
  searchParams: Promise<{ capaId?: string; ncId?: string; pncId?: string; complaintId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const sp = await searchParams;
  let prefill: {
    title?: string; problemSummary?: string; rootCause?: string; prevention?: string;
    sourceType?: string; sourceId?: string; sourceNumber?: string;
  } = {};

  if (sp.capaId) {
    const [capa] = await db.select().from(capas)
      .where(and(eq(capas.id, sp.capaId), eq(capas.orgId, session.user.organizationId)));
    if (capa) {
      const rc = typeof capa.d4RootCause === "string"
        ? capa.d4RootCause
        : Array.isArray(capa.d4RootCause)
          ? (capa.d4RootCause as Array<{ why: string; because: string }>)
              .filter((r) => r.why).map((r, i) => `Why ${i + 1}: ${r.why}${r.because ? ` → ${r.because}` : ""}`).join("\n")
          : "";
      prefill = {
        title: `Q-Alert: ${capa.title}`,
        problemSummary: capa.problemStatement ?? capa.d2Description ?? "",
        rootCause: capa.d3InterimContainment ? `[봉쇄조치]\n${capa.d3InterimContainment}\n\n[근본원인]\n${rc}` : rc,
        prevention: "",
        sourceType: "capa",
        sourceId: capa.id,
        sourceNumber: capa.capaNumber,
      };
    }
  } else if (sp.ncId) {
    const [nc] = await db.select().from(internalNCs)
      .where(and(eq(internalNCs.id, sp.ncId), eq(internalNCs.orgId, session.user.organizationId)));
    if (nc) {
      prefill = {
        title: `Q-Alert: ${nc.title}`,
        problemSummary: nc.description ?? "",
        sourceType: "internal_nc",
        sourceId: nc.id,
        sourceNumber: nc.ncNumber,
      };
    }
  } else if (sp.pncId) {
    const [pnc] = await db.select().from(partNCs)
      .where(and(eq(partNCs.id, sp.pncId), eq(partNCs.orgId, session.user.organizationId)));
    if (pnc) {
      prefill = {
        title: `Q-Alert: ${pnc.title}`,
        problemSummary: pnc.description ?? "",
        sourceType: "part_nc",
        sourceId: pnc.id,
        sourceNumber: pnc.pncNumber,
      };
    }
  } else if (sp.complaintId) {
    const [cc] = await db.select().from(customerComplaints)
      .where(and(eq(customerComplaints.id, sp.complaintId), eq(customerComplaints.orgId, session.user.organizationId)));
    if (cc) {
      prefill = {
        title: `Q-Alert: ${cc.title}`,
        problemSummary: cc.customerDescription ?? "",
        sourceType: "customer_complaint",
        sourceId: cc.id,
        sourceNumber: cc.complaintNumber,
      };
    }
  }

  return <NewQAlertForm prefill={prefill} />;
}
