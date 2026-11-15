import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Moment = Tables<"moments">;

export const MEDIA_BUCKET = "moment-media";
export const AVATAR_BUCKET = "avatars";
export const LIMITS = { photo: 25 * 1024 * 1024, video: 100 * 1024 * 1024, audio: 50 * 1024 * 1024 };

export const momentKeys = {
  all: ["moments"] as const,
  detail: (id: string) => ["moments", id] as const,
};

/** "Nov 14, 2026" from a YYYY-MM-DD date without time-zone shifts. */
export function formatMomentDate(d: string) {
  const [y = 1970, m = 1, day = 1] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Today's date as YYYY-MM-DD in the browser's local time. */
export function todayLocal() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

const urlCache = new Map<string, { url: string; exp: number }>();
/** Short-lived signed URL for a private file (cached ~50 min). */
export async function signedUrl(path: string | null | undefined, bucket = MEDIA_BUCKET) {
  if (!path) return null;
  const key = `${bucket}/${path}`;
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  urlCache.set(key, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

/** Card type priority: photo > video > voice > quote. */
export function cardType(m: Pick<Moment, "photo_path" | "video_path" | "audio_path">) {
  if (m.photo_path) return "photo" as const;
  if (m.video_path) return "video" as const;
  if (m.audio_path) return "voice" as const;
  return "quote" as const;
}
