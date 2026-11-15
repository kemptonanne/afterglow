# AI-suggested titles and emojis

When you add a photo, video or voice note while saving a moment, afterglow looks at it and fills in a short title and 1–3 emojis for you. You can always change them before saving.

## What you'll get
- **Photo:** a few seconds after you pick it, the title box and emojis fill in, for example "Sunset picnic with Maya 🌅🧺".
- **Video:** the suggestion comes from the video's first frame (the same picture shown on the card).
- **Voice note:** when you finish recording, it's written down first. The title and emojis come from what you said.
- **Only fills empty fields:** if you've already typed a title or picked emojis, they're left alone. A small "✨ Suggest" button next to the title asks for a fresh idea at any time.
- While it's thinking, the title box says "Thinking of a title…". You can still type, and saving is never blocked.
- If the suggestion fails, nothing changes and no error pops up. You just fill it in yourself.
- Titles stay under 80 characters and use 1–3 emojis, matching the existing rules.

## Technical details
- New authenticated server function `suggestMomentMeta` (requireSupabaseAuth) in `src/lib/suggest.functions.ts`. It takes either a small image (the photo or video poster, shrunk in the browser to about 768px JPEG and sent as a data URL) or a short audio clip.
  - Images go to the default model (openai/gpt-6-astra) with the picture attached.
  - Audio is transcribed with openai/gpt-transcribe, then the text goes to the same model.
  - The model is asked for JSON `{ title, emojis }`. The server trims the title to 80 characters, keeps only real emoji characters, and limits them to 1–3.
- The voice-note transcript made here is not saved. The existing transcript step still runs after the moment is saved, so the transcript and summary flow stays as it is.
- In SaveMomentSheet: start a suggestion when a photo, video or voice note is added, keep only the latest request, and fill title and emojis only if they are still empty. Add the "✨ Suggest" button.
- A unit test for cleaning up the model's reply: the 80-character title limit, emoji-only filtering, and the 1–3 count.
- Check in the browser, signed in: pick a test photo and confirm the title and emojis fill in, then save.

## Also: date box fix
- On iPhone, the Date box on "Save a moment" runs past the right edge of the screen. It will be made to fit the screen width, lined up with the other boxes. The date boxes on Chapters and in the date filter get the same fix.
- Technical: iOS Safari gives date inputs a minimum width of their own. Add `min-w-0 max-w-full appearance-none` to these inputs, plus a small global rule for `input[type=date]` (`-webkit-appearance: none; min-width: 0;` and left-aligned date text). Check at a 390px-wide phone screen size.
