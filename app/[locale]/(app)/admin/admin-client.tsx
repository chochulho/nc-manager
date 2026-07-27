"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Shield, Building2, ExternalLink, Database, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Org {
  id: string;
  name: string;
  status: string;
  plan_id: string;
  created_at: string;
}

interface Props {
  orgs: Org[];
  categoryCount: number;
  currentUser: {
    id: string;
    email: string;
    name: string | null;
    organizationId: string | null;
    organizationName: string | null;
  };
}

export default function AdminClient({ orgs, categoryCount, currentUser }: Props) {
  const t = useTranslations("admin");
  const [seeding, setSeeding] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<Record<string, unknown> | null>(null);

  async function handleSeedCategories() {
    setSeeding(true);
    try {
      const res = await fetch("/api/nc/admin/seed-categories", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? t("seedSuccess"));
      } else {
        toast.error(data.error ?? t("seedFailed"));
      }
    } catch {
      toast.error(t("requestFailed"));
    } finally {
      setSeeding(false);
    }
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    try {
      const res = await fetch("/api/debug/session");
      const data = await res.json();
      setDiagResult(data);
    } catch (err) {
      toast.error(t("diagFailed") + String(err));
    } finally {
      setDiagnosing(false);
    }
  }

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge className="bg-green-100 text-green-800">{t("active")}</Badge>;
    if (status === "suspended") return <Badge variant="destructive">{t("suspended")}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* 현재 세션 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("currentSession")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">{t("email")}</span>
          <span>{currentUser.email}</span>
          <span className="text-muted-foreground">{t("currentOrg")}</span>
          <span>{currentUser.organizationName ?? <span className="text-red-500 font-semibold">{t("noOrg")}</span>}</span>
          <span className="text-muted-foreground">{t("orgId")}</span>
          <span className="font-mono text-xs truncate">{currentUser.organizationId ?? "—"}</span>
        </CardContent>
      </Card>

      {/* 세션 진단 */}
      <Card className={currentUser.organizationId ? "border-green-200" : "border-red-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            {t("sessionDiag")}
          </CardTitle>
          <CardDescription>
            {t("sessionDiagDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiagnose}
            disabled={diagnosing}
            className="gap-1"
          >
            <Search className={`h-3 w-3 ${diagnosing ? "animate-spin" : ""}`} />
            {t("runDiag")}
          </Button>

          {diagResult && (
            <div className="rounded-lg bg-slate-50 border p-3 space-y-1 text-xs font-mono overflow-auto max-h-64">
              {Object.entries(diagResult).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-500 min-w-[160px]">{k}:</span>
                  <span className={
                    k === "diagnosis" && String(v).startsWith("OK")
                      ? "text-green-700 font-bold"
                      : k === "diagnosis"
                      ? "text-red-700 font-bold"
                      : "text-slate-800"
                  }>
                    {typeof v === "object" ? JSON.stringify(v) : String(v ?? "null")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Hub 조직 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("qualityHubOrgs")}
              </CardTitle>
              <CardDescription>
                {t("qualityHubOrgsDesc")}
              </CardDescription>
            </div>
            <a
              href="https://qmintel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                {t("openQualityHub")}
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {orgs.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t("noOrgsWarning")}
            </p>
          ) : (
            <div className="divide-y">
              {orgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">{org.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{org.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{org.plan_id}</Badge>
                    {statusBadge(org.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 시스템 데이터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t("systemData")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("ncCategories")}</p>
              <p className="text-xs text-muted-foreground">
                {t("categoryCount", { count: categoryCount })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedCategories}
              disabled={seeding || categoryCount > 0}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${seeding ? "animate-spin" : ""}`} />
              {categoryCount > 0 ? t("alreadySeeded") : t("seedCategories")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
