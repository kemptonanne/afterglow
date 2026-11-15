import { createFileRoute } from "@tanstack/react-router";
import { Wall, validateWallSearch } from "@/components/wall/Wall";
import { DemoLoader } from "@/components/wall/DemoLoader";

export const Route = createFileRoute("/_authenticated/wall")({
  validateSearch: validateWallSearch,
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <><DemoLoader /><Wall search={search} update={next => { void navigate({ search: next, replace: true, resetScroll: false }); }} /></>;
}
