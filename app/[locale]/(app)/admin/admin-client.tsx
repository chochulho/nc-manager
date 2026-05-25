"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, Building2, ExternalLink, Database, RefreshCw } from "lucide-react";
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
  const [seeding, setSeeding] = useState(false);

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
          <span>{currentUser.organizationName ?? "—"}</span>
          <span className="text-muted-foreground">조직 ID</span>
          <span className="font-mono text-xs truncate">{currentUser.organizationId ?? "—"}</span>
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
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">조직 없음</p>
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
