import { db } from "@/lib/db";
import type { AppSession } from "@/lib/auth";
import {
  internalNCs, customerComplaints, capas, qAlerts, lessonsLearned, ncSequences, ncActivities,
} from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";

export type EntityKind = "internal_nc" | "customer_complaint" | "capa" | "q_alert" | "lessons_learned";

/** 등록번호 변경/삭제 등 관리자 전용 작업을 수행할 권한이 있는지 확인한다. */
export function isRecordAdmin(session: AppSession): boolean {
  return session.user.orgRole === "ADMIN" || session.user.isAdmin;
}

const PREFIX: Record<EntityKind, string> = {
  internal_nc: "NC",
  customer_complaint: "CC",
  capa: "CAPA",
  q_alert: "QA",
  lessons_learned: "LL",
};

export function formatNumber(kind: EntityKind, year: number, seq: number): string {
  return `${PREFIX[kind]}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * 삭제하려는 레코드를 다른 엔티티가 참조하고 있는지 검사한다.
 * 반환된 배열이 비어있지 않으면 삭제를 차단해야 한다.
 */
export async function findBlockingLinks(kind: EntityKind, id: string, orgId: string): Promise<string[]> {
  const blockers: string[] = [];

  async function capaBlockerBySourceId(sourceType: "internal_nc" | "customer_complaint") {
    const rows = await db
      .select({ n: capas.capaNumber })
      .from(capas)
      .where(and(eq(capas.orgId, orgId), eq(capas.sourceType, sourceType), eq(capas.sourceId, id)));
    rows.forEach((r) => blockers.push(`연결된 CAPA(${r.n})가 있어 삭제할 수 없습니다`));
  }

  async function qAlertBlockers(sourceType: "internal_nc" | "customer_complaint" | "capa") {
    const rows = await db
      .select({ n: qAlerts.alertNumber })
      .from(qAlerts)
      .where(and(eq(qAlerts.orgId, orgId), eq(qAlerts.sourceType, sourceType), eq(qAlerts.sourceId, id)));
    rows.forEach((r) => blockers.push(`연결된 Q-Alert(${r.n})가 있어 삭제할 수 없습니다`));
  }

  async function capaNumberById(capaId: string | null) {
    if (!capaId) return null;
    const [row] = await db.select({ n: capas.capaNumber }).from(capas).where(and(eq(capas.id, capaId), eq(capas.orgId, orgId)));
    return row?.n ?? null;
  }

  if (kind === "internal_nc") {
    const [nc] = await db.select({ capaId: internalNCs.capaId }).from(internalNCs)
      .where(and(eq(internalNCs.id, id), eq(internalNCs.orgId, orgId)));
    const capaNumber = await capaNumberById(nc?.capaId ?? null);
    if (capaNumber) blockers.push(`연결된 CAPA(${capaNumber})가 있어 삭제할 수 없습니다`);
    await capaBlockerBySourceId("internal_nc");
    await qAlertBlockers("internal_nc");
    const llRows = await db.select({ n: lessonsLearned.llNumber }).from(lessonsLearned)
      .where(and(eq(lessonsLearned.orgId, orgId), eq(lessonsLearned.sourceInternalNcId, id)));
    llRows.forEach((r) => blockers.push(`연결된 레슨런(${r.n})이 있어 삭제할 수 없습니다`));
  }

  if (kind === "customer_complaint") {
    const [c] = await db.select({ capaId: customerComplaints.capaId }).from(customerComplaints)
      .where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, orgId)));
    const capaNumber = await capaNumberById(c?.capaId ?? null);
    if (capaNumber) blockers.push(`연결된 CAPA(${capaNumber})가 있어 삭제할 수 없습니다`);
    await capaBlockerBySourceId("customer_complaint");
    await qAlertBlockers("customer_complaint");
    const llRows = await db.select({ n: lessonsLearned.llNumber }).from(lessonsLearned)
      .where(and(eq(lessonsLearned.orgId, orgId), eq(lessonsLearned.sourceComplaintId, id)));
    llRows.forEach((r) => blockers.push(`연결된 레슨런(${r.n})이 있어 삭제할 수 없습니다`));
  }

  if (kind === "capa") {
    const [nc] = await db.select({ n: internalNCs.ncNumber }).from(internalNCs)
      .where(and(eq(internalNCs.orgId, orgId), eq(internalNCs.capaId, id)));
    if (nc) blockers.push(`연결된 내부 부적합(${nc.n})이 있어 삭제할 수 없습니다`);
    const [cc] = await db.select({ n: customerComplaints.complaintNumber }).from(customerComplaints)
      .where(and(eq(customerComplaints.orgId, orgId), eq(customerComplaints.capaId, id)));
    if (cc) blockers.push(`연결된 고객 클레임(${cc.n})이 있어 삭제할 수 없습니다`);
    await qAlertBlockers("capa");
  }

  // q_alert, lessons_learned: 이 두 엔티티를 참조하는 다른 엔티티가 없어 항상 삭제 가능

  return blockers;
}

/**
 * 등록번호를 변경한다. 유일성 검사 → 번호 컬럼 갱신 → qAlerts.sourceNumber 동기화 →
 * ncSequences 보정(향후 자동 채번과 충돌 방지) 순으로 처리한다.
 */
export async function renumberEntity(
  kind: EntityKind,
  id: string,
  orgId: string,
  year: number,
  seq: number
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const newNumber = formatNumber(kind, year, seq);

  async function isDuplicate(): Promise<boolean> {
    switch (kind) {
      case "internal_nc": {
        const rows = await db.select({ id: internalNCs.id }).from(internalNCs)
          .where(and(eq(internalNCs.orgId, orgId), eq(internalNCs.ncNumber, newNumber), ne(internalNCs.id, id)));
        return rows.length > 0;
      }
      case "customer_complaint": {
        const rows = await db.select({ id: customerComplaints.id }).from(customerComplaints)
          .where(and(eq(customerComplaints.orgId, orgId), eq(customerComplaints.complaintNumber, newNumber), ne(customerComplaints.id, id)));
        return rows.length > 0;
      }
      case "capa": {
        const rows = await db.select({ id: capas.id }).from(capas)
          .where(and(eq(capas.orgId, orgId), eq(capas.capaNumber, newNumber), ne(capas.id, id)));
        return rows.length > 0;
      }
      case "q_alert": {
        const rows = await db.select({ id: qAlerts.id }).from(qAlerts)
          .where(and(eq(qAlerts.orgId, orgId), eq(qAlerts.alertNumber, newNumber), ne(qAlerts.id, id)));
        return rows.length > 0;
      }
      case "lessons_learned": {
        const rows = await db.select({ id: lessonsLearned.id }).from(lessonsLearned)
          .where(and(eq(lessonsLearned.orgId, orgId), eq(lessonsLearned.llNumber, newNumber), ne(lessonsLearned.id, id)));
        return rows.length > 0;
      }
    }
  }

  if (await isDuplicate()) {
    return { ok: false, error: "이미 사용 중인 번호입니다" };
  }

  switch (kind) {
    case "internal_nc":
      await db.update(internalNCs).set({ ncNumber: newNumber }).where(and(eq(internalNCs.id, id), eq(internalNCs.orgId, orgId)));
      break;
    case "customer_complaint":
      await db.update(customerComplaints).set({ complaintNumber: newNumber }).where(and(eq(customerComplaints.id, id), eq(customerComplaints.orgId, orgId)));
      break;
    case "capa":
      await db.update(capas).set({ capaNumber: newNumber }).where(and(eq(capas.id, id), eq(capas.orgId, orgId)));
      break;
    case "q_alert":
      await db.update(qAlerts).set({ alertNumber: newNumber }).where(and(eq(qAlerts.id, id), eq(qAlerts.orgId, orgId)));
      break;
    case "lessons_learned":
      await db.update(lessonsLearned).set({ llNumber: newNumber }).where(and(eq(lessonsLearned.id, id), eq(lessonsLearned.orgId, orgId)));
      break;
  }

  if (kind === "internal_nc" || kind === "customer_complaint" || kind === "capa") {
    await db.update(qAlerts).set({ sourceNumber: newNumber })
      .where(and(eq(qAlerts.orgId, orgId), eq(qAlerts.sourceType, kind), eq(qAlerts.sourceId, id)));
  }

  await db
    .insert(ncSequences)
    .values({ orgId, entityType: kind, year, lastSeq: seq })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`GREATEST(${ncSequences.lastSeq}, ${seq})` },
    });

  return { ok: true, number: newNumber };
}

export async function logAdminAction(
  orgId: string,
  kind: EntityKind,
  entityId: string,
  userId: string,
  action: "deleted" | "renumbered",
  payload: unknown
): Promise<void> {
  await db.insert(ncActivities).values({ orgId, entityType: kind, entityId, userId, action, payload: payload as object });
}
