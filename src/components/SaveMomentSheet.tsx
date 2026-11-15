import { lazy, Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { LIMITS, MEDIA_BUCKET, momentKeys, todayLocal } from "@/lib/moments";
import { requestTranscription } from "@/lib/transcribe.functions";
import { VoiceRecorder, type Voice } from "@/components/save/VoiceRecorder";
import { fileExt, videoPoster } from "@/components/save/media";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
const field = "w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:border-primary";

function usePreview(blob: Blob | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function SaveMomentForm({ onSaved }: { onSaved: () => void }) {
  const qc = useQueryClient();
  const transcribe = useServerFn(requestTranscription);
  const [title, setTitle] = useState("");
  const [emojis, setEmojis] = useState<string[]>([]);
  const [date, setDate] = useState(todayLocal);
  const [words, setWords] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const photoUrl = usePreview(photo);
  const videoUrl = usePreview(video);
  const today = todayLocal();

  const valid = title.trim().length > 0 && emojis.length >= 1 && !!date && date <= today && !voiceBusy &&
    (!voice || voice.blob.size <= LIMITS.audio);

  function pick(kind: "photo" | "video", file?: File) {
    if (!file) return;
    setMediaError("");
    if (!file.type.startsWith(kind === "photo" ? "image/" : "video/"))
      return setMediaError(`Choose a ${kind === "photo" ? "photo" : "video"} file.`);
    if (file.size > LIMITS[kind])
      return setMediaError(kind === "photo" ? "That photo is over 25 MB. Choose a smaller one." : "That video is over 100 MB. Choose a shorter one.");
    if (kind === "photo") setPhoto(file); else setVideo(file);
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true); setError(""); setProgress("Getting ready…");
    const uploaded: string[] = [];
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("signed out");
      const id = crypto.randomUUID();
      const root = `${u.user.id}/${id}`;
      const poster = video ? await videoPoster(video).catch(() => null) : null;
      const files: [string, string, Blob][] = [];
      if (photo) files.push(["photo_path", `photo.${fileExt(photo, "jpg")}`, photo]);
      if (video) files.push(["video_path", `video.${fileExt(video, "mp4")}`, video]);
      if (poster) files.push(["video_poster_path", "poster.jpg", poster]);
      if (voice) files.push(["audio_path", voice.blob.type.includes("mp4") ? "voice.mp4" : "voice.webm", voice.blob]);
      const paths: Record<string, string> = {};
      for (const [i, [col, name, blob]] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const path = `${root}/${name}`;
        const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: blob.type || undefined });
        if (error) throw error;
        uploaded.push(path);
        paths[col] = path;
      }
      setProgress("Saving…");
      const { error } = await supabase.from("moments").insert({
        id, title: title.trim(), emojis, moment_date: date, body_text: words.trim() || null, ...paths,
        audio_duration_seconds: voice?.duration ?? null, transcription_status: voice ? "pending" : "none",
      });
      if (error) throw error;
      if (voice) void transcribe({ data: { momentId: id } }).finally(() => qc.invalidateQueries({ queryKey: momentKeys.all }));
      void qc.invalidateQueries({ queryKey: momentKeys.all });
      toast.success("Moment saved");
      onSaved();
    } catch {
      if (uploaded.length) await supabase.storage.from(MEDIA_BUCKET).remove(uploaded).catch(() => undefined);
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false); setProgress("");
    }
  }

  return (
    <form className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 px-5 pb-8 pt-8"
      onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <header className="pr-8">
        <SheetTitle className="font-serif text-3xl font-normal italic">Save a moment</SheetTitle>
        <SheetDescription className="mt-1">One good thing, worth keeping.</SheetDescription>
      </header>
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <label className="block space-y-2">
          <span className="font-medium">Title</span>
          <input className={field} placeholder="What happened?" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          <span className="block text-right text-xs text-muted-foreground">{title.length}/80</span>
        </label>

        <section className="space-y-3">
          <h3 className="font-sans font-medium">How it felt <span className="text-sm font-normal text-muted-foreground">(1–3 emojis)</span></h3>
          <div className="flex flex-wrap gap-2">
            {emojis.map((e) => (
              <button key={e} type="button" aria-label={`Remove ${e}`} onClick={() => setEmojis((l) => l.filter((x) => x !== e))}
                className="flex items-center gap-1.5 rounded-full border border-input bg-card px-3 py-1.5 text-xl">
                {e}<X className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
            <button type="button" disabled={emojis.length >= 3} onClick={() => setPickerOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-full border border-input px-4 py-2 text-sm disabled:opacity-40">
              <Plus className="h-4 w-4" /> {emojis.length >= 3 ? "3 chosen" : "Add emoji"}
            </button>
          </div>
          {pickerOpen && emojis.length < 3 && (
            <div className="overflow-hidden rounded-2xl border">
              <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading emojis…</p>}>
                <EmojiPicker width="100%" height={360} lazyLoadEmojis onEmojiClick={({ emoji }) => {
                  setEmojis((l) => (l.length < 3 && !l.includes(emoji) ? [...l, emoji] : l));
                  setPickerOpen(false);
                }} />
              </Suspense>
            </div>
          )}
        </section>

        <label className="block space-y-2">
          <span className="font-medium">Date</span>
          <input type="date" max={today} className={field} value={date} onChange={(e) => setDate(e.target.value)} />
          {date > today && <span className="text-sm text-destructive">Pick today or an earlier day.</span>}
        </label>

        <label className="block space-y-2">
          <span className="font-medium">Words <span className="text-sm font-normal text-muted-foreground">(optional)</span></span>
          <textarea className={`${field} min-h-28`} maxLength={1000} placeholder="A little more to remember…" value={words} onChange={(e) => setWords(e.target.value)} />
          <span className="block text-right text-xs text-muted-foreground">{words.length}/1000</span>
        </label>

        {(["photo", "video"] as const).map((kind) => {
          const file = kind === "photo" ? photo : video;
          return (
            <section key={kind} className="paper-panel space-y-3 rounded-2xl border p-4">
              <h3 className="text-xl capitalize">{kind}</h3>
              <p className="text-xs text-muted-foreground">Camera or library · up to {kind === "photo" ? 25 : 100} MB</p>
              {file ? (
                <>
                  {kind === "photo"
                    ? <img src={photoUrl} alt="Chosen photo" className="max-h-60 w-full rounded-xl object-contain" />
                    : <video src={videoUrl} controls playsInline className="max-h-60 w-full rounded-xl" />}
                  <button type="button" className="text-sm text-muted-foreground underline" onClick={() => (kind === "photo" ? setPhoto(null) : setVideo(null))}>
                    Remove {kind}
                  </button>
                </>
              ) : (
                <input type="file" accept={kind === "photo" ? "image/*" : "video/*"} aria-label={`Choose ${kind}`}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border file:border-input file:bg-card file:px-4 file:py-2"
                  onChange={(e) => { pick(kind, e.target.files?.[0]); e.target.value = ""; }} />
              )}
            </section>
          );
        })}
        {mediaError && <p role="alert" className="text-sm text-destructive">{mediaError}</p>}

        <VoiceRecorder value={voice} onChange={setVoice} onBusyChange={setVoiceBusy} />
      </fieldset>

      <footer className="mt-auto space-y-3 border-t pt-5">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {progress && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}
        <button type="submit" disabled={!valid || saving} className="h-12 w-full rounded-full bg-primary text-primary-foreground disabled:opacity-50">
          {saving ? "Saving…" : "Save moment"}
        </button>
      </footer>
    </form>
  );
}

export function SaveMomentSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-dvh overflow-y-auto border-0 bg-background p-0">
        {open && <SaveMomentForm onSaved={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}
