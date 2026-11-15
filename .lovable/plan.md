# Step 2: Data and privacy

Step 1 is confirmed working. This step sets up where moments, chapters and check-in settings are stored, plus private file storage. No new screens yet.

## What gets stored
- **Profiles** (already exist): name, photo, time zone.
- **Moments**: title (1–80 characters), 1–3 emojis, date (defaults to today, can't be in the future), optional words (up to 1000 characters), optional photo / video / voice recording, video still frame, recording length, transcript, one-line summary, transcription status (none, pending, done, failed).
- **Chapters**: title, start and end date, the ordered list of moments picked.
- **Check-in settings**: on/off (on by default), frequency (weekly by default, monthly, or custom every 1–365 days), the day custom was saved, last time an email went out. One row per person, created automatically at sign-up.

## Privacy rules
- Each person can only see and change their own rows.
- Moments can't be edited once saved, only added or deleted. Only the server can fill in the transcript and summary later.
- Two private file areas: one for moment photos, videos and recordings (100 MB per file), and one for profile photos. Each person can only reach files in their own folder. Files open through short-lived private links, never public ones.

**Done when:** a second account can't see or open anything from the first.

## Technical notes
- Tables: moments, chapters, checkin_settings with user_id uuid (no FK to auth.users), GRANTs to authenticated + service_role, RLS `auth.uid() = user_id`.
- moments: SELECT/INSERT/DELETE policies only, no UPDATE policy; server updates via service role. Title/emoji/body length checks; future-date check via trigger (not CHECK).
- checkin_settings: unique user_id, frequency check, interval_days 1–365 required only for custom; extend the signup trigger to insert a default row and backfill existing users.
- Buckets `moment-media` (private, 100MB) and `avatars` (private, 5MB) via storage tool; storage.objects policies on `(storage.foldername(name))[1] = auth.uid()::text`.
- Verify with two users via SQL role simulation.
