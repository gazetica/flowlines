# gen_icon.py — Flow Lines launcher icon generator (FL Day 18, Task 18.1-18.2)
# Recreates the SplashScreen mandala (VDD Section 4) with PIL and exports the
# Play Console 512 master + all Android launcher densities (legacy, round,
# adaptive foreground). No SVG rasteriser available, so the mandala is drawn
# mathematically (quadratic beziers stamped as round-capped strokes).
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# --- VDD colours (64-unit source space, matches SplashScreen.tsx SVG) ---
BG       = (28, 14, 66, 255)      # #1C0E42 purple card
RING     = (127, 119, 221, 51)    # rgba(127,119,221,0.2) faint ring
RED      = (226, 75, 74, 255)     # #E24B4A
BLUE     = (55, 138, 221, 255)    # #378ADD
GREEN    = (99, 153, 34, 255)     # #639922
YELLOW   = (239, 159, 39, 255)    # #EF9F27
CORE     = (127, 119, 221, 255)   # #7F77DD
CORE_LT  = (173, 167, 240, 255)   # #ADA7F0

ARCS = [
    ((10, 32), (32, 6),  (54, 32), RED),
    ((10, 32), (32, 58), (54, 32), BLUE),
    ((32, 8),  (58, 32), (32, 56), GREEN),
    ((32, 8),  (6, 32),  (32, 56), YELLOW),
]
STROKE = 2.5  # in 64-space


def qbez(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def render(canvas_px, tf, scale64, with_bg):
    """Render the mandala at canvas_px using transform tf (maps 64-space -> px)
    and scale64 (px per 64-unit) for stroke sizing. with_bg draws the rounded
    purple card; otherwise the background stays transparent (adaptive fg)."""
    img = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if with_bg:
        r = 12 * scale64
        x0, y0 = tf((0, 0))
        x1, y1 = tf((64, 64))
        d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=r, fill=BG)

    # Faint ring (semi-transparent) on its own layer, then composite.
    ring = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    cx, cy = tf((32, 32))
    rr = 22 * scale64
    rw = max(1, int(round(1 * scale64)))
    rd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=RING, width=rw)
    img = Image.alpha_composite(img, ring)
    d = ImageDraw.Draw(img)

    # Arcs: stamp filled circles along the bezier for smooth round-capped strokes.
    half = STROKE * scale64 / 2.0
    for p0, p1, p2, col in ARCS:
        steps = 260
        for i in range(steps + 1):
            t = i / steps
            x, y = qbez(p0, p1, p2, t)
            px, py = tf((x, y))
            d.ellipse([px - half, py - half, px + half, py + half], fill=col)

    # Core dots.
    for rad, col in ((6, CORE), (3, CORE_LT)):
        rp = rad * scale64
        d.ellipse([cx - rp, cy - rp, cx + rp, cy + rp], fill=col)

    return img


def make_full(master_px):
    """Full icon: 64-space mapped edge-to-edge with the purple card background."""
    s = master_px / 64.0
    tf = lambda p: (p[0] * s, p[1] * s)
    return render(master_px, tf, s, with_bg=True)


def make_foreground(master_px):
    """Adaptive foreground: mandala scaled into the central 72dp safe zone of a
    108dp canvas, transparent background."""
    # 108-space canvas; map 64-space art into 72 units centred at (54,54).
    inner = 72.0 / 64.0          # 64-space -> 108-space units
    u = master_px / 108.0        # 108-space units -> px
    def tf(p):
        x108 = 54 + (p[0] - 32) * inner
        y108 = 54 + (p[1] - 32) * inner
        return (x108 * u, y108 * u)
    scale64 = inner * u          # px per 64-unit (for stroke sizing)
    return render(master_px, tf, scale64, with_bg=False)


def circle_crop(img):
    """Mask an icon to a circle (for ic_launcher_round.png legacy)."""
    n = img.size[0]
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, n - 1, n - 1], fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def save(img, size, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path, "PNG")
    print("  ->", os.path.relpath(path, ROOT), f"{size}x{size}")


# Density -> (legacy/round px, foreground px)
DENS = {
    "mdpi":    (48, 108),
    "hdpi":    (72, 162),
    "xhdpi":   (96, 216),
    "xxhdpi":  (144, 324),
    "xxxhdpi": (192, 432),
}

print("Rendering masters...")
full_master = make_full(2048)      # legacy + round + 512 store master
fg_master = make_foreground(2160)  # adaptive foreground
round_master = circle_crop(full_master)

print("512 Play Console master:")
save(full_master, 512, os.path.join(ROOT, "android", "app", "src", "main", "ic_launcher-playstore.png"))

print("Launcher densities:")
for dens, (legacy, fg) in DENS.items():
    folder = os.path.join(RES, f"mipmap-{dens}")
    save(full_master,  legacy, os.path.join(folder, "ic_launcher.png"))
    save(round_master, legacy, os.path.join(folder, "ic_launcher_round.png"))
    save(fg_master,    fg,     os.path.join(folder, "ic_launcher_foreground.png"))

print("Done.")
