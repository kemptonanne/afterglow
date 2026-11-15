# README rewrite and repo cleanup

## README
Replace the placeholder README ("Implement exactly the screenshot…") with a real one:
- What afterglow is (one-line pitch from the north star: hold onto the moments of your life and look back on them).
- Features: chat-style "Save a moment" (text, photo, video, voice), AI titles/emojis, voice transcript + summary, the wall with search and filters, chapters with download/share picture, settings and check-in schedule, Google sign-in, installable home-screen app.
- Live URL: https://afterglow-moments.lovable.app
- Tech overview: TanStack Start + React, Tailwind v4, Lovable Cloud (auth, database, private storage), Lovable AI.
- Project layout (routes, components, lib) and local dev commands (`bun install`, `bun run dev`, `bun run test`).
- Known open items: reminder emails need a sender domain; assistant (MCP) connection unfinished.

## Cleanup (unused only, nothing visible changes)
- Remove 44 unused UI kit files in `src/components/ui/` (only `sheet` and `sonner` are imported), plus `src/hooks/use-mobile.tsx` if only the sidebar used it.
- Remove unused dependencies that only those files needed (e.g. Radix packages, recharts, embla, cmdk, vaul, react-day-picker, input-otp, react-resizable-panels) — each confirmed unused by search before removal.
- Remove leftovers from the unfinished assistant setup (`@lovable.dev/mcp-js`, `use-webmcp-tool`) since no code uses them; can be re-added when that work resumes.
- Remove the unused `drizzle/` folder and `drizzle.config.ts` if nothing references them; delete stray `tsconfig.tsbuildinfo` and add it to `.gitignore`.
- Rename package from `tanstack_start_ts` to `afterglow`.
- Tidy `roadmap.md` (group finished items, keep the two open items with their blockers).

## Check
Build passes, all tests pass, and a quick phone-size click-through (wall, save sheet, chapters, settings) still works.
