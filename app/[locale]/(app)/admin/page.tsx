import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { ncCategoriesL2 } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  // Supabase 조직 목록
  const adminClient = createSupabaseAdminClient();
  const { data: orgs } = await adminClient
    .from("organizations")
    .select("id, name, status, plan_id, created_at")
    .order("created_at", { ascending: false });

  // 카테고리 시드 현황
  const [catCount] = await db.select({ c: count() }).from(ncCategoriesL2);

  return (
    <AdminClient
      orgs={orgs ?? []}
      categoryCount={catCount.c}
      currentUser={session.user}
    />
  );
}
