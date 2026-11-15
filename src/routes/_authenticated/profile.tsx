import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — afterglow" },
      { name: "description", content: "Your name and photo will be editable here." },
      { property: "og:title", content: "Profile — afterglow" },
      { property: "og:description", content: "Your name and photo will be editable here." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <section className="paper-panel rounded-2xl p-6 text-center">
      <h1 className="text-2xl">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your name and photo will be editable here.</p>
    </section>
  );
}
