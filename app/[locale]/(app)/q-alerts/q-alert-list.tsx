"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Plus, CheckCircle2, Clock, Archive, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface QAlertItem {
  id: string;
  alertNumber: string;
  title: string;
  status: string;
  sourceType: string | null;
  sourceNumber: string | null;
  targetProcess: string | null;
  postedAt: Date | null;
  expiresAt: Date | null;
  trainedAt: Date | null;
  createdByName: string | null;
  createdAt: Date;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  draft:    { label: "초안",   className: "bg-gray-100 text-gray-600",    icon: <FileText className="h-3 w-3" /> },
  reviewed: { label: "검토완료", className: "bg-blue-50 text-blue-700",   icon: <Eye className="h-3 w-3" /> },
  posted:   { label: "게시중",  className: "bg-green-50 text-green-700",  icon: <CheckCircle2 className="h-3 w-3" /> },
  archived: { label: "보관",   className: "bg-amber-50 text-amber-700",   icon: <Archive className="h-3 w-3" /> },
};

const SOURCE_LABELS: Record<string, string> = {
  capa: "CAPA",
  internal_nc: "내부 부적합",
  customer_complaint: "고객 클레임",
  standalone: "독립",
};

const STATUS_TABS = [
  { value: "all", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "reviewed", label: "검토완료" },
  { value: "posted", label: "게시중" },
  { value: "archived", label: "보관" },
] as const;

export function QAlertList({ items }: { items: QAlertItem[] }) {
  const [activeTab, setActiveTab] = useState<string>("all");

  const filtered = activeTab === "all" ? items : items.filter((a) => a.status === activeTab);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Bell className="h-6 w-6 text-orange-500" />
          Q-Alert
        </h1>
        <Link href="/q-alerts/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            신규 등록
          </Button>
        </Link>
      </div>

      {/* 상태 탭 필터 */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map(({ value, label }) => {
          const count = value === "all" ? items.length : items.filter((a) => a.status === value).length;
          return (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">등록된 Q-Alert가 없습니다.</p>
            <Link href="/q-alerts/new">
              <Button variant="outline" className="mt-4">첫 Q-Alert 등록하기</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b text-xs text-muted-foreground">
              <span className="font-semibold text-gray-700">총 {filtered.length}건</span>
            </div>
            <ul className="divide-y">
              {filtered.map((alert) => {
                const cfg = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.draft;
                const isExpired = alert.expiresAt && new Date() > alert.expiresAt && alert.status === "posted";

                return (
                  <li key={alert.id} className="group hover:bg-gray-50/70 transition-colors">
                    <Link href={`/q-alerts/${alert.id}`} className="block px-4 py-3">
                      {/* 1행 */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-orange-600 shrink-0 w-28 group-hover:underline">
                          {alert.alertNumber}
                        </span>
                        <span className="font-medium text-sm flex-1 truncate">{alert.title}</span>
                        <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {isExpired && (
                          <span className="shrink-0 flex items-center gap-1 text-xs text-red-600 font-semibold">
                            <Clock className="h-3 w-3" /> 만료
                          </span>
                        )}
                      </div>

                      {/* 2행 */}
                      <div className="flex items-center gap-3 mt-1 ml-[7.5rem] flex-wrap">
                        {alert.sourceType && alert.sourceNumber && (
                          <span className="text-xs text-blue-600 font-medium">
                            {SOURCE_LABELS[alert.sourceType] ?? alert.sourceType}: {alert.sourceNumber}
                          </span>
                        )}
                        {alert.targetProcess && (
                          <span className="text-xs text-muted-foreground">대상: {alert.targetProcess}</span>
                        )}
                        {alert.postedAt && (
                          <span className="text-xs text-muted-foreground">게시: {formatDate(alert.postedAt)}</span>
                        )}
                        {alert.expiresAt && (
                          <span className="text-xs text-muted-foreground">만료: {formatDate(alert.expiresAt)}</span>
                        )}
                        {alert.trainedAt ? (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> 교육완료 {formatDate(alert.trainedAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">교육 미완료</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{formatDate(alert.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
