# Chapter image export

Chapter screens already show "Download chapter" and "Share chapter" buttons, but nobody has tested them yet. This plan makes them dependable and checks that they produce a real image.

## What you'll get
- **Download chapter** saves a tall 1080x1920 picture of the chapter, sized like a phone story. It shows the afterglow name, the chapter title, the dates, the pinned moment cards with their photos, and "Little moments, kept." at the bottom.
- **Download** and **Share** are two separate buttons. Download saves the picture to your device.
- **Share** opens your phone's share menu so you can send a copy to Instagram, WhatsApp, Messages, TikTok, Facebook and other apps on your phone. Apps can't be posted to directly from a website, so you pick the app in that menu.
- On computers that have no share menu, Share downloads the picture and shows "Picture saved. Post it from your photos."
- The picture is made in advance, so Share opens right away and the phone doesn't block it.
- Both buttons work on a new chapter preview and on a saved chapter.
- If one photo fails to load, the picture still comes out with a "Picture unavailable" card in that spot.
- Chapters with lots of moments fit on the picture: cards get smaller when needed, and if there are more than 12 moments, a "+N more" note appears.
- Voice and text moments appear as paper quote cards.

## Technical details
- Keep the hidden fixed-size poster and the existing html-to-image export in ChapterPreview.
- Fetch each signed photo as a blob and turn it into a data URL before rendering, so the export doesn't depend on storage cross-origin settings. Video moments use their poster image.
- If an image fails, swap in the placeholder instead of stopping the whole export.
- Pick 3 or 4 columns based on how many moments there are, and show at most 12 tiles on the poster.
- Make the PNG in advance (when the preview loads or the first button is tapped) and keep it ready. Share then calls navigator.share({files}) immediately, so the phone doesn't block it for coming too late after the tap.
- Retry the html-to-image render once, because the first render in Safari sometimes comes out without images.
- Add a unit test for the column and tile-limit choice.
- Check with Playwright as a signed-in user: create a chapter, click Download, and confirm the saved PNG is 1080x1920, not empty, and shows the photos.
