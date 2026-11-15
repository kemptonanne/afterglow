import { Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Layers, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("name").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });
}

const tabs = [
  { to: "/wall", label: "My wall", icon: Home },
  { to: "/chapters", label: "Chapters", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const { data: profile } = useProfile();
  const initial = (profile?.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="flex items-center justify-between border-b px-5 pb-3 pt-5">
        <Link to="/wall" className="font-serif text-3xl italic text-foreground">afterglow</Link>
        <Link
          to="/profile"
          aria-label="Your profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border bg-secondary font-serif text-lg text-foreground"
        >
          {initial}
        </Link>
      </header>
      <main className="flex-1 px-5 py-6 pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md justify-around border-t bg-background/95 py-2 backdrop-blur">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 border-b-2 border-transparent px-4 pb-1 text-xs text-muted-foreground"
            activeProps={{ className: "!border-primary !text-primary font-medium" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
