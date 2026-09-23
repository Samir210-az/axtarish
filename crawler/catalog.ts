export function entryIndex(cursor: number, offset: number, total: number): number {
  return total === 0 ? 0 : (cursor + offset) % total;
}

export function nextCursor(cursor: number, processed: number, total: number): number {
  return total === 0 ? 0 : (cursor + processed) % total;
}
