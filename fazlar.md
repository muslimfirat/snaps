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

## Faz 1 — API uçlarını koruma (Bulgu #1)  ✅ TAMAM (2026-08-29)

Amaç: `/api/*` uçlarının kimlik doğrulamasız ve limitsiz kötüye kullanımını durdurmak.

Politika: **Melez** (kullanıcı kararı) — `snap/solve` + `coach/chat` girişsiz kullanılabilir
ama rate-limit'li; kurum portalı ve plan üretimi Google girişi zorunlu.
Doğrulama: **public JWK** (`jose`), `firebase-admin` yok, servis hesabı gerekmez.

- [x] `server.ts` — Firebase ID token doğrulayan `requireAuth` middleware (jose `jwtVerify` + `createRemoteJWKSet`)
  - `iss`/`aud` = `firebase-applet-config.json`'daki `projectId`, imza + expiry kontrolü
  - Token yok → `401 AUTH_REQUIRED`, geçersiz → `401 INVALID_TOKEN` (fallback JSON değil)
- [x] `src/lib/apiClient.ts` — ortak `apiFetch(path, body, opts?)` helper'ı
  - Giriş varsa `Authorization: Bearer <idToken>` ekler
  - `res.ok` kontrolü, `ApiError` (status + code + TR mesaj) fırlatır, non-JSON gövdeyi tolere eder
  - 16 `fetch('/api/...')` çağrısı bu helper'a taşındı (11 bileşen)
- [x] `express-rate-limit`: `/api/*` genel 60/dk + `snap/solve` & `coach/chat` için 20/dk (`aiLimiter`)
  - `app.set('trust proxy', 1)` (Cloud Run arkasında doğru IP)
- [x] `express.json`: `snap/solve` + `parse-optical-form` → `8mb`, diğer her şey → `1mb` (eski: global `25mb`)
- [x] Korunan uçlar: `/api/institution/*` (3 uç) + `/api/coach/generate-plan` + `/api/coach/generate-plan-from-mock`

**Test sonuçları (curl, token'sız):**
| Uç | Beklenen | Sonuç |
|----|----------|-------|
| `/api/health` | 200 | ✅ 200 |
| `/api/snap/solve` | 200 (public) | ✅ 200 |
| `/api/coach/chat` | 200 (public) | ✅ 200 |
| `/api/coach/topic-summary`, `/api/duel/*` | 200 (public) | ✅ 200 |
| `/api/institution/analyze-class` | 401 | ✅ 401 AUTH_REQUIRED |
| `/api/coach/generate-plan[-from-mock]` | 401 | ✅ 401 |
| geçersiz `Bearer` token | 401 | ✅ 401 INVALID_TOKEN |
| `coach/chat` × 25 | ~20 sonra 429 | ✅ 18×200 + 429 |

- [x] `npm run lint` → 0 hata · `npm run build` → başarılı · frontend render + konsol temiz

**Not / Faz 6'ya devir:** `npm run build` `import.meta` uyarısı veriyor (`server.ts` ESM ama
esbuild `--format=cjs`). Önceden vardı, `dev` (tsx) etkilenmiyor. Faz 6'da düzeltilecek.

**Kabul kriterleri:** ✅ Token'sız korunan uç → 401, public uçlar çalışıyor, 429 tetikleniyor, lint+build temiz.

### Faz 1 sonrası açık iş (Faz 3 & 4'e bağlı)
- Kurum portalı artık giriş gerektiriyor ama uygulamada kurum girişi ayrı bir sistem
  (`institutionAuth.ts`, localStorage). Google girişi olmayan kurum kullanıcısı korunan
  uçları çağıramaz. **Faz 3'te** kurum auth'u Firebase'e taşınınca çözülür.
- Bileşenlerdeki `catch` blokları hâlâ çoğunlukla sadece `console.error` + fallback.
  `ApiError.message` kullanıcıya gösterilmiyor. **Faz 4** bunu tamamlayacak.

---

## Faz 2 — Firestore 1 MiB limiti (Bulgu #4, #8)  ✅ TAMAM (2026-08-29)

Amaç: fotoğraflı snap'ler biriktikçe bulut senkronunun sessizce çökmesini önlemek.

Kapsam: **Pragmatik** (kullanıcı kararı) — tek-doküman modeli korundu, base64 görsel
çıkarma + boyut koruması ile sorunun ~%90'ı çözüldü. Tam alt-koleksiyon migrasyonu
**Faz 2b'ye ertelendi** (gerçek bir kullanıcı limite dayanırsa çekilecek).

- [x] `firestoreSync.ts` `stripImages()` — `snaps` ve `mistakes` dizilerinden `imageUrl` (base64)
  buluta yazılmadan önce çıkarılıyor. Yerel `localStorage` kopyası görseli o cihazda tutuyor
- [x] `trimOversizedPayload()` — serileştirilmiş doküman > 900 KB ise en büyük alanları sırayla
  düşürüyor + `console.warn`; her şey düşürülüp hâlâ büyükse `CLOUD_PAYLOAD_TOO_LARGE` fırlatıyor
- [x] Görünür senkron durumu: `GoogleAuthButton` içinde `SyncStatusRow`
  (yeşil "aktif" / indigo "eşitleniyor…" / kırmızı "başarısız" + **Tekrar dene** butonu)
- [x] `AuthContext`: `retrySync()` eklendi; `pendingPayloadRef` başarısız/kısmi senkron
  payload'unu biriktiriyor, retry (veya sonraki mutasyon) tümünü yeniden gönderiyor
- [x] Ölü kod silindi: `syncProfileToFirestore`, `subscribeToUserCloudData` (+ `onSnapshot` importu)

**Doğrulama:** `npm run lint` 0 hata · `npm run build` başarılı · frontend render + konsol temiz
(HMR ws hatası hariç, alakasız). Not: gerçek Google girişi ile canlı Firestore E2E testi
yapılamadı (bu ortamda oturum açılamıyor); mantık tip-kontrollü + build temiz.

**Kabul kriterleri (revize):** ✅ Görsel içeren snap'ler artık buluta base64 taşımıyor →
20+ fotoğraflı snap tek-dokümanı şişirmiyor. ✅ Boyut aşımında sessiz çökme yerine
kısmi senkron + uyarı. ✅ Kullanıcı senkron hatasını görüp tekrar deneyebiliyor.

---

## Faz 2b — Alt-koleksiyon migrasyonu (ERTELENDİ)

Tetik: bir kullanıcının `/users/{uid}` dokümanı 700 KB'ı geçerse veya çok-cihaz
senaryosu gerçek ihtiyaç olursa.

- [ ] `snaps`, `mistakes`, `mockExams`, `flashcards` → `/users/{uid}/{coll}/{id}` alt-koleksiyonları
  - `firestore.rules` zaten izin veriyor; `firebase-blueprint.json` zaten böyle tasarlanmış
  - `firestoreSync.ts`: per-document `setDoc`/`deleteDoc`, okuma `getDocs`
  - App.tsx handler'ları delta (upsert/delete) geçecek şekilde uyarla
- [ ] Eski tek-doküman formatını ilk açılışta migrate et, sonra ana dokümandan sil

---

## Faz 3 — Kurum portalı: demo olarak işaretle (Bulgu #2, #3)  ✅ TAMAM (2026-08-29)

Ürün kararı: **(b) demo/showcase.** Gerçek auth'a taşıma işi ileride ayrı bir
mini-proje olarak ele alınacak (aşağıdaki "Faz 3b").

- [x] `institutionAuth.ts` başına `⚠️ DEMO ONLY — NOT REAL AUTHENTICATION` blok yorumu
- [x] `institutionData.ts` başına `⚠️ DEMO DATA — fictional sample data` yorumu
- [x] `InstitutionLoginView`: yanıltıcı "Şifreli & İzole Kurum Girişi" rozeti → **"Demo Modu"** (amber)
- [x] Login ekranına görünür demo uyarı bandı ("gerçek kimlik doğrulama yok, veriler
  yalnızca bu tarayıcıda, kurgusal örnek veri, gerçek öğrenci verisi girmeyin")
- [x] Portal başlığındaki "şifreli giriş" ifadesi "yönetim paneli önizlemesi" ile değiştirildi
- [x] Seed telefon/isimler kurgusal doğrulandı (`0542 111 22 33` vb. kalıplar)
- [x] Yeni `README.md` — teknoloji, çalıştırma, API politikası + "Bilinen sınırlamalar"da demo notu

**Doğrulama:** `npm run lint` 0 hata · tarayıcıda "Demo Modu" rozeti + uyarı bandı görünüyor.
Not: `auth/unauthorized-domain` — `localhost` Firebase projesinde yetkili domain değil,
bu yüzden gerçek Google girişi lokalde test edilemiyor (beklenen, değişikliklerimizle ilgisiz).

**Kabul kriterleri:** ✅ Portal her yüzeyde açıkça "demo" olarak işaretli, yanıltıcı güvenlik iddiası kalmadı.

---

## Faz 3b — Kurum portalını gerçek özelliğe çevir (ERTELENDİ / opsiyonel)

- [ ] Kurum hesapları `/institutions/{id}` + Firebase Auth (email/password veya custom claims)
- [ ] Öğrenci verisi Firestore'da, kurallar kurum üyeliğine göre
- [ ] `institutionAuth.ts` istemci-tarafı parola karşılaştırması kaldırılır
- [ ] Faz 1'de eklenen `/api/institution/*` auth gate'i kurum kullanıcısıyla uçtan uca bağlanır

---

## Faz 4 — Dayanıklılık ve hata yönetimi (Bulgu #5, #6, #12)  ✅ TAMAM (2026-08-29)

Amaç: tek bir kötü yanıt veya gece yarısı senaryosunun uygulamayı bozmasını önlemek.

- [x] `res.ok` kontrolü — Faz 1'deki `apiFetch` helper'ında zaten var, doğrulandı
- [x] `src/components/ErrorBoundary.tsx` — class component, `main.tsx`'te `<App>`'i sarıyor
  - Fallback: "Bir şeyler ters gitti" + "Sayfayı Yenile" butonu + dev'de hata detayı (`import.meta.env.DEV`)
- [x] `src/lib/dateUtils.ts` — `getLocalDateStr(date?)` + `dayDifference(a, b)` (yerel takvim günü)
  - `storage.ts`: `DEFAULT_PROFILE`, `processDailyLoginStreak`, `loadWeeklyStudyLogs` → yerel tarih;
    eski modül-içi `getDayDifference` silindi (UTC/yerel karışıklığı vardı)
  - `DailyTasksWidget` (günlük görev anahtarı), `SmartMistakeBank` (Leitner due + nextReviewDate),
    `MockExamTracker` (deneme tarihi varsayılanı) → `getLocalDateStr`
  - Seed/demo verilerdeki `toISOString` (curriculumData, institutionAuth, InstitutionPortal) dokunulmadı (kozmetik)
- [x] `src/components/ApiErrorToast.tsx` — `apiFetch` başarısızlıkta (`401/429/ağ`)
  `snaps:api-error` CustomEvent yayıyor; App'te tek global toast dinliyor (4 sn tekrar-bastırma, oto-kapanış)

**Ek: `@types/react` + `@types/react-dom` eklendi** (projede hiç yoktu — tüm React `any`'di).
Bu, gizli kalmış 4 tip hatasını ortaya çıkardı, hepsi düzeltildi:
| Dosya | Hata | Düzeltme |
|-------|------|----------|
| `ClassroomLeaderboard.tsx:103` | `StudentRecord.streakDays` yok | tipe opsiyonel alan + `|| 0` |
| `Dashboard.tsx:149` | `onNavigateTab('profile','SETTINGS')` geçersiz kategori | `'PROFILE'` |
| `StreakAnalytics.tsx:355` | recharts `activeTooltipIndex` string\|number | `Number(...)` + null guard |
| `VoiceAICoach.tsx:47` | `examInfo.targetAudience` yok | `targetHint` |

**Doğrulama:** `npm run lint` **0 hata** (yeni taban — artık gerçek React tipleriyle) ·
`npm run build` başarılı · tarayıcıda ApiErrorToast tetiklenip görüntülendi (ekran görüntüsü) ·
konsol temiz.

**Kabul kriterleri:** ✅ ErrorBoundary bağlı (beyaz ekran yerine fallback). ✅ Streak/günlük
mantığı artık tutarlı yerel takvim günü kullanıyor. ✅ API hataları kullanıcıya toast ile görünüyor.

---

## Faz 5 — Tutarlılık ve tip düzeltmeleri (Bulgu #9, #10, #11)  ✅ TAMAM (2026-08-29)

Amaç: yarım kalmış refactor kalıntılarını temizlemek.

- [x] `MainTabCategory`: 8 → **5 değer** (`HOME | TRAINING | CALENDAR | PROFILE | INSTITUTION`).
  `OVERVIEW`, `AI_STUDIO`, `PRACTICE` kaldırıldı
  - 11 çağrı yeri kanonik sete hizalandı (`OVERVIEW→HOME`, `AI_STUDIO/PRACTICE→TRAINING`):
    `App.tsx` (4), `QuickStartModal` (4), `ClassroomLeaderboard`, `CurriculumTracker`, `StreakAnalytics` (2)
  - `Header.tsx` `mappedCategoryId` yaması tamamen silindi → doğrudan `activeCategory`
  - `BottomNav.tsx` `isHomeActive`/`isTrainingActive` legacy `||` dalları silindi
  - Not: `StreakAnalytics` "pomodoro" linki yanlışlıkla `OVERVIEW` veriyordu → `TRAINING` (highlight bug'ı düzeldi)
- [x] `onIncrementQuestionCount` — `SnapSolver.tsx:169` opsiyonel prop koşulsuz çağrılıyordu → `?.` guard
  - `SmartMistakeBank`, `QuestionDuel`, `SpeedTrainer` zaten guard'lı (doğrulandı)
- [x] `App.tsx` bulut-restore effect'i: `localStateRef` eklendi — seed dalı artık `profile/snaps/...`
  değerlerini ref'ten okuyor (uid değişiminde bayat closure riski yok)
- [x] Ölü/yanıltıcı prop temizliği (yarım refactor kalıntısı):
  - `Dashboard.onUpdateProfile` — App geçiyordu ama Dashboard hiç kullanmıyordu → prop + geçiş silindi
  - `DailyTasksWidget.onIncrementQuestionCount` + `onIncrementStudyMinutes` — deklare ama destructure bile edilmiyordu → silindi
  - `MockExamTracker.onUpdateStudyPlan` — opsiyonel ama koşulsuz çağrılıyor + App hep geçiyor → zorunlu yapıldı
  - `CurriculumTracker` / `StreakAnalytics` `onNavigateTab` — `category: any` → `category?: MainTabCategory`

**Doğrulama:** `npm run lint` **0 hata** · `npm run build` başarılı · tarayıcıda Anasayfa↔Antrenman
kategori highlight'ı doğru, konsol temiz.

**Kabul kriterleri:** ✅ Nav kategori geçişleri doğru highlight yapıyor. ✅ `tsc --noEmit` temiz.

---

## Faz 6 — Build ve araç zinciri (Bulgu #13, #14, #15)  ✅ TAMAM (2026-08-29)

Amaç: derleyicinin gerçekten iş yapmasını sağlamak.

- [x] `tsconfig.json`: `"resolveJsonModule": true` eklendi (`src/lib/firebase.ts` JSON importu artık
  resmî olarak destekleniyor; önceden `moduleResolution: bundler` sayesinde sessizce geçiyordu)
- [x] `"strict": true` açıldı → **0 hata**. Faz 4 (gerçek React tipleri + 4 gizli hata düzeltmesi)
  ve Faz 5 (ölü prop temizliği) sayesinde kod zaten strict-temizmiş. `strictNullChecks` geçici
  moduna gerek kalmadı. Probe dosyasıyla tsc'nin gerçekten tip kontrolü yaptığı doğrulandı
- [x] `server.ts:95` Gemini model zinciri `https://ai.google.dev/gemini-api/docs/models` (2026-08-29)
  ile doğrulandı. Eski: `['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.1-pro-preview']`
  (unpinned alias + preview model). Yeni: **`['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-pro']`**
  — sabitlenmiş hızlı GA modeli → ucuz/hızlı GA fallback → güçlü GA reasoning fallback.
  (Gemini 3.x "pro" hâlâ preview-only olduğu için güçlü fallback GA `gemini-2.5-pro`'da kaldı.)
  API key olmadığından log'dan ilk-deneme doğrulaması yapılamadı; ID'ler resmî listeye karşı teyitli
- [x] **Bonus (Faz 1'den devir):** `npm run build` `import.meta` uyarısı düzeltildi. esbuild
  `--format=cjs` → **`--format=esm`**, çıktı `dist/server.cjs` → `dist/server.mjs`, `start` +
  `clean` scriptleri güncellendi. `server.ts` zaten ESM; artık `import.meta.url` bundle'da da çalışıyor
  (config dosyası okuması cwd'den bağımsız doğru çözülüyor)
- [x] CI yok → `.githooks/pre-commit` (`npm run lint`, TR mesajlı, `--no-verify` ile atlanabilir) +
  `git config core.hooksPath .githooks` + `package.json` `prepare` scripti (klonda otomatik kurulur)

**Doğrulama:**
| Kontrol | Sonuç |
|---------|-------|
| `npm run lint` (strict + resolveJsonModule) | ✅ 0 hata |
| `npm run build` | ✅ başarılı, **`import.meta` uyarısı yok** (eskiden vardı) |
| `NODE_ENV=production node dist/server.mjs` | ✅ ayağa kalkıyor |
| prod `/api/health`, SPA `/`, `/api/snap/solve` | ✅ 200 (fallback yanıt) |
| prod `/api/institution/analyze-class` (token'sız) | ✅ 401 → `__dirname` config okuması doğru |
| `npm run dev` (tsx) hâlâ çalışıyor | ✅ health/SPA/401 aynı |
| `.githooks/pre-commit` elle | ✅ lint çalıştırıp exit 0 |

**Kabul kriterleri:** ✅ `npm run lint` sıfır hata (strict açık). ⚠️ Gemini ilk-deneme model
doğrulaması API key gerektirdiğinden log'dan yapılamadı; model ID'leri resmî dokümana karşı teyit edildi.

### Faz 7'ye devir
- `server.ts:228` `const PORT = 3000` sabit — Cloud Run `PORT` env'ini enjekte eder.
  `process.env.PORT || 3000` yapılmalı (Faz 7 temizliğine eklendi).
- Vite build hâlâ tek 1.8 MB chunk üretiyor (kod bölme yok) — kozmetik, Faz 7 opsiyonel.

---

## Faz 7 — Sunucu refactor ve son temizlik (Bulgu #7, #16)  ✅ TAMAM (2026-08-29)

Amaç: ~1880 satırlık `server.ts`'i sürdürülebilir hale getirmek.

- [x] `handleGeminiJson({ res, label, contents, schema, fallback, noKeyFallback?, config?, validate?, shape? })`
  ortak yardımcısı + plain-text uçlar için `handleGeminiText`
  - `getGeminiClient` + API key kontrolü + `callGeminiApi` (model fallback) + `JSON.parse` +
    doğrulama + hata/fallback JSON artık tek yerde
  - **13 uç** bu iki helper'a indirgendi (11 JSON + `coach/chat` & `generate-whatsapp-report` text)
  - `noKeyFallback` opsiyonu: API-key-yok ile hata-fallback farklı olan uçlarda (snap/solve,
    quiz, analyze-class, twins, target-simulator, duel, speed-trainer, whatsapp) davranış birebir korundu
  - `server.ts` 1877 → 1742 satır (−135). Asıl kazanç yapısal: her uçtaki try/catch/parse/
    key-check tekrarı kalktı, model-fallback + hata yönetimi merkezileşti
- [x] `loadWeeklyStudyLogs` (`storage.ts`) — **Ürün kararı: gerçek veri.** Deterministik seed
  (aktif gün varyansı + off-day %15) tamamen kaldırıldı. Artık yalnız bugünkü canlı sayaç +
  `saveDailyStudyLogs` ile kaydedilmiş günler gerçek; kayıtsız günler `0`. Fonksiyon docstring'i güncellendi
- [x] `firebase-blueprint.json` — gerçek şemayla farkı `_note` alanıyla belgelendi (blueprint =
  HEDEF alt-koleksiyon tasarımı / Faz 2b; mevcut impl tek-doküman, `firestoreSync.ts`). README zaten not ediyordu
- [x] Ölü kod taraması: tüm `data/` + `lib/` export'ları (institutionData dahil) kullanılıyor,
  ölü dosya yok. **Not:** `tsc --noUnusedLocals` 30 bileşende 222 kullanılmayan import (çoğu
  lucide-react ikonu) buluyor — mekanik ama Faz 7 dışı; ayrı temizlik olarak ertelendi
- [x] `server.ts` `const PORT = 3000` → `Number(process.env.PORT) || 3000` (Cloud Run, Faz 6'dan devir)
- [x] Vite kod bölme (**kullanıcı: "sen seç" → basit manualChunks**): `firebase` (660 KB),
  `charts`/recharts (411 KB), `icons`/lucide (48 KB) ayrı chunk'lara. Ana bundle 1880 → 756 KB.
  Lazy-load eklenmedi

**Doğrulama:**
| Kontrol | Sonuç |
|---------|-------|
| `npm run lint` (strict) | ✅ 0 hata |
| `npm run build` | ✅ başarılı, chunk'lar bölündü (firebase/charts/icons/index) |
| `NODE_ENV=production PORT=3009 node dist/server.mjs` | ✅ 3009'da ayağa kalktı (PORT env çalışıyor) |
| prod `/api/health`, SPA `/`, `/api/snap/solve` | ✅ 200 (fallback) |
| prod `/api/institution/analyze-class` (token'sız) | ✅ 401 |
| dev: chat/topic-summary/quiz/duel/twins/whatsapp fallback'leri | ✅ eski çıktıyla birebir |
| `coach/chat` no-key mesajı (`examType` interpolasyonlu) | ✅ korundu (noKeyFallback) |

**Kabul kriterleri:** ✅ `server.ts` yapısal olarak sadeleşti (uç başına ~15 satır boilerplate
kalktı), davranış birebir aynı. ✅ Analitik grafiği artık yalnız gerçek veri gösteriyor (sahte seed yok).

---

## Faz 8 — Kullanılmayan import temizliği (Faz 7'den ertelendi)  ✅ TAMAM (2026-08-30)

Amaç: `tsc --noUnusedLocals` ile ortaya çıkan mekanik ölü kodu temizlemek.

- [x] TypeScript compiler API ile codemod (`_codemod.mjs`, geçici) — `noUnusedLocals` +
  `noUnusedParameters` açıkken çıkan **TS6133** tanılarından yalnızca **import bildirimi
  içindekiler** hedeflendi. Non-import (local/parametre) atlandı
- [x] **178 kullanılmayan import** 32 dosyadan kaldırıldı (çoğu `lucide-react` ikonu; ayrıca
  `recharts`, `firebase/auth` (`onAuthStateChanged`), `storage` (`saveDailyStudyLogs`),
  `institutionData`, `react` (`useCallback`) vb.). Çok satırlı import blokları tek satıra indirildi
- [x] Davranış değişikliği yok — yalnız kullanılmayan bağlamalar silindi. `tsconfig` dokunulmadı
  (`noUnusedLocals` kalıcı açılmadı; 44 non-import kullanılmayan local/param duruyor → Faz 8b)

**Doğrulama:**
| Kontrol | Sonuç |
|---------|-------|
| `npm run lint` (strict) | ✅ 0 hata |
| `npm run build` | ✅ başarılı, 2326 modül, chunk bölme korundu |
| dev `/api/health`, SPA `/`, `/api/snap/solve` | ✅ 200 |
| dev `/api/institution/analyze-class` (token'sız) | ✅ 401 |

**Kabul kriterleri:** ✅ `git diff` −556/+40 satır, yalnız import satırları. Lint + build temiz, uçlar aynı.

### Faz 8b — Kullanılmayan local/parametre (bir kısmı gerçek bug adayı)
44 non-import TS6133 kaldı. Kör silme yerine tek tek bakılmalı — bazıları eksik bağlanmış
özellik işareti: `App.tsx` `handleDeleteSnap` (silme handler'ı hiç bağlanmamış),
`VoiceAICoach` `prompt` (kurulan prompt hiç gönderilmiyor), `SettingsModal` `handleTestInsight`,
`AchievementBadges` `selectedBadge` state, `InstitutionPortal` kullanılmayan prop/state'ler.

---

## Öneri sıralama

1. Faz 0 → 1 → 2 (production'da gerçek kırılma/maliyet)
2. Faz 3 (ürün kararı gerektirir — paralel düşünülebilir)
3. Faz 4 → 5 → 6
4. Faz 7 (teknik borç, aceleye gerek yok)
