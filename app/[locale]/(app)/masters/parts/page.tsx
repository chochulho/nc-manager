"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import Link from "next/link";

interface Part { id: string; partNumber: string; partName: string; customerId: string | null }
interface Customer { id: string; code: string; name: string }

export default function PartsPage() {
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
    if (!form.partNumber || !form.partName) { toast.error("품번과 품명을 입력하세요."); return; }
    const url = editing ? `/api/nc/masters/parts/${editing.id}` : "/api/nc/masters/parts";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { toast.error("저장에 실패했습니다."); return; }
    toast.success(editing ? "수정됐습니다." : "등록됐습니다.");
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("비활성화하시겠습니까?")) return;
    await fetch(`/api/nc/masters/parts/${id}`, { method: "DELETE" });
    toast.success("삭제됐습니다.");
    load();
  }

  const customerMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/masters"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">부품 관리</h1>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />추가</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
          <h2 className="section-title">{editing ? "부품 수정" : "신규 부품"}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>품번 *</Label>
              <Input className="mt-1" value={form.partNumber} onChange={(e) => setForm(p => ({ ...p, partNumber: e.target.value }))} placeholder="PART-001" />
            </div>
            <div>
              <Label>품명 *</Label>
              <Input className="mt-1" value={form.partName} onChange={(e) => setForm(p => ({ ...p, partName: e.target.value }))} placeholder="브레이크 패드" />
            </div>
            <div>
              <Label>고객사</Label>
              <Select value={form.customerId} onValueChange={(v: string) => setForm(p => ({ ...p, customerId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="선택 (선택사항)" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm"><Check className="h-4 w-4 mr-1" />저장</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4 mr-1" />취소</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">등록된 부품이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">품번</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">품명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">고객사</th>
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
