import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — afterglow" },
      { name: "description", content: "Check-in reminders and account options are coming next." },
      { property: "og:title", content: "Settings — afterglow" },
      { property: "og:description", content: "Check-in reminders and account options are coming next." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <section className="paper-panel rounded-2xl p-6 text-center">
      <h1 className="text-2xl">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">Check-in reminders and account options are coming next.</p>
    </section>
  );
}
