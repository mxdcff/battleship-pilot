# Local changes to this vendored copy

Pinned upstream: https://github.com/patch-gg/pixelfx at commit a84159688af3ca37a4be05a0d422b94451b2e24e (pixelfx 0.3.0).

- Removed `gallery/fonts/` (Patch Pixel is not MIT-licensed; this project does not use it).
- Removed the Patch Pixel `@font-face` from `gallery/style.css` and its embedding from `tools/build-gallery.mjs`.
- Removed `docs/readme/` (README preview images, 12 MB).
- Nothing in `src/` or `tools/lib/` was changed.

To move to a newer pixelfx, run `tools/pixelfx-pin.sh <commit>` from the repository root.
