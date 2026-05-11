import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orgInvitations, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export default async function InvitePage({ params }: { params: Promise<{ token: string; locale: string }> }) {
  const { token } = await params;

  const [invite] = await db
    .select({
      id: orgInvitations.id,
      email: orgInvitations.email,
      status: orgInvitations.status,
      expiresAt: orgInvitations.expiresAt,
      orgName: organizations.name,
    })
    .from(orgInvitations)
    .innerJoin(organizations, eq(orgInvitations.organizationId, organizations.id))
    .where(and(eq(orgInvitations.token, token), eq(orgInvitations.status, "PENDING")))
    .limit(1);

  if (!invite || invite.expiresAt < new Date()) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">초대 링크 만료</h1>
        <p className="text-muted-foreground">유효하지 않거나 만료된 초대 링크입니다.</p>
      </div>
    );
  }

  redirect(`/register?token=${token}`);
}
