# afterglow

Hold onto the little moments of your life — and look back on them.

**Live:** https://afterglow-moments.lovable.app

## Features
- **Save a moment** from a chat-style bar: type, add a photo or video, or record a voice note.
- **AI suggestions** for a title and emojis from the photo, video, voice or text.
- **Voice transcripts and summaries**, with retry if transcription fails.
- **My wall**: a scrolling journal of moments with search, media/emoji and date filters.
- **Chapters**: group moments by date range, then download or share a picture of the chapter.
- **Settings & profile**: name, photo, time zone and check-in reminder schedule.
- **Sign in** with email/password or Google; installs to a phone home screen as an app.

## Tech
- TanStack Start (React 19, Vite) with file-based routes
- Tailwind CSS v4 (theme tokens in `src/styles.css`)
- Lovable Cloud: auth, database with per-user access rules, private media storage
- Lovable AI for transcription and title suggestions

## Project layout
```text
src/routes/                 pages (signed-in pages under _authenticated/)
src/components/wall/        wall, chat-style composer
src/components/save/        recorder and media helpers
src/components/chapters/    chapters list and chapter picture
src/components/SaveMomentSheet.tsx  save flow
src/lib/                    shared logic, server functions and tests
public/                     icons and app manifest
```

## Development
```sh
bun install
bun run dev    # http://localhost:8080
bun run test
```

## Open items
- Check-in reminder emails need a sender email domain.
- AI assistant (MCP) connection is not finished.

Built with [Lovable](https://lovable.dev/projects/60ce2aa3-6a1d-4305-8a58-99546f50e703).
