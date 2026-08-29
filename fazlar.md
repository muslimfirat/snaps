# Snaps — Kod İyileştirme Fazları

Kod incelemesinden çıkan bulguların faz faz uygulama planı. Her faz bağımsız
commit'lenebilir. Bir faz bitmeden sonrakine geçme; her fazın sonunda
"Kabul kriterleri" sağlanmalı.

Durum: `[ ]` bekliyor · `[~]` devam ediyor · `[x]` tamam

---

## Faz 0 — Hazırlık ve güvenlik ağı  ✅ TAMAM (2026-08-29)

Amaç: değişikliklere başlamadan önce ölçülebilir bir taban oluşturmak.

- [x] Bağımlılıkları kur — `bun` yok, **npm kullanıldı** (`package-lock.json` oluştu, 324 paket)
- [x] `npm run lint` (`tsc --noEmit`) → **0 hata** (taban). Not: `resolveJsonModule` olmadan da geçiyor; Bulgu #14 bu TS sürümünde sorun olmayabilir, Faz 6'da teyit
- [x] `npm run dev` → server `:3000` ayağa kalkıyor, Vite frontend render oluyor, konsol hatasız
- [x] Smoke test: `/api/health`, `/api/snap/solve`, `/api/coach/chat` → fallback yanıtları çalışıyor (GEMINI_API_KEY yok, bu beklenen)
- [x] `git init` + ilk commit (`83d41cc`)

**Taban durumu:**
- Toolchain: Node v24.19, npm 11.17 (bun yok). Komutlar: `npm install`, `npm run dev`, `npm run lint`, `npm run build`
- Lint: 0 hata
- `.env` yok → tüm AI özellikleri curated/fallback içerik döndürüyor
- Bilinen çalışan akışlar: Dashboard render, API fallback uçları

**Kabul kriterleri:** ✅ Lint temiz, uygulama çalışıyor, temiz ilk commit atıldı.

---

## Faz 1 — API uçlarını koruma (Bulgu #1, #2-kısmi)

Amaç: `/api/*` uçlarının kimlik doğrulamasız ve limitsiz kötüye kullanımını durdurmak.

- [ ] `server.ts` içine `/api/*` için Firebase ID token doğrulayan middleware ekle
  - İstemci `fetch` çağrılarına `Authorization: Bearer <idToken>` başlığı eklenecek
  - Token yoksa/geçersizse `401` dön (fallback JSON değil)
  - `firebase-admin` paketi eklenip service account ile init edilecek **veya** hafif alternatif: Google'ın public JWK'leriyle token doğrulama
- [ ] İstemci tarafı: ortak `apiFetch(path, body)` helper'ı oluştur (`src/lib/apiClient.ts`)
  - `auth.currentUser?.getIdToken()` ile token ekler
  - `res.ok` kontrolü yapar, hata durumunda anlamlı `Error` fırlatır
  - 15 `fetch('/api/...')` çağrısını bu helper'a taşı
- [ ] `express-rate-limit` ekle: `/api/*` için IP başına makul limit (ör. 30 istek/dk)
- [ ] `express.json({ limit: '25mb' })` → snap ucu için `8mb`, diğerleri için `1mb`
- [ ] Anonim/misafir kullanım gerekiyorsa: sadece `/api/coach/chat` ve `/api/snap/solve` için düşük limitli anonim erişim; gerisi auth zorunlu

**Kabul kriterleri:** Token'sız `curl` ile `/api/snap/solve` → `401`. Giriş yapmış kullanıcı uygulamada tüm AI özelliklerini sorunsuz kullanıyor. Rate limit aşımında `429`.

**Riskler:** AI Studio applet ortamında `firebase-admin` service account erişimi. Yoksa JWK doğrulama yoluna geç.

---

## Faz 2 — Firestore veri modeli ve 1 MiB limiti (Bulgu #4, #8)

Amaç: fotoğraflı snap'ler biriktikçe bulut senkronunun sessizce çökmesini önlemek.

- [ ] `SnapSolution` buluta yazılmadan önce `imageUrl` (base64) alanını çıkar
  - Yerel `localStorage`'da kalabilir; sadece Firestore payload'undan çıkarılacak
- [ ] `snaps`, `mistakes`, `mockExams`, `flashcards` → `/users/{uid}/{coll}/{id}` alt-koleksiyonlarına taşı
  - `firestore.rules` zaten izin veriyor; `firebase-blueprint.json` zaten bu şekilde tasarlanmış
  - `firestoreSync.ts`: dizi replace yerine per-document `setDoc`/`deleteDoc`
  - Okuma: `getDocs(collection(...))`
- [ ] Geriye dönük uyumluluk: eski tek-doküman formatındaki veriyi ilk açılışta alt-koleksiyonlara migrate et, sonra ana dokümandan sil
- [ ] Senkron hatası artık kullanıcıya görünür olsun: `syncStatus === 'error'` durumunda Header'da uyarı rozeti + tekrar dene butonu
- [ ] Ölü kodu temizle: `syncProfileToFirestore`, `subscribeToUserCloudData` — ya kullan ya sil

**Kabul kriterleri:** 20+ fotoğraflı snap eklenince bulut senkronu çalışıyor. Firestore konsolunda alt-koleksiyonlar görünüyor. Eski hesap açıldığında verisi kayıpsız migrate oluyor.

---

## Faz 3 — Kurum portalı kimlik doğrulama kararı (Bulgu #2, #3)

Amaç: düz metin şifre + istemci-tarafı auth + öğrenci PII riskini kapatmak.

- [ ] **Ürün kararı:** Kurum portalı (a) gerçek çok-kiracılı özellik mi, (b) demo/showcase mı?
- [ ] **(a) ise:**
  - Kurum hesaplarını Firestore'a taşı (`/institutions/{id}`), şifre yerine Firebase Auth (email/password veya custom claims)
  - Öğrenci verisi Firestore'da, kurallar kurum üyeliğine göre
  - `institutionAuth.ts` istemci-tarafı parola karşılaştırmasını kaldır
- [ ] **(b) ise:**
  - `institutionAuth.ts` ve `institutionData.ts` başına `// DEMO ONLY — no real auth, seeded sample data` yorumu
  - Login ekranına görünür "Demo modu" etiketi
  - Seed telefon/isimlerin tamamen kurgusal olduğunu doğrula (şu an öyle görünüyor)
- [ ] Karar ne olursa olsun: `README`/`metadata.json`'a not

**Kabul kriterleri:** Portal ya gerçek auth ile korumalı ya da her yüzeyde açıkça "demo" olarak işaretli.

---

## Faz 4 — Dayanıklılık ve hata yönetimi (Bulgu #5, #6, #12)

Amaç: tek bir kötü yanıt veya gece yarısı senaryosunun uygulamayı bozmasını önlemek.

- [ ] `res.ok` kontrolü — Faz 1'deki `apiClient` helper'ı ile zaten çözülüyorsa doğrula; değilse tamamla
- [ ] React `<ErrorBoundary>` bileşeni ekle, `main.tsx`'te `<App>`'i sarmala
  - Fallback UI: "Bir şeyler ters gitti" + yenile butonu + hata detayı (dev'de)
- [ ] Zaman dilimi düzeltmesi: `storage.ts` içinde tek bir `getLocalDateStr()` yardımcısı
  - `processDailyLoginStreak`, `getDayDifference`, `loadWeeklyStudyLogs`, `DEFAULT_PROFILE` — hepsi bunu kullansın
  - `toISOString().split('T')[0]` (UTC) kullanımlarını kaldır
- [ ] `apiClient` hatalarında bileşenlerde kullanıcıya görünür mesaj (sadece haptic değil) — toast veya inline uyarı

**Kabul kriterleri:** Bir bileşen bilerek throw ettirildiğinde beyaz ekran yerine fallback görünüyor. Cihaz saati gece 01:00 / UTC-3 senaryosunda streak doğru hesaplanıyor.

---

## Faz 5 — Tutarlılık ve tip düzeltmeleri (Bulgu #9, #10, #11)

Amaç: yarım kalmış refactor kalıntılarını temizlemek.

- [ ] `MainTabCategory`: kullanılmayan değerleri (`OVERVIEW`, `AI_STUDIO`, `PRACTICE` vb.) tek sete indir
  - `getCategoryForTab` ile çağrı yerlerini aynı sete hizala
  - `Header.tsx:217` `OVERVIEW→HOME` yamasını kaldır
- [ ] `onIncrementQuestionCount` — `SnapSolver` ve diğer bileşenlerde ya prop'u zorunlu yap ya çağrıyı guard'la
- [ ] `App.tsx:80` bulut-restore effect'i: seed dalındaki closure değerlerini `ref`'e al veya effect'i böl
- [ ] Diğer `?`-opsiyonel ama koşulsuz çağrılan prop'ları tara (`grep -n "?: (" src/components`)

**Kabul kriterleri:** Nav kategori geçişleri tüm sekmelerde doğru highlight yapıyor. `tsc --noEmit` bu dosyalarda yeni hata üretmiyor.

---

## Faz 6 — Build ve araç zinciri (Bulgu #13, #14, #15)

Amaç: derleyicinin gerçekten iş yapmasını sağlamak.

- [ ] `tsconfig.json`: `"resolveJsonModule": true` ekle — `bun run lint` geçmeli
- [ ] `"strict": true` aç, çıkan hataları listele
  - Hepsi bir commit'te düzeltilemezse: geçici olarak sadece `"strictNullChecks": true` + kalanları takip listesine
- [ ] `server.ts:35` Gemini model ID'lerini doğrula
  - Geçerli olmayan (`gemini-3.7-flash`, `gemini-3.1-*`) ID'leri kaldır veya güncel olanlarla değiştir
  - Fallback zinciri: 1 geçerli hızlı model + 1 geçerli güçlü model yeter
- [ ] CI yoksa: basit bir `bun run lint` pre-commit hook'u

**Kabul kriterleri:** `bun run lint` sıfır hata. Gemini çağrıları ilk denemede doğru modele gidiyor (loglardan doğrula).

---

## Faz 7 — Sunucu refactor ve son temizlik (Bulgu #7, #16)

Amaç: 1780 satırlık `server.ts`'i sürdürülebilir hale getirmek.

- [ ] `handleGeminiJson(res, { schema, prompt, contents, fallback })` ortak yardımcısı
  - try / model fallback / `JSON.parse` / şema doğrulama / fallback JSON tek yerde
  - 15 uç bu helper'a indirgensin
- [ ] `loadWeeklyStudyLogs` sahte veri üretimi (`storage.ts:465`):
  - **Ürün kararı:** demo seeding mi kalsın, yoksa gerçek loglanmamış günler `0` mı görünsün?
  - Karar "gerçek" ise: seed mantığını kaldır, boş günler boş
  - Karar "demo" ise: fonksiyon başına yorum + ilk gerçek log girildiğinde seed'i bırak
- [ ] `firebase-blueprint.json` ↔ gerçek Firestore şeması uyumunu son kez kontrol et
- [ ] Kullanılmayan import/dosya taraması (`institutionData` içindeki ölü export'lar vb.)

**Kabul kriterleri:** `server.ts` belirgin şekilde kısaldı, davranış aynı. Analitik grafikleri ya gerçek veri gösteriyor ya net "örnek veri" etiketli.

---

## Öneri sıralama

1. Faz 0 → 1 → 2 (production'da gerçek kırılma/maliyet)
2. Faz 3 (ürün kararı gerektirir — paralel düşünülebilir)
3. Faz 4 → 5 → 6
4. Faz 7 (teknik borç, aceleye gerek yok)
