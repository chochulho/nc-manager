"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string; code: string; name: string;
  initialResponseSlaHours: number; containmentSlaHours: number; finalReportSlaDays: number;
}

const defaultForm = { code: "", name: "", initialResponseSlaHours: "24", containmentSlaHours: "48", finalReportSlaDays: "15" };

export default function CustomersPage() {
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
    if (!form.code || !form.name) { toast.error("코드와 이름을 입력하세요."); return; }
    const body = {
      code: form.code, name: form.name,
      initialResponseSlaHours: Number(form.initialResponseSlaHours),
      containmentSlaHours: Number(form.containmentSlaHours),
      finalReportSlaDays: Number(form.finalReportSlaDays),
    };
    const url = editing ? `/api/nc/masters/customers/${editing.id}` : "/api/nc/masters/customers";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { toast.error("저장에 실패했습니다."); return; }
    toast.success(editing ? "수정됐습니다." : "등록됐습니다.");
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("비활성화하시겠습니까?")) return;
    await fetch(`/api/nc/masters/customers/${id}`, { method: "DELETE" });
    toast.success("삭제됐습니다.");
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/masters"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">고객사 관리</h1>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />추가</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
          <h2 className="section-title">{editing ? "고객사 수정" : "신규 고객사"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>코드 *</Label>
              <Input className="mt-1" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="CUST-001" />
            </div>
            <div>
              <Label>이름 *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="(주)완성차" />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">SLA 설정 (고객 클레임 대응 기한)</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>초도 대응 (시간)</Label>
                <Input type="number" className="mt-1" value={form.initialResponseSlaHours} onChange={(e) => setForm(p => ({ ...p, initialResponseSlaHours: e.target.value }))} />
              </div>
              <div>
                <Label>봉쇄조치 (시간)</Label>
                <Input type="number" className="mt-1" value={form.containmentSlaHours} onChange={(e) => setForm(p => ({ ...p, containmentSlaHours: e.target.value }))} />
              </div>
              <div>
                <Label>최종보고서 (일)</Label>
                <Input type="number" className="mt-1" value={form.finalReportSlaDays} onChange={(e) => setForm(p => ({ ...p, finalReportSlaDays: e.target.value }))} />
              </div>
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
          <div className="p-8 text-center text-muted-foreground">등록된 고객사가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">코드</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">초도대응(h)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">봉쇄조치(h)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">최종보고(d)</th>
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
