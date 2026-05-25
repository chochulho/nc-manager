"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

interface Customer {
  id: string; code: string; name: string;
  initialResponseSlaHours: number; containmentSlaHours: number; finalReportSlaDays: number;
}

const defaultForm = { code: "", name: "", initialResponseSlaHours: "24", containmentSlaHours: "48", finalReportSlaDays: "15" };

export default function CustomersPage() {
  const t = useTranslations("masters");
  const tc = useTranslations("masters.customers");
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(defaultForm);

  async function load() {
    const res = await fetch("/api/nc/masters/customers");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  }

  function openEdit(item: Customer) {
    setEditing(item);
    setForm({
      code: item.code, name: item.name,
      initialResponseSlaHours: String(item.initialResponseSlaHours),
      containmentSlaHours: String(item.containmentSlaHours),
      finalReportSlaDays: String(item.finalReportSlaDays),
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code || !form.name) { toast.error(tc("requiredFields")); return; }
    const body = {
      code: form.code, name: form.name,
      initialResponseSlaHours: Number(form.initialResponseSlaHours),
      containmentSlaHours: Number(form.containmentSlaHours),
      finalReportSlaDays: Number(form.finalReportSlaDays),
    };
    const url = editing ? `/api/nc/masters/customers/${editing.id}` : "/api/nc/masters/customers";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { toast.error(t("saveFailed")); return; }
    toast.success(editing ? t("updated") : t("created"));
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/nc/masters/customers/${id}`, { method: "DELETE" });
    toast.success(t("deleted"));
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/masters"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">{tc("pageTitle")}</h1>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />{t("add")}</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
          <h2 className="section-title">{editing ? tc("editTitle") : tc("newTitle")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("code")} *</Label>
              <Input className="mt-1" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="CUST-001" />
            </div>
            <div>
              <Label>{t("name")} *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder={tc("namePlaceholder")} />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">{tc("slaSection")}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{tc("initialResponse")}</Label>
                <Input type="number" className="mt-1" value={form.initialResponseSlaHours} onChange={(e) => setForm(p => ({ ...p, initialResponseSlaHours: e.target.value }))} />
              </div>
              <div>
                <Label>{tc("containment")}</Label>
                <Input type="number" className="mt-1" value={form.containmentSlaHours} onChange={(e) => setForm(p => ({ ...p, containmentSlaHours: e.target.value }))} />
              </div>
              <div>
                <Label>{tc("finalReport")}</Label>
                <Input type="number" className="mt-1" value={form.finalReportSlaDays} onChange={(e) => setForm(p => ({ ...p, finalReportSlaDays: e.target.value }))} />
              </div>
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
          <div className="p-8 text-center text-muted-foreground">{tc("empty")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("code")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("name")}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{tc("colInitialResponse")}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{tc("colContainment")}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{tc("colFinalReport")}</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.initialResponseSlaHours}h</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.containmentSlaHours}h</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.finalReportSlaDays}d</td>
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
