import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      else if (data.session) navigate({ to: "/wall", replace: true });
      else setNotice("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate({ to: "/wall", replace: true });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-center font-serif text-5xl italic">afterglow</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">A private wall for good moments.</p>
      <form onSubmit={submit} className="paper-panel mt-8 space-y-3 rounded-2xl p-6">
        <h2 className="mb-2 text-xl">{mode === "signin" ? "Welcome back" : "Start your wall"}</h2>
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
