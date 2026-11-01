---
name: game-fx
description: Add, change or remove a pixel art effect in 배틀쉽 파일럿 (this repo). Use whenever an effect, explosion, splash, sprite animation or "pixelfx" is mentioned for this game. Covers the bake (pixelfx → PNG+JSON) → embed (into the single-file game) → play-in-game pipeline. Read the pixelfx skill too for choosing and refining effects.
---

# Effects in 배틀쉽 파일럿

The game is one HTML file (`battleship-pilot.html`), a canvas game with no build step at runtime. Effects come from
**pixelfx**, vendored at a pinned commit in `vendor/pixelfx/` (see `vendor/pixelfx/PINNED_COMMIT`). Use that
checkout for every pixelfx command; do not clone another copy.

## Pipeline

1. **Pick or make the effect** with the `pixelfx` skill, run from `vendor/pixelfx`:
   `npm run fx:list -- explosion` · `npm run fx:render -- explosions/big-explosion --out /tmp/fx` and look at the
   `contact.png` it writes.
2. **Declare it** in `fx/fx.config.json`:
   `{ "name": "bigboom", "id": "explosions/big-explosion", "fps": 10, "maxSec": 4.6, "downscale": 2, "seed": 7, "opts": {} }`
   - `name` is the key the game uses. `opts` are pixelfx options (palette, flip, size...).
   - `downscale` 2 halves the pixel size (the game draws about 1 world unit per sheet pixel). `fps` and `maxSec`
     keep the sheet small: the sheet is embedded as base64, so keep each under ~1 MB.
3. **Bake**: `npm run fx:bake` writes `assets/fx/<name>.png` (trimmed transparent frames in a grid) and
   `assets/fx/<name>.json` (Aseprite-style frames; `meta.pixelfx` has fps, frames, frameSize, columns, pivot).
   These two files are what any other engine (Unity, Godot...) would import.
4. **Embed**: `npm run fx:embed` rewrites the block between `/*PIXELFX:BEGIN*/` and `/*PIXELFX:END*/` in
   `battleship-pilot.html` with `const FXSHEETS={...}`. Never edit that block by hand. `npm run fx` does 3+4.
5. **Play it**: in game code call `playFx(name, x, z, scale)` with world coordinates. Effects update in the
   battle loop (`S.pfx`) and draw over ships in `drawPfx(cam)`, nearest-neighbour, anchored at the sheet pivot.
   Current uses: `bigboom` when the last boss sinks (scale 1.15) and when an elite flagship sinks (0.7), in `kill(e)`.
6. **Check it in the game**: build (`npm run build` → `dist/index.html`), open it in a headless browser
   (playwright), start a battle, trigger the event, and screenshot a few moments of the effect. Look at the
   screenshots before saying it works.

## Rules

- pixelfx is MIT: keep `THIRD_PARTY_NOTICES.md` up to date if new pixelfx-derived code is copied in.
- Do not use the Patch Pixel font (not MIT). It is removed from the vendored copy; do not add it back.
- To update pixelfx: `tools/pixelfx-pin.sh <commit>` then `npm run fx` and re-check effects.
