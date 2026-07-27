"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Mail, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Notification {
  id: string;
  subject: string;
  body: string;
  recipientEmails: string[];
  sentAt: string;
  sentByUser: { id: string; name: string | null; email: string | null };
}

interface Props {
  entityType: "internal_nc" | "part_nc" | "customer_complaint";
  entityId: string;
}

export function NotificationSection({ entityType, entityId }: Props) {
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [form, setForm] = useState({ subject: "", body: "", recipientEmails: [] as string[] });

  async function load() {
    const res = await fetch(`/api/nc/notifications?entityType=${entityType}&entityId=${entityId}`);
    if (res.ok) setNotifications(await res.json());
  }

  useEffect(() => { load(); }, [entityType, entityId]);

  function addEmail() {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(tn("invalidEmail"));
      return;
    }
    if (form.recipientEmails.includes(trimmed)) {
      toast.error(tn("duplicateEmail"));
      return;
    }
    setForm((prev) => ({ ...prev, recipientEmails: [...prev.recipientEmails, trimmed] }));
    setEmailInput("");
  }

  function removeEmail(email: string) {
    setForm((prev) => ({ ...prev, recipientEmails: prev.recipientEmails.filter((e) => e !== email) }));
  }

  async function handleSend() {
    if (!form.subject.trim()) { toast.error(tn("requiredSubject")); return; }
    if (!form.body.trim()) { toast.error(tn("requiredBody")); return; }
    if (!form.recipientEmails.length) { toast.error(tn("requiredRecipient")); return; }

    setSending(true);
    try {
      const res = await fetch("/api/nc/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, ...form }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? tn("sendFailed"));
        return;
      }
      toast.success(tn("sendSuccess"));
      setOpen(false);
      setForm({ subject: "", body: "", recipientEmails: [] });
      setEmailInput("");
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Mail className="h-4 w-4 text-orange-500" />
          {tn("title")} ({notifications.length})
        </h2>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <Send className="h-3.5 w-3.5 mr-1" />
          {tn("send")}
        </Button>
      </div>

      {/* Send form */}
      {open && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
          <div>
            <Label className="text-xs">{tn("recipientEmail")}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                placeholder="example@company.com"
                className="flex-1 h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addEmail} className="h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {form.recipientEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.recipientEmails.map((email) => (
                  <span key={email} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs">
                    {email}
                    <button onClick={() => removeEmail(email)} className="text-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">{tn("subject")}</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder={tn("subjectPlaceholder")}
              className="mt-1 h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">{tn("body")}</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              rows={6}
              placeholder={tn("bodyPlaceholder")}
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button size="sm" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              {sending ? tn("sending") : tn("sendEmail")}
            </Button>
          </div>
        </div>
      )}

      {/* Send history */}
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="border border-gray-100 rounded-xl px-4 py-3 space-y-1 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{n.subject}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {new Date(n.sentAt).toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tn("recipient")}: {n.recipientEmails.join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {tn("sender")}: {n.sentByUser.name ?? n.sentByUser.email}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-2">{tn("empty") ?? ""}</p>
      )}
    </div>
  );
}
