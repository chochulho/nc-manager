"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

interface Process { id: string; code: string; name: string; siteId: string | null }
interface Site { id: string; code: string; name: string }

export default function ProcessesPage() {
  const t = useTranslations("masters");
  const tp = useTranslations("masters.processes");
  const [items, setItems] = useState<Process[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  const [form, setForm] = useState({ code: "", name: "", siteId: "" });

  async function load() {
    const [pRes, sRes] = await Promise.all([
      fetch("/api/nc/masters/processes"),
      fetch("/api/nc/masters/sites"),
    ]);
    if (pRes.ok) setItems(await pRes.json());
    if (sRes.ok) setSites(await sRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", siteId: "" });
    setShowForm(true);
  }

  function openEdit(item: Process) {
    setEditing(item);
    setForm({ code: item.code, name: item.name, siteId: item.siteId ?? "" });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code || !form.name) { toast.error(t("requiredCodeAndName")); return; }
    const url = editing ? `/api/nc/masters/processes/${editing.id}` : "/api/nc/masters/processes";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { toast.error(t("saveFailed")); return; }
    toast.success(editing ? t("updated") : t("created"));
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/nc/masters/processes/${id}`, { method: "DELETE" });
    toast.success(t("deleted"));
    load();
  }

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]));

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/masters"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">{tp("pageTitle")}</h1>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("add")}</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
          <h2 className="section-title">{editing ? tp("editTitle") : tp("newTitle")}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{t("code")} *</Label>
              <Input className="mt-1" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder={tp("codePlaceholder")} />
            </div>
            <div>
              <Label>{t("name")} *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder={tp("namePlaceholder")} />
            </div>
            <div>
              <Label>{t("siteField")}</Label>
              <Select value={form.siteId} onValueChange={(v: string) => setForm(p => ({ ...p, siteId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t("optionalSelect")} /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm"><Check className="h-4 w-4 mr-1" />{t("save")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4 mr-1" />{t("cancel")}</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{tp("empty")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("code")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("name")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("siteField")}</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.siteId ? siteMap[item.siteId] ?? "-" : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
