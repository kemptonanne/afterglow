import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { LIMITS } from "@/lib/moments";
import { clock } from "./media";

export type Voice = { blob: Blob; duration: number };
const MIC_DENIED = "Microphone access is off. Turn it on in your browser settings to record.";

export function VoiceRecorder({ value, onChange, onBusyChange }: {
  value: Voice | null; onChange: (v: Voice | null) => void; onBusyChange: (b: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string>();
  const recorder = useRef<MediaRecorder | null>(null);
  const started = useRef(0);

  useEffect(() => {
    if (!value) return setPreview(undefined);
    const u = URL.createObjectURL(value.blob);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setSeconds((Date.now() - started.current) / 1000), 200);
    return () => window.clearInterval(t);
  }, [recording]);

  useEffect(() => () => { if (recorder.current?.state === "recording") recorder.current.stop(); }, []);

  async function start() {
    setMessage("");
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("unsupported");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const n = e instanceof DOMException ? e.name : "";
      setMessage(n === "NotAllowedError" || n === "PermissionDeniedError" ? MIC_DENIED : "Recording isn't available in this browser.");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.current = rec;
    const chunks: Blob[] = [];
    let bytes = 0;
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.push(e.data);
      bytes += e.data.size;
      if (bytes >= LIMITS.audio && rec.state === "recording") {
        rec.stop();
        setMessage("Recording stopped automatically at the 50 MB limit.");
      }
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (blob.size) onChange({ blob, duration: Math.max(1, Math.round((Date.now() - started.current) / 1000)) });
      setRecording(false);
      onBusyChange(false);
    };
    started.current = Date.now();
    setSeconds(0);
    onChange(null);
    rec.start(250);
    setRecording(true);
    onBusyChange(true);
  }

  const btn = "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm";
  return (
    <section className="paper-panel space-y-3 rounded-2xl border p-4">
      <h3 className="text-xl">Voice</h3>
      {recording ? (
        <div className="flex items-center gap-4">
          <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
          <span role="timer" className="tabular-nums text-primary">{clock(seconds)}</span>
          <button type="button" className={`${btn} bg-primary text-primary-foreground`} onClick={() => recorder.current?.stop()}>
            <Square className="h-4 w-4" /> Stop
          </button>
        </div>
      ) : value ? (
        <>
          <audio className="w-full" controls src={preview} />
          <div className="flex gap-2">
            <button type="button" className={`${btn} border border-input`} onClick={() => void start()}>Re-record</button>
            <button type="button" className={`${btn} text-muted-foreground`} onClick={() => { onChange(null); setMessage(""); }}>Remove</button>
          </div>
        </>
      ) : (
        <button type="button" className={`${btn} bg-primary text-primary-foreground`} onClick={() => void start()}>
          <Mic className="h-4 w-4" /> Record
        </button>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
