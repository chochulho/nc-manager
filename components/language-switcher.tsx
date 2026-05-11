"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const localeFlags: Record<string, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
};

const localeNames: Record<string, string> = {
  ko: "한국어",
  en: "English",
};

interface Props {
  collapsed?: boolean;
}

export function LanguageSwitcher({ collapsed }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors",
            collapsed ? "justify-center h-9 w-9 mx-auto" : "gap-2 px-3 py-2 w-full"
          )}
        >
          <Globe className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="text-xs">{localeFlags[locale]} {localeNames[locale]}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-36">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleChange(loc)}
            className={locale === loc ? "font-semibold" : ""}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
