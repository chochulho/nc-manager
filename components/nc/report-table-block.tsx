"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  columns: string[];
  columnWidths?: number[];
  rows: string[][];
  editing: boolean;
  onChange: (rows: string[][]) => void;
}

const MIN_COL_PX = 64;
const IDEAL_TOTAL_PX = 640;

export function ReportTableBlock({ columns, columnWidths, rows, editing, onChange }: Props) {
  function updateCell(rowIdx: number, colIdx: number, value: string) {
    const next = rows.map((row, i) => (i === rowIdx ? row.map((c, j) => (j === colIdx ? value : c)) : row));
    onChange(next);
  }

  function addRow() {
    onChange([...rows, columns.map(() => "")]);
  }

  function removeRow(rowIdx: number) {
    onChange(rows.filter((_, i) => i !== rowIdx));
  }

  // 컬럼마다 최소 픽셀 폭을 보장해 좁은 레이아웃(좌우배치 등)에서도 입력칸이 눌리지 않도록 함.
  // 넘치는 경우 바깥 컨테이너의 overflow-x-auto로 가로 스크롤 처리.
  const weights = columnWidths?.length === columns.length ? columnWidths : columns.map(() => 1);
  const weightSum = weights.reduce((a, b) => a + (b || 1), 0) || 1;
  const colPx = weights.map((w) => Math.max(MIN_COL_PX, ((w || 1) / weightSum) * IDEAL_TOTAL_PX));
  const totalPx = colPx.reduce((a, b) => a + b, 0) + (editing ? 40 : 0);

  return (
    <div className="rounded-xl border border-gray-200 overflow-x-auto">
      <table className="text-xs" style={{ tableLayout: "fixed", width: `${totalPx}px` }}>
        <colgroup>
          {colPx.map((px, i) => <col key={i} style={{ width: `${px}px` }} />)}
          {editing && <col style={{ width: "40px" }} />}
        </colgroup>
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="text-left px-3 py-2 font-medium text-gray-600 truncate">{col}</th>
            ))}
            {editing && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + 1} className="px-3 py-4 text-center text-muted-foreground">—</td></tr>
          )}
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((_, colIdx) => (
                <td key={colIdx} className="px-2 py-1.5">
                  {editing ? (
                    <Input
                      value={row[colIdx] ?? ""}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      className="h-7 text-xs w-full"
                    />
                  ) : (
                    <span className="px-1 break-words">{row[colIdx] || "-"}</span>
                  )}
                </td>
              ))}
              {editing && (
                <td className="px-1">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeRow(rowIdx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="p-2 bg-gray-50 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" />행 추가
          </Button>
        </div>
      )}
    </div>
  );
}
