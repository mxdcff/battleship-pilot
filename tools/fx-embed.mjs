#!/usr/bin/env node
// assets/fx/*.png+json -> the FXSHEETS block inside battleship-pilot.html (the game ships as one file)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "fx/fx.config.json"), "utf8"));
const dir = join(ROOT, cfg.out), game = join(ROOT, "battleship-pilot.html");
const sheets = {};
for (const f of readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const j = JSON.parse(readFileSync(join(dir, f), "utf8")), m = j.meta.pixelfx, name = f.slice(0, -5);
  sheets[name] = { src: "data:image/png;base64," + readFileSync(join(dir, j.meta.image)).toString("base64"),
    fw: m.frameSize[0], fh: m.frameSize[1], cols: m.columns, n: m.frames, fps: m.fps, loop: m.loop, pivot: m.pivot, k: m.downscale || 1 };
}
const html = readFileSync(game, "utf8"), A = "/*PIXELFX:BEGIN*/", B = "/*PIXELFX:END*/";
const i = html.indexOf(A), k = html.indexOf(B);
if (i < 0 || k < i) { console.error("FXSHEETS markers not found in battleship-pilot.html"); process.exit(1); }
writeFileSync(game, html.slice(0, i + A.length) + "const FXSHEETS=" + JSON.stringify(sheets) + ";" + html.slice(k));
console.log("embedded:", Object.keys(sheets).map(n => `${n} (${(sheets[n].src.length / 1024).toFixed(0)} KB)`).join(", "));
