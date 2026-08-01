export const PAGE_SIZE = 30;

export function parsePageParam(pageStr: string | undefined): number {
  const page = pageStr !== undefined ? parseInt(pageStr) || 1 : 1;
  return page < 1 ? 1 : page;
}

export function totalPagesFor(totalCount: number): number {
  return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
}
