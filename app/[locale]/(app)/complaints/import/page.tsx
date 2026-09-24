import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ncSites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSelectedSiteId } from "@/lib/site-filter";
import { ImportComplaintClient } from "./import-complaint-client";

export default async function ImportComplaintPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;

  const [sites, defaultSiteId] = await Promise.all([
    db.select({ id: ncSites.id, name: ncSites.name, code: ncSites.code })
      .from(ncSites)
      .where(and(eq(ncSites.orgId, orgId), eq(ncSites.isActive, true))),
    getSelectedSiteId(),
  ]);

  return <ImportComplaintClient sites={sites} defaultSiteId={defaultSiteId} />;
}
