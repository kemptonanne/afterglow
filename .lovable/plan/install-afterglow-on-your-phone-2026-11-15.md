# Install Afterglow on your phone

Afterglow gets its own app icon and opens full-screen from your home screen, without the browser bars, like a real app.

## What you'll get
- **App icon:** a new afterglow icon, a burgundy italic serif "a" with a soft warm glow on cream paper, matching the app's look. It's used on the home screen, in the app switcher and as the browser tab icon.
- **Name:** "afterglow" under the icon.
- **Opens like an app:** full screen, in the cream page color, straight to your wall (or the sign-in page if you're signed out).
- **iPhone:** in Safari, tap Share → "Add to Home Screen". **Android:** Chrome offers "Install app" or "Add to Home screen".
- No offline mode, so the app still needs internet. That keeps updates instant, with no risk of an old version getting stuck on your phone. Offline mode can be added later if you want it.
- **Note:** installing only works on the published site, not inside the editor preview. After this, publish again.

## Technical details
- Generate one 1024×1024 icon image, then resize it to 512, 192 and 180 (apple-touch-icon) and a 32px favicon. Also make a 512 "maskable" version with extra safe padding so Android's round crop doesn't cut off the "a". All go in `public/icons/`.
- Add `public/manifest.webmanifest` with:
  - name/short_name "afterglow"
  - start_url "/", scope "/", display "standalone"
  - background_color and theme_color set to hex versions of the cream background and the burgundy
  - the icon list, including the maskable one
- In the head of `__root.tsx`, add: the manifest link, theme-color, apple-touch-icon, `apple-mobile-web-app-capable`, the status bar style, apple-mobile-web-app-title "afterglow", and the new favicon PNG.
- No service worker and no vite-plugin-pwa.
- Check: the manifest and icons load at their URLs, and Chrome reads the manifest correctly.
