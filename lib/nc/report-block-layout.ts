import type { BlockWidth } from "@/lib/db/schema";

export const WIDTH_OPTIONS: { value: BlockWidth; label: string; weight: number }[] = [
  { value: "full", label: "전체 너비", weight: 1 },
  { value: "half", label: "1/2", weight: 1 / 2 },
  { value: "1/3", label: "1/3", weight: 1 / 3 },
  { value: "2/3", label: "2/3", weight: 2 / 3 },
];

export function widthWeight(width: BlockWidth | undefined): number {
  return WIDTH_OPTIONS.find((o) => o.value === (width ?? "full"))?.weight ?? 1;
}

// 연속된 "전체 너비 미만" 블록을 합이 100%에 가까워질 때까지 한 행으로 묶는다.
// "전체 너비" 블록은 항상 단독 행.
export function groupBlocksIntoRows<T extends { width?: BlockWidth }>(blocks: T[]): T[][] {
  const rows: T[][] = [];
  let current: T[] = [];
  let currentWeight = 0;

  for (const block of blocks) {
    const w = widthWeight(block.width);
    if (w >= 0.999) {
      if (current.length) { rows.push(current); current = []; currentWeight = 0; }
      rows.push([block]);
      continue;
    }
    current.push(block);
    currentWeight += w;
    if (currentWeight >= 0.999) {
      rows.push(current);
      current = [];
      currentWeight = 0;
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

// 한 행 안에서 각 블록이 차지할 비율(합계 1)을 반환 — 지정한 너비 합이 100%에 못 미쳐도 균등 정규화한다.
export function rowFractions<T extends { width?: BlockWidth }>(row: T[]): number[] {
  if (row.length <= 1) return [1];
  const weights = row.map((b) => widthWeight(b.width));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => w / sum);
}
