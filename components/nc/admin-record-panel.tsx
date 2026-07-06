"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function parseNumber(number: string): { year: number; seq: number } {
  const parts = number.split("-");
  const year = Number(parts[1]);
  const seq = Number(parts[2]);
  const now = new Date().getFullYear();
  return {
    year: Number.isInteger(year) ? year : now,
    seq: Number.isInteger(seq) ? seq : 1,
  };
}

export function AdminRecordPanel({
  currentNumber,
  deleteApiUrl,
  renumberApiUrl,
  listHref,
  onRenumbered,
}: {
  currentNumber: string;
  deleteApiUrl: string;
  renumberApiUrl: string;
  listHref: string;
  onRenumbered: (newNumber: string) => void;
}) {
  const initial = parseNumber(currentNumber);
  const [year, setYear] = useState(String(initial.year));
  const [seq, setSeq] = useState(String(initial.seq));
  const [renumbering, setRenumbering] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const thisYear = new Date().getFullYear();
  const yearOptions = [thisYear - 1, thisYear, thisYear + 1];

  async function handleRenumber() {
    const seqNum = Number(seq);
    if (!Number.isInteger(seqNum) || seqNum < 1) {
      toast.error("순번을 올바르게 입력해주세요.");
      return;
    }
    setRenumbering(true);
    try {
      const res = await fetch(renumberApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), seq: seqNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error === "이미 사용 중인 번호입니다" ? data.error : "번호 변경에 실패했습니다.");
        return;
      }
      onRenumbered(data.number);
      toast.success(`번호가 ${data.number}(으)로 변경됐습니다.`);
    } finally {
      setRenumbering(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`${currentNumber}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(deleteApiUrl, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(`삭제할 수 없습니다:\n${(data.blockers as string[] ?? []).join("\n")}`);
        return;
      }
      if (!res.ok) {
        toast.error("삭제에 실패했습니다.");
        return;
      }
      toast.success("삭제됐습니다.");
      window.location.href = listHref;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-red-200 p-5 space-y-4">
      <h2 className="section-title flex items-center gap-2 text-red-700">
        <ShieldAlert className="h-4 w-4" />
        관리자 작업
      </h2>

      <div>
        <Label>등록번호 변경</Label>
        <div className="flex items-center gap-2 mt-1">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
            className="w-24"
          />
          <Button variant="outline" size="sm" onClick={handleRenumber} disabled={renumbering}>
            {renumbering ? "변경 중..." : "번호 변경"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">현재 번호: {currentNumber}</p>
      </div>

      <div>
        <Label>레코드 삭제</Label>
        <div className="mt-1">
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700 border-red-200">
            <Trash2 className="h-4 w-4 mr-1" /> {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">CAPA/Q-Alert/레슨런 등에 연결된 기록은 삭제할 수 없습니다.</p>
      </div>
    </div>
  );
}
