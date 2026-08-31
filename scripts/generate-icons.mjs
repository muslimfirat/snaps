/**
 * Marka ikonlarını ve sosyal kart görselini üretir.
 * Tek seferlik: `node scripts/generate-icons.mjs` → public/ altına PNG'ler.
 * (sharp yalnızca bu script için geçici devDependency'dir.)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#4f46e5"/><stop offset="0.55" stop-color="#6366f1"/><stop offset="1" stop-color="#7c3aed"/>
</linearGradient>`;
// 512x512 uzayında ortalanmış beş köşeli yıldız.
const STAR = 'M256 104l44.6 108.4L418 222l-91 74.5L354 412l-98-61.8L158 412l27-115.5-91-74.5 117.4-9.6z';

/** 512x512 viewBox; sharp çıktı boyutuna resize eder. */
function iconSvg({ radius = 0.22, star = 1, bg = true } = {}) {
  const r = Math.round(512 * radius);
  const off = (512 - 512 * star) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>${GRAD}</defs>
    ${bg ? `<rect width="512" height="512" rx="${r}" fill="url(#g)"/>` : ''}
    <g transform="translate(${off} ${off}) scale(${star})"><path d="${STAR}" fill="#fff"/></g>
  </svg>`;
}

/** Maskable — dairesel maskeye karşı güvenli alan (yıldız %64, tam kenarlı zemin). */
function maskableSvg() {
  const s = 0.64;
  const off = (512 - 512 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>${GRAD}</defs>
    <rect width="512" height="512" fill="url(#g)"/>
    <g transform="translate(${off} ${off}) scale(${s})"><path d="${STAR}" fill="#fff"/></g>
  </svg>`;
}

function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0c10"/><stop offset="1" stop-color="#111827"/></linearGradient>
      ${GRAD}
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="1080" cy="60" r="380" fill="#6366f1" opacity="0.12"/>
    <rect x="96" y="150" width="128" height="128" rx="30" fill="url(#g)"/>
    <g transform="translate(120 174) scale(0.172)"><path d="${STAR}" fill="#fff"/></g>
    <text x="248" y="242" font-family="system-ui,'Segoe UI',Roboto,sans-serif" font-size="56" font-weight="800" fill="#ffffff">Snaps</text>
    <text x="96" y="386" font-family="system-ui,'Segoe UI',Roboto,sans-serif" font-size="70" font-weight="800" fill="#ffffff">KPSS &amp; YKS AI Sınav Koçu</text>
    <text x="96" y="452" font-family="system-ui,'Segoe UI',Roboto,sans-serif" font-size="33" fill="#94a3b8">Fotoğrafla çöz  ·  Kişisel plan &amp; analiz  ·  Zinciri kırma</text>
  </svg>`;
}

const jobs = [
  ['icon-192.png', iconSvg(), [192, 192]],
  ['icon-512.png', iconSvg(), [512, 512]],
  ['icon-maskable-512.png', maskableSvg(), [512, 512]],
  ['apple-touch-icon.png', iconSvg({ radius: 0, star: 0.82 }), [180, 180]],
  ['favicon-32.png', iconSvg({ radius: 0.28, star: 0.92 }), [32, 32]],
  ['favicon-16.png', iconSvg({ radius: 0.28, star: 0.92 }), [16, 16]],
  ['og-image.png', ogSvg(), [1200, 630]],
];

for (const [name, svg, [w, h]] of jobs) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(w, h, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(join(pub, name));
  const meta = await sharp(join(pub, name)).metadata();
  console.log('✓', name, `${meta.width}x${meta.height}`);
}
