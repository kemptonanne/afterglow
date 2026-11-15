import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, Camera, ChevronLeft, Image as ImageIcon, Lock, Mic, Pencil, Plus, Sparkles, Type, Upload, Video as VideoIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { formatMomentDate, LIMITS, MEDIA_BUCKET, momentKeys, todayLocal } from "@/lib/moments";
import { requestTranscription } from "@/lib/transcribe.functions";
import { VoiceRecorder, type Voice } from "@/components/save/VoiceRecorder";
import { blobBase64, clock, fileExt, smallImageDataUrl, videoPoster } from "@/components/save/media";
import { suggestMomentMeta, transcribeDraft } from "@/lib/suggest.functions";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
const field = "w-full min-w-0 max-w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:border-primary";

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

type Kind = "voice" | "photo" | "video" | "text";
type Step = "type" | Kind | "details";
const QUICK_EMOJIS = ["😊", "😌", "🎉", "🥰", "😂", "🌅"];
const outline = "inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-primary px-4 py-3 text-sm text-primary disabled:opacity-50";
const primaryBtn = "h-12 w-full rounded-full bg-primary text-primary-foreground disabled:opacity-50";
const pinned = "paper-panel relative rounded-md border border-card p-3 shadow-md";
const Pin = () => <span aria-hidden="true" className="brass-pin absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full" />;

function audioDuration(blob: Blob) {
  return new Promise<number>((res) => {
    const a = document.createElement("audio"); const u = URL.createObjectURL(blob);
    a.preload = "metadata"; a.src = u;
    a.onloadedmetadata = () => { URL.revokeObjectURL(u); res(Number.isFinite(a.duration) ? Math.max(1, Math.round(a.duration)) : 1); };
    a.onerror = () => { URL.revokeObjectURL(u); res(1); };
  });
}

export type MomentStart = { words?: string; photo?: File; video?: File; voice?: Voice };
function startKind(i?: MomentStart): Kind | null { return !i ? null : i.photo ? "photo" : i.video ? "video" : i.voice ? "voice" : "text"; }

function SaveMomentForm({ onSaved, close, initial }: { onSaved: () => void; close: () => void; initial?: MomentStart }) {
  const qc = useQueryClient();
  const transcribe = useServerFn(requestTranscription);
  const draftFn = useServerFn(transcribeDraft);
  const suggestFn = useServerFn(suggestMomentMeta);
  const [step, setStep] = useState<Step>(initial ? "details" : "type");
  const [kind, setKind] = useState<Kind | null>(() => startKind(initial));
  const [title, setTitle] = useState("");
  const [emojis, setEmojis] = useState<string[]>([]);
  const [date, setDate] = useState(todayLocal);
  const [words, setWords] = useState(initial?.words ?? "");
  const [photo, setPhoto] = useState<File | null>(initial?.photo ?? null);
  const [video, setVideo] = useState<File | null>(initial?.video ?? null);
  const [voice, setVoice] = useState<Voice | null>(initial?.voice ?? null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editDate, setEditDate] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const photoUrl = usePreview(photo);
  const videoUrl = usePreview(video);
  const posterRef = useRef<Blob | null>(null);
  const posterUrl = usePreview(step === "details" && video ? posterRef.current : null);
  const today = todayLocal();
  const latest = useRef(0);
  const current = useRef({ title, emojis });
  current.current = { title, emojis };

  const valid = title.trim().length > 0 && emojis.length >= 1 && !!date && date <= today && !voiceBusy &&
    (!voice || voice.blob.size <= LIMITS.audio);
  const quick = [...new Set([...suggested, ...emojis, ...QUICK_EMOJIS])].slice(0, 4);

  function pick(k: "photo" | "video", file?: File) {
    if (!file) return;
    setMediaError("");
    if (!file.type.startsWith(k === "photo" ? "image/" : "video/"))
      return setMediaError(`Choose a ${k === "photo" ? "photo" : "video"} file.`);
    if (file.size > LIMITS[k])
      return setMediaError(k === "photo" ? "That photo is over 25 MB. Choose a smaller one." : "That video is over 100 MB. Choose a shorter one.");
    if (k === "photo") setPhoto(file); else { setVideo(file); posterRef.current = null; void videoPoster(file).then((b) => { posterRef.current = b; }).catch(() => undefined); }
  }

  async function pickAudio(file?: File) {
    if (!file) return;
    setMediaError("");
    if (!file.type.startsWith("audio/")) return setMediaError("Choose an audio file.");
    if (file.size > LIMITS.audio) return setMediaError("That recording is over 50 MB. Choose a shorter one.");
    setVoice({ blob: file, duration: await audioDuration(file) });
  }

  // Draft transcript for checking before continuing.
  useEffect(() => {
    if (!voice || voice.blob.size > 24 * 1024 * 1024) return;
    let active = true;
    setDrafting(true);
    void (async () => {
      try {
        const r = await draftFn({ data: { audio: await blobBase64(voice.blob), audioType: voice.blob.type } });
        if (active && r?.text) setWords((w) => w.trim() ? w : r.text);
      } catch { /* quiet */ }
      finally { if (active) setDrafting(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice]);

  async function suggest(force = false) {
    const run = ++latest.current;
    setSuggesting(true);
    try {
      const data = kind === "photo" && photo ? { image: await smallImageDataUrl(photo) }
        : kind === "video" && video ? { image: await smallImageDataUrl(posterRef.current ?? await videoPoster(video)) }
        : words.trim() ? { text: words.trim().slice(0, 4000) }
        : kind === "voice" && voice && voice.blob.size <= 10 * 1024 * 1024 ? { audio: await blobBase64(voice.blob), audioType: voice.blob.type }
        : null;
      if (!data) return;
      const meta = await suggestFn({ data });
      if (!meta || run !== latest.current) return;
      setSuggested(meta.emojis);
      if (force || !current.current.title.trim()) setTitle(meta.title);
      if (force || !current.current.emojis.length) setEmojis(meta.emojis);
    } catch { /* quiet: user fills it in */ }
    finally { if (run === latest.current) setSuggesting(false); }
  }

  // Arriving from the wall's composer: go straight to details and suggest a title.
  useEffect(() => {
    if (!initial) return;
    void (async () => {
      if (initial.video) posterRef.current = await videoPoster(initial.video).catch(() => null);
      void suggest();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toDetails() { setStep("details"); setPickerOpen(false); void suggest(); }
  function back() {
    if (step === "type") return close();
    if (step === "details") return setStep(kind ?? "type");
    setStep("type");
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
      const usePhoto = kind === "photo" ? photo : null, useVideo = kind === "video" ? video : null, useVoice = kind === "voice" ? voice : null;
      const poster = useVideo ? posterRef.current ?? await videoPoster(useVideo).catch(() => null) : null;
      const files: [string, string, Blob][] = [];
      if (usePhoto) files.push(["photo_path", `photo.${fileExt(usePhoto, "jpg")}`, usePhoto]);
      if (useVideo) files.push(["video_path", `video.${fileExt(useVideo, "mp4")}`, useVideo]);
      if (poster) files.push(["video_poster_path", "poster.jpg", poster]);
      if (useVoice) files.push(["audio_path", useVoice.blob.type.includes("mp4") || useVoice.blob.type.includes("m4a") ? "voice.mp4" : "voice.webm", useVoice.blob]);
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
        audio_duration_seconds: useVoice?.duration ?? null, transcription_status: useVoice ? "pending" : "none",
      });
      if (error) throw error;
      if (useVoice) void transcribe({ data: { momentId: id } }).finally(() => qc.invalidateQueries({ queryKey: momentKeys.all }));
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

  const header = (
    <div className="flex items-center gap-3 border-b border-border pb-3">
      <button type="button" aria-label={step === "type" ? "Close" : "Back"} onClick={back} className="-ml-1 rounded-full p-1"><ChevronLeft className="h-6 w-6" /></button>
      <span className="font-serif text-2xl italic">afterglow</span>
    </div>
  );
  const privacy = (text: string) => <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" />{text}</p>;
  const fileButton = (label: string, Icon: typeof Camera, accept: string, onFile: (f?: File) => void, capture?: "environment" | "user") => (
    <label className={`${outline} cursor-pointer`}>
      <Icon className="h-4 w-4" />{label}
      <input type="file" accept={accept} capture={capture} className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
  const wrap = (children: React.ReactNode, footer?: React.ReactNode) => (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 px-5 pb-8 pt-6">
      {header}
      <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      {footer && <footer className="space-y-3">{footer}</footer>}
    </div>
  );

  if (step === "type") return wrap(<>
    <header className="text-center">
      <SheetTitle className="font-serif text-4xl font-normal italic">Save a moment</SheetTitle>
      <SheetDescription className="mt-2">How would you like to keep it?</SheetDescription>
    </header>
    <div className="grid grid-cols-2 gap-4 pt-2">
      {([["voice", Mic, "Voice", "Record or upload"], ["photo", Camera, "Photo", "Take or upload"], ["video", VideoIcon, "Video", "Record or upload"], ["text", Type, "Text", "Write it down"]] as const).map(([k, Icon, label, sub]) => (
        <button key={k} type="button" onClick={() => { setKind(k); setMediaError(""); setStep(k); }} className={`${pinned} flex aspect-square flex-col items-center justify-center gap-2 text-center`}>
          <Pin /><Icon className="h-9 w-9 text-primary" strokeWidth={1.5} /><span className="font-serif text-2xl">{label}</span><span className="text-sm text-muted-foreground">{sub}</span>
        </button>
      ))}
    </div>
    <div className="mt-auto">{privacy("Only you can see your moments.")}</div>
  </>);

  if (step === "photo" || step === "video") {
    const isPhoto = step === "photo"; const file = isPhoto ? photo : video;
    return wrap(<>
      <SheetTitle className="text-center font-serif text-3xl font-normal italic">{isPhoto ? "Add a photo" : "Add a video"}</SheetTitle>
      <SheetDescription className="sr-only">{isPhoto ? "Take or upload a photo" : "Record or upload a video"}</SheetDescription>
      <div className={`${pinned} mx-auto w-full max-w-xs pb-10`}><Pin />
        {file ? (isPhoto ? <img src={photoUrl} alt="Chosen photo" className="aspect-[4/3.6] w-full rounded-sm object-cover" /> : <video src={videoUrl} controls playsInline className="aspect-[4/3.6] w-full rounded-sm bg-foreground/10 object-cover" />)
          : <div className="flex aspect-[4/3.6] flex-col items-center justify-center gap-2 rounded-sm bg-muted text-sm text-muted-foreground">{isPhoto ? <Camera className="h-8 w-8" /> : <VideoIcon className="h-8 w-8" />}No {isPhoto ? "photo" : "video"} yet</div>}
      </div>
      <div className="flex gap-3">
        {isPhoto ? fileButton("Take photo", Camera, "image/*", (f) => pick("photo", f), "environment") : fileButton("Record video", VideoIcon, "video/*", (f) => pick("video", f), "environment")}
        {fileButton(isPhoto ? "Upload photo" : "Upload video", Upload, isPhoto ? "image/*" : "video/*", (f) => pick(isPhoto ? "photo" : "video", f))}
      </div>
      <p className="text-center text-xs text-muted-foreground">Up to {isPhoto ? 25 : 100} MB</p>
      {mediaError && <p role="alert" className="text-sm text-destructive">{mediaError}</p>}
    </>, <button type="button" disabled={!file} className={primaryBtn} onClick={toDetails}>Continue</button>);
  }

  if (step === "voice") return wrap(<>
    <SheetTitle className="font-serif text-3xl font-normal">Add a voice note</SheetTitle>
    <SheetDescription className="sr-only">Record or upload a voice note</SheetDescription>
    <VoiceRecorder value={voice} onChange={(v) => { setVoice(v); if (v) setWords(""); }} onBusyChange={setVoiceBusy} />
    <div className="flex gap-3">{fileButton("Upload audio", Upload, "audio/*", (f) => void pickAudio(f))}</div>
    {mediaError && <p role="alert" className="text-sm text-destructive">{mediaError}</p>}
    {voice && <div className={`${pinned} p-5`}><Pin />
      <h3 className="mb-3 text-2xl">Transcript</h3>
      <textarea className={`${field} min-h-32`} maxLength={1000} value={words} onChange={(e) => setWords(e.target.value)} placeholder={drafting ? "Writing it down…" : "Add what you said (optional)"} />
    </div>}
    {voice && <p className="text-center text-sm text-muted-foreground">Check the words before continuing.</p>}
  </>, <button type="button" disabled={!voice || voiceBusy} className={primaryBtn} onClick={toDetails}>Continue</button>);

  if (step === "text") return wrap(<>
    <SheetTitle className="font-serif text-3xl font-normal">Write a moment</SheetTitle>
    <SheetDescription className="sr-only">Write your moment down</SheetDescription>
    <div className={`${pinned} flex flex-1 p-5 pt-7`}><Pin />
      <textarea autoFocus aria-label="Your moment" className="min-h-72 w-full flex-1 resize-none bg-transparent text-lg leading-relaxed outline-none" maxLength={1000} value={words} onChange={(e) => setWords(e.target.value)} placeholder="What happened?" />
    </div>
    <p className="text-center text-sm text-muted-foreground">This becomes your story in the next step.</p>
  </>, <button type="button" disabled={!words.trim()} className={primaryBtn} onClick={toDetails}>Continue</button>);

  // details
  const thumb = kind === "photo" ? photoUrl : kind === "video" ? posterUrl ?? videoUrl : undefined;
  return (
    <form className="contents" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {wrap(<fieldset disabled={saving} className="min-w-0 space-y-6">
        <SheetTitle className="font-serif text-3xl font-normal">Your moment</SheetTitle>
        <SheetDescription className="sr-only">Add details and save</SheetDescription>
        {kind !== "text" && <div className="flex items-center gap-5">
          <div className={`${pinned} w-40 shrink-0 p-2`}><Pin />
            {thumb && kind === "photo" ? <img src={thumb} alt="" className="aspect-[4/3] w-full rounded-sm object-cover" />
              : thumb ? <video src={thumb} muted playsInline className="aspect-[4/3] w-full rounded-sm object-cover" />
              : <div className="flex aspect-[4/3] items-center justify-center gap-2 text-sm"><Mic className="h-5 w-5 text-primary" />{voice ? clock(voice.duration) : ""}</div>}
          </div>
          <button type="button" className={`${outline} flex-none`} onClick={() => setStep(kind ?? "type")}><ImageIcon className="h-4 w-4" />Change</button>
        </div>}

        <section className="space-y-2">
          <h3 className="text-xl">How did it feel?</h3>
          <p className="text-sm text-muted-foreground">Choose 1–3 emojis.</p>
          <div className="flex flex-wrap gap-2">
            {quick.map((e) => { const on = emojis.includes(e); return (
              <button key={e} type="button" aria-pressed={on} aria-label={`${on ? "Remove" : "Add"} ${e}`} disabled={!on && emojis.length >= 3}
                onClick={() => setEmojis((l) => on ? l.filter((x) => x !== e) : [...l, e])}
                className={`h-14 w-14 rounded-xl border text-2xl disabled:opacity-40 ${on ? "border-2 border-primary bg-card" : "border-input bg-card/60"}`}>{e}</button>); })}
            <button type="button" aria-label="More emojis" disabled={emojis.length >= 3} onClick={() => setPickerOpen((o) => !o)} className="flex h-14 w-14 items-center justify-center rounded-xl border border-input disabled:opacity-40"><Plus className="h-5 w-5" /></button>
          </div>
          <p className="text-xs text-muted-foreground">{emojis.length} of 3 selected {emojis.filter((e) => !quick.includes(e)).join(" ")}</p>
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
          <span className="flex items-center justify-between gap-3"><span className="font-serif text-xl">Name this moment</span>
            <button type="button" disabled={suggesting} onClick={() => void suggest(true)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-input px-3 py-1 text-xs disabled:opacity-50"><Sparkles className="h-3 w-3" />{suggesting ? "Thinking…" : "Suggest"}</button>
          </span>
          <input className={field} placeholder={suggesting ? "Thinking of a title…" : "What happened?"} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="block space-y-2">
          <span className="font-serif text-xl">The story <span className="font-sans text-sm text-muted-foreground">(optional)</span></span>
          <textarea className={`${field} min-h-20`} maxLength={1000} placeholder="A little more to remember…" value={words} onChange={(e) => setWords(e.target.value)} />
        </label>

        {editDate ? (
          <label className="block space-y-2"><span className="sr-only">Date</span>
            <input type="date" autoFocus max={today} className={`${field} appearance-none text-left`} value={date} onChange={(e) => setDate(e.target.value)} onBlur={() => setEditDate(false)} />
          </label>
        ) : (
          <button type="button" onClick={() => setEditDate(true)} className={`${field} flex items-center gap-3 text-left`} aria-label={`Date: ${formatMomentDate(date)}. Change date`}>
            <CalendarDays className="h-5 w-5 shrink-0" /><span className="flex-1">{formatMomentDate(date)}</span><Pencil className="h-4 w-4 shrink-0" />
          </button>
        )}
        {date > today && <span className="text-sm text-destructive">Pick today or an earlier day.</span>}
        <div className="[&>p]:justify-start">{privacy("Only you can see this.")}</div>
      </fieldset>, <>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {progress && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}
        <button type="submit" disabled={!valid || saving} className={primaryBtn}>{saving ? "Saving…" : "Save moment"}</button>
      </>)}
    </form>
  );
}

export function SaveMomentSheet({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: MomentStart; onSaved?: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-dvh overflow-y-auto border-0 bg-background p-0">
        {open && <SaveMomentForm initial={initial} onSaved={() => { onSaved?.(); onOpenChange(false); }} close={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}
