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
2. **Declare it** in `fx/fx.config.json` (see the header of `tools/fx-bake.mjs` for every field):
   - `name` is the key the game uses; `id`, `fps`, `maxSec`, `seed`; `opts` are pixelfx options (palette, stone...).
   - **Make it sit in the game, not on top of it.** The game is a top-down 3/4 view with finely painted sprites
     and additive glows, while pixelfx effects are side-view pixel art. So: `downscale: 1` (native pixels, drawn
     small), `lightDownscale: 3` (glow baked as its own soft layer), `squash: ~0.82` (3/4 view), `groundFade`
     (no flat ground stripe on the sea), `smokeRamp` + `opts.palette` in the game's colors
     (fire `#8a1f14 #e0533f #ff7a3d #ffb347 #ffd75e #fff1b8`, smoke neutral grey, spray `#6f8fa6`).
   - Sheets are embedded as base64: keep color + light under ~1.3 MB per effect (`fps` 10, `maxSec` 3-4).
3. **Bake**: `npm run fx:bake` writes `assets/fx/<name>.png` (color layer, trimmed frames in a grid),
   `assets/fx/<name>-light.png` (glow layer) and `assets/fx/<name>.json` (Aseprite-style frames; `meta.pixelfx` has fps, frames, frameSize, columns, pivot).
   These two files are what any other engine (Unity, Godot...) would import.
4. **Embed**: `npm run fx:embed` rewrites the block between `/*PIXELFX:BEGIN*/` and `/*PIXELFX:END*/` in
   `battleship-pilot.html` with `const FXSHEETS={...}`. Never edit that block by hand. `npm run fx` does 3+4.
5. **Play it**: in game code call `playFx(name, x, z, scale)` with world coordinates. Effects update in the
   battle loop (`S.pfx`) and draw over ships in `drawPfx(cam)`: color layer nearest-neighbour, light layer
   additive and smoothed, both anchored at the pivot, fading over the last 5 frames. `scale` is world units per
   sheet pixel (0.5-0.75 matches the ships). When an effect replaces a game burst, drop the game's own particles
   for it so they do not double up. Current use: `bigboom` when the last boss sinks (0.75) or an elite flagship
   sinks (0.5), in `kill(e)`, which then skips its fire-puff burst.
6. **Check it in the game**: build (`npm run build` → `dist/index.html`), open it in a headless browser
   (playwright), start a battle, trigger the event, and screenshot a few moments of the effect. Look at the
   screenshots before saying it works.

## Rules

- pixelfx is MIT: keep `THIRD_PARTY_NOTICES.md` up to date if new pixelfx-derived code is copied in.
- Do not use the Patch Pixel font (not MIT). It is removed from the vendored copy; do not add it back.
- To update pixelfx: `tools/pixelfx-pin.sh <commit>` then `npm run fx` and re-check effects.
