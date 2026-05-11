import Link from "next/link";
import { Database, MapPin, Users, Package, Wrench, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export default async function MastersPage() {
  const t = await getTranslations("masters");

  const masterLinks = [
    { href: "/masters/customers", label: t("customers.label"), icon: Users, desc: t("customers.desc") },
    { href: "/masters/suppliers", label: t("suppliers.label"), icon: Package, desc: t("suppliers.desc") },
    { href: "/masters/parts", label: t("parts.label"), icon: Wrench, desc: t("parts.desc") },
    { href: "/masters/sites", label: t("sites.label"), icon: MapPin, desc: t("sites.desc") },
    { href: "/masters/processes", label: t("processes.label"), icon: Database, desc: t("processes.desc") },
    { href: "/masters/categories", label: t("categories.label"), icon: Tag, desc: t("categories.desc") },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("title")}</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {masterLinks.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2 flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
