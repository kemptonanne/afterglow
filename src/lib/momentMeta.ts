const EMOJI = /\p{Extended_Pictographic}/u;
/** Clean an AI reply into a valid title (≤80 chars) and 1–3 unique emojis. Returns null if unusable. */
export function cleanMomentMeta(raw: unknown): { title: string; emojis: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { title?: unknown; emojis?: unknown };
  const title = typeof r.title === "string" ? r.title.replace(/\s+/g, " ").trim().slice(0, 80).trim() : "";
  const list = Array.isArray(r.emojis) ? r.emojis : [];
  const emojis = [...new Set(list.filter((e): e is string => typeof e === "string").map((e) => e.trim()).filter((e) => e && [...e].length <= 8 && EMOJI.test(e) && !/[\p{L}\p{N}]/u.test(e)))].slice(0, 3);
  if (!title || !emojis.length) return null;
  return { title, emojis };
}
