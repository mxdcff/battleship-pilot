# 배틀쉽 파일럿

Pixel naval roguelike inspired by the WC3 custom map 배틀쉽. HTML5 canvas, Korean UI, mobile and PC.

- `battleship-pilot.html` is the whole game: the page body (style, markup, one script). It is published as-is to
  a Claude artifact; `npm run build` wraps it into `dist/index.html` (+ zip) for itch.io.
- Keep the game a single file with no runtime dependencies. Images are drawn in code or embedded as data URIs.
- Bump `const VERSION` for every release.
- Effects: use the `game-fx` skill (pipeline) and the `pixelfx` skill (picking and refining effects).
  pixelfx is vendored at a pinned commit in `vendor/pixelfx/`. Do not use the Patch Pixel font.
- Third-party credits go in `THIRD_PARTY_NOTICES.md`.
- Play feedback and gameplay logs arrive in the owner's Google Form (anonymous). Respond in Korean.
- Before saying a change works, build it and check it in a headless browser (playwright): no page errors, and a
  screenshot of the changed scene.
