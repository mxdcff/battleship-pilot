#!/usr/bin/env python3
"""Shrink baked sprite sheets ~4x: 256-color palette PNG with alpha (Pillow).
Called by tools/fx-bake.mjs; skipped there if Python or Pillow is missing.
usage: python3 tools/fx-quantize.py file.png [...]"""
import os, sys
from PIL import Image
for f in sys.argv[1:]:
    a = os.path.getsize(f)
    im = Image.open(f).convert("RGBA")
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(f, optimize=True)
    print(f"  {os.path.basename(f)}: {a // 1024} -> {os.path.getsize(f) // 1024} KB")
