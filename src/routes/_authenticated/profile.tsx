import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <section className="paper-panel rounded-2xl p-6 text-center">
      <h1 className="text-2xl">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your name and photo will be editable here.</p>
      <button onClick={signOut} className="mt-6 rounded-full border border-input px-6 py-2 text-sm">
        Sign out
      </button>
    </section>
  );
}
