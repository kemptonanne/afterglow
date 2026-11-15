export interface ChapterCandidate {
  id: string;
  moment_date: string;
  emojis: string[];
  has_photo: boolean;
  has_video: boolean;
  has_audio: boolean;
}
const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
const type = (m: ChapterCandidate) => m.has_photo || m.has_video ? 'picture' : m.has_audio ? 'voice' : 'quote';
const compare = (a: ChapterCandidate, b: ChapterCandidate) => a.moment_date.localeCompare(b.moment_date) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Pure, input-order independent chapter selection. Dates are inclusive UTC calendar days. */
export function selectChapterMoments<T extends ChapterCandidate>(moments: readonly T[], start: string, end: string): T[] {
  const days = day(end) - day(start) + 1;
  if (!Number.isFinite(days) || days <= 0) return [];
  const candidates = moments.filter(m => m.moment_date >= start && m.moment_date <= end).sort(compare);
  const slots = Math.min(days <= 7 ? 4 : days <= 31 ? 6 : 9, candidates.length);
  if (!slots) return [];
  const picked: T[] = [];
  const used = new Set<string>();
  const seenEmoji = new Set<string>();
  const counts = { picture: 0, voice: 0, quote: 0 };
  const types = [...new Set(candidates.map(type))];
  const mixed = types.some(t => t !== 'picture');
  const cap = Math.floor(0.6 * slots);
  const eligible = () => candidates.filter(m => !used.has(m.id)
    // Keep the explicit mixed-media test's strict cap; picture-only periods fill all slots.
    && (!mixed || type(m) !== 'picture' || counts.picture < cap)
    && !(mixed && picked.length === slots - 1 && counts.voice + counts.quote === 0 && type(m) === 'picture'));
  const score = (m: T) => 3 * [...new Set(m.emojis)].filter(e => !seenEmoji.has(e)).length
    + 2 * Number(counts[type(m)] === Math.min(...types.map(t => counts[t])))
    + Number(type(m) === 'picture');
  const distance = (m: T) => picked.length ? Math.min(...picked.map(p => Math.abs(day(m.moment_date) - day(p.moment_date)))) : 0;
  const pick = (pool: T[]) => {
    const winner = pool.sort((a, b) => score(b) - score(a) || distance(b) - distance(a) || compare(a, b))[0];
    if (!winner) return;
    picked.push(winner); used.add(winner.id); counts[type(winner)]++;
    winner.emojis.forEach(e => seenEmoji.add(e));
  };
  for (let chunk = 0; chunk < slots; chunk++) {
    pick(eligible().filter(m => Math.min(slots - 1, Math.floor((day(m.moment_date) - day(start)) * slots / days)) === chunk));
  }
  while (picked.length < slots) {
    const pool = eligible();
    if (!pool.length) break;
    pick(pool);
  }
  return picked.sort(compare);
}
