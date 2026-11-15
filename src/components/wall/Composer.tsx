import { useEffect, useRef, useState } from "react";
import { ArrowUp, Camera, Mic, Plus, Square, Video as VideoIcon, X } from "lucide-react";
import { SaveMomentSheet, type MomentStart } from "@/components/SaveMomentSheet";
import type { Voice } from "@/components/save/VoiceRecorder";
import { clock } from "@/components/save/media";
import { LIMITS } from "@/lib/moments";

type Attachment = { kind: "photo" | "video"; file: File } | { kind: "voice"; voice: Voice };

function usePreview(file: Blob | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { if (!file) return setUrl(undefined); const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  return url;
}

const BARS = 24;

/** Chat-style "keep a little of today" bar at the bottom of the wall. */
export function Composer({ hidden }: { hidden: boolean }) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [att, setAtt] = useState<Attachment | null>(null);
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.15));
  const [sheet, setSheet] = useState(false);
  const [start, setStart] = useState<MomentStart | undefined>();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const rec = useRef<{ recorder: MediaRecorder; cancel: boolean; stop: () => void } | null>(null);
  const preview = usePreview(att && att.kind !== "voice" ? att.file : att?.kind === "voice" ? att.voice.blob : null);

  useEffect(() => { const a = area.current; if (!a) return; a.style.height = "auto"; a.style.height = `${Math.min(a.scrollHeight, 120)}px`; }, [text]);
  useEffect(() => () => { if (rec.current) { rec.current.cancel = true; rec.current.recorder.stop(); } }, []);

  function pick(kind: "photo" | "video", file?: File) {
    setMenu(false); setMessage("");
    if (!file) return;
    if (!file.type.startsWith(kind === "photo" ? "image/" : "video/")) return setMessage(`Choose a ${kind} file.`);
    if (file.size > LIMITS[kind]) return setMessage(kind === "photo" ? "That photo is over 25 MB." : "That video is over 100 MB.");
    setAtt({ kind, file });
  }

  async function record() {
    setMessage(""); setMenu(false);
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("unsupported");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const n = e instanceof DOMException ? e.name : "";
      return setMessage(n === "NotAllowedError" ? "Microphone access is off. Turn it on in your browser settings." : "Recording isn't available in this browser.");
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = []; let bytes = 0; const began = Date.now();
    const ctx = new AudioContext(); const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = window.setInterval(() => {
      setSeconds((Date.now() - began) / 1000);
      analyser.getByteTimeDomainData(data);
      let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      setLevels((l) => [...l.slice(1), Math.max(0.12, Math.min(1, peak * 2.5))]);
    }, 90);
    const handle = { recorder, cancel: false, stop: () => recorder.stop() };
    rec.current = handle;
    recorder.ondataavailable = (e) => { if (!e.data.size) return; chunks.push(e.data); bytes += e.data.size; if (bytes >= LIMITS.audio && recorder.state === "recording") recorder.stop(); };
    recorder.onstop = () => {
      window.clearInterval(tick); void ctx.close(); stream.getTracks().forEach((t) => t.stop());
      rec.current = null; setRecording(false); setLevels(Array(BARS).fill(0.15));
      if (handle.cancel) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (blob.size) setAtt({ kind: "voice", voice: { blob, duration: Math.max(1, Math.round((Date.now() - began) / 1000)) } });
    };
    setSeconds(0); recorder.start(250); setRecording(true);
  }

  const ready = !!text.trim() || !!att;
  function send() {
    if (!ready) return;
    setStart({ words: text.trim() || undefined, ...(att?.kind === "photo" ? { photo: att.file } : att?.kind === "video" ? { video: att.file } : att?.kind === "voice" ? { voice: att.voice } : {}) });
    setSheet(true);
  }
  function clear() { setText(""); setAtt(null); setMessage(""); }

  const iconBtn = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-sage focus-visible:outline-2 focus-visible:outline-ring";
  return <>
    <div aria-hidden={hidden} inert={hidden} className={`fixed inset-x-0 bottom-[4.5rem] z-20 mx-auto max-w-md px-4 transition-all duration-300 ease-out ${hidden ? "pointer-events-none translate-y-10 opacity-0" : ""}`}>
      {menu && <div className="animate-drop relative mb-2 w-44 rounded-2xl border bg-card p-1.5 shadow-lg">
        <button type="button" onClick={() => photoInput.current?.click()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-sage"><Camera className="h-5 w-5" />Photo</button>
        <button type="button" onClick={() => videoInput.current?.click()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-sage"><VideoIcon className="h-5 w-5" />Video</button>
        <span aria-hidden className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r bg-card" />
      </div>}
      <div className="rounded-[1.75rem] border border-primary/30 bg-card p-2 shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--foreground)_25%,transparent)] transition-all duration-300">
        {recording ? <div className="animate-drop flex items-center gap-2">
          <button type="button" aria-label="Cancel recording" onClick={() => { if (rec.current) { rec.current.cancel = true; rec.current.stop(); } }} className={`${iconBtn} border`}><X className="h-5 w-5" /></button>
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <span role="timer" className="text-xs tabular-nums">{clock(seconds)}</span>
            <div aria-hidden className="flex h-7 items-center gap-[3px]">{levels.map((l, i) => <span key={i} className="w-[3px] rounded-full bg-primary transition-[height] duration-100" style={{ height: `${l * 100}%` }} />)}</div>
            <span className="text-[11px] italic text-muted-foreground">Recording…</span>
          </div>
          <button type="button" aria-label="Stop recording" onClick={() => rec.current?.stop()} className={`${iconBtn} bg-primary text-primary-foreground hover:bg-primary`}><Square className="h-4 w-4 fill-current" /></button>
        </div> : <>
          {att && <div className="animate-drop relative mb-2 overflow-hidden rounded-2xl">
            {att.kind === "photo" && <img src={preview} alt="Your photo" className="max-h-40 w-full object-cover" />}
            {att.kind === "video" && <video src={preview} muted playsInline className="max-h-40 w-full bg-muted object-cover" />}
            {att.kind === "voice" && <div className="flex items-center gap-3 bg-sage px-3 py-2"><Mic className="h-4 w-4 shrink-0 text-primary" /><audio controls src={preview} className="h-9 min-w-0 flex-1" /></div>}
            <button type="button" aria-label="Remove attachment" onClick={() => setAtt(null)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-card"><X className="h-4 w-4" /></button>
          </div>}
          <div className="flex items-end gap-1">
            <button type="button" aria-label="Add photo or video" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className={`${iconBtn} border`}><Plus className={`h-5 w-5 transition-transform duration-200 ${menu ? "rotate-45" : ""}`} /></button>
            <textarea ref={area} rows={1} aria-label="Write a moment" placeholder="Keep a little of today…" value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setMenu(false)}
              className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 font-serif text-lg leading-snug outline-none placeholder:italic placeholder:text-muted-foreground" />
            <button type="button" aria-label="Record a voice note" onClick={() => void record()} className={iconBtn}><Mic className="h-5 w-5" /></button>
            {ready && <button type="button" aria-label="Continue" onClick={send} className={`${iconBtn} animate-drop bg-primary text-primary-foreground hover:bg-primary`}><ArrowUp className="h-5 w-5" /></button>}
          </div>
        </>}
      </div>
      {message && <p role="status" className="mt-1 text-center text-xs text-destructive">{message}</p>}
      {ready && !recording && <p className="mt-1 text-center font-serif text-sm italic text-muted-foreground">Next: emojis, title &amp; story</p>}
      <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { pick("photo", e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => { pick("video", e.target.files?.[0]); e.target.value = ""; }} />
    </div>
    <SaveMomentSheet open={sheet} onOpenChange={setSheet} initial={start} onSaved={clear} />
  </>;
}
