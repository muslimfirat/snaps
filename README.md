# Snaps — KPSS & YKS Koçluk

Türkiye'deki KPSS ve YKS adayları için yapay zeka destekli sınav koçluğu uygulaması:
fotoğrafla soru çözümü (Snap), sesli/yazılı koç, akıllı hata bankası (Leitner),
haftalık çalışma planı, deneme analizi, hedef simülatörü, soru düellosu, hız
antrenörü ve bir dershane yönetim paneli önizlemesi.

## Teknoloji

- **Frontend:** React 19 + Vite 6 + Tailwind 4
- **Backend:** Express (`server.ts`), tsx ile çalışır
- **AI:** Google Gemini (`@google/genai`) — sunucu tarafında
- **Bulut:** Firebase Auth (Google ile giriş) + Firestore (kullanıcı verisi senkronu)

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:3000  (Express + Vite middleware)
```

`bun` da kullanılabilir (`bun.lock` mevcut). Diğer komutlar:

```bash
npm run lint     # tsc --noEmit (strict)
npm run build    # vite build + esbuild ile dist/server.mjs (ESM)
npm start        # dist/server.mjs (production)
```

### Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın. `GEMINI_API_KEY` ayarlanmazsa
tüm AI özellikleri hazır (curated) yedek içerik döndürür — uygulama yine çalışır.

## API erişim politikası

`/api/*` uçları Firebase ID token + IP rate-limit ile korunur:

| Uç | Erişim |
|----|--------|
| `snap/solve`, `coach/chat` ve diğer öğrenme araçları | Girişsiz, rate-limit'li |
| `institution/*`, `coach/generate-plan[-from-mock]` | Google girişi zorunlu |

## Bilinen sınırlamalar

- **Kurum portalı (dershane girişi) bir DEMO'dur.** Gerçek kimlik doğrulama yoktur;
  hesaplar ve öğrenci bilgileri yalnızca tarayıcının `localStorage`'ında tutulur ve
  tamamen kurgusal örnek verilerden oluşur. Gerçek öğrenci verisi girmeyin.
  Bkz. `src/lib/institutionAuth.ts`.
- Bulut senkronu tek `/users/{uid}` dokümanı kullanır; snap fotoğrafları buluta
  taşınmaz (yalnızca yerel). Ayrıntı ve gelecek planı: `fazlar.md`.

## Yol haritası

Kod inceleme bulguları ve faz faz iyileştirme planı: [`fazlar.md`](./fazlar.md).
