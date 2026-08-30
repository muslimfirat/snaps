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
| `coach/generate-plan[-from-mock]` | Google girişi zorunlu |
| `institution/*` | Google girişi + kurum üyeliği (`memberUids`) zorunlu → aksi halde `403` |

## Kurum portalı

Kurum ("dershane") portalı Firebase Auth ile korunur:

- Yönetici mevcut **Google hesabıyla** giriş yapar; ayrı e-posta/şifre yoktur.
- Her kurum `/institutions/{id}` Firestore dokümanıdır; erişim `memberUids`
  dizisiyle sınırlıdır (`firestore.rules`). Öğrenci/veli iletişim bilgileri yalnızca
  yetkili üyelere açıktır.
- Sunucu `/api/institution/*` çağrılarında üyeliği kullanıcının ID token'ı ile
  Firestore REST üzerinden doğrular (`firebase-admin` yok).
- İlk girişte kurum bulunmazsa yönetici yeni kurum oluşturur (isteğe bağlı olarak
  kurgusal örnek verilerle). Örnek veriler `src/data/institutionData.ts`.

Kurallar + üyelik testleri: `npm run test:rules` (emulator, `test/firestore.test.mjs`).

## Bilinen sınırlamalar

- Snap fotoğrafları buluta taşınmaz (yalnızca yerel cihazda). Kullanıcı verisi
  `/users/{uid}` ana dokümanı + alt-koleksiyonlarda tutulur. Ayrıntı: `fazlar.md`.
- Gerçek Google popup + isimli Firestore veritabanı ile uçtan uca doğrulama ancak
  staging'de yapılabilir; emulator kural + mantık katmanını kapsar.

## Yol haritası

Kod inceleme bulguları ve faz faz iyileştirme planı: [`fazlar.md`](./fazlar.md).
