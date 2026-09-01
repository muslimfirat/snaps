#!/usr/bin/env python3
"""
Marka ikonlarını tek kaynaktan üretir: assets/snaps-icon-1024.png (tam taşma, 1024x1024).
Çalıştır:  python3 scripts/generate-icons.py
Çıktı:     public/ altına favicon'lar, apple-touch-icon, PWA ikonları, maskable, og-image.

Bağımlılık: Pillow (yalnızca bu script).
"""
from __future__ import annotations
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "snaps-icon-1024.png")
PUB = os.path.join(ROOT, "public")
os.makedirs(PUB, exist_ok=True)

master = Image.open(SRC).convert("RGB")
assert master.size == (1024, 1024), f"kaynak 1024x1024 olmalı, {master.size} bulundu"

LANCZOS = Image.Resampling.LANCZOS


def resized(size: int, crop: float = 0.0) -> Image.Image:
    """crop: her kenardan kırpılacak oran (favicon'da glyph daha büyük görünsün diye)."""
    im = master
    if crop:
        m = round(1024 * crop)
        im = im.crop((m, m, 1024 - m, 1024 - m))
    return im.resize((size, size), LANCZOS)


def save_png(img: Image.Image, name: str) -> None:
    img.save(os.path.join(PUB, name), "PNG", optimize=True)
    print(f"  ✓ {name}  {img.size[0]}x{img.size[1]}")


# --- düz kare ikonlar (tam taşma; platform kendi maskesini uygular) ------------
save_png(resized(512), "icon-512.png")
save_png(resized(192), "icon-192.png")
save_png(resized(180), "apple-touch-icon.png")
# uygulama içi küçük marka işareti (Header / Onboarding) — köşeler kırpılı,
# CSS köşe yuvarlatması temiz otursun diye
save_png(resized(192, crop=0.06), "icon-mark.png")
save_png(resized(32, crop=0.05), "favicon-32.png")
save_png(resized(16, crop=0.05), "favicon-16.png")

# --- favicon.ico (16 / 32 / 48) ----------------------------------------------
resized(256, crop=0.05).save(
    os.path.join(PUB, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)]
)
print("  ✓ favicon.ico  16/32/48")


# --- maskable: içeriği küçült + düz degrade kenarı dışa uzat ----------------
# Önce yuvarlak köşeleri kırp (kenar = düz degrade), sonra S'i %84'e küçültüp
# ortala ki agresif dairesel maske bile kuyruğu/kıvılcımı kesmesin; boşluk
# kenar pikseli uzatılarak dikişsiz doldurulur.
def maskable(size: int, name: str, content: float = 0.84) -> None:
    src = master.crop((60, 60, 964, 964))  # düz degrade kenar
    inner = round(size * content)
    off = (size - inner) // 2
    fg = src.resize((inner, inner), LANCZOS)
    c = Image.new("RGB", (size, size))
    c.paste(fg, (off, off))
    c.paste(fg.crop((0, 0, 1, inner)).resize((off, inner)), (0, off))
    c.paste(fg.crop((inner - 1, 0, inner, inner)).resize((size - off - inner, inner)), (off + inner, off))
    c.paste(c.crop((0, off, size, off + 1)).resize((size, off)), (0, 0))
    c.paste(c.crop((0, off + inner - 1, size, off + inner)).resize((size, size - off - inner)), (0, off + inner))
    save_png(c, name)


maskable(512, "icon-maskable-512.png")
maskable(192, "icon-maskable-192.png")


# --- sosyal kart (og-image 1200x630) ---------------------------------------
def font(size: int, bold: bool = False):
    for p in (
        f"/System/Library/Fonts/Supplemental/Arial{' Bold' if bold else ''}.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def og_image() -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#0b0c10")

    glow = Image.new("RGB", (W, H), "#0b0c10")
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 620, -360, W + 300, 420], fill="#4B3BD6")
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img = Image.blend(img, glow, 0.5)

    sz = 300
    img.paste(master.resize((sz, sz), LANCZOS), (100, (H - sz) // 2))

    d = ImageDraw.Draw(img)
    x = 452
    d.text((x, 214), "Snaps", font=font(104, bold=True), fill="#ffffff")
    d.text((x, 352), "KPSS & YKS AI Sınav Koçu", font=font(40, bold=True), fill="#c7d2fe")
    d.text((x, 410), "Fotoğrafla çöz · Kişisel plan & analiz · Zinciri kırma",
           font=font(26), fill="#93a4bd")
    save_png(img, "og-image.png")


og_image()
print("Bitti.")
