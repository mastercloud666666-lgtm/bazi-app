#!/usr/bin/env python3
"""Render the opaque "TZ" home-screen icon used by iOS.

iOS composites apple-touch-icon over black, so the source must carry no alpha
at all -- the existing images/icon-*.png are RGBA with transparent corners and
would show up as a black square on the home screen. This writes a truecolor PNG
(no alpha channel) with the navy bleeding to every edge; iOS applies its own
rounded-rect mask on top.

Stdlib only (zlib + struct), so it runs anywhere python3 does. Unlike the older
gen_icons.py this needs no Pillow.

    python3 scripts/gen_app_icons.py [output_dir]
"""
import os
import struct
import sys
import zlib

NAVY = (0x0A, 0x25, 0x40)  # --ink in tengyunzi-clean.css
WHITE = (0xFF, 0xFF, 0xFF)
TARGETS = [
    ("apple-touch-icon.png", 180),
    # manifest.json declares these "any maskable". Android may crop up to 20% on
    # each side, so the wordmark has to sit inside the 80%-diameter safe circle:
    # its half-diagonal is sqrt(0.28^2 + 0.15^2) = 0.32 of the icon, under 0.4.
    # These were RGBA with a transparent corner, which Android renders as black.
    ("icon-192.png", 192),
    ("icon-512.png", 512),
]
SUPERSAMPLE = 3


def _chunk(kind, data):
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def encode_png(width, height, rgb):
    """Truecolor 8-bit PNG, one filter byte (0 = None) per scanline."""
    stride = width * 3
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw += rgb[y * stride:(y + 1) * stride]
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _chunk(b"IEND", b"")
    )


def build_glyph_test(size):
    """Return a point-in-wordmark test for "TZ".

    Matches the .brand-mark "TZ" in the site nav. Both letters are straight-line
    only, so each glyph is a couple of rectangles plus one sheared band for the
    Z diagonal -- no font rasterizer needed.
    """
    mark_width = 0.56 * size
    mark_height = 0.30 * size
    glyph_width = 0.24 * size
    stroke = 0.062 * size
    left = (size - mark_width) / 2
    top = (size - mark_height) / 2
    t_x = left
    z_x = left + glyph_width + 0.08 * size
    inner_top = top + stroke
    inner_bottom = top + mark_height - stroke
    diag_half = stroke * 0.62  # widened so the slant reads as evenly thick

    def is_ink(x, y):
        if y < top or y > top + mark_height:
            return False

        # T: top bar plus centered stem.
        if t_x <= x <= t_x + glyph_width:
            if y <= top + stroke:
                return True
            if abs(x - (t_x + glyph_width / 2)) <= stroke / 2:
                return True

        # Z: top bar, bottom bar, and the diagonal between them.
        if z_x <= x <= z_x + glyph_width:
            if y <= top + stroke:
                return True
            if y >= inner_bottom:
                return True
            frac = (y - inner_top) / (inner_bottom - inner_top)
            center_x = (z_x + glyph_width - stroke / 2) + frac * (
                (z_x + stroke / 2) - (z_x + glyph_width - stroke / 2)
            )
            if abs(x - center_x) <= diag_half:
                return True

        return False

    return is_ink


def render(size):
    is_ink = build_glyph_test(size)
    rgb = bytearray(size * size * 3)
    step = 1.0 / SUPERSAMPLE
    samples = SUPERSAMPLE * SUPERSAMPLE

    for y in range(size):
        for x in range(size):
            hits = 0
            for sy in range(SUPERSAMPLE):
                for sx in range(SUPERSAMPLE):
                    if is_ink(x + (sx + 0.5) * step, y + (sy + 0.5) * step):
                        hits += 1
            coverage = hits / samples
            offset = (y * size + x) * 3
            for c in range(3):
                rgb[offset + c] = round(NAVY[c] + (WHITE[c] - NAVY[c]) * coverage)
    return encode_png(size, size, bytes(rgb))


def main():
    out_dir = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "public/images")
    os.makedirs(out_dir, exist_ok=True)
    for name, size in TARGETS:
        path = os.path.join(out_dir, name)
        with open(path, "wb") as handle:
            handle.write(render(size))
        print(f"wrote {path} ({size}x{size}, no alpha)")


if __name__ == "__main__":
    main()
