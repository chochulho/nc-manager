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
import { ReportTemplateBlocksEditor } from "@/components/nc/report-template-blocks-editor";
import type { ReportTemplateBlock } from "@/lib/db/schema";

interface Template {
  id: string; name: string; customerId: string | null; isDefault: boolean;
  accentColor: string; blocks: ReportTemplateBlock[];
}
interface Customer { id: string; code: string; name: string }

const DEFAULT_BLOCKS: ReportTemplateBlock[] = [
  { key: "problem", type: "text", label: "문제 현상 및 조사 내용" },
  { key: "cause", type: "text", label: "원인 분석" },
  { key: "conclusion", type: "text", label: "결론 및 종합" },
];

const emptyForm = { name: "", customerId: "", isDefault: false, accentColor: "1E40AF", blocks: DEFAULT_BLOCKS };

export default function ReportTemplatesPage() {
  const t = useTranslations("masters");
  const tt = useTranslations("masters.reportTemplates");
  const [items, setItems] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/nc/masters/report-templates"),
      fetch("/api/nc/masters/customers"),
    ]);
    if (tRes.ok) setItems(await tRes.json());
    if (cRes.ok) setCustomers(await cRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: Template) {
    setEditing(item);
    setForm({
      name: item.name, customerId: item.customerId ?? "", isDefault: item.isDefault,
      accentColor: item.accentColor, blocks: item.blocks,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.blocks.length) { toast.error(tt("requiredFields")); return; }
    const url = editing ? `/api/nc/masters/report-templates/${editing.id}` : "/api/nc/masters/report-templates";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { toast.error(t("saveFailed")); return; }
    toast.success(editing ? t("updated") : t("created"));
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/nc/masters/report-templates/${id}`, { method: "DELETE" });
    toast.success(t("deleted"));
    load();
  }

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/masters"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">{tt("pageTitle")}</h1>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("add")}</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
          <h2 className="section-title">{editing ? tt("editTitle") : tt("newTitle")}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{tt("name")} *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={tt("namePlaceholder")} />
            </div>
            <div>
              <Label>{t("customerField")}</Label>
              <Select value={form.customerId} onValueChange={(v: string) => setForm((p) => ({ ...p, customerId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={tt("commonTemplate")} /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{tt("accentColor")}</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-8 w-8 rounded border border-gray-200 shrink-0" style={{ backgroundColor: `#${form.accentColor}` }} />
                <Input
                  value={form.accentColor}
                  onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6) }))}
                  placeholder="1E40AF"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 rounded" />
            <span className="text-sm font-medium">{tt("isDefault")}</span>
          </label>

          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{tt("blocksSection")}</p>
            <ReportTemplateBlocksEditor blocks={form.blocks} onChange={(blocks) => setForm((p) => ({ ...p, blocks }))} />
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
          <div className="p-8 text-center text-muted-foreground">{tt("empty")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tt("name")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("customerField")}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{tt("isDefault")}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{tt("blockCount")}</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.customerId ? customerMap[item.customerId] ?? "-" : tt("commonTemplate")}</td>
                  <td className="px-4 py-3 text-center">{item.isDefault ? "✓" : ""}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.blocks.length}</td>
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
