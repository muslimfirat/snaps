# Snaps — KPSS & YKS Koçluk

Türkiye'deki KPSS ve YKS adayları için yapay zeka destekli sınav koçluğu uygulaması:
fotoğrafla soru çözümü (Snap), sesli/yazılı koç, akıllı hata bankası (Leitner),
haftalık çalışma planı, deneme analizi, hedef simülatörü, soru düellosu, hız
antrenörü, başarı rozetleri ve bir dershane yönetim paneli önizlemesi.

İlk açılışta kısa bir kurulum akışı (hedef sınav, sınav tarihi, günlük hedefler)
çıkar; kişisel ilerleme (seri, çözülen soru, deneme geçmişi) sıfırdan başlar.

## Teknoloji

- **Frontend:** React 19 + Vite 6 + Tailwind 4 (`@theme` token'ları)
- **Backend:** Express (`server.ts`), tsx ile çalışır
- **AI:** Google Gemini (`@google/genai`) — sunucu tarafında
- **Bulut:** Firebase Auth (Google ile giriş) + Firestore (kullanıcı verisi senkronu)
- **Grafik:** Recharts · **Animasyon:** CSS + canvas-confetti

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

## Tasarım sistemi & tema

- **Tek renk kaynağı:** tüm renkler `src/index.css` içindeki `@theme` bloğunda
  ("Odak" paleti — öğrenci psikolojisine ve uzun çalışma seanslarında göz
  yorgunluğunu azaltmaya göre ayarlı: kırık beyaz metin, ılık nötr zeminler,
  tek indigo marka tonu, ölçülü semantik renkler). `src/theme.ts` yalnızca
  JS'te hex gereken yerler için bu değerleri yansıtır; grafik/SVG renkleri
  `src/lib/chartColors.ts` üzerinden CSS değişkenlerinden okunur.
- **Ölçekler:** tipografi `--text-3xs..3xl`, gölge `--shadow-1/2/3` (2 tema için
  ayrı), köşe yarıçapı kart `2xl` / buton `xl` / modal `3xl` kuralı.

### Gündüz / Gece / Sistem teması

- **Ayarlar → Görünüm**'den seçilir. Varsayılan: **Gece**. "Sistem" cihaz
  tercihini izler ve tercih değişince canlı güncellenir.
- Mekanik: `src/lib/themeMode.ts` tercihi çözüp `<html data-theme="light|dark">`
  yazar; `index.html` içindeki boyama-öncesi script yanıp sönmeyi engeller.
  `@theme` = Gece varsayılanı, `:root[data-theme="light"]` = Gündüz paleti.
- Uyumluluk katmanı (`index.css`) mevcut ~1950 `slate-*` / aksan / gölge / gradyan
  yardımcı sınıfını token'lara bağlar → tek blok her iki temayı da çevirir.
  Gündüzde koyu gradyan banner'ları açık yüzeye iner, renkli buton üstündeki metin
  açık kalır, tam ekran modal karartması koyu kalır.
- Grafikler (`useChartColors`) tema değişiminde `snaps:themechange` olayıyla
  reload'suz güncellenir.
- Bileşenler token util'lerine (`bg-surface-1`, `text-fg-muted`, …) geçtikçe
  uyumluluk katmanı küçülüyor.

## Performans & erişilebilirlik

- Rota düzeyi görünümler `React.lazy` + `<Suspense>` ile tembel yüklenir; ilk
  boyama yalnızca Dashboard + kabuk. Recharts ve kurum portalı ayrı chunk'ta.
- Modallar: `role="dialog"` + `aria-modal`, `<body>` scroll kilidi, focus-trap
  ve odak iadesi (`src/lib/useModalA11y.ts`).
- Üst navigasyon tam WAI-ARIA tab paterni: `role="tablist/tab/tabpanel"`,
  `aria-selected`, roving `tabindex`, ←/→/Home/End ok tuşu navigasyonu
  (`src/lib/useTablistKeys.ts`). Alt navigasyonda `aria-current`.
- `prefers-reduced-motion` desteği; `theme-color` meta temaya göre.

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
- Portala erişim üst menüdeki hamburger → "Dershane Portalı"ndan sağlanır.

Kurallar + üyelik testleri: `npm run test:rules` (emulator, `test/firestore.test.mjs`).

## Bilinen sınırlamalar

- Snap fotoğrafları buluta taşınmaz (yalnızca yerel cihazda). Kullanıcı verisi
  `/users/{uid}` ana dokümanı + alt-koleksiyonlarda tutulur. Ayrıntı: `fazlar.md`.
- Gerçek Google popup + isimli Firestore veritabanı ile uçtan uca doğrulama ancak
  staging'de yapılabilir; emulator kural + mantık katmanını kapsar.
- Renk uyumluluk katmanı geçiş dönemine ait bir köprü; hedef, bileşenlerin
  doğrudan `@theme` token util'lerini kullanması.

## Yol haritası

Kod inceleme bulguları ve faz faz iyileştirme planı: [`fazlar.md`](./fazlar.md).
