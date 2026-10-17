# gen_store_assets.py — Flow Lines | Gazetica Studio | Sprint 5B | FL-5B-001
#
# Generates the two Play Store binary assets (NOT committed — store-assets/ is
# gitignored):
#   - store-assets/icon-512.png                 512x512  RGB
#   - store-assets/feature-graphic-1024x500.png 1024x500 RGB
#
# Pure Pillow (no aggdraw / ImageMagick / Inkscape). The mandala matches the
# in-app SplashScreen / launcher icon (VDD §4): 4 quadratic-bezier arcs over a
# faint ring with a two-tone hub, drawn by stamping round dots along each bezier.
#
# Run: python scripts/gen_store_assets.py

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "store-assets")
os.makedirs(OUT, exist_ok=True)

# ── Colours (VDD §4) ─────────────────────────────────────────────────────────
ICON_BG   = (26, 10, 60)        # #1A0A3C  icon card (per FL-5B-001, NOT #1C0E42)
DEEP_BG   = (13, 6, 32)         # #0D0620  app deepest bg (icon corners + grad left)
GRAD_R    = (28, 14, 66)        # #1C0E42  gradient right
RING      = (127, 119, 221)     # #7F77DD @ 0.2 alpha
RED       = (226, 75, 74)       # #E24B4A
BLUE      = (55, 138, 221)      # #378ADD
GREEN     = (99, 153, 34)       # #639922
YELLOW    = (239, 159, 39)      # #EF9F27
CORE      = (127, 119, 221)     # #7F77DD
CORE_LT   = (173, 167, 240)     # #ADA7F0
GOLD      = (255, 215, 0)       # #FFD700
PURPLE_LT = (173, 167, 240)     # #ADA7F0
MUTED     = (107, 92, 153)      # #6B5C99

# Arcs in the 64-unit SVG source space (p0, p1=control, p2, colour).
ARCS = [
    ((10, 32), (32, 6),  (54, 32), RED),
    ((10, 32), (32, 58), (54, 32), BLUE),
    ((32, 8),  (58, 32), (32, 56), GREEN),
    ((32, 8),  (6, 32),  (32, 56), YELLOW),
]


def qbez(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def render_icon_rgba(size):
    """Render the icon at `size`x`size` as RGBA with a rounded #1A0A3C card and
    fully transparent corners (so it can sit on any background). Geometry scales
    from the 512 reference: stroke 24, ring r208 w8, hub r56/r28, corner 22."""
    s = size / 512.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded card.
    radius = 22 * s
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=ICON_BG + (255,))

    # 64-space -> px transform (edge to edge).
    tf = lambda p: (p[0] * size / 64.0, p[1] * size / 64.0)
    cx, cy = tf((32, 32))

    # Faint ring on its own layer (semi-transparent), then composite.
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rr = 208 * s
    rw = max(1, int(round(8 * s)))
    rd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=RING + (51,), width=rw)
    img = Image.alpha_composite(img, ring)
    d = ImageDraw.Draw(img)

    # Arcs — stamp round dots along each bezier for smooth round-capped strokes.
    half = (24 * s) / 2.0
    steps = max(120, int(420 * s))
    for p0, p1, p2, col in ARCS:
        for i in range(steps + 1):
            x, y = qbez(p0, p1, p2, i / steps)
            px, py = tf((x, y))
            d.ellipse([px - half, py - half, px + half, py + half], fill=col + (255,))

    # Two-tone hub.
    for rad, col in ((56, CORE), (28, CORE_LT)):
        rp = rad * s
        d.ellipse([cx - rp, cy - rp, cx + rp, cy + rp], fill=col + (255,))

    # Re-apply the rounded mask so arcs/ring can't bleed into the transparent corners.
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", (size, size), 0), mask))
    return img


def make_icon_512():
    """Standalone store icon: rounded card flattened onto #0D0620 → RGB (no alpha)."""
    icon = render_icon_rgba(512)
    base = Image.new("RGBA", (512, 512), DEEP_BG + (255,))
    base = Image.alpha_composite(base, icon)
    out = base.convert("RGB")
    path = os.path.join(OUT, "icon-512.png")
    out.save(path, "PNG")
    return path


# ── Fonts ────────────────────────────────────────────────────────────────────
FONT_DIRS = ["C:/Windows/Fonts"]
PROJECT_FONTS = [os.path.join(ROOT, "public", "fonts")]
loaded_fonts = {}


def load_font(candidates, size, role):
    paths = []
    for d in PROJECT_FONTS + FONT_DIRS:
        for c in candidates:
            paths.append(os.path.join(d, c))
    for p in paths:
        if os.path.exists(p):
            try:
                f = ImageFont.truetype(p, size)
                loaded_fonts[role] = os.path.basename(p)
                return f
            except Exception:
                continue
    loaded_fonts[role] = "PIL default (no TTF found)"
    return ImageFont.load_default()


def make_feature_graphic():
    W, H = 1024, 500
    # Left→right linear gradient #0D0620 → #1C0E42.
    base = Image.new("RGB", (W, H))
    px = base.load()
    for x in range(W):
        t = x / (W - 1)
        r = round(DEEP_BG[0] + (GRAD_R[0] - DEEP_BG[0]) * t)
        g = round(DEEP_BG[1] + (GRAD_R[1] - DEEP_BG[1]) * t)
        b = round(DEEP_BG[2] + (GRAD_R[2] - DEEP_BG[2]) * t)
        for y in range(H):
            px[x, y] = (r, g, b)
    img = base.convert("RGBA")

    # Faint dot-grid texture (rgba(127,119,221,0.04), 3px radius, 32px spacing).
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    a = round(0.04 * 255)
    for gx in range(0, W, 32):
        for gy in range(0, H, 32):
            gd.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=RING + (a,))
    img = Image.alpha_composite(img, grid)

    icon_cx, icon_cy = 210, 250

    # Radial glow behind the icon (rgba(127,119,221,0.15) centre → transparent @200).
    GR = 200
    glow = Image.new("RGBA", (GR * 2, GR * 2), (0, 0, 0, 0))
    gp = glow.load()
    for yy in range(GR * 2):
        for xx in range(GR * 2):
            dist = ((xx - GR) ** 2 + (yy - GR) ** 2) ** 0.5
            if dist < GR:
                aa = round(0.15 * 255 * (1 - dist / GR))
                gp[xx, yy] = RING + (aa,)
    img.alpha_composite(glow, (icon_cx - GR, icon_cy - GR))

    # Icon ~200x200 (rendered at 400 then downscaled for crisp edges), alpha-pasted.
    icon = render_icon_rgba(400).resize((200, 200), Image.LANCZOS)
    img.alpha_composite(icon, (icon_cx - 100, icon_cy - 100))

    # (FL-5B-001 follow-up) Right-edge accent line removed — the spec marked it
    # "optional", and a lone thin line on one edge reads as an artifact, not a frame.

    # Text block, left-aligned from x=450, vertically centred.
    d = ImageDraw.Draw(img)
    f_title = load_font(["SpaceMono-Bold.ttf", "SpaceMono-Regular.ttf", "consolab.ttf", "consola.ttf", "arialbd.ttf", "arial.ttf"], 64, "title")
    f_sub   = load_font(["DMSans-Regular.ttf", "segoeui.ttf", "arial.ttf"], 28, "subtitle")
    f_tag   = load_font(["DMSans-Regular.ttf", "segoeui.ttf", "arial.ttf"], 20, "tagline")

    tx = 450
    line1 = "FLOW LINES"
    line2 = "Colour Connection Puzzle"
    line3 = "200 Levels · 4 Modes · Daily Challenge"

    def h(font, text):
        bb = d.textbbox((0, 0), text, font=font)
        return bb[3] - bb[1], bb[1]

    h1, o1 = h(f_title, line1)
    h2, o2 = h(f_sub, line2)
    h3, o3 = h(f_tag, line3)
    gap12, gap23 = 12, 10
    total = h1 + gap12 + h2 + gap23 + h3
    y = (H - total) // 2

    d.text((tx, y - o1), line1, font=f_title, fill=GOLD)
    y += h1 + gap12
    d.text((tx, y - o2), line2, font=f_sub, fill=PURPLE_LT)
    y += h2 + gap23
    d.text((tx, y - o3), line3, font=f_tag, fill=MUTED)

    out = img.convert("RGB")
    path = os.path.join(OUT, "feature-graphic-1024x500.png")
    out.save(path, "PNG")
    return path


print("Generating Flow Lines store assets ->", os.path.relpath(OUT, ROOT))
icon_path = make_icon_512()
feat_path = make_feature_graphic()

for p in (icon_path, feat_path):
    im = Image.open(p)
    print(f"  {os.path.relpath(p, ROOT)}  {im.size[0]}x{im.size[1]}  mode={im.mode}  {os.path.getsize(p)} bytes")
print("Fonts loaded:", loaded_fonts)
print("Done.")
