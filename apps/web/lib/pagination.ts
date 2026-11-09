export type PaginationItem = number | 'ellipsis';

export function paginationModel(total: number, requestedPage: number, pageSize: number) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const safeSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 10;
  const totalPages = Math.ceil(safeTotal / safeSize);
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), Math.max(1, totalPages));
  const firstResult = safeTotal === 0 ? 0 : (page - 1) * safeSize + 1;
  const lastResult = Math.min(page * safeSize, safeTotal);
  const visible: number[] = [];

  if (totalPages <= 7) {
    for (let number = 1; number <= totalPages; number++) visible.push(number);
  } else {
    const candidates = new Set([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
    visible.push(...[...candidates].filter(number => number >= 1 && number <= totalPages).sort((a, b) => a - b));
  }

  const items: PaginationItem[] = [];
  visible.forEach((number, index) => {
    if (index && number - visible[index - 1] > 1) items.push('ellipsis');
    items.push(number);
  });
  return { page, totalPages, firstResult, lastResult, items };
}
