import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — afterglow" },
      { name: "description", content: "Sign in to your private wall of good moments." },
      { property: "og:title", content: "Sign in — afterglow" },
      { property: "og:description", content: "Sign in to your private wall of good moments." },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-full border border-input bg-card px-5 py-3 text-sm outline-none focus:border-primary";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function google() {
    setBusy(true); setError(null); setNotice(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setError("Couldn't sign in with Google. Try again."); setBusy(false); return; }
    if (result.redirected) return;
    navigate({ to: "/wall", search: { q: "", media: [], emojis: [], from: "", to: "" }, replace: true });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: name.trim(), time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        },
      });
      if (error) setError(error.message);
      else if (data.session) navigate({ to: "/wall", search: { q: "", media: [], emojis: [], from: "", to: "" }, replace: true });
      else setNotice("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate({ to: "/wall", search: { q: "", media: [], emojis: [], from: "", to: "" }, replace: true });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-center font-serif text-5xl italic">afterglow</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">A private wall for good moments.</p>
      <form onSubmit={submit} className="paper-panel mt-8 space-y-3 rounded-2xl p-6">
        <h2 className="mb-2 text-xl">{mode === "signin" ? "Welcome back" : "Start your wall"}</h2>
        <button type="button" onClick={google} disabled={busy} style={{ background: "#FFFFFF", borderColor: "#747775", color: "#1F1F1F" }} className="flex w-full items-center justify-center gap-[10px] rounded-full border px-3 py-[10px] text-sm font-medium leading-5 disabled:opacity-60">
          <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.480-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.820z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.950 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        {mode === "signup" && (
          <input className={field} placeholder="Your name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className={field} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-primary">{notice}</p>}
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
