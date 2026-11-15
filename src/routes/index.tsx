import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "afterglow — a private wall for good moments" },
      { name: "description", content: "Save the small good moments of your life and look back on them." },
      { property: "og:title", content: "afterglow — a private wall for good moments" },
      { property: "og:description", content: "Save the small good moments of your life and look back on them." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/wall" : "/auth" });
  },
});
