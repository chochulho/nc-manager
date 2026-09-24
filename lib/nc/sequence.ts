import { db } from "@/lib/db";
import { ncSequences } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function nextComplaintNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .insert(ncSequences)
    .values({ orgId, entityType: "customer_complaint", year, lastSeq: 1 })
    .onConflictDoUpdate({
      target: [ncSequences.orgId, ncSequences.entityType, ncSequences.year],
      set: { lastSeq: sql`${ncSequences.lastSeq} + 1` },
    })
    .returning({ lastSeq: ncSequences.lastSeq });

  const seq = result[0].lastSeq;
  return `CC-${year}-${String(seq).padStart(4, "0")}`;
}
