export const POSTER_MAX_TILES = 12;
/** Columns, visible tile count and overflow for the 1080x1920 chapter poster. */
export function posterLayout(count: number) {
  const shown = Math.min(count, POSTER_MAX_TILES);
  return { columns: count <= 6 ? 3 : 4, shown, more: count - shown };
}
