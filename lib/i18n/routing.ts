import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});
