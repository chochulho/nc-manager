"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Users, Crown, MapPin, CheckSquare, Square, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  orgRole: "ADMIN" | "MEMBER";
  createdAt: Date;
}

interface Site {
  id: string;
  code: string;
  name: string;
}

interface Props {
  initialMembers: Member[];
  sites: Site[];
  userSiteMap: Record<string, string[]>;
}

export function MembersClient({ initialMembers, sites, userSiteMap }: Props) {
  const t = useTranslations("settings");
  // 사용자-사이트 접근 권한 상태 (로컬 낙관적 업데이트용)
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>(userSiteMap);
  const [pending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null); // "userId:siteId"

  async function toggleSiteAccess(userId: string, siteId: string, currentlyAllowed: boolean) {
    const key = `${userId}:${siteId}`;
    setLoadingKey(key);

    // 낙관적 업데이트
    setAccessMap((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: currentlyAllowed
          ? current.filter((id) => id !== siteId)
          : [...current, siteId],
      };
    });

    try {
      const method = currentlyAllowed ? "DELETE" : "POST";
      const res = await fetch("/api/nc/settings/user-sites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, siteId }),
      });

      if (!res.ok) {
        // 실패 시 롤백
        setAccessMap((prev) => {
          const current = prev[userId] ?? [];
          return {
            ...prev,
            [userId]: currentlyAllowed
              ? [...current, siteId]
              : current.filter((id) => id !== siteId),
          };
        });
        toast.error(t("accessChangeFailed"));
      } else {
        toast.success(currentlyAllowed ? t("accessRemoved") : t("accessAdded"));
      }
    } catch {
      // 네트워크 오류 시 롤백
      setAccessMap((prev) => {
        const current = prev[userId] ?? [];
        return {
          ...prev,
          [userId]: currentlyAllowed
            ? [...current, siteId]
            : current.filter((id) => id !== siteId),
        };
      });
      toast.error(t("requestFailed"));
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("membersTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("membersDesc")}
        </p>
      </div>

      {sites.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">{t("noSites")}</p>
          </div>
          <p className="text-xs text-amber-600 mt-0.5 ml-6">
            {t("noSitesHint")}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            {t("membersSection")} ({t("membersCount", { count: initialMembers.length })})
          </span>
          {sites.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {t("siteAccess")}
            </span>
          )}
        </div>

        <div className="divide-y">
          {initialMembers.map((member) => {
            const isAdmin = member.orgRole === "ADMIN";
            const allowedSites = accessMap[member.id] ?? [];

            return (
              <div key={member.id} className="px-5 py-4">
                {/* 멤버 정보 */}
                <div className="flex items-center justify-between mb-3">
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
                    {isAdmin ? (
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" /> {t("roles.ADMIN")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("roles.MEMBER")}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(member.createdAt)}</span>
                  </div>
                </div>

                {/* 사업장 접근 권한 */}
                {sites.length > 0 && (
                  <div className="ml-11">
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-green-500" />
                        <span>{t("adminFullAccess")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sites.map((site) => {
                          const allowed = allowedSites.includes(site.id);
                          const key = `${member.id}:${site.id}`;
                          const isLoading = loadingKey === key;

                          return (
                            <button
                              key={site.id}
                              onClick={() => toggleSiteAccess(member.id, site.id, allowed)}
                              disabled={isLoading}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                allowed
                                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                              }`}
                            >
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : allowed ? (
                                <CheckSquare className="h-3 w-3" />
                              ) : (
                                <Square className="h-3 w-3" />
                              )}
                              {site.code} {site.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
