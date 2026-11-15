# Voice transcript and summary

Voice moments already get written down after you save them, and that step worked in a test today. But the opened moment shows only the one-line summary and never the full transcript. If writing it down fails, the only sign is that "Writing it down…" goes away, and there's no way to try again.

## What you'll get
- Opening a voice moment shows the player, then the summary in italics, then a **Transcript** section with everything you said.
- While it's being written down, you'll see "Writing it down…", and the moment updates by itself when it's done.
- If it fails, you'll see "Couldn't write this one down" and a **Try again** button.
- Recordings too big to write down (about 24 MB, roughly 25+ minutes) say so plainly and offer no retry. The recording is still kept.
- Voice cards on the wall keep showing the summary. Search still finds words from the transcript.

## Technical details
- In the moment view in Wall.tsx, add a collapsible transcript block with the "failed" state and a retry button that calls requestTranscription through useServerFn. Then refresh the moment and wall queries.
- In transcribe.functions.ts:
  - Return a reason ("too_large", "no_speech" or "error"). Save "too_large" as its own status so the screen knows not to offer a retry.
  - Treat a moment that's been stuck on "pending" for more than 2 minutes as failed, so it can be retried.
  - Switch `.inputValidator` to `.validator` to clear the deprecation warning.
- Signed in, in the browser: save a voice moment from a short generated speech file and confirm the transcript and summary appear. Then force a failure and confirm Try again recovers it.
