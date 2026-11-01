#!/usr/bin/env node
// pixelfx effect -> sprite sheets in assets/fx/ that sit right in the game:
//   <name>.png        color layer (smoke, fire, debris), alpha, drawn normally, nearest-neighbour
//   <name>-light.png  light layer (glow), drawn additively and smoothed, like the game's own glows
//   <name>.json       Aseprite-style frames; meta.pixelfx has fps, frames, frameSize, columns, pivot, light
//   node tools/fx-bake.mjs            bake every effect in fx/fx.config.json
//   node tools/fx-bake.mjs bigboom    bake one by name
//
// Per-effect options in fx.config.json (all optional):
//   fps, maxSec, seed, opts (pixelfx options: palette, stone, ...)
//   downscale        color layer pixel size (1 = native; 2 halves it)
//   lightDownscale   light layer pixel size (glow is soft, 2-4 is fine)
//   squash           vertical scale, for the game's top-down 3/4 view (e.g. 0.82)
//   groundFade       {above, r0, r1}: near the ground line (within `above` px), fade pixels from r0 to r1 px
//                    left/right of the pivot, so side-view ground fires do not draw a flat stripe on the sea
//   smokeRamp        hex colors dark -> light; grey (unsaturated) color pixels are remapped onto it
//   startSec         skip the effect's lead-in (e.g. start a lightning strike just before the bolt lands)
//   --no-quantize    keep full RGBA PNGs (otherwise a 256-color pass shrinks them ~4x)
//   glow             strength of the additive light layer in the game (0..1, default 0.9)
//   variants         [{seed, opts}, ...]: bake several takes; the game picks one at random each time it plays.
//                    Files are <name>-v<i>.png / -v<i>-light.png / -v<i>.json. Without it: one take, -v0.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "fx/fx.config.json"), "utf8"));
const PFX = join(ROOT, cfg.pixelfx);
const { loadEffect, renderFrames } = await import(pathToFileURL(join(PFX, "tools/lib/fxlib.mjs")));
const { encodePNG } = await import(pathToFileURL(join(PFX, "tools/lib/png.mjs")));
const args = process.argv.slice(2), noQ = args.includes("--no-quantize"), want = args.filter(a => !a.startsWith("--")), written = [];
const hexRGB = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };

// Uint32 ABGR buffers -> RGBA bytes
function colorRGBA(raw) { const o = new Uint8ClampedArray(raw.length * 4); for (let i = 0; i < raw.length; i++) { const c = raw[i]; o[i * 4] = c & 255; o[i * 4 + 1] = c >>> 8 & 255; o[i * 4 + 2] = c >>> 16 & 255; o[i * 4 + 3] = c >>> 24; } return o; }
function lightRGBA(L) { const o = new Uint8ClampedArray(L.length * 4); for (let i = 0; i < L.length; i++) { const l = L[i]; const r = l & 255, g = l >>> 8 & 255, b = l >>> 16 & 255; o[i * 4] = r; o[i * 4 + 1] = g; o[i * 4 + 2] = b; o[i * 4 + 3] = (r | g | b) ? 255 : 0; } return o; }

function resample(px, w, h, k, sy) { // box filter by k in x, k/sy in y (premultiplied); k>=1, sy<=1
  const W = Math.max(1, Math.round(w / k)), H = Math.max(1, Math.round(h * sy / k)), o = new Uint8ClampedArray(W * H * 4);
  const fx = w / W, fy = h / H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = Math.floor(y * fy); yy < Math.min(h, Math.ceil((y + 1) * fy)); yy++)
      for (let xx = Math.floor(x * fx); xx < Math.min(w, Math.ceil((x + 1) * fx)); xx++) {
        const s = (yy * w + xx) * 4, al = px[s + 3]; r += px[s] * al; g += px[s + 1] * al; b += px[s + 2] * al; a += al; n++;
      }
    const d = (y * W + x) * 4; if (a > 0) { o[d] = r / a; o[d + 1] = g / a; o[d + 2] = b / a; o[d + 3] = a / n; }
  }
  return { px: o, w: W, h: H };
}

function smoke(px, ramp) {
  if (!ramp) return; const R = ramp.map(hexRGB), n = R.length - 1;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue; const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > 46) continue; // fire, embers: keep
    const t = Math.min(0.999, (0.3 * r + 0.55 * g + 0.15 * b) / 200) * n, k = Math.floor(t), f = t - k;
    const w = 1 - (mx - mn) / 46; // blend less as saturation rises
    for (let c = 0; c < 3; c++) px[i + c] = px[i + c] * (1 - w) + (R[k][c] * (1 - f) + R[k + 1][c] * f) * w;
  }
}

function groundFade(px, w, h, gf, pivot) {
  if (!gf) return;
  for (let y = 0; y < h; y++) { const up = pivot[1] - y; if (up > gf.above) continue; const v = Math.max(0, up) / gf.above;
    const r0 = gf.r0 + (gf.r1 - gf.r0) * v * 0.5, r1 = gf.r1 + (gf.r1 - gf.r0) * v;
    for (let x = 0; x < w; x++) { const d = Math.abs(x - pivot[0]); if (d <= r0) continue; const k = d >= r1 ? 0 : 1 - (d - r0) / (r1 - r0); px[(y * w + x) * 4 + 3] *= k; } }
}

function pack(frames, fw, fh, box) {
  const [x0, y0, x1, y1] = box, cw = x1 - x0 + 1, ch = y1 - y0 + 1, n = frames.length;
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * ch) / cw)))), rows = Math.ceil(n / cols), SW = cols * cw;
  const sheet = new Uint8ClampedArray(SW * rows * ch * 4);
  frames.forEach((f, i) => { const ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const s = ((y + y0) * fw + x + x0) * 4, d = ((oy + y) * SW + ox + x) * 4; for (let c = 0; c < 4; c++) sheet[d + c] = f.px[s + c]; } });
  return { png: encodePNG(SW, rows * ch, sheet), cols, cw, ch, SW, SH: rows * ch };
}
function bbox(frames, w, h, thr = 6) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const f of frames) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f.px[(y * w + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? [0, 0, 0, 0] : [x0, y0, x1, y1];
}

const out = join(ROOT, cfg.out); mkdirSync(out, { recursive: true });
for (const e of cfg.effects) {
  if (want.length && !want.includes(e.name)) continue;
  const fx = await loadEffect(e.id, join(PFX, "src/fx"));
  const vars = e.variants || [{ seed: e.seed }];
  for (let vi = 0; vi < vars.length; vi++) {
  const V = vars[vi], tag = `${e.name}-v${vi}`;
  const r = renderFrames(fx, { fps: e.fps, seed: V.seed ?? e.seed, bg: "none", actor: false, options: { ...(e.opts || {}), ...(V.opts || {}) } });
  let raw = r.frames; const s0 = Math.round((e.startSec || 0) * e.fps); if (e.maxSec) raw = raw.slice(s0, Math.round(e.maxSec * e.fps) + 1); else raw = raw.slice(s0);
  const k = e.downscale || 1, kl = e.lightDownscale || k, sq = e.squash || 1, pv = fx.meta.origin;
  // color layer
  let col = raw.map(f => { const px = colorRGBA(f.raw); smoke(px, e.smokeRamp); groundFade(px, r.w, r.h, e.groundFade, pv); return resample(px, r.w, r.h, k, sq); });
  const cw0 = col[0].w, ch0 = col[0].h;
  while (col.length > 1 && bbox([col[col.length - 1]], cw0, ch0)[2] === 0) col.pop();
  const n = col.length, cb = bbox(col, cw0, ch0), C = pack(col, cw0, ch0, cb);
  // light layer, same frames, same world box
  const lit = raw.slice(0, n).map(f => { const px = lightRGBA(f.light); groundFade(px, r.w, r.h, e.groundFade, pv); return resample(px, r.w, r.h, kl, sq); });
  const lw0 = lit[0].w, lh0 = lit[0].h, lb = bbox(lit, lw0, lh0, 2), Lp = pack(lit, lw0, lh0, lb);
  const pivC = [Math.round(pv[0] / k) - cb[0], Math.round(pv[1] * sq / k) - cb[1]];
  const pivL = [Math.round(pv[0] / kl) - lb[0], Math.round(pv[1] * sq / kl) - lb[1]];
  const json = { frames: [], meta: {} };
  for (let i = 0; i < n; i++) json.frames.push({ filename: `${tag} ${i}`, frame: { x: (i % C.cols) * C.cw, y: Math.floor(i / C.cols) * C.ch, w: C.cw, h: C.ch }, rotated: false, trimmed: true,
    spriteSourceSize: { x: cb[0], y: cb[1], w: C.cw, h: C.ch }, sourceSize: { w: cw0, h: ch0 }, duration: Math.round(1000 / e.fps) });
  json.meta = { app: "https://github.com/patch-gg/pixelfx", version: "1", image: `${tag}.png`, format: "RGBA8888", size: { w: C.SW, h: C.SH }, scale: String(1 / k),
    frameTags: [{ name: tag, from: 0, to: n - 1, direction: "forward" }],
    pixelfx: { id: e.id, effect: e.name, variant: vi, seed: V.seed ?? e.seed, name: fx.meta.name, fps: e.fps, loop: fx.meta.loop, frames: n, frameSize: [C.cw, C.ch], columns: C.cols, pivot: pivC, downscale: k, squash: sq,
      light: { image: `${tag}-light.png`, frameSize: [Lp.cw, Lp.ch], columns: Lp.cols, pivot: pivL, downscale: kl, blend: "additive", glow: e.glow ?? 0.9 } } };
  writeFileSync(join(out, `${tag}.png`), C.png); writeFileSync(join(out, `${tag}-light.png`), Lp.png); written.push(join(out, `${tag}.png`), join(out, `${tag}-light.png`));
  writeFileSync(join(out, `${tag}.json`), JSON.stringify(json, null, 1));
  console.log(`${tag} <- ${e.id}: ${n} frames @${e.fps}fps · color ${C.cw}x${C.ch} ${(C.png.length / 1024).toFixed(0)} KB · light ${Lp.cw}x${Lp.ch} ${(Lp.png.length / 1024).toFixed(0)} KB`);
  }
}
// 256-color palette pass (about 4x smaller, visually the same for pixel art). Needs python3 + Pillow.
if (!noQ && written.length) {
  const q = spawnSync("python3", [join(ROOT, "tools/fx-quantize.py"), ...written], { encoding: "utf8" });
  if (q.status === 0) process.stdout.write(q.stdout); else console.warn("palette pass skipped (python3 + Pillow not available):", (q.stderr || q.error || "").toString().split("\n")[0]);
}
