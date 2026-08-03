"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Type, Table2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportTemplateBlock } from "@/lib/db/schema";

const TYPE_ICONS: Record<ReportTemplateBlock["type"], typeof Type> = {
  text: Type, table: Table2, photo: Image,
};

const TYPE_LABELS: Record<ReportTemplateBlock["type"], string> = {
  text: "텍스트", table: "표", photo: "사진",
};

function makeBlock(type: ReportTemplateBlock["type"]): ReportTemplateBlock {
  const key = `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (type === "table") return { key, type, label: "", columns: ["항목", "내용"] };
  if (type === "photo") return { key, type, label: "" };
  return { key, type, label: "" };
}

interface Props {
  blocks: ReportTemplateBlock[];
  onChange: (blocks: ReportTemplateBlock[]) => void;
}

export function ReportTemplateBlocksEditor({ blocks, onChange }: Props) {
  const [addType, setAddType] = useState<ReportTemplateBlock["type"]>("text");

  function updateBlock(index: number, patch: Partial<ReportTemplateBlock>) {
    onChange(blocks.map((b, i) => (i === index ? ({ ...b, ...patch } as ReportTemplateBlock) : b)));
  }

  function updateColumns(index: number, raw: string) {
    const columns = raw.split(",").map((c) => c.trim()).filter(Boolean);
    onChange(blocks.map((b, i) => (i === index && b.type === "table" ? { ...b, columns } : b)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addBlock() {
    onChange([...blocks, makeBlock(addType)]);
  }

  return (
    <div className="space-y-2">
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">등록된 블록이 없습니다. 아래에서 블록을 추가하세요.</p>
      )}

      {blocks.map((block, index) => {
        const Icon = TYPE_ICONS[block.type];
        return (
          <div key={block.key} className="rounded-xl border border-gray-200 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700">
                <Icon className="h-3.5 w-3.5" />{TYPE_LABELS[block.type]}
              </span>
              <Input
                value={block.label}
                onChange={(e) => updateBlock(index, { label: e.target.value })}
                placeholder="블록 제목 (예: 문제 현상 및 조사 내용)"
                className="h-8 text-sm flex-1"
              />
              <div className="flex items-center shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => removeBlock(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {block.type === "table" && (
              <Input
                value={block.columns.join(", ")}
                onChange={(e) => updateColumns(index, e.target.value)}
                placeholder="표 컬럼명 (콤마로 구분, 예: No, 검사항목, 검사SPEC, 결과, 비고)"
                className="h-8 text-xs"
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 pt-1">
        <Select value={addType} onValueChange={(v) => setAddType(v as ReportTemplateBlock["type"])}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text" className="text-xs">텍스트</SelectItem>
            <SelectItem value="table" className="text-xs">표</SelectItem>
            <SelectItem value="photo" className="text-xs">사진</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addBlock}>
          <Plus className="h-3.5 w-3.5 mr-1" />블록 추가
        </Button>
      </div>
    </div>
  );
}
