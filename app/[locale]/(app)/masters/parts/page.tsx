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

interface Part { id: string; partNumber: string; partName: string; customerId: string | null }
interface Customer { id: string; code: string; name: string }

export default function PartsPage() {
  const t = useTranslations("masters");
  const tp = useTranslations("masters.parts");
  const [items, setItems] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [form, setForm] = useState({ partNumber: "", partName: "", customerId: "" });

  async function load() {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/nc/masters/parts"),
      fetch("/api/nc/masters/customers"),
    ]);
    if (pRes.ok) setItems(await pRes.json());
    if (cRes.ok) setCustomers(await cRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ partNumber: "", partName: "", customerId: "" });
    setShowForm(true);
  }

  function openEdit(item: Part) {
    setEditing(item);
    setForm({ partNumber: item.partNumber, partName: item.partName, customerId: item.customerId ?? "" });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.partNumber || !form.partName) { toast.error(tp("requiredFields")); return; }
    const url = editing ? `/api/nc/masters/parts/${editing.id}` : "/api/nc/masters/parts";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { toast.error(t("saveFailed")); return; }
    toast.success(editing ? t("updated") : t("created"));
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/nc/masters/parts/${id}`, { method: "DELETE" });
    toast.success(t("deleted"));
    load();
  }

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

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
              <Label>{tp("partNumber")} *</Label>
              <Input className="mt-1" value={form.partNumber} onChange={(e) => setForm(p => ({ ...p, partNumber: e.target.value }))} placeholder="PART-001" />
            </div>
            <div>
              <Label>{tp("partName")} *</Label>
              <Input className="mt-1" value={form.partName} onChange={(e) => setForm(p => ({ ...p, partName: e.target.value }))} placeholder={tp("namePlaceholder")} />
            </div>
            <div>
              <Label>{t("customerField")}</Label>
              <Select value={form.customerId} onValueChange={(v: string) => setForm(p => ({ ...p, customerId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t("optionalSelect")} /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tp("partNumber")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{tp("partName")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t("customerField")}</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.partNumber}</td>
                  <td className="px-4 py-3 font-medium">{item.partName}</td>
                  <td className="px-4 py-3 text-gray-500">{item.customerId ? customerMap[item.customerId] ?? "-" : "-"}</td>
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
