"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DocChangeItem {
  id: string;
  docType: string;       // 'PFD' | 'PFMEA' | 'CP' | 'WI' | '체크시트' | 'custom'
  customLabel?: string;  // docType === 'custom'일 때 사용자 입력 문서명
  docRef?: string;       // 문서 번호 / 참조
  status: "not_required" | "required" | "completed";
  note?: string;
  apqpDocId?: string;    // 미래 APQP Manager 연동용
}

const PRESET_TYPES = ["PFD", "PFMEA", "CP", "WI", "체크시트"] as const;

const STATUS_CONFIG: Record<DocChangeItem["status"], { label: string; className: string }> = {
  not_required: { label: "변경 없음", className: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
  required:     { label: "변경 필요", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  completed:    { label: "완료",      className: "bg-green-100 text-green-700 hover:bg-green-200" },
};

const STATUS_CYCLE: DocChangeItem["status"][] = ["not_required", "required", "completed"];

interface Props {
  items: DocChangeItem[];
  editing: boolean;
  onChange: (items: DocChangeItem[]) => void;
}

export function DocumentChangesSection({ items, editing, onChange }: Props) {
  const [addType, setAddType] = useState<string>("PFD");
  const [addCustomLabel, setAddCustomLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  function cycleStatus(id: string) {
    if (!editing) return;
    onChange(items.map((item) => {
      if (item.id !== id) return item;
      const idx = STATUS_CYCLE.indexOf(item.status);
      return { ...item, status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] };
    }));
  }

  function updateField(id: string, field: keyof DocChangeItem, value: string) {
    onChange(items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function addItem() {
    const label = addType === "custom" ? addCustomLabel.trim() : addType;
    if (!label) return;
    const newItem: DocChangeItem = {
      id: crypto.randomUUID(),
      docType: addType,
      customLabel: addType === "custom" ? addCustomLabel.trim() : undefined,
      docRef: "",
      status: "not_required",
    };
    onChange([...items, newItem]);
    setAddType("PFD");
    setAddCustomLabel("");
    setShowAdd(false);
  }

  const displayLabel = (item: DocChangeItem) =>
    item.docType === "custom" ? (item.customLabel ?? "기타") : item.docType;

  return (
    <div className="space-y-2">
      {items.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">—</p>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-sm">
          {/* 문서 유형 뱃지 */}
          <span className="shrink-0 w-20 text-xs font-semibold text-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 truncate">
            {displayLabel(item)}
          </span>

          {/* 문서 번호 */}
          {editing ? (
            <Input
              value={item.docRef ?? ""}
              onChange={(e) => updateField(item.id, "docRef", e.target.value)}
              placeholder="문서번호 / 참조"
              className="h-7 text-xs flex-1"
            />
          ) : (
            <span className="flex-1 text-muted-foreground truncate">
              {item.docRef || "—"}
            </span>
          )}

          {/* 상태 토글 버튼 */}
          <button
            type="button"
            onClick={() => cycleStatus(item.id)}
            className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${STATUS_CONFIG[item.status].className} ${editing ? "cursor-pointer" : "cursor-default"}`}
          >
            {STATUS_CONFIG[item.status].label}
          </button>

          {/* APQP 연동 표시 */}
          {item.apqpDocId && (
            <span title={`APQP: ${item.apqpDocId}`} className="shrink-0 text-blue-400">
              <ExternalLink className="h-3 w-3" />
            </span>
          )}

          {/* 삭제 */}
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-red-400 hover:text-red-600"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {/* 추가 행 */}
      {editing && showAdd && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={addType} onValueChange={setAddType}>
            <SelectTrigger className="h-7 text-xs w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
              <SelectItem value="custom" className="text-xs">기타 (직접입력)</SelectItem>
            </SelectContent>
          </Select>

          {addType === "custom" && (
            <Input
              value={addCustomLabel}
              onChange={(e) => setAddCustomLabel(e.target.value)}
              placeholder="문서명 (예: 검사기준)"
              className="h-7 text-xs flex-1"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
          )}

          <Button type="button" size="sm" className="h-7 text-xs shrink-0" onClick={addItem}>
            추가
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setShowAdd(false)}>
            취소
          </Button>
        </div>
      )}

      {editing && !showAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs mt-1"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3 w-3 mr-1" /> 문서 추가
        </Button>
      )}
    </div>
  );
}
