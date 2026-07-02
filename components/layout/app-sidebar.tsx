"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/lib/i18n/navigation";
import {
  LayoutDashboard, AlertTriangle, MessageSquareWarning, ClipboardCheck,
  Database, Users, Shield, LogOut, ChevronDown,
  PanelLeftClose, PanelLeftOpen, MapPin, Lightbulb, ExternalLink, Bell, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppSession } from "@/lib/auth";

const STORAGE_KEY = "nc-sidebar-collapsed";

interface SiteItem {
  id: string;
  code: string;
  name: string;
}

interface AppSidebarProps {
  session: AppSession;
  sites?: SiteItem[];
  currentSiteId?: string | null;
}

export function AppSidebar({ session, sites = [], currentSiteId = null }: AppSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isAdmin = session.user.isAdmin === true;
  const isOrgAdmin = session.user.orgRole === "ADMIN" || isAdmin;

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/internal-nc", label: t("internalNc"), icon: AlertTriangle },
    { href: "/complaints", label: t("complaints"), icon: MessageSquareWarning },
    { href: "/field-analysis", label: t("fieldAnalysis"), icon: MapPin },
    { href: "/capa", label: t("capa"), icon: ClipboardCheck },
    { href: "/q-alerts", label: t("qAlerts"), icon: Bell },
    { href: "/lessons-learned", label: t("lessonsLearned"), icon: Lightbulb },
    { href: "/masters", label: t("masters"), icon: Database },
    ...(isOrgAdmin ? [{ href: "/settings/members", label: t("orgMembers"), icon: Users }] : []),
    ...(isAdmin ? [{ href: "/admin", label: t("admin"), icon: Shield }] : []),
  ];

  const userInitials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const isCollapsed = mounted && collapsed;

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "flex flex-col min-h-screen border-r bg-sidebar shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden",
          isCollapsed ? "w-14" : "w-60"
        )}
      >
        {/* Logo + 토글 */}
        <div className={cn("flex items-center h-14 border-b shrink-0", isCollapsed ? "justify-center px-0" : "px-4 gap-2")}>
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">NC</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-semibold text-sm truncate text-sidebar-foreground">NC Manager</span>
              {session.user.organizationName && (
                <span className="text-[10px] text-muted-foreground truncate">{session.user.organizationName}</span>
              )}
            </div>
          )}
          <button
            onClick={toggle}
            className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors shrink-0"
            aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* 사업장 스위처 — 2개 이상일 때만 표시 */}
        {sites.length > 1 && (
          <div className={cn("border-b", isCollapsed ? "px-1.5 py-2" : "px-3 py-2")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex justify-center w-full h-9 w-9 mx-auto items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors relative">
                    <Building2 className="h-4 w-4" />
                    {currentSiteId && (
                      <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {currentSiteId
                    ? (sites.find((s) => s.id === currentSiteId)?.name ?? "사업장 선택됨")
                    : "전체 사업장"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-sidebar-accent transition-colors text-left">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">
                      {currentSiteId
                        ? `${sites.find((s) => s.id === currentSiteId)?.code ?? ""} ${sites.find((s) => s.id === currentSiteId)?.name ?? ""}`
                        : "전체 사업장"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      document.cookie = "nc-selected-site=; path=/; max-age=0";
                      router.refresh();
                    }}
                    className={cn("text-xs cursor-pointer", !currentSiteId && "font-semibold text-primary")}
                  >
                    전체 사업장
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {sites.map((site) => (
                    <DropdownMenuItem
                      key={site.id}
                      onClick={() => {
                        document.cookie = `nc-selected-site=${site.id}; path=/; max-age=86400`;
                        router.refresh();
                      }}
                      className={cn("text-xs cursor-pointer", currentSiteId === site.id && "font-semibold text-primary")}
                    >
                      <span className="font-mono mr-1.5 text-muted-foreground">{site.code}</span>
                      {site.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className={cn("flex-1 py-4 space-y-1", isCollapsed ? "px-1.5" : "px-3")}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const item = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center h-9 w-9 mx-auto" : "gap-3 px-3 py-2",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && label}
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={href}>
                <TooltipTrigger asChild><div>{item}</div></TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
              </Tooltip>
            ) : item;
          })}
        </nav>

        {/* QMintel 홈 링크 */}
        <div className={cn("border-t py-2", isCollapsed ? "px-1.5" : "px-3")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://qmintel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-center h-9 w-9 mx-auto items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">QMintel 홈으로</TooltipContent>
            </Tooltip>
          ) : (
            <a
              href="https://qmintel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>QMintel 홈으로</span>
            </a>
          )}
        </div>

        {/* Language Switcher */}
        <div className={cn("border-t py-2", isCollapsed ? "px-1.5" : "px-3")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div><LanguageSwitcher collapsed /></div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{t("changeLanguage")}</TooltipContent>
            </Tooltip>
          ) : (
            <LanguageSwitcher />
          )}
        </div>

        {/* User */}
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex justify-center w-full rounded-md p-1.5 hover:bg-sidebar-accent transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={session.user.image ?? undefined} />
                        <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-medium">{session.user.name}</p>
                    <p className="text-muted-foreground">{session.user.email}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate text-xs">{session.user.name ?? t("user")}</p>
                    <p className="text-muted-foreground truncate text-xs">{session.user.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
