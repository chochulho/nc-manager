import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/login", "/register", "/invite"];

export default auth(async function middleware(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl;

  // NextAuth 내부 경로: 항상 통과
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  // API 경로: auth 체크만 (intl 처리 불필요)
  if (pathname.startsWith("/api/")) {
    if (!req.auth && !publicPaths.some((p) => pathname.includes(p))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 공개 경로: intl 처리 후 통과
  const isPublic = publicPaths.some((p) => pathname.includes(p));
  if (isPublic) return intlMiddleware(req as any);

  // 앱 경로: 미인증 시 로그인으로
  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(req as any);
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
