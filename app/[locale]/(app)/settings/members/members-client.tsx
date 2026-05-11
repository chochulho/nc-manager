"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Users, Mail, Trash2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  orgRole: string;
  createdAt: Date;
}

export function MembersClient({ initialMembers }: { initialMembers: Member[] }) {
  const t = useTranslations("settings");
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/nc/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("toastInviteFailed"));
        return;
      }
      if (data.pending) {
        toast.success(t("toastInviteSent", { email: inviteEmail }));
      } else {
        toast.success(t("toastMemberAdded"));
        setMembers((prev) => [...prev, data]);
      }
      setInviteEmail("");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm(t("confirmRemove"))) return;
    const res = await fetch(`/api/nc/org/members/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success(t("toastMemberRemoved"));
    } else {
      toast.error(t("toastRemoveFailed"));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("membersTitle")}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="section-title mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" /> {t("inviteSection")}
        </h2>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder={t("inviteEmail")}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? t("inviting") : t("inviteButtonLabel")}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{t("membersSection")} ({t("membersCount", { count: members.length })})</span>
        </div>
        <div className="divide-y">
          {members.map((member) => (
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
                {member.orgRole !== "ADMIN" && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
