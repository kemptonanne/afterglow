import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/chapters")({
  head: () => ({
    meta: [
      { title: "Chapters — afterglow" },
      { name: "description", content: "Little collections of your moments will live here." },
      { property: "og:title", content: "Chapters — afterglow" },
      { property: "og:description", content: "Little collections of your moments will live here." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <section className="paper-panel rounded-2xl p-6 text-center">
      <h1 className="text-2xl">Chapters</h1>
      <p className="mt-2 text-sm text-muted-foreground">Little collections of your moments will live here.</p>
    </section>
  );
}
