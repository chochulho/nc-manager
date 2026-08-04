"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Type, Table2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportTableBlock } from "@/components/nc/report-table-block";
import { groupBlocksIntoRows, rowFractions, WIDTH_OPTIONS } from "@/lib/nc/report-block-layout";
import type { ReportTemplateBlock, BlockWidth } from "@/lib/db/schema";

const TYPE_ICONS: Record<ReportTemplateBlock["type"], typeof Type> = {
  text: Type, table: Table2, photo: Image,
};

const TYPE_LABELS: Record<ReportTemplateBlock["type"], string> = {
  text: "텍스트", table: "표", photo: "사진",
};

const MAX_COLUMNS = 10;

function makeBlock(type: ReportTemplateBlock["type"]): ReportTemplateBlock {
  const key = `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (type === "table") return { key, type, label: "", columns: ["항목", "내용"], columnWidths: [1, 1], defaultRows: [], width: "full" };
  if (type === "photo") return { key, type, label: "", width: "full" };
  return { key, type, label: "", width: "full" };
}

interface IndexedBlock extends Record<string, unknown> {
  key: string;
  type: ReportTemplateBlock["type"];
  width?: BlockWidth;
  __index: number;
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

  function addColumn(index: number) {
    onChange(blocks.map((b, i) => {
      if (i !== index || b.type !== "table" || b.columns.length >= MAX_COLUMNS) return b;
      const columns = [...b.columns, `컬럼${b.columns.length + 1}`];
      const columnWidths = [...(b.columnWidths ?? b.columns.map(() => 1)), 1];
      const defaultRows = (b.defaultRows ?? []).map((row) => [...row, ""]);
      return { ...b, columns, columnWidths, defaultRows };
    }));
  }

  function removeColumn(index: number, colIdx: number) {
    onChange(blocks.map((b, i) => {
      if (i !== index || b.type !== "table" || b.columns.length <= 1) return b;
      const columns = b.columns.filter((_, j) => j !== colIdx);
      const columnWidths = (b.columnWidths ?? b.columns.map(() => 1)).filter((_, j) => j !== colIdx);
      const defaultRows = (b.defaultRows ?? []).map((row) => row.filter((_, j) => j !== colIdx));
      return { ...b, columns, columnWidths, defaultRows };
    }));
  }

  function updateColumnName(index: number, colIdx: number, name: string) {
    onChange(blocks.map((b, i) => (i === index && b.type === "table" ? { ...b, columns: b.columns.map((c, j) => (j === colIdx ? name : c)) } : b)));
  }

  function updateColumnWidth(index: number, colIdx: number, weight: number) {
    onChange(blocks.map((b, i) => {
      if (i !== index || b.type !== "table") return b;
      const columnWidths = b.columnWidths ?? b.columns.map(() => 1);
      return { ...b, columnWidths: columnWidths.map((w, j) => (j === colIdx ? weight : w)) };
    }));
  }

  function updateDefaultRows(index: number, rows: string[][]) {
    onChange(blocks.map((b, i) => (i === index && b.type === "table" ? { ...b, defaultRows: rows } : b)));
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

  const indexed: IndexedBlock[] = blocks.map((b, i) => ({ ...b, __index: i }));
  const rows = groupBlocksIntoRows(indexed);

  function renderBlockCard(item: IndexedBlock, positionLabel: string | null) {
    const index = item.__index;
    const block = blocks[index];
    const Icon = TYPE_ICONS[block.type];
    const width: BlockWidth = block.width ?? "full";

    return (
      <div key={block.key} className="rounded-xl border border-gray-200 p-3 space-y-2 h-full">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700">
            <Icon className="h-3.5 w-3.5" />{TYPE_LABELS[block.type]}
          </span>
          {positionLabel && (
            <span className="shrink-0 text-xs font-medium px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {positionLabel}
            </span>
          )}
          <Input
            value={block.label}
            onChange={(e) => updateBlock(index, { label: e.target.value })}
            placeholder="블록 제목 (예: 문제 현상 및 조사 내용)"
            className="h-8 text-sm flex-1 min-w-[120px]"
          />
          <div className="flex items-center shrink-0 gap-1">
            <Select value={width} onValueChange={(v) => updateBlock(index, { width: v as BlockWidth })}>
              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WIDTH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {block.type === "text" && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">기본 내용 (선택 — 보고서 작성 시 미리 채워질 텍스트, 예: 소제목 목록)</p>
            <Textarea
              value={block.defaultValue ?? ""}
              onChange={(e) => updateBlock(index, { defaultValue: e.target.value })}
              placeholder={"1. 외관 특이 사항: \n2. X-RAY 확인: \n3. 제품 생산 이력 확인: \n4. Field 고품 EOL 재검사: "}
              rows={4}
              className="text-xs"
            />
          </div>
        )}

        {block.type === "table" && (
          <div className="space-y-2 pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1">컬럼 구성 (최대 {MAX_COLUMNS}개, 비중으로 폭 조정)</p>
              <div className="space-y-1">
                {block.columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex items-center gap-1.5">
                    <Input
                      value={col}
                      onChange={(e) => updateColumnName(index, colIdx, e.target.value)}
                      placeholder={`컬럼 ${colIdx + 1}`}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      type="number" min={1} max={10}
                      value={block.columnWidths?.[colIdx] ?? 1}
                      onChange={(e) => updateColumnWidth(index, colIdx, Math.max(1, Number(e.target.value) || 1))}
                      className="h-7 text-xs w-14"
                      title="폭 비중"
                    />
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
                      onClick={() => removeColumn(index, colIdx)} disabled={block.columns.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button" variant="outline" size="sm" className="h-7 text-xs mt-1.5"
                onClick={() => addColumn(index)} disabled={block.columns.length >= MAX_COLUMNS}
              >
                <Plus className="h-3 w-3 mr-1" />컬럼 추가 ({block.columns.length}/{MAX_COLUMNS})
              </Button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                기본 행 (보고서 작성 시 미리 채워질 행 — 검사항목처럼 고정된 행을 여기서 만들어두면 편합니다)
              </p>
              <ReportTableBlock
                columns={block.columns}
                columnWidths={block.columnWidths}
                rows={block.defaultRows ?? []}
                editing
                onChange={(rows) => updateDefaultRows(index, rows)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground">등록된 블록이 없습니다. 아래에서 블록을 추가하세요.</p>
      )}

      {rows.map((row, rowIdx) => {
        const fractions = rowFractions(row);
        if (row.length === 1) {
          return <div key={rowIdx}>{renderBlockCard(row[0], null)}</div>;
        }
        return (
          <div key={rowIdx} className="flex gap-2 items-stretch">
            {row.map((item, colIdx) => {
              const posLabel = colIdx === 0 ? "◀ 좌측" : colIdx === row.length - 1 ? "우측 ▶" : `${colIdx + 1}번째`;
              return (
                <div key={item.key} style={{ flexBasis: `${fractions[colIdx] * 100}%` }} className="min-w-0">
                  {renderBlockCard(item, `${posLabel} · ${Math.round(fractions[colIdx] * 100)}%`)}
                </div>
              );
            })}
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
      <p className="text-xs text-muted-foreground">
        너비를 "전체"보다 작게 지정한 블록은 연속으로 배치될 때 자동으로 좌우로 나란히 묶입니다 (합이 100%가 되면 한 행 완성).
      </p>
    </div>
  );
}
