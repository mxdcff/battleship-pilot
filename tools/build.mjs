#!/usr/bin/env node
// battleship-pilot.html (page body) -> dist/index.html (standalone page for itch.io) and, if `zip` exists, dist/battleship-pilot-<version>.zip
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const body = readFileSync(join(ROOT, "battleship-pilot.html"), "utf8");
const ver = (body.match(/const VERSION='([^']+)'/) || [, "dev"])[1];
const head = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes"><style>*,*::before,*::after{box-sizing:border-box}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font-size:14px}[hidden]{display:none!important}</style></head><body>';
const dist = join(ROOT, "dist"); mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, "index.html"), head + body + "</body></html>");
const zip = join(dist, `battleship-pilot-${ver}.zip`);
try { rmSync(zip, { force: true }); execFileSync("zip", ["-qj", zip, join(dist, "index.html")]); console.log(`dist/index.html, ${zip.replace(ROOT + "/", "")}`); }
catch { console.log("dist/index.html (zip not available)"); }
