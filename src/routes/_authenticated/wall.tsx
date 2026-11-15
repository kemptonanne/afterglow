import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/wall")({
  head: () => ({
    meta: [
      { title: "My wall — afterglow" },
      { name: "description", content: "Your good moments will be pinned here." },
      { property: "og:title", content: "My wall — afterglow" },
      { property: "og:description", content: "Your good moments will be pinned here." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <section className="paper-panel rounded-2xl p-6 text-center">
      <h1 className="text-2xl">My wall</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your good moments will be pinned here.</p>
    </section>
  );
}
