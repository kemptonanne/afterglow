import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AVATAR_BUCKET, signedUrl } from "@/lib/moments";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — afterglow" },
      { name: "description", content: "Your afterglow profile." },
      { property: "og:title", content: "Profile — afterglow" },
      { property: "og:description", content: "Your afterglow profile." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["profile", "editor"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
      if (error) throw error;
      return { ...data, email: auth.user.email ?? "", avatarUrl: await signedUrl(data.avatar_path, AVATAR_BUCKET) };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!query.data) return;
    const value = (name ?? query.data.name).trim();
    if (!value) return setError("Please enter your name.");
    setBusy(true); setError(""); setStatus("");
    const { error } = await supabase.from("profiles").update({ name: value }).eq("id", query.data.id);
    if (error) setError("Couldn't save changes. Try again.");
    else { await qc.invalidateQueries({ queryKey: ["profile"] }); setName(null); setStatus("Changes saved."); }
    setBusy(false);
  }

  async function uploadPhoto(file: File) {
    if (!query.data) return;
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[file.type];
    setError(""); setStatus("");
    if (!ext) return setError("Choose a JPG, PNG, or WebP photo.");
    if (file.size > 5 * 1024 * 1024) return setError("Choose a photo smaller than 5 MB.");
    setBusy(true);
    const path = `${query.data.id}/avatar-${Date.now()}.${ext}`;
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) { setError("Couldn't update your photo. Try again."); setBusy(false); return; }
    const old = query.data.avatar_path;
    const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", query.data.id);
    if (error) { await supabase.storage.from(AVATAR_BUCKET).remove([path]); setError("Couldn't update your photo. Try again."); }
    else { if (old) await supabase.storage.from(AVATAR_BUCKET).remove([old]); await qc.invalidateQueries({ queryKey: ["profile"] }); setStatus("Photo updated."); }
    setBusy(false);
  }

  if (query.isPending) return <p role="status">Loading profile…</p>;
  if (query.isError || !query.data) return <p role="alert">Couldn't load your profile.</p>;
  const p = query.data;
  const displayName = name ?? p.name;

  return (
    <section>
      <h1 className="text-3xl">Your profile</h1>
      <div className="my-7 flex flex-col items-center gap-3">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border bg-secondary font-serif text-5xl">
          {p.avatarUrl ? <img src={p.avatarUrl} alt="Your profile photo" className="h-full w-full object-cover" /> : p.name.trim().charAt(0).toUpperCase() || "?"}
        </div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose profile photo"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadPhoto(f); }} />
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="text-primary underline underline-offset-4">
          Change photo
        </button>
      </div>
      <form onSubmit={saveName} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm">Name</span>
          <input required maxLength={60} value={displayName} disabled={busy} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full border border-input bg-card px-5 py-3" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm">Email</span>
          <input readOnly value={p.email} className="w-full rounded-full border border-input bg-card px-5 py-3 text-muted-foreground" />
        </label>
        <button type="submit" disabled={busy || !displayName.trim()} className="w-full rounded-full bg-primary py-3 text-primary-foreground disabled:opacity-50">
          {busy ? "Please wait…" : "Save changes"}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <p role="status" className="mt-3 text-center text-sm text-muted-foreground">{status}</p>
      <button onClick={signOut} className="mx-auto mt-4 block px-6 py-2 text-muted-foreground underline underline-offset-4">Sign out</button>
    </section>
  );
}
