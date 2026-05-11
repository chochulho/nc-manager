"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, AlertTriangle, MessageSquareWarning, ClipboardCheck,
  Database, Users, Shield, LogOut, ChevronDown,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { LanguageSwitcher } from "@/components/language-switcher";

const STORAGE_KEY = "nc-sidebar-collapsed";

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();
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

  const isAdmin = session?.user?.isAdmin ?? false;
  const isOrgAdmin = session?.user?.orgRole === "ADMIN" || isAdmin;

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/internal-nc", label: t("internalNc"), icon: AlertTriangle },
    { href: "/complaints", label: t("complaints"), icon: MessageSquareWarning },
    { href: "/capa", label: t("capa"), icon: ClipboardCheck },
    { href: "/masters", label: t("masters"), icon: Database },
    ...(isOrgAdmin ? [{ href: "/settings/members", label: t("orgMembers"), icon: Users }] : []),
    ...(isAdmin ? [{ href: "/admin", label: t("admin"), icon: Shield }] : []),
  ];

  const userInitials = session?.user?.name
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
              {session?.user?.organizationName && (
                <span className="text-[10px] text-muted-foreground truncate">{session.user.organizationName}</span>
              )}
            </div>
          )}
          <button
            onClick={toggle}
            className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors shrink-0"
            aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

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

        {/* Language Switcher */}
        <div className={cn("border-t py-2", isCollapsed ? "px-1.5" : "px-3")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div><LanguageSwitcher collapsed /></div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">언어 변경</TooltipContent>
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
                        <AvatarImage src={session?.user?.image ?? undefined} />
                        <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-medium">{session?.user?.name}</p>
                    <p className="text-muted-foreground">{session?.user?.email}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={session?.user?.image ?? undefined} />
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate text-xs">{session?.user?.name ?? t("user")}</p>
                    <p className="text-muted-foreground truncate text-xs">{session?.user?.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
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
