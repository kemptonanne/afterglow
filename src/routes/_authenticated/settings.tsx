import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — afterglow" },
      { name: "description", content: "Your check-in reminders and account settings." },
      { property: "og:title", content: "Settings — afterglow" },
      { property: "og:description", content: "Your check-in reminders and account settings." },
    ],
  }),
  component: Page,
});

type Settings = Tables<"checkin_settings">;
const key = ["checkin-settings"];

function todayInZone(timeZone: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

function Page() {
  const qc = useQueryClient();
  const [interval, setIntervalText] = useState<string | null>(null);
  const [validation, setValidation] = useState("");

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const [settings, profile] = await Promise.all([
        supabase.from("checkin_settings").select("*").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("profiles").select("time_zone").eq("id", auth.user.id).single(),
      ]);
      if (settings.error) throw settings.error;
      if (profile.error) throw profile.error;
      return {
        timeZone: profile.data.time_zone,
        settings: (settings.data ?? {
          user_id: auth.user.id, enabled: true, frequency: "weekly", interval_days: null, anchor_date: null, last_sent_at: null,
        }) as Settings,
      };
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      if (!query.data) throw new Error("Settings are not loaded.");
      const c = query.data.settings;
      const { data, error } = await supabase
        .from("checkin_settings")
        .upsert(
          {
            user_id: c.user_id,
            enabled: patch.enabled ?? c.enabled,
            frequency: patch.frequency ?? c.frequency,
            interval_days: patch.interval_days === undefined ? c.interval_days : patch.interval_days,
            anchor_date: patch.anchor_date === undefined ? c.anchor_date : patch.anchor_date,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (settings) => {
      if (query.data) qc.setQueryData(key, { ...query.data, settings });
      setIntervalText(null);
      setValidation("");
    },
  });

  if (query.isPending) return <p role="status">Loading settings…</p>;
  if (query.isError || !query.data)
    return (
      <div role="alert">
        <p>Couldn't load settings.</p>
        <button className="mt-3 underline" onClick={() => query.refetch()}>Try again</button>
      </div>
    );

  const { settings, timeZone } = query.data;
  const intervalText = interval ?? String(settings.interval_days ?? 3);
  const validInterval = /^\d+$/.test(intervalText) && Number(intervalText) >= 1 && Number(intervalText) <= 365;

  function saveCustom(force = false) {
    if (!validInterval) return setValidation("Choose a whole number from 1 to 365.");
    if (!force && settings.frequency === "custom" && Number(intervalText) === settings.interval_days) return;
    save.mutate({ frequency: "custom", interval_days: Number(intervalText), anchor_date: todayInZone(timeZone) });
  }

  return (
    <section className="space-y-5">
      <h1 className="text-3xl">Settings</h1>
      <section className="paper-panel relative rounded-2xl border p-5">
        <span aria-hidden className="brass-pin absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full" />
        <h2 className="text-2xl">Check-ins</h2>
        <p className="mt-1 text-sm text-muted-foreground">A gentle reminder to look back and keep something good.</p>

        <fieldset disabled={save.isPending} className="mt-4">
          <label className="flex items-center justify-between gap-4 border-b pb-3">
            <span>Enable check-ins</span>
            <input type="checkbox" role="switch" checked={settings.enabled}
              onChange={(e) => save.mutate({ enabled: e.target.checked })} className="h-5 w-5 accent-primary" />
          </label>
          <fieldset className="mt-3 space-y-3" disabled={!settings.enabled}>
            <legend className="mb-2">Frequency</legend>
            {([["weekly", "Weekly", "Every Monday"], ["monthly", "Monthly", "The 1st of each month"], ["custom", "Custom", "Every few days, your choice"]] as const).map(
              ([value, label, hint]) => (
                <label key={value} className="flex items-start gap-3">
                  <input type="radio" name="frequency" checked={settings.frequency === value}
                    onChange={() => { setValidation(""); if (value === "custom") saveCustom(true); else save.mutate({ frequency: value }); }}
                    className="mt-1 h-4 w-4 accent-primary" />
                  <span>
                    {label}
                    {value === "weekly" && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">Default</span>}
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ),
            )}
            {settings.frequency === "custom" && (
              <label className="ml-7 flex items-center gap-2">
                Every
                <input aria-label="Number of days between check-ins" type="number" min={1} max={365} value={intervalText}
                  onChange={(e) => { setIntervalText(e.target.value); setValidation(""); }}
                  onBlur={() => saveCustom()} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  className="w-20 rounded-full border border-input bg-card px-3 py-1.5 text-center" />
                days
              </label>
            )}
          </fieldset>
        </fieldset>
        {validation && <p role="alert" className="mt-2 text-sm text-destructive">{validation}</p>}
        {save.isError && <p role="alert" className="mt-2 text-sm text-destructive">Couldn't save. Try again.</p>}

        <div className="mt-4 border-t pt-3">
          <p className="text-sm text-muted-foreground">You can turn check-ins off anytime.</p>
          <div className="mt-3 flex items-start gap-3 rounded-xl border bg-card p-3">
            <Heart aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">How's your day going? If anything good happened, you can save it on your wall.</p>
          </div>
        </div>
        <button disabled className="mt-4 w-full cursor-not-allowed rounded-full border border-input px-4 py-2 text-sm opacity-50">
          Send me a test check-in
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Email reminders turn on once an email sender is set up.</p>
      </section>

      <section className="paper-panel rounded-2xl border p-5">
        <h2 className="border-b pb-2 text-2xl">Account</h2>
        <Link to="/profile" className="flex items-center justify-between pt-3">
          Your profile <ChevronRight aria-hidden className="h-5 w-5" />
        </Link>
      </section>
      <p className="px-4 text-center text-sm text-muted-foreground">Your moments are private. Share only the chapters you choose.</p>
    </section>
  );
}
