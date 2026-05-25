"use client";

import { useTranslations } from "next-intl";
import { Users, Crown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  orgRole: "ADMIN" | "MEMBER";
  createdAt: Date;
}

export function MembersClient({ initialMembers }: { initialMembers: Member[] }) {
  const t = useTranslations("settings");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("membersTitle")}</h1>
      </div>

      {/* Quality Hub 안내 배너 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">멤버 관리는 Quality Hub에서 하세요</p>
          <p className="text-xs text-blue-600 mt-0.5">초대, 역할 변경, 제거 등 모든 멤버 관리는 Quality Hub에서 이루어집니다.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
          onClick={() => window.open(process.env.NEXT_PUBLIC_QUALITY_HUB_URL ?? "https://quality-hub.vercel.app", "_blank")}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Quality Hub 열기
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{t("membersSection")} ({t("membersCount", { count: initialMembers.length })})</span>
        </div>
        <div className="divide-y">
          {initialMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {member.name?.[0]?.toUpperCase() ?? member.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{member.name ?? t("noName")}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {member.orgRole === "ADMIN" ? (
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" /> {t("roles.ADMIN")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{t("roles.MEMBER")}</Badge>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(member.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
