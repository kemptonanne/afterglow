import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET, momentKeys } from "@/lib/moments";

const DEMO: { t: string; e: string[]; daysAgo: number; body?: string; photo?: number }[] = [
  { t: "Finally got the soup right", e: ["🥹", "🍲"], daysAgo: 1, photo: 292 },
  { t: "The long way home", e: ["🌅", "⛵"], daysAgo: 3, photo: 1015 },
  { t: "Another coffee", e: ["☕", "👯"], daysAgo: 6, body: "Two hours that felt like ten minutes." },
  { t: "Walking home", e: ["🚶"], daysAgo: 9, body: "The light on the bay was beautiful." },
  { t: "First swim of the year", e: ["🌊", "🥶"], daysAgo: 12, photo: 1011 },
  { t: "Mom called just to chat", e: ["❤️"], daysAgo: 14 },
  { t: "Fixed the bike myself", e: ["🔧", "💪"], daysAgo: 17, body: "Took three videos and one pep talk." },
  { t: "Forest morning", e: ["🌲", "😌"], daysAgo: 20, photo: 1018 },
  { t: "Beat my 5k time", e: ["🏃", "🎉"], daysAgo: 23 },
  { t: "Read in the sun", e: ["📖", "☀️"], daysAgo: 27, photo: 1073 },
  { t: "Dinner with old friends", e: ["🍝", "🥂", "😂"], daysAgo: 31, body: "We laughed until the restaurant closed." },
  { t: "Mountain view", e: ["⛰️", "😮"], daysAgo: 34, photo: 1036 },
];

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Load demo moments" — only for @demo.afterglow accounts with an empty wall. */
export function DemoLoader() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: [...momentKeys.all, "demo-eligible"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email?.toLowerCase().endsWith("@demo.afterglow")) return null;
      const { count } = await supabase.from("moments").select("id", { count: "exact", head: true });
      return count === 0 ? u.user.id : null;
    },
  });
  if (!data) return null;

  async function load(userId: string) {
    setBusy(true);
    for (const m of DEMO) {
      const id = crypto.randomUUID();
      let photo_path: string | null = null;
      if (m.photo) {
        const blob = await fetch(`https://picsum.photos/id/${m.photo}/900/1100`).then((r) => r.blob()).catch(() => null);
        if (blob) {
          const path = `${userId}/${id}/photo.jpg`;
          const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
          if (!error) photo_path = path;
        }
      }
      await supabase.from("moments").insert({ id, title: m.t, emojis: m.e, moment_date: daysAgo(m.daysAgo), body_text: m.body ?? null, photo_path });
    }
    await qc.invalidateQueries({ queryKey: momentKeys.all });
    setBusy(false);
  }

  return (
    <div className="mb-4 text-center">
      <button disabled={busy} onClick={() => void load(data)} className="rounded-full border border-input px-5 py-2 text-sm disabled:opacity-50">
        {busy ? "Loading demo moments…" : "Load demo moments"}
      </button>
    </div>
  );
}
