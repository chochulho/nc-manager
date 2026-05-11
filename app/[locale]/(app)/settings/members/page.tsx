import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.orgRole !== "ADMIN" && !session.user.isAdmin) redirect("/dashboard");
  if (!session.user.organizationId) redirect("/dashboard");

  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, orgRole: users.orgRole, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.organizationId, session.user.organizationId))
    .orderBy(users.createdAt);

  return <MembersClient initialMembers={members} />;
}
