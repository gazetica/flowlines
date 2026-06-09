#!/usr/bin/env python3
# generate_icon.py
# Numtap | Gazetica Studio | Task F-004
#
# Generates the Numtap app icon (gold rounded square + navy "N" lettermark) for
# every Android mipmap density. Two layer sets are produced:
#
#  1. Legacy launcher icons (pre-Android-8 + Play Store fallback):
#       mipmap-<d>/ic_launcher.png and ic_launcher_round.png
#       = gold rounded square (transparent outside the radius) + centred navy N.
#
#  2. Adaptive foreground (Android 8+; this is what the device actually renders):
#       mipmap-<d>/ic_launcher_foreground.png
#       = transparent 108dp layer with a navy N padded into the central safe zone.
#     The gold comes from the @color/ic_launcher_background colour (set to #FFD700
#     in values/ic_launcher_background.xml), so the foreground holds only the N.
#
# Everything is rendered at 4x and downsampled (LANCZOS) for crisp edges at 48px.

from PIL import Image, ImageDraw, ImageFont
import os

GOLD = (255, 215, 0, 255)      # #FFD700 background
NAVY = (7, 17, 31, 255)        # #07111F lettermark
LETTER = "N"
SS = 4                          # supersample factor

BASE = "android/app/src/main/res"

# Legacy ic_launcher.png / ic_launcher_round.png sizes (px).
LEGACY = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Adaptive foreground sizes (px) — the full 108dp layer per density.
FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

FONT_CANDIDATES = [
    "C:/Windows/Fonts/consolab.ttf",                              # Consolas Bold (monospace, ~Space Mono)
    "C:/Windows/Fonts/arialbd.ttf",                               # Arial Bold
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",       # Linux fallback
]


def load_font(px):
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_centered_letter(size, font_px):
    """Return an RGBA image (size x size, transparent) with a navy N centred."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = load_font(font_px)
    bbox = draw.textbbox((0, 0), LETTER, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), LETTER, font=font, fill=NAVY)
    return img


def make_legacy(size):
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(s * 0.25)  # 18dp on a 72dp icon == 25%
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=GOLD)
    # N at ~55% of the icon, centred.
    letter = draw_centered_letter(s, int(s * 0.55))
    img.alpha_composite(letter)
    return img.resize((size, size), Image.LANCZOS)


def make_foreground(size):
    # N only (transparent), sized to ~46% of the 108dp layer so it sits well inside
    # the central safe zone (any launcher mask shape) once composited on gold.
    s = size * SS
    letter = draw_centered_letter(s, int(s * 0.46))
    return letter.resize((size, size), Image.LANCZOS)


for folder, size in LEGACY.items():
    out = os.path.join(BASE, folder)
    os.makedirs(out, exist_ok=True)
    legacy = make_legacy(size)
    legacy.save(os.path.join(out, "ic_launcher.png"))
    legacy.save(os.path.join(out, "ic_launcher_round.png"))
    fg = make_foreground(FOREGROUND[folder])
    fg.save(os.path.join(out, "ic_launcher_foreground.png"))
    print(f"{folder}: ic_launcher {size}px, foreground {FOREGROUND[folder]}px")

print("Done.")
