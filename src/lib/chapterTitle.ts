const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export function chapterTitle(start: string, end: string, today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()): string {
  const from = parse(start), to = parse(end);
  const month = from.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const lastDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate();
  if (sameMonth && from.getUTCDate() === 1 && to.getUTCDate() === lastDay) return `Your ${month}`;
  if (sameMonth && from.getUTCDate() === 1 && end === today) return `${month}, so far`;
  if ((to.getTime() - from.getTime()) / 86400000 === 6) return `Week of ${short(from)}`;
  return `${short(from)}–${short(to)}`;
}
