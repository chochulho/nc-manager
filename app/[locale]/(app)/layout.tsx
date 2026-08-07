import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ncSites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // NC Manager 제품 사용권한 없는 멤버 차단 (qmintel 멤버×제품 매트릭스 기준).
  // 공유 Supabase 세션이라 signOut 금지(quality-hub까지 로그아웃됨) — 안내 화면만 표시.
  if (!session.user.entitled) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-lg font-semibold text-foreground">접근 권한이 없습니다</h1>
          <p className="text-sm text-muted-foreground">
            NC Manager 사용 권한이 없습니다. 조직 관리자에게 제품 접근 권한을 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  const orgId = session.user.organizationId;

  // 사업장 목록 + 현재 선택된 사업장 쿠키 병렬 조회
  const [allSites, cookieStore] = await Promise.all([
    orgId
      ? db
          .select({ id: ncSites.id, code: ncSites.code, name: ncSites.name })
          .from(ncSites)
          .where(and(eq(ncSites.orgId, orgId), eq(ncSites.isActive, true)))
          .orderBy(ncSites.code)
      : Promise.resolve([]),
    cookies(),
  ]);

  // 비관리자는 본인 허용 사업장만 스위처에 표시
  const accessibleSites = session.user.allowedSiteIds === null
    ? allSites
    : allSites.filter((s) => session.user.allowedSiteIds!.includes(s.id));

  const cookieSiteId = cookieStore.get("nc-selected-site")?.value ?? null;
  // 쿠키에 저장된 사업장이 접근 가능한 목록에 없으면 무시
  const currentSiteId = cookieSiteId && accessibleSites.some((s) => s.id === cookieSiteId)
    ? cookieSiteId
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar session={session} sites={accessibleSites} currentSiteId={currentSiteId} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
