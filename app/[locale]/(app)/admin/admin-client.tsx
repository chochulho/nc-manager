"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, Building2, ExternalLink, Database, RefreshCw, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [seeding, setSeeding] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<Record<string, unknown> | null>(null);

  async function handleSeedCategories() {
    setSeeding(true);
    try {
      const res = await fetch("/api/nc/admin/seed-categories", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? "카테고리 시드 완료");
      } else {
        toast.error(data.error ?? "시드 실패");
      }
    } catch {
      toast.error("요청 실패");
    } finally {
      setSeeding(false);
    }
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim()) {
      toast.error("조직 이름을 입력하세요");
      return;
    }
    setCreatingOrg(true);
    try {
      const res = await fetch("/api/nc/admin/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? "조직 생성 완료 — 페이지를 새로고침 하세요");
        setNewOrgName("");
        // Refresh the page to show updated org list and re-run auth
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error ?? "조직 생성 실패");
      }
    } catch {
      toast.error("요청 실패");
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    try {
      const res = await fetch("/api/debug/session");
      const data = await res.json();
      setDiagResult(data);
    } catch (err) {
      toast.error("진단 실패: " + String(err));
    } finally {
      setDiagnosing(false);
    }
  }

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge className="bg-green-100 text-green-800">활성</Badge>;
    if (status === "suspended") return <Badge variant="destructive">정지</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">관리자</h1>
      </div>

      {/* 현재 세션 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">현재 세션</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">이메일</span>
          <span>{currentUser.email}</span>
          <span className="text-muted-foreground">현재 조직</span>
          <span>{currentUser.organizationName ?? <span className="text-red-500 font-semibold">없음 (페이지 접근 불가)</span>}</span>
          <span className="text-muted-foreground">조직 ID</span>
          <span className="font-mono text-xs truncate">{currentUser.organizationId ?? "—"}</span>
        </CardContent>
      </Card>

      {/* 세션 진단 */}
      <Card className={currentUser.organizationId ? "border-green-200" : "border-red-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            세션 진단
          </CardTitle>
          <CardDescription>
            조직 ID가 없으면 내부NC·클레임·CAPA 등 모든 페이지가 대시보드로 리다이렉트됩니다.
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
            세션 진단 실행
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
                Quality Hub 조직
              </CardTitle>
              <CardDescription>
                Supabase org_members 기반 — 멤버 관리는 Quality Hub에서
              </CardDescription>
            </div>
            <a
              href="https://quality-hub-pi.vercel.app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Quality Hub 열기
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {orgs.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ 조직 없음 — 아래에서 조직을 생성하면 모든 페이지를 사용할 수 있습니다.
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

          {/* 조직 생성 폼 */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground">새 조직 생성</p>
            <div className="flex gap-2">
              <Input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="조직 이름 (예: 테스트 제조사)"
                className="flex-1 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
              />
              <Button
                size="sm"
                onClick={handleCreateOrg}
                disabled={creatingOrg || !newOrgName.trim()}
                className="gap-1"
              >
                <Plus className={`h-3 w-3 ${creatingOrg ? "animate-spin" : ""}`} />
                생성
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              생성 후 현재 계정이 해당 조직의 owner로 자동 등록됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 시스템 데이터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            시스템 데이터
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">NC 분류체계 (카테고리)</p>
              <p className="text-xs text-muted-foreground">
                현재 {categoryCount}개 시스템 카테고리
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
              {categoryCount > 0 ? "이미 시드됨" : "카테고리 시드"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
