#!/usr/bin/env node
// pixelfx effect -> trimmed sprite sheet (PNG + Aseprite-style JSON) in assets/fx/
//   node tools/fx-bake.mjs            bake every effect in fx/fx.config.json
//   node tools/fx-bake.mjs bigboom    bake one by name
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "fx/fx.config.json"), "utf8"));
const PFX = join(ROOT, cfg.pixelfx);
const { loadEffect, renderFrames } = await import(pathToFileURL(join(PFX, "tools/lib/fxlib.mjs")));
const { encodePNG } = await import(pathToFileURL(join(PFX, "tools/lib/png.mjs")));
const want = process.argv.slice(2);

function down(rgba, w, h, k) { // premultiplied box filter, k x k
  if (k <= 1) return { px: rgba, w, h };
  const W = Math.floor(w / k), H = Math.floor(h / k), o = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const s = ((y * k + j) * w + x * k + i) * 4, al = rgba[s + 3];
      r += rgba[s] * al; g += rgba[s + 1] * al; b += rgba[s + 2] * al; a += al;
    }
    const d = (y * W + x) * 4;
    if (a > 0) { o[d] = r / a; o[d + 1] = g / a; o[d + 2] = b / a; o[d + 3] = a / (k * k); }
  }
  return { px: o, w: W, h: H };
}

for (const e of cfg.effects) {
  if (want.length && !want.includes(e.name)) continue;
  const fx = await loadEffect(e.id, join(PFX, "src/fx"));
  const r = renderFrames(fx, { fps: e.fps, seed: e.seed, bg: "none", actor: false, options: e.opts });
  let frames = r.frames.map(f => down(f.clear, r.w, r.h, e.downscale || 1));
  const fw = frames[0].w, fh = frames[0].h;
  if (e.maxSec) frames = frames.slice(0, Math.round(e.maxSec * e.fps));
  while (frames.length > 1 && !frames[frames.length - 1].px.some((v, i) => i % 4 === 3 && v > 8)) frames.pop();
  // union bounding box of visible pixels
  let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
  for (const f of frames) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (f.px[(y * fw + x) * 4 + 3] > 8) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, n = frames.length;
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * ch) / cw)))), rows = Math.ceil(n / cols);
  const sheet = new Uint8ClampedArray(cols * cw * rows * ch * 4), SW = cols * cw;
  const json = { frames: [], meta: {} };
  frames.forEach((f, i) => {
    const ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const s = ((y + y0) * fw + x + x0) * 4, d = ((oy + y) * SW + ox + x) * 4;
      sheet[d] = f.px[s]; sheet[d + 1] = f.px[s + 1]; sheet[d + 2] = f.px[s + 2]; sheet[d + 3] = f.px[s + 3];
    }
    json.frames.push({ filename: `${e.name} ${i}`, frame: { x: ox, y: oy, w: cw, h: ch }, rotated: false, trimmed: true,
      spriteSourceSize: { x: x0, y: y0, w: cw, h: ch }, sourceSize: { w: fw, h: fh }, duration: Math.round(1000 / e.fps) });
  });
  const k = e.downscale || 1, piv = fx.meta.origin;
  json.meta = { app: "https://github.com/patch-gg/pixelfx", version: "1", image: `${e.name}.png`, format: "RGBA8888",
    size: { w: SW, h: rows * ch }, scale: String(1 / k),
    frameTags: [{ name: e.name, from: 0, to: n - 1, direction: "forward" }],
    pixelfx: { id: e.id, name: fx.meta.name, fps: e.fps, loop: fx.meta.loop, frames: n, frameSize: [cw, ch], columns: cols,
      pivot: [Math.round(piv[0] / k) - x0, Math.round(piv[1] / k) - y0], downscale: k } };
  const out = join(ROOT, cfg.out); mkdirSync(out, { recursive: true });
  const png = encodePNG(SW, rows * ch, sheet);
  writeFileSync(join(out, `${e.name}.png`), png);
  writeFileSync(join(out, `${e.name}.json`), JSON.stringify(json, null, 1));
  console.log(`${e.name} <- ${e.id}: ${n} frames ${cw}x${ch} @${e.fps}fps, sheet ${SW}x${rows * ch}, ${(png.length / 1024).toFixed(0)} KB`);
}
