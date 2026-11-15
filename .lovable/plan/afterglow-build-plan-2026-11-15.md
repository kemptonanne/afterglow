# afterglow — build plan

Following your uploaded build plan in order, one step at a time, matching the five mockups. This first round covers **Step 1: App shell, look and sign-in**; later steps follow after each check passes.

## Step 1 (this round)
- Turn on Lovable Cloud.
- Look: warm cream paper background with subtle texture, deep burgundy primary, dark brown text, brass pins; italic serif "afterglow" wordmark and serif headings, clean sans body; pill buttons/inputs with thin brown outline. All as reusable theme colors and fonts.
- Header: wordmark left, round avatar right (opens a profile page placeholder).
- Bottom tabs: My wall, Chapters, Settings — active tab burgundy with underline; placeholder content.
- Sign-in page: email + password, name asked on sign-up. Every other page requires sign-in. A profile is created with name and browser time zone.
- Phone-sized, centered on desktop.

**Done when:** you can sign up, sign out, sign in, and switch tabs.

## Next steps (later rounds, per your plan)
2 Data and privacy · 3 Save a moment · 4 My wall · 5 Moment overlay and delete · 6 Voice transcript and summary · 7 Search and filters · 8 Chapter picker · 9 Chapter screens · 10 Settings and profile · 11 Check-in emails · 12 Demo data and final pass.

The assumptions listed in your plan (weekly/monthly/custom/off check-ins, one of each media, etc.) are used as written.

## Technical notes
- Cloud auth with email/password enabled; profiles table with trigger on signup (name + time_zone from sign-up metadata), RLS own-row only.
- Protected routes under the managed `_authenticated` layout; public `/auth` route.
- Fonts via link tags (e.g. Fraunces + a clean sans), oklch tokens in styles.css.
