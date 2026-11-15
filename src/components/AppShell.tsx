import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Layers, Search, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AVATAR_BUCKET, signedUrl } from "@/lib/moments";

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("name, avatar_path").eq("id", u.user.id).maybeSingle();
      if (!data) return null;
      return { ...data, avatarUrl: await signedUrl(data.avatar_path, AVATAR_BUCKET) };
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
  const onWall = useRouterState({ select: (s) => s.location.pathname === "/wall" });
  const [searching, setSearching] = useState(false);
  useEffect(() => { const on = (e: Event) => setSearching(!!(e as CustomEvent<boolean>).detail); window.addEventListener("afterglow:searching", on); return () => window.removeEventListener("afterglow:searching", on); }, []);
  const hideNav = onWall && searching;
  const initial = (profile?.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-5 pb-3 pt-5">
        <Link to="/wall" search={{ q: "", media: [], emojis: [], from: "", to: "" }} className="truncate font-serif text-3xl italic text-foreground">afterglow</Link>
        <div className="flex shrink-0 items-center gap-2">
        {onWall && <button type="button" aria-label="Search your moments" onClick={() => window.dispatchEvent(new Event("afterglow:search"))} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-sage focus-visible:outline-2 focus-visible:outline-ring"><Search className="h-5 w-5" /></button>}
        <Link
          to="/profile"
          aria-label="Your profile"
          className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-sage font-serif text-lg text-foreground"
        >
          {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
        </Link>
        </div>
      </header>
      <main className={`flex-1 px-5 py-6 ${hideNav ? "pb-8" : "pb-32"}`}>
        <Outlet />
      </main>
      <nav aria-hidden={hideNav} inert={hideNav} className={`fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md justify-around border-t bg-background py-2 transition-transform duration-200 ${hideNav ? "translate-y-full" : ""}`}>
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            search={(to === "/wall" ? { q: "", media: [], emojis: [], from: "", to: "" } : {}) as never}
            className="flex flex-col items-center gap-0.5 border-b-2 border-transparent px-4 pb-1 text-xs text-muted-foreground"
            activeOptions={{ includeSearch: false }}
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
