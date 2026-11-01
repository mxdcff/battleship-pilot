#!/usr/bin/env bash
# Re-vendor pixelfx at a fixed commit:  tools/pixelfx-pin.sh <commit-sha>
# Keeps the same local changes as vendor/pixelfx/LOCAL_CHANGES.md (no Patch Pixel font, no README images).
set -euo pipefail
SHA="${1:?usage: tools/pixelfx-pin.sh <commit-sha>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git clone -q https://github.com/patch-gg/pixelfx "$TMP/pixelfx"
git -C "$TMP/pixelfx" checkout -q "$SHA"
rm -rf "$TMP/pixelfx/.git" "$TMP/pixelfx/gallery/fonts" "$TMP/pixelfx/docs/readme" "$TMP/pixelfx/records"
python3 - "$TMP/pixelfx" <<'PY'
import sys,re,os
d=sys.argv[1]
p=os.path.join(d,'gallery/style.css'); s=open(p).read()
s=re.sub(r'@font-face\s*\{[^}]*\}','/* Patch Pixel @font-face removed */',s,count=1).replace('"Patch Pixel", ','')
open(p,'w').write(s)
p=os.path.join(d,'tools/build-gallery.mjs'); t=open(p).read()
t=re.sub(r'const font = readFileSync\(join\(G, "fonts", "PatchPixel-Regular.woff2"\)\)\.toString\("base64"\);','',t)
t=re.sub(r'\.replace\("url\(fonts/PatchPixel-Regular\.woff2\)", `url\(data:font/woff2;base64,\$\{font\}\)`\)','',t)
open(p,'w').write(t)
PY
cp "$ROOT/vendor/pixelfx/LOCAL_CHANGES.md" "$TMP/pixelfx/LOCAL_CHANGES.md"
sed -i "s/at commit [0-9a-f]\{7,40\}/at commit $SHA/" "$TMP/pixelfx/LOCAL_CHANGES.md"
rm -rf "$ROOT/vendor/pixelfx"; mv "$TMP/pixelfx" "$ROOT/vendor/pixelfx"
echo "$SHA" > "$ROOT/vendor/pixelfx/PINNED_COMMIT"
cp "$ROOT/vendor/pixelfx/skills/pixelfx/SKILL.md" "$ROOT/.claude/skills/pixelfx/SKILL.md"
echo "pixelfx pinned to $SHA. Re-bake: npm run fx"
