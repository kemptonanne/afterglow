import { ChaptersPage } from "@/components/chapters/ChaptersPage";
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
  return <ChaptersPage />;
}
