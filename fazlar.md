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

## Faz 2b — Alt-koleksiyon migrasyonu  ✅ TAMAM (2026-08-30)

Tetik: bir kullanıcının `/users/{uid}` dokümanı 700 KB'ı geçerse veya çok-cihaz
senaryosu gerçek ihtiyaç olursa. **Uygulama emulator gerektirir** — bu turda
`brew install openjdk` (JDK 26) + `npm i -g firebase-tools` (global, devDep değil) +
`@firebase/rules-unit-testing` (devDep) kuruldu, emulator ile uçtan uca test edildi.
Komut: `PATH="/usr/local/opt/openjdk/bin:$PATH" npm run test:rules`.

### Uygulama sonucu (aşağıdaki plan büyük ölçüde birebir izlendi)

- [x] `src/lib/firestoreSync.ts` yeniden yazıldı:
  - `COLLECTION_FIELDS = ['snaps','mistakes','mockExams','flashcards']` → her biri
    `/users/{uid}/{field}/{id}` alt-koleksiyonu. Ana doküman yalnız `profile`,
    `studyPlan`, `subjects_*`, `userId`, `updatedAt` tutuyor
  - `syncCollectionDelta(uid, coll, upserts, deleteIds, database?)` — `writeBatch`,
    450-op'luk parçalara bölünür, `snaps`/`mistakes` için `stripImageField` (base64 çıkar)
  - `syncUserDataToFirestore(userId, data, database?)` — ana doküman `setDoc(merge)` +
    verilen her liste alanı için `syncFullList` (cloud id'leri `getDocs` → tam liste
    upsert, listede olmayan cloud dokümanı sil). `trimOversizedPayload` ana doküman
    için backstop olarak kaldı
  - `fetchAllCollections(userId, database?)` — ana doküman + 4 alt-koleksiyon `getDocs`
    (`Promise.all`). Hiç veri yoksa `null` (yeni kullanıcı → App seed dalı)
  - `migrateUserToSubcollections(userId, database?)` — tek seferlik: eski gömülü diziler
    varsa alt-koleksiyona yaz → başarılıysa `updateDoc(deleteField())` → `localStorage`
    `snaps_migrated_v2_{uid}` işareti. Kısmi başarıda dizileri SİLMEZ, işaret koymaz (retry)
  - `database` parametresi (`Firestore = db`) — sadece test için enjeksiyon; app çağrıları değişmedi
- [x] `src/context/AuthContext.tsx` — `fetchUserDataFromFirestore` → `fetchAllCollections`;
  `fetchCloudData` artık önce `migrateUserToSubcollections` (await) çalıştırıyor.
  Hata artık yutulmuyor, `throw` ediliyor → App başarısız okumayı "yeni kullanıcı" sanıp
  bulutu ezmiyor
- [x] `src/App.tsx` — **değişmedi.** Handler'lar tüm listeyi geçmeye devam ediyor
  (firestoreSync tam-liste→delta çeviriyor). Bulut-restore effect'i aynı
- [x] `firebase.json` + `.firebaserc` (emulator: firestore 8080, auth 9099, UI kapalı,
  singleProjectMode) · `firestore.rules` **değişmedi** (`{subcollection=**}` zaten kapsıyor)
- [x] `test/firestore.test.mjs` + `npm run test:rules`
  (`firebase emulators:exec ... "tsx --test"`) — `@firebase/rules-unit-testing`

**Doğrulama:**
| Kontrol | Sonuç |
|---------|-------|
| `npm run test:rules` (emulator) | ✅ 7/7 pass |
| — senaryo 1: eski tek-doküman → migrate → alt-koleksiyonlar dolu, ana dokümanda dizi yok, 2. çağrı no-op | ✅ |
| — senaryo 1b: eski dizi yok → migrasyon atlanır | ✅ |
| — senaryo 2: 25 fotoğraflı snap → 25 ayrı doküman, hepsinde `imageUrl` yok, <900 KB | ✅ |
| — senaryo 3: snap sil → cloud dokümanı siliniyor; 2. cihaz `fetchAllCollections` ile görüyor | ✅ |
| — senaryo 3b: `syncCollectionDelta` upsert + delete | ✅ |
| — senaryo 4: B kullanıcısı A'nın `users/A/snaps/*` dokümanına erişemiyor (get + set) | ✅ |
| — `fetchAllCollections` boş kullanıcı → `null` | ✅ |
| `npm run lint` (strict + noUnusedLocals) | ✅ 0 hata |
| `npm run build` | ✅ 2326 modül, chunk bölme korundu, `server.mjs` OK |
| dev `/api/health` `/` `/api/snap/solve` / `/api/institution/analyze-class` (token'sız) | ✅ 200/200/200/401 |
| tarayıcı: Dashboard render + konsol temiz | ✅ |

**Bilinen sınır / devir:** İlk sürüm "cloud authoritative tam senkron" (plan kararı).
Anonim kullanımda biriken yerel liste, zaten cloud dokümanı olan bir hesaba ilk girişte
bulut boşsa üzerine yazılır — bu davranış Faz 2b öncesiyle **aynı** (yeni regresyon değil),
gerçek merge semantiği ayrı bir işe bırakıldı. Gerçek Google popup + isimli
Firestore veritabanı (`ai-studio-...`) ile canlı E2E ancak staging'de doğrulanabilir;
emulator default-db + kural + mantık katmanını kapsıyor.

---

### Orijinal plan (referans)

Tetik: bir kullanıcının `/users/{uid}` dokümanı 700 KB'ı geçerse veya çok-cihaz
senaryosu gerçek ihtiyaç olursa.

### Hedef veri modeli

```
/users/{uid}                      → profile, studyPlan, subjects_*, updatedAt (küçük, tek doküman kalır)
/users/{uid}/snaps/{snapId}       → SnapSolution (imageUrl yine strip'lenir)
/users/{uid}/mistakes/{mistakeId} → MistakeQuestionItem
/users/{uid}/mockExams/{examId}   → MockExamRecord
/users/{uid}/flashcards/{cardId}  → Flashcard
```

`firestore.rules` zaten `match /users/{userId}/{subcollection=**}` ile izin veriyor —
kural değişikliği GEREKMEZ. `firebase-blueprint.json` zaten bu şemayı belgeliyor.

### Adımlar

**1. `src/lib/firestoreSync.ts` — yeni delta API'si**

- İçe aktarmalara ekle: `collection, getDocs, writeBatch, deleteDoc, doc` (firebase/firestore).
- `MAX_DOC_BYTES` / `trimOversizedPayload` artık sadece ana `/users/{uid}` dokümanı için
  gerekli (profile+studyPlan+subjects). `stripImages` korunur.
- Yeni fonksiyonlar:
  - `syncCollectionDelta(uid, collName, upserts: T[], deleteIds: string[])` — `writeBatch`
    ile `set(doc(db,'users',uid,collName,item.id), stripImagesOne(item), {merge:true})` +
    silinenler için `batch.delete(...)`. Batch limiti 500 → 450'lik parçalara böl.
  - `fetchAllCollections(uid): Promise<CloudUserData>` — her alt-koleksiyon için `getDocs`,
    `snap.docs.map(d => d.data())`. Ana dokümandan profile/studyPlan/subjects okunur.
- `syncUserDataToFirestore` imzası korunur ama içi ikiye ayrılır: ana-doküman alanları
  (`profile`, `studyPlan`, `subjects_*`) `setDoc(merge)` ile; koleksiyon alanları
  (`snaps`/`mistakes`/`mockExams`/`flashcards`) verildiğinde tam liste → delta hesapla:
  mevcut cloud id'leri `getDocs` ile çek, `upserts = yeni liste`, `deleteIds = cloud − yeni`.
  (İlk sürüm: basit "tam senkron" — tüm listeyi upsert, listede olmayan cloud dokümanı sil.)
- `CloudUserData` aynı kalır (tüketiciler değişmez).

**2. `src/lib/firestoreMigration.ts` (yeni) — tek seferlik taşıma**

- `migrateUserToSubcollections(uid): Promise<boolean>` —
  1. `getDoc(doc(db,'users',uid))` → eski gömülü diziler var mı? (`data.snaps` Array vb.)
  2. Varsa: her diziyi `syncCollectionDelta(uid, coll, arr, [])` ile alt-koleksiyona yaz.
  3. Başarılıysa ana dokümandan `updateDoc(ref, { snaps: deleteField(), mistakes: deleteField(), mockExams: deleteField(), flashcards: deleteField() })`.
  4. `localStorage['snaps_migrated_v2_'+uid] = '1'` işaretle; idempotent olsun.
- Kısmi başarıda ana dokümanı SİLME (yeniden denenebilir kalsın).

**3. `src/context/AuthContext.tsx`**

- `fetchCloudData` → `fetchAllCollections(uid)` çağırır.
- Girişte sıra: `onAuthStateChanged` → `migrateUserToSubcollections(uid)` (await) → sonra
  `fetchCloudData`. Migration bir kez çalışır, sonraki girişlerde erken döner.
- `syncCurrentDataToCloud` içindeki `pendingPayloadRef` mantığı korunur; alt-koleksiyon
  yazımı da aynı retry kuyruğuna girer.

**4. `src/App.tsx` — handler'lar**

- Şu an her handler tüm listeyi `syncCurrentDataToCloud({ snaps: updated })` ile geçiyor.
  İlk sürümde BU KORUNUR (firestoreSync tam-liste→delta çevirir). Performans için 2. turda
  `handleDeleteMockExam` vb. `{ mockExamsDelete: [id] }` deltası geçebilir — opsiyonel.
- Bulut-restore effect'i (satır 69-137) değişmez; `cloudData.snaps` yine dolu gelir.

**5. Test (emulator zorunlu)**

- `firebase.json` + emulator config ekle (firestore + auth), `npm run test:rules` scripti.
- Senaryolar:
  - Eski tek-doküman kullanıcı → giriş → migration çalışır → alt-koleksiyonlar dolu,
    ana dokümanda diziler yok. İkinci giriş migration'ı atlar.
  - 25 fotoğraflı snap → her biri ayrı doküman, hiçbiri 1 MiB'a yaklaşmıyor.
  - Snap sil → cloud dokümanı da siliniyor. Çok-cihaz: A'da ekle → B'de `getDocs` görüyor.
  - Kural testi: `users/A/snaps/x` dokümanına B kullanıcısı erişemiyor.

**Kabul kriterleri:** Emulator'da yukarıdaki 4 senaryo yeşil · `npm run lint` + `build` temiz ·
mevcut kullanıcı verisi kaybolmadan taşınıyor.

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

## Faz 3b — Kurum portalını gerçek özelliğe çevir  ✅ TAMAM (2026-08-30)

Auth modeli: **Google hesabı + `/institutions/{id}.memberUids` üyeliği.** Ayrı
e-posta/şifre sistemi tamamen kaldırıldı. Emulator (JDK 26 + firebase-tools) ile
uçtan uca test edildi.

### Uygulama sonucu (aşağıdaki plan büyük ölçüde izlendi)

- [x] `src/types.ts` — `InstitutionAccount`: `password` SİLİNDİ; `ownerUid`,
  `memberUids: string[]`, `ownerEmail` EKLENDİ. `InstitutionAuthSession` interface'i SİLİNDİ.
- [x] `src/lib/institutionAuth.ts` (580 satır, 3 sahte kurum + parola mantığı) SİLİNDİ →
  `src/lib/institutionStore.ts` (Firestore): `fetchMyInstitution(uid)` (`memberUids`
  `array-contains` sorgusu), `createInstitution(uid, email, form)`,
  `seedDemoInstitution(uid, email)` (örnek sınıf/öğrenci/deneme), `syncInstitutionToFirestore(id, partial)`
  (`setDoc merge` — `ownerUid`/`memberUids` asla gönderilmez). Hepsinde `database?` param (test enjeksiyonu).
- [x] `firestore.rules` — `instMember()` helper + `/institutions/{instId}` bloğu
  (get=üye, list=authed, create=owner==uid ∧ uid∈memberUids, update=üye ∧ owner değişmez,
  delete=owner). `data/institutionData.ts` DEFAULT_* seed'leri KALDI.
- [x] `src/components/InstitutionLoginView.tsx` yeniden yazıldı (529 → ~340 satır):
  3 faz — `NEEDS_GOOGLE` (`<GoogleAuthButton/>`), `CHECKING` (`fetchMyInstitution`),
  `NO_INSTITUTION` (kurum oluştur formu + "örnek verilerle başlat" onay kutusu, ŞİFRE YOK).
  Kurumu varsa effect `onLoginSuccess`. Demo rozeti/uyarı bandı/hızlı-demo-login KALDIRILDI.
- [x] `src/App.tsx` — senkron localStorage init'leri kalktı; `useEffect([currentUser?.uid])`
  → `fetchMyInstitution`. `handleInstitutionLogout` artık **Google oturumunu kapatmaz**,
  sadece local state temizler. `handleUpdateInstitution*` → `persistInstitution()` helper
  → `syncInstitutionToFirestore`. localStorage yazımları offline cache olarak kaldı.
- [x] `src/components/InstitutionPortal.tsx` — `activeInstitutionId` prop; 3 `/api/institution/*`
  çağrısına `institutionId` body'e eklendi.
- [x] `server.ts` — `requireAuth` artık `req.idToken` saklıyor. Yeni `requireInstitutionMember`:
  `req.body.institutionId` yoksa `400`; Firestore REST (`FIRESTORE_REST_BASE`, emulator-aware)
  ile `institutions/{id}` dokümanını **kullanıcının token'ıyla** okur → 401/403 → `403
  INSTITUTION_FORBIDDEN`, 404 → `404`, ağ → `502`; `memberUids`'te uid yoksa `403`.
  `app.use('/api/institution', requireInstitutionMember)` (requireAuth'tan sonra).
  Config okuması `FIREBASE_CONFIG` (projectId + firestoreDatabaseId).
- [x] `test/firestore.test.mjs` — 4 yeni institution testi (owner create + non-member deny,
  eklenen üye okur ama owner'ı ele geçiremez, sahte owner ile create reddi, seedDemo).

**Doğrulama:**
| Kontrol | Sonuç |
|---------|-------|
| `npm run test:rules` (emulator) | ✅ 11/11 pass (7 eski + 4 yeni) |
| `npm run lint` (strict + noUnusedLocals) | ✅ 0 hata |
| `npm run build` | ✅ 2326 modül, chunk bölme korundu, `server.mjs` OK |
| dev `/api/health` `/` `/api/snap/solve` | ✅ 200 |
| dev `/api/institution/analyze-class` (token'sız) | ✅ 401 AUTH_REQUIRED |
| dev `/api/institution/generate-whatsapp-report` (geçersiz token) | ✅ 401 INVALID_TOKEN |
| tarayıcı: Kurum Portalı → "Google ile giriş" ekranı render + konsol temiz | ✅ |

**Bilinen sınır / devir:** `requireInstitutionMember`'ın `400 INSTITUTION_ID_REQUIRED` ve
üye=200 / üye-değil=403 yolları geçerli imzalı token gerektirdiğinden dev'de doğrulanamadı
(Faz 2b ile aynı sınır — staging). Firestore REST zaten kuralları uyguladığı için üye-değil
kullanıcı REST'ten de 403 alır; sunucudaki `memberUids` kontrolü ek savunma. Kurum verisi
ilk sürümde gömülü dizi (`students` vb.) — büyürse `/institutions/{id}/students/{sid}`
ayrımı ayrı işe bırakıldı (Faz 2b deseni). Üye ekleme/çıkarma UI'si yok (Firestore'dan elle).

---

### Orijinal plan (referans)

**Auth modeli kararı (kullanıcı, 2026-08-30): Google hesabı + üyelik.** Kurum yöneticisi

**Auth modeli kararı (kullanıcı, 2026-08-30): Google hesabı + üyelik.** Kurum yöneticisi
mevcut Google girişiyle oturum açar; uid'si bir `/institutions/{id}` dokümanının
`memberUids` dizisindeyse portala erişir. Ayrı e-posta/şifre sistemi **tamamen kalkar**.
**Uygulama emulator gerektirir** (Java yok → burada test edilemez; kör yazılmamalı).
firebase-admin YOK → sunucu Firestore'u kullanıcının ID token'ı + REST ile okur.

### Hedef veri modeli

```
/institutions/{instId} → {
  id, ownerUid, memberUids: string[], ownerEmail,
  config: InstitutionConfig,
  classGroups: ClassGroup[], students: StudentRecord[], institutionExams: InstitutionExam[],
  createdAt, updatedAt
}
```
(Öğrenci verisi ilk sürümde gömülü dizi — mevcut tek-doküman deseniyle tutarlı; büyürse
`/institutions/{id}/students/{sid}` ayrımı ayrı bir işe bırakılır, bkz Faz 2b deseni.)

### `firestore.rules` — YENİ blok (`default deny`'dan ÖNCE)

```
function instMember(inst) { return isAuthenticated() && request.auth.uid in inst.memberUids; }

match /institutions/{instId} {
  allow get:    if instMember(resource.data);
  allow list:   if isAuthenticated();   // array-contains sorgusu; get zaten filtreliyor
  allow create: if isAuthenticated()
                && request.resource.data.ownerUid == request.auth.uid
                && request.auth.uid in request.resource.data.memberUids;
  allow update: if instMember(resource.data)
                && request.resource.data.ownerUid == resource.data.ownerUid
                && request.resource.data.memberUids.hasAny([request.auth.uid]);
  allow delete: if isAuthenticated() && request.auth.uid == resource.data.ownerUid;
}
```

### Adımlar

**1. `src/types.ts`**
- `InstitutionAccount`: `password` KALDIR; `ownerUid: string`, `memberUids: string[]`,
  `ownerEmail: string` EKLE; `lastLoginAt` opsiyonel kalır.
- `InstitutionAuthSession` interface'ini SİL (artık Firebase session'ı kullanılıyor).

**2. `src/lib/institutionStore.ts` (yeni — `institutionAuth.ts`'in yerine)**
- `fetchMyInstitution(uid): Promise<InstitutionAccount | null>` —
  `getDocs(query(collection(db,'institutions'), where('memberUids','array-contains',uid), limit(1)))`.
- `createInstitution(uid, email, form): Promise<InstitutionAccount>` — `addDoc` /
  `setDoc(doc(collection(db,'institutions')))`, `ownerUid=uid`, `memberUids=[uid]`.
  Mevcut `registerInstitution`'daki config/initialClass kurma mantığı buraya taşınır.
- `syncInstitutionToFirestore(instId, partial)` — `setDoc(ref, {...partial, updatedAt}, {merge:true})`.
- `seedDemoInstitution(uid, email)` — `institutionData.ts` DEFAULT_* ile örnek kurum
  oluşturur (login ekranındaki "örnek verilerle başla" için).
- `INITIAL_INSTITUTION_ACCOUNTS` (3 sahte kurum) + `loginInstitution` + `registerInstitution` SİL.
- `institutionData.ts` DEFAULT_* seed'leri KALIR (yeni kurum + demo için kullanılır).

**3. `src/lib/firebase.ts`** — değişiklik yok (aynı `auth`, `db`).

**4. `src/components/InstitutionLoginView.tsx` (büyük yeniden yazım, ~529 → ~250 satır)**
- Props: `onLoginSuccess(account)`, `onReturnToStudentMode()` — aynı.
- 3 durum:
  - **Google'a girmemiş** → `useAuth().currentUser` yok → "Kurum paneline erişmek için
    Google ile giriş yapın" + `<GoogleAuthButton/>`.
  - **Girmiş ama kurumu yok** → "Kurum Oluştur" formu (name/branch/director/phone/logo/renk;
    ŞİFRE ALANI YOK) + "Örnek verilerle doldur" onay kutusu → `createInstitution` /
    `seedDemoInstitution` → `onLoginSuccess`.
  - **Girmiş + kurumu var** → otomatik `onLoginSuccess(account)` (effect içinde).
- Demo hesap listesi / hızlı-demo-login / parola alanları SİLİNİR.
- "Demo Modu" amber rozeti + uyarı bandı KALDIRILIR (artık gerçek); README güncellenir.

**5. `src/App.tsx` (~15 çağrı yeri)**
- `getCurrentInstitutionSession/getInstitutionAccountById/syncInstitutionData/logoutInstitution`
  importlarını `institutionStore` API'siyle değiştir.
- Institution state başlangıç değerleri artık senkron localStorage'dan okunamaz →
  `useState(null)` + yeni `useEffect([currentUser?.uid])`: `fetchMyInstitution(uid)` →
  bulunca `setCurrentInstitutionAccount / setInstitutionConfig / setClassGroups / setStudents
  / setInstitutionExams`. Yoksa hepsi boş/default.
- `handleInstitutionLoginSuccess(account)` — aynı, session yazımı yok.
- `handleInstitutionLogout` — sadece local state temizler + student moduna döner;
  **Google oturumunu KAPATMAZ** (`logoutInstitution()` çağrısı silinir).
- `handleUpdateInstitution*` handler'ları → `syncInstitutionToFirestore(instId, {...})`.
- `storage.saveInstitutionConfig/...` yerel yazımları KALIR (offline fallback) ama
  authoritative kaynak Firestore olur.

**6. `server.ts` — `/api/institution/*` üyelik kontrolü**
- `requireAuth` middleware'i zaten var (Faz 1, satır 342). Yeni `requireInstitutionMember`:
  - Body'de `institutionId` bekle (client tüm `/api/institution/*` çağrılarına ekleyecek:
    `analyze-class`, `generate-whatsapp-report`, `parse-optical-form`).
  - `GET https://firestore.googleapis.com/v1/projects/{projectId}/databases/{dbId}/documents/institutions/{institutionId}`
    başlık: `Authorization: Bearer <req.idToken>` (requireAuth bunu `req` üstüne koymalı — şu an
    sadece verify ediyor, token string'ini de sakla).
  - Firestore kurallar gereği üye değilse 403 döner → biz `403 INSTITUTION_FORBIDDEN`.
  - Doküman yoksa `404`. Ağ hatası → `502`.
- `src/lib/apiClient.ts` — institution çağrıları için `institutionId`'yi otomatik body'e
  ekleyen ince sarmalayıcı veya çağrı yerlerinde elle ekleme (3 yer: InstitutionPortal
  analyze/whatsapp, optical form).

**7. Test (emulator zorunlu: firestore + auth emulator)**
- `firebase.json` emulator config + `@firebase/rules-unit-testing` ile:
  - A kullanıcısı kurum oluşturur → `ownerUid=A`, `memberUids=[A]`. B okuyamaz (get denied).
  - B'yi `memberUids`'e ekle → B okur/yazar. B `ownerUid`'i değiştiremez (update denied).
  - A olmayan biri `ownerUid=A` ile create edemez.
- Sunucu: sahte JWK ile imzalı token + emulator Firestore → üye 200, üye-değil 403.
- `npm run lint` + `build` temiz · InstitutionPortal render (mevcut demo veriyle elle).

**Kabul kriterleri:** İstemci-tarafı parola karşılaştırması kalmadı · kurum verisi
Firestore'da, kurallar üyelikle koruyor · `/api/institution/*` üye olmayan Google
kullanıcısına 403 · emulator kural testleri yeşil · README "demo" notu güncellendi.

**Riski:** Gerçek Google popup + gerçek proje Firestore'u + sunucu REST üçlüsü ancak
staging'de uçtan uca doğrulanabilir; emulator ilk 2 katmanı kapsar.

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

### Faz 8b — Kullanılmayan local/import temizliği + `noUnusedLocals` açıldı  ✅ TAMAM (2026-08-30)

`noUnusedLocals` (yalnız local; `noUnusedParameters` bilinçli kapalı — imza/callback
parametreleri meşru) ile kalan 25 TS6133 tek tek elden geçirildi:

- **Ölü bileşen silindi:** `src/components/ErrorNotebook.tsx` (275 satır). `SmartMistakeBank`
  onun yerini almış (`mistakes`/`notebook`/`errors` sekmeleri); App.tsx'te yalnız ölü import'tu.
  Beraberinde `App.tsx` `handleDeleteSnap` (yalnız ErrorNotebook'a gidiyordu) kaldırıldı
  → **not: snap silme artık hiçbir canlı yüzeyde yok** (önceden de fiilen erişilemezdi; ürün gapı)
- **Ölü import:** `App.tsx` (`React` react-jsx ile gereksiz, `EXAM_METADATA`), `Dashboard` (`THEME`),
  `SmartMistakeBank` (`Skeleton`)
- **Ölü local/state:** `AchievementBadges.selectedBadge` (hiç yapılmamış rozet-detay modalı),
  `SettingsModal.handleTestInsight` (bağlanmamış debug tetikleyici),
  `VoiceAICoach` `prompt` (kurulup gönderilmeyen şablon — API çağrısı yok, lokal fallback kalıyor),
  `InstitutionPortal` `showAddExamModal`/`karneStudent` state'leri,
  `FinancialSummary` `studentQuota`/`simSoftwareNetSavings` + `setTuitionMonthsPerYear`,
  `Dashboard` `unlockedCount`, `CurriculumTracker` `isAnswered`, `DailyStreakBadge` `activeLoginDates`,
  `StreakAnalytics` `selectedDayLog`, `SmartMistakeBank` `stageInfo`, `server.ts` `examType` (optical-form)
  - Setter'ı kullanılan state'lerde değer düşürüldü: `ParentDashboard.isPdfGenerating`,
    `SnapSolver.isPracticingSimilar` → `const [, setX] = useState(...)`
- **`tsconfig.json`: `"noUnusedLocals": true`** kalıcı açıldı (pre-commit hook artık yeniden birikmeyi engelliyor)

**Doğrulama:** `npm run lint` ✅ 0 · `npm run build` ✅ (2326 modül) · dev health/spa/solve/topic-summary
✅ 200 · optical-form & analyze-class (token'sız) ✅ 401.

**Kabul kriterleri:** ✅ `noUnusedLocals` açık ve sıfır hata. ✅ Ölü ErrorNotebook + bağlanmamış
handler'lar temizlendi, davranış aynı.

---

## Faz 9 — UI/UX bug ve davranış düzeltmeleri  🟡 KISMEN (2026-08-30)

Amaç: analizde çıkan gerçek bug'ları ve mobil kullanılabilirlik kırıklarını gidermek.
Kaynak: 2026-08-30 UI/UX + renk analizi (kod + canlı tarayıcı, mobil + masaüstü).

### Uygulama sonucu — 1. tur (2026-08-30)
- [x] **9.1 tamam:** Dashboard "Son Rozet" boş ekran → yeni `achievements` sekmesi
  (`App.tsx` render dalı + `Header` HOME alt-sekmesi "Başarılar & Rozetler" + `BottomNav`
  HOME listesi + `getCategoryForTab`). Ölü `AchievementBadges` bileşeni artık canlı yüzeyde.
  `Dashboard.tsx:132` → `onNavigateTab('achievements','HOME')`.
- [x] **9.1 tamam:** `index.css`'e `@keyframes enter` + `.animate-in/.fade-in/.zoom-in-95/
  .slide-in-from-*` + `.animate-fadeIn/.animate-scaleUp` + `prefers-reduced-motion` guard.
  Derlenmiş CSS'te doğrulandı → modal/toast/dropdown artık animasyonlu.
- [x] **9.1 tamam:** `.no-scrollbar` tanımlandı → mobilde çift kaydırma çubuğu gitti (görsel teyit).
- [x] **9.2 tamam:** `App.tsx` `<main>` `pb-28 md:pb-8`; kök `justify-between` kaldırıldı;
  `BottomNav` `pb-[max(0.375rem,env(safe-area-inset-bottom))]`; footer `pb-24 md:pb-4` + `no-print`;
  bileşenlerdeki tekil `pb-16`'lar kaldırıldı (Dashboard/InstitutionPortal/QuickFlashcards).
  Doğrulama: JS ile main pb=112px, footer nav'ın üstünde, dev boşluk yok.
- [x] **9.2 tamam:** Dashboard hızlı-eylem kartları mobilde tek sütun (`grid-cols-1 sm:grid-cols-2`) +
  `truncate` kaldırıldı → metin kırpılmıyor (görsel teyit).
- [x] **9.3 kısmi:** `Header` geri sayım `setInterval` 1000ms → 60000ms (saniyelik tam-Header
  render'ı önlendi).
- [x] **9.4 kısmi:** `Header` logo `<div onClick>` → `<button aria-label>`; `index.html`
  `lang="tr"`, gerçek `<title>`/description/OG, `theme-color`, `apple-mobile-web-app-*`,
  SVG favicon, `viewport-fit=cover`.

### Uygulama sonucu — 2. tur (2026-08-30)
- [x] **9.6 route lazy-load:** `App.tsx` 16 rota bileşeni `React.lazy` + `<Suspense>` (Skeleton
  fallback). Sonuç: `index.js` **750 KB → 359 KB** (gzip 190→107). recharts (411 KB) artık ayrı
  chunk (yalnız StreakAnalytics/InstitutionPortal). InstitutionPortal 151 KB ayrı — öğrenci hiç
  yüklemiyor. Kritik yol ~1.9 MB → ~1.2 MB. Canlı: tüm rotalar tembel yükleniyor, hata yok.
- [x] **9.5 onboarding + dürüstlük:**
  - `DEFAULT_PROFILE` sahte ilerleme sıfırlandı (`streakDays/todayQuestions/todayMinutes 6/45/110
    → 0`). `onboarded` alanı eklendi (`types.ts`).
  - `loadMockExams` sahte deneme geçmişi + "kişisel notlar" kaldırıldı → `[]` (EmptyState yönlendirir).
  - İlk açılışta `SettingsModal` `isOnboarding` modunda otomatik açılır: "Hoş Geldin" başlığı,
    X/Vazgeç yok, "Kaydet ve Başla", isim alanı boş. Kayıtta `onboarded:true` + modal kapanır.
    Canlı: uçtan uca doğrulandı (isim dashboard'a yansıyor, seri 1'den başlıyor).
  - `SettingsModal` "Firestore Aktif" → `currentUser` varsa "Buluta bağlı", yoksa "Yalnız bu cihazda".
  - "Aktif Lisans / PRO Aktif" → "Erken Erişim / Tüm özellikler açık" (satın-alma iddiası yumuşatıldı).

### Uygulama sonucu — 3. tur (2026-08-30)
- [x] **9.3:**
  - `getCategoryForTab` — `institution` + `inst_*` artık `INSTITUTION` kategorisi (eskiden `HOME`).
    `BottomNav` kurum sekmesindeyken "Anasayfa"yı yakmıyor (dürüst: kurum modunda alt-nav'da aktif yok).
  - `BottomNav` "Profil" aktif durumu → yeni `settingsOpen` prop'u (ayarlar modalı açıkken yanar).
  - `AuthContext` — 8 sn failsafe `setTimeout(setLoading(false))` → Firebase yavaş/engelliyse
    header'da sonsuz spinner kalmıyor.
- [x] **9.4:**
  - `src/lib/useModalA11y.ts` — `<body>` scroll-lock + basit focus-trap + odak iadesi hook'u.
  - `SettingsModal`: `role="dialog"` + `aria-modal` + `aria-labelledby` + hook. `CommandSearch`:
    `role="dialog"` + `aria-modal` + `aria-label` + backdrop tıkla-kapat + scroll-lock.
  - `aria-current="page"` — Header kategori (masaüstü+mobil) + alt-sekme butonları, `BottomNav` 4 buton.
  - Hamburger `aria-label` + `aria-expanded`; SettingsModal toggle'ları `peer-focus-visible:ring-2`.
  - Canlı doğrulama: dialog rolü + `aria-labelledby` + body kilidi + onboarding akışı — hepsi çalışıyor.

### Uygulama sonucu — 4. tur (2026-08-30)
- [x] **Ölü bileşen temizliği:** `SubjectProgressWidget` (296) + `DailyStreakBadge` (361) +
  `ClassroomLeaderboard` (362) silindi — hiç render edilmiyorlardı (~1000 satır). `getSubjectTheme`
  artık yalnız tanımlı (zararsız; StreakAnalytics `THEME.subjects.math.hex` kullanmaya devam).
- [x] **10.6 (kısmi):** `@theme`'e `--text-2xs`/`--text-3xs` (11px/10px) + line-height. Codemod:
  `text-[8px..12px]` (337 kullanım) → `text-3xs`/`text-2xs`/`text-xs`. 8-9px etiketler 10px'e çıktı
  (erişilebilirlik). Boşluk/yarıçap/gölge ölçeği kaldı (görsel etki düşük).
- [x] **10.5 (tamam):** `src/lib/chartColors.ts` — `getComputedStyle` ile `@theme` CSS var'larını
  okur. `StreakAnalytics`, `DailyGoalProgressRing`, `PomodoroTimer` grafik/halka renkleri buradan
  (iki tema uyumlu; tema değişince reload'da uygulanır).
- [x] **10b — GÜNDÜZ TEMASI:**
  - `index.css` `[data-theme="light"]` + `@media (prefers-color-scheme: light) [data-theme="system"]`
    blokları — tüm token'lar (zemin/metin/semantik) gündüz değerleriyle. Varsayılan = Gece.
  - Uyumluluk katmanı genişletildi: yarı-saydam `slate-900/950/*` panelleri (`/40`–`/95`) temayı
    izliyor, tam ekran modal scrim'i gündüzde koyu kalıyor, renkli buton üstündeki `text-white`
    gündüzde beyaz kalıyor.
  - `src/lib/themeMode.ts` + `index.html` boyama-öncesi init script (yanıp sönme yok) +
    `SettingsModal` "Görünüm" seçici (Sistem/Gündüz/Gece), `localStorage` + `<html data-theme>`.
    `theme-color` meta dinamik.
  - `BottomNav` zemini token'a taşındı (gündüzde artık koyu kalmıyor).
  - Canlı doğrulama: Dashboard + StreakAnalytics + SettingsModal, gündüz↔gece anlık geçiş,
    kontrast rahat, regresyon yok.

### Uygulama sonucu — 5. tur (2026-08-30): tutarlılık gözden geçirme + düzeltmeler
Canlı iki-tema incelemesi sonrası kullanıcı geri bildirimi ("dark monoton, gündüz koyu adalar,
Kurum çift yol") üzerine:
- [x] **Dark canlılık:** kart kenarlıkları belirginleşti (`--color-border #2f3340→#383d4d`); gold
  parlatıldı (`#dda544→#ecb44e`); success/danger az miktar canlandırıldı; **Dashboard hızlı-eylem
  ikon kutuları** artık 4 farklı renk (indigo/altın/yeşil/sky) — "kumarhane değil ama cansız da değil".
- [x] **Gündüz koyu gradyan adaları:** `[data-theme="light"]` altında `from/via/to-slate-9xx` +
  `*-95x` tint durakları açık yüzeye iniyor → başlık banner'ları sayfayla uyumlu. `text-white`
  "beyaz kal" istisnası daralttıldı (yalnız marka/semantik dolgulu butonlar; slate gradyanı hariç)
  → banner başlıkları gündüzde koyu ve okunur.
- [x] **Koyu-indigo "seçili" zeminleri** (`bg-indigo-950/*`, `bg-indigo-900/*`) → her iki temada
  çalışan marka tinti; `CurriculumTracker` seçili ders satırı düzeltildi.
- [x] **Kurum çift yol:** üst kategori çubuğundan (masaüstü 4→3 kolon + mobil kaydırıcı) çıkarıldı;
  hamburger'daki "Dershane Portalı" kısayolu korundu (kullanıcı tercihi). `CATEGORY_DEFINITIONS`
  değişmedi → alt-sekme çözümü tutarlı.
- [x] **"Sistem" teması** basitleştirildi: `themeMode.ts` tercihi (system/light/dark) `<html
  data-theme>`'e çözer + `matchMedia` canlı dinleyici. `index.css` tek gündüz bloğu (media kopyası
  kalktı). `index.html` init script system'i çözüyor.
- [x] Doğrulama: `tsc` 0 · `build` OK · Dashboard/StreakAnalytics/CurriculumTracker iki temada,
  anlık geçiş, kontrast rahat, regresyon yok.

### Uygulama sonucu — 6. tur (2026-08-30): gündüz teması ince ayar
- [x] **Renkli koyu-tint zeminleri (`bg-<renk>-900/950/*`)** — tüm opaklık varyantları explicit
  sınıf listesiyle token tintine (`color-mix + transparent`) çevrildi → gece/gündüz ikisinde de
  alttaki yüzey görünür (seçili satır, vurgu paneli, rozet arkası). `hover:bg-*` etkilenmez.
- [x] **Gündüz gradyan başlık banner'ları** — `from/via/to-slate-9xx` + `*-95x` durakları geniş
  attribute-selector'la açık yüzeye iner.
- [x] **`--color-brand-fg` çift-görev bug'ı** çözüldü: `--color-brand-fg` (indigo VURGU METNİ,
  gündüzde koyulaşır) + `--color-on-brand` (renkli BUTON metni, iki temada açık) ayrıldı.
  `text-indigo/violet/purple/pink/fuchsia-*` → brand-fg; buton metni → on-brand.
  (Gündüzde "Dengeli & Standart", "Deneme Telafi Planı" gibi soluk başlıklar düzeldi.)
- [x] **Grafik renkleri:** `useChartColors` hook'u (`useState` lazy init + `snaps:themechange`
  dinleyici) — modül-yükleme yerine mount'ta okuyor → Pomodoro/DailyGoalRing/StreakAnalytics
  halka + grid renkleri artık doğru (eskiden fallback koyu değere düşüyordu) + tema değişiminde
  reload'sız güncelleniyor. `themeMode.applyTheme` olay yayıyor.
- [x] `[data-theme="light"]` semantik `-fg` token'ları beyazda kontrast için biraz koyulaştırıldı.
- [x] Doğrulama: `tsc` 0 · `build` OK · iki temada 8+ ekran (Dashboard/Snap/Mock/Pomodoro/Planner/
  Müfredat/StreakAnalytics/CommandSearch) canlı — regresyon yok, anlık geçiş çalışıyor.

### Uygulama sonucu — 7. tur (2026-08-30): tam tablist ARIA + gölge ölçeği
- [x] **9.4 tam tab paterni:** `src/lib/useTablistKeys.ts` — ←/→/↑/↓/Home/End ok tuşu navigasyonu
  (roving tabindex + otomatik seçim). Header 3 nav çubuğu (`role="tablist"`), butonlar
  `role="tab"` + `aria-selected` + `tabIndex` + `aria-controls`; `<main>` `role="tabpanel"` +
  `aria-labelledby`. Canlı: 10 sekmeli listede ok/Home/End odak gezdiriyor + seçiyor (doğrulandı).
  `BottomNav` `role="navigation"` + `aria-current` olarak kalıyor (arama modalı açtığı için
  tab-panel paternine uymuyor — bilinçli).
- [x] **10.6 gölge ölçeği:** `@theme` + `[data-theme="light"]` `--shadow-1/2/3` (gece: ince,
  kenarlık işi yapar; gündüz: yumuşak gri elevasyon). Uyumluluk katmanı: `shadow-sm..2xl` (6
  basamak) → 3 seviye; ~80 **renkli gölge** (`shadow-indigo-600/30` vb. — çıngıraklı) nötr
  `--shadow-2`'ye indi. Gündüz teması artık düz-kenarlık değil, gerçek elevasyon.
- [x] Tipografi ölçeği zaten yapıldı (5. tur). Boşluk (`p-3.5/4/5/6`) ve yarıçap
  (`rounded-xl/2xl/3xl`) — fiili sistem yeterince tutarlı (kart 2xl, buton xl, modal 3xl,
  girinti/çip lg); ±2px için 300+ dosya değişikliği/regresyon riski değmez → bırakıldı.
- [x] Doğrulama: `tsc` 0 · `build` OK · iki temada dashboard + settings + tablist klavye — sorunsuz.

### Kalan
Planlanan tüm faz maddeleri tamamlandı. Sürdürme işleri: uyumluluk katmanı bileşenler token
util'lerine geçtikçe küçülecek; gündüz teması gerçek kullanımda ince ayar isteyebilir.

### Orijinal plan (referans)

### 9.1 — Gerçek bug'lar
- [ ] **Dashboard "Son Rozet" butonu boş ekran** — `Dashboard.tsx:132` `onNavigateTab('profile','PROFILE')`
  çağırıyor ama `App.tsx`'te `activeTab === 'profile'` / `'settings'` için render dalı yok
  (ayarlar bir modal). Rozet kartına tıklayınca `<main>` tamamen boşalıyor.
  → Butonu `onOpenSettings()`'e bağla **veya** gerçek bir "Başarılar" sekmesi ekle.
  `getCategoryForTab`'deki `'profile'`/`'settings'` → `PROFILE` eşlemesini de netleştir.
- [ ] **Entrance animasyonları ölü** — 22 bileşende `animate-in fade-in zoom-in-95
  slide-in-from-bottom-*` kullanılıyor ama `tw-animate-css` / `tailwindcss-animate` paketi yok,
  `index.css`'te tanım yok, derlenmiş CSS'te bu sınıflar yok (doğrulandı). Tüm modal/toast/dropdown
  animasyonsuz "zıplayarak" açılıyor. → `tw-animate-css` ekle + `index.css`'e `@import "tw-animate-css";`
  (veya keyframe'leri elle tanımla).
- [ ] **`no-scrollbar` sınıfı tanımsız** — `Header.tsx:468,496` yatay kaydırıcılarda kullanılıyor,
  hiçbir yerde tanımlı değil → mobilde kategori + alt-sekme satırlarının altında çift gri kaydırma
  çubuğu görünüyor (canlı testte doğrulandı). → `index.css`'e
  `.no-scrollbar{scrollbar-width:none} .no-scrollbar::-webkit-scrollbar{display:none}`.

### 9.2 — Mobil layout
- [ ] **Sabit `BottomNav` içeriği örtüyor** — `App.tsx:421` `<main>`'de mobil alt boşluk yok.
  Sadece 3 bileşende (`Dashboard`, `InstitutionPortal`, `QuickFlashcards`) `pb-16` var; diğer
  ~12 görünüm (`SnapSolver`, `StudyPlanner`, `MockExamTracker`, `SmartMistakeBank`, `PomodoroTimer`,
  `CurriculumTracker`, `StreakAnalytics`, `SpeedTrainer`, `QuestionDuel`, `VoiceAICoach`,
  `AICoachChat`, `TargetSimulator`) alt menünün arkasında kalıyor. Footer da tamamen gizli.
  → Boşluğu tek yerden `<main>`'e ver (`pb-24 md:pb-8`), bileşenlerdeki tekil `pb-16`'ları kaldır.
- [ ] **iOS safe-area** — `BottomNav`'a `padding-bottom: max(6px, env(safe-area-inset-bottom))`;
  `index.html` viewport'a `viewport-fit=cover`.
- [ ] **Kısa sayfada dev boş alan** — `App.tsx:401` kök `flex flex-col justify-between`; `main`
  zaten `flex-1`. `justify-between` gereksiz, içerik kısa olunca ~600px boşluk açıyor (canlı testte
  görüldü). → `justify-between` kaldır.
- [ ] **Mobil sticky header ~300px** (812px ekranın ~%38'i: üst bar + kategori kaydırıcı +
  alt-sekme kaydırıcı). → Mobilde kategori satırını `BottomNav`'a devret veya scroll'da header'ı
  collapse et; en az alt-sekme çubuğu sticky olmaktan çıksın.
- [ ] **Dashboard hızlı-eylem kartlarında metin kırpılıyor** (`Dashboard.tsx:171-255`) — mobilde
  2 sütun çok dar: "Yapay zeka il…", "Deneme Ka…", "AI Sınav Ko…". → Mobilde tek sütun veya
  `truncate` yerine `line-clamp-2` + daha kısa açıklamalar.

### 9.3 — Navigasyon tutarlılığı
- [ ] `BottomNav` "Profil" butonu `isProfileActive`'i `activeTab === 'settings'` ile kontrol ediyor
  ama bu asla true olmuyor (ayarlar modal) → Profil sekmesi hiç aktif görünmüyor.
- [ ] Kurum Portalı `activeTab === 'institution'` iken `getCategoryForTab` bunu `HOME` sayıyor →
  `BottomNav`'da "Anasayfa" yanıyor. `INSTITUTION` kategorisi tutarlı ele alınmalı.
- [ ] Hamburger menüsündeki "Dershane Portalı" ile üst kategori çubuğundaki "Kurum Portalı" çift yol —
  hamburger'dan kaldır veya kategori çubuğunu sadeleştir.
- [ ] `GoogleAuthButton` — Firebase Auth yavaş/engelli olursa header'da sonsuz spinner (`loading`
  timeout fallback'i yok). → ~8sn sonra "giriş yap" durumuna düş.

### 9.4 — Erişilebilirlik
- [ ] Logo tıklanabilir `<div>` (`Header.tsx:230`) → `<button>`.
- [ ] Sekme çubukları `role="tablist"`/`role="tab"`/`aria-selected`; `BottomNav` butonlarına
  `aria-current`.
- [ ] İkon-only butonlara `aria-label` (hamburger, geri sayım, streak pill).
- [ ] Toggle switch'lere görünür focus ring (`SettingsModal.tsx:301,352`).
- [ ] Modallara `role="dialog"` + `aria-modal` + focus-trap + açılışta autofocus + kapanışta focus
  iadesi + `body` scroll-lock; backdrop tıklamasında kaydedilmemiş değişiklik uyarısı
  (`SettingsModal`).
- [ ] `index.html`: `lang="en"` → `lang="tr"`; `<title>` "My Google AI Studio App" → "Snaps —
  KPSS & YKS AI Sınav Koçu"; favicon, `theme-color`, `apple-mobile-web-app-*` meta ekle; OG açıklaması.

### 9.5 — Ürün
- [ ] **İlk açılış / onboarding** — `storage.ts:36` varsayılan profil "Sınav Adayı"; uygulama
  6 günlük seri, sahte rozet, geçmiş deneme netleri, 45 çözülmüş soru ile açılıyor. Kurulum akışı yok.
  → İlk açılışta zorunlu mini-onboarding (isim + sınav + tarih); demo veriyi
  `hasCompletedOnboarding` flag'i arkasına al.
- [ ] "PRO Aktif / Aktif Lisans / Firestore Aktif" hardcoded (`SettingsModal.tsx:284,411,421`,
  `GoogleAuthButton.tsx:63` — `idle`'da da "Aktif") → gerçek duruma bağla.

### 9.6 — Performans (opsiyonel, Faz 10 ile paralel)
- [ ] İlk yük ~1.9 MB JS (`index` 742 KB + `firebase` 672 KB + `charts` 410 KB), route lazy-load yok.
  → `React.lazy` ile ağır sekmeler (`StreakAnalytics`, `MockExamTracker`, `TargetSimulator`,
  `ParentDashboard`, `InstitutionPortal` 2051 satır).

**Kabul kriterleri:** `npm run lint` 0 hata · `npm run build` başarılı · Dashboard rozet butonu
çalışan bir yüzeye gidiyor · mobilde hiçbir görünümün son elemanı `BottomNav` altında kalmıyor ·
modallar animasyonlu açılıyor · `lang="tr"`.

---

## Faz 10 — Renk sistemi + tasarım ölçeği tam yenilemesi  🟡 KISMEN (2026-08-30)

Amaç: 4 kopuk renk kaynağını (`theme.ts`, `index.css` `:root`, `!important` ezmeleri, ~297
arbitrary hex) tek `@theme` kaynağına indirmek + öğrenci psikolojisi ve göz sağlığına göre paleti
yeniden ayarlamak + tipografi/boşluk/gölge ölçeğini standardize etmek.
**Karar (2026-08-30): "Tam yenileme" kapsamı seçildi. Işık teması Faz 10b'ye ertelendi.
"Hata Defteri" kırmızıdan altın/indigo'ya çevrilecek.**

### Uygulama sonucu — 1. tur (2026-08-30): temel + codemod
- [x] **10.1:** `index.css`'e tek `@theme` bloğu — "Odak" paleti (canvas #13141a, surface-0..3,
  border/-strong, fg/-secondary/-muted/-disabled, brand #5b5fd6, success/warning/danger/info,
  6 ders token'ı). `:root` custom-prop bloğu ve kullanılmayan `.bg-surface-card` vb. helper'lar silindi.
- [x] **10.1:** Metin `!important` ezmeleri kaldırıldı → yerine `@theme` var'larından okuyan
  **uyumluluk katmanı**: ~1950 `slate-*` / `text-white` yardımcısı tek noktadan yeni palete bağlandı
  (değerler @theme'den; `!important` yardımcıyı ezmek için zorunlu, aşamalı küçülecek).
  `text-white`/`slate-100` → `--color-fg` (saf beyaz halation'ı bitti).
- [x] **10.2:** codemod (`scratchpad/color_codemod.py`) — 291 arbitrary `prefix-[#hex]` → token
  util (`bg-surface-1`, `border-border` …). Rol bazlı eşleme (bg/border/text ayrı). Kalan: 0
  (SVG `stroke=/fill=` hariç). 15 dosya.
- [x] **10.1/theme.ts:** `surfaces` + `text` blokları silindi (kullanılmıyordu); `brand` #5b5fd6'ya,
  `status` semantik token'lara hizalandı; "@theme tek kaynak" başlık yorumu.
- [x] Doğrulama: `tsc` 0 · `vite build` başarılı (2327 modül) · canlı mobil+masaüstü görsel:
  regresyon yok, yüzeyler ılık/yumuşak, kontrast rahat, layout sağlam.

### Uygulama sonucu — 2. tur (2026-08-30): aksan psikolojisi
- [x] **10.3:** `index.css` uyumluluk katmanına **aksan bloğu** eklendi:
  - Marka: `indigo-400/500/600/700` (metin/bg/border/gradyan durakları) → tek `--color-brand`
    (indigo-600, beyaz metin AA). 4 kopuk indigo tonu bitti.
  - `emerald/green/teal` → `--color-success` (#35c393, yumuşak); `amber/yellow/orange` →
    `--color-warning` (#dda544, mat altın — alarm turuncusu değil); `rose/red` → `--color-danger`
    (#e26571, yumuşak mercan). Metin varyantları `-fg` (açık) token'ına.
  - Gradyan `from-/via-/to-` durakları da sakinleştirildi (hue tek sisteme iner) — "kumarhane"
    etkisi kırıldı, seri rozeti artık yumuşak altın, alt-nav arama butonu düz marka indigo.
    (Not: v4'te `--tw-gradient-from`'a pozisyon eklemek gradyanı bozuyor → yalnız renk override edildi.)
  - `@theme`'e `--color-*-fg` (açık metin) + `--color-brand-fg` eklendi.
- [x] **10.3 / Hata Defteri:** Leitner **1. Kutu** `rose` → `amber` ("gelişim alanı" tonu, utanç
  kırmızısı yok). Modül başlığı zaten indigo'ydu. Yanlış-cevap geri bildirimi (`text-rose-*`)
  uyumluluk katmanıyla yumuşak mercana indi — hâlâ ayırt edilir ama sert değil.
- [x] Doğrulama: `tsc` 0 · `vite build` OK · canlı: Dashboard/StreakAnalytics/Hata Defteri/
  Settings modal — tutarlı, sakin, kırmızı/neon yok, kontrast rahat, regresyon yok.

### Kalan (3. tur)
- [ ] 10.4 — **MOOT/gözden geçir:** `getSubjectTheme` + `SubjectProgressWidget` + `DailyStreakBadge` +
  `ClassroomLeaderboard` **ölü bileşen** (0 render yeri — Faz 8 tarzı temizlik adayı). Canlı ders
  renkleri yalnız `CurriculumTracker`/`MockExamTracker`'da ad-hoc; küçük iş.
- [x] 10.5 — recharts/SVG `stroke=/fill=` literalleri palet hex'lerine hizalandı
  (DailyGoalProgressRing, StreakAnalytics, PomodoroTimer, FinancialSummary; `THEME.*` kullanan
  yerler zaten hizalıydı). Not: Faz 10b'de `getComputedStyle` ile CSS var'a çevrilecek (iki tema).
- [ ] 10.6 — tipografi/boşluk/yarıçap/gölge ölçeği (`@theme`; `text-[10px/11px]` tek-kullanımları,
  `p-3.5/p-4/p-5/p-6` karışıklığı, `rounded-xl/2xl/3xl`, `shadow-*` → 2 seviye).
- [ ] Ölü bileşen temizliği: `SubjectProgressWidget`, `DailyStreakBadge`, `ClassroomLeaderboard`
  (+ kullanımıysa `getSubjectTheme`/`THEME.subjects`).

### Mevcut durum tespiti
- Uygulama zemini 3 farklı değerde: `theme.ts` `#0F1117`, `index.css` `body #14151C !important`,
  `App.tsx` `bg-slate-950` → `!important #161822`. Header kendi zemini `#0F111A`.
- ~20 neredeyse-aynı koyu yüzey tonu (`#161822 #1B1D27 #222533 #141622 #1A1D2D #1E2132 #12141C
  #1c1f2d #232733 …`) + slate-900/950 ezmeleri.
- `theme.ts` semantik renkleri kodun kullanımıyla çelişiyor: theme `green/red/orange` diyor,
  kod `emerald` (344×) / `rose` (165×) / `amber` (304×) kullanıyor. `theme.ts.status` ölü kod.
- `getSubjectTheme` yalnız `SubjectProgressWidget`'ta kullanılıyor (ders renk sistemi %95 âtıl).
- `index.css` 31 `!important` — 3'ü metin rengi ezmesi; hiyerarşiyi düzleştiriyor, bileşenler
  override edemiyor, kontrast iddiası yanlış zemine (`#14151C`) göre ölçülmüş.
- 451× `text-white`, 66 gradyan — saf beyaz/near-black kontrastı ~19:1 (halation, göz yorgunluğu).
- Darklar mavi-soğuk (gece çalışması + melatonin için ideal değil).
- recharts renkleri ayrı 4. kopya (`FinancialSummary`, `DailyGoalProgressRing`: `#6366f1 #10b981
  #f59e0b #232738 …`).

### 10.1 — Token kaynağı: tek `@theme` bloğu (`index.css`)
- [ ] `@theme` bloğu ekle — "Odak" paleti (gece çalışmasına ayarlı, hafif ılık nötr, saf siyahtan uzak):
  ```
  --color-bg:#13141A  --color-surface-0:#181A22  --color-surface-1:#1F212B
  --color-surface-2:#282B37  --color-surface-3:#333747
  --color-border:#2F3340  --color-border-strong:#3E4353
  --color-fg:#E8EBF1 (saf beyaz DEĞİL, ~12:1 tavan)  --color-fg-secondary:#B9C0CD
  --color-fg-muted:#8B94A4  --color-fg-disabled:#5C6472
  --color-brand:#5B5FD6  --color-brand-hover:#4C50C4
  --color-success:#35C393  --color-warning:#DDA544  --color-danger:#E26571  --color-info:#4FA3D4
  --color-subj-turkce:#2FA98C  --color-subj-matematik:#4F8FD6  --color-subj-tarih:#C1904A
  --color-subj-cografya:#C06B8C  --color-subj-vatandaslik:#6C7590  --color-subj-fen:#6BA85D
  ```
  (Değerler uygulama sırasında gerçek zeminde kontrast ölçülerek ±%5 ince ayarlanabilir.)
- [ ] `index.css`'ten metin `!important` ezmelerini (`.text-slate-300/400/500`) ve yüzey
  `!important` ezmelerini kaldır. Print `!important`'ları kalır.
- [ ] `theme.ts` küçült: `surfaces`/`text`/`status`/`brand` blokları silinir. `THEME.subjects` +
  `getSubjectTheme` kalır (recharts/canvas hex ister) ama değerleri `@theme` ders token'larıyla
  **birebir** eşitlenir + "kaynak: index.css @theme" yorumu. İdeal: JS tarafı
  `getComputedStyle(document.documentElement).getPropertyValue('--color-…')` ile okur.

### 10.2 — Codemod: ~297 arbitrary hex → token util
- [ ] Eşleme tablosuyla toplu değişim (çoğu birebir):
  | Eski | Yeni |
  |---|---|
  | `#0F1117 #0F111A #12141C #141620 #141622 #14151C` | `bg-bg` |
  | `#161822 #161826 #161922 #1A1D2D #1c1f2d #1E2130 #1E2132` + `bg-slate-950` | `bg-surface-0` |
  | `#1B1D27` + `bg-slate-900` | `bg-surface-1` |
  | `#222533 #232733 #22263A #242838` | `bg-surface-2` |
  | `#2A2E40 #2B3045` | `bg-surface-3` |
  | `#2D3245 #262B3D #282D42` | `border-border` |
  | `#3B4259 #3A405A` | `border-border-strong` |
  | `#7FAE96` (2× SnapSolver) | `text-success` veya kaldır |
- [ ] Her dosya değişiminden sonra mobil + masaüstü ekran görüntüsü diff (görsel regresyon).

### 10.3 — Aksan sadeleştirme (psikoloji)
- [ ] `emerald` → `success` token'ı (344 kullanım, semantik "başarı" olanlar).
- [ ] `amber` kullanımını azalt (304→hedef ~%40): seri/streak `warning` altınına iner, **küçük**,
  yanıp sönme yok. Kutlama anı (`canvas-confetti`) `success` + konfeti.
- [ ] **`rose` yalnız yıkıcı eylemde** (sil/çıkış). "Hata Defteri" (`SmartMistakeBank` +
  `mistakes/notebook/errors` sekmeleri) → `warning` altın veya `brand` indigo, "Gelişim Alanları"
  tonu. İkonlar korunur.
- [ ] 66 gradyanın ~%80'i düz `surface-*` / `brand`'e iner (dashboard "kumarhane" etkisini kır).
- [ ] Renk körü güvenliği: success/danger her yerde ikon + şekil ile de ayrışsın.

### 10.4 — Ders renkleri
- [ ] `getSubjectTheme`'i tüm ders-renkli yüzeylerde kullan (`Dashboard`, `CurriculumTracker`,
  `MockExamTracker`, `StudyPlanner`, `SubjectProgressWidget`). Ders renkleri **desatüre etiket**
  (tint arka plan + renkli metin), asla tam dolgu.
- [ ] Çakışmaları çöz: Türkçe (emerald) vs success, Coğrafya (pink) vs danger → ders token'ları
  ayrı isim uzayında (`--color-subj-*`).

### 10.5 — recharts / SVG
- [ ] `FinancialSummary`, `DailyGoalProgressRing`, `StreakAnalytics`, `TargetSimulator`,
  `MockExamTracker` grafik renklerini CSS var'dan besle (JS'te `getComputedStyle`).

### 10.6 — Tipografi / boşluk / gölge ölçeği ("tam yenileme")
- [ ] `@theme`'e tipografi ölçeği: `--text-xs…--text-3xl` + satır yüksekliği. Şu an `text-[10px]`,
  `text-[11px]` gibi tek-kullanım boyutlar dolaşıyor — 5-6 basamaklı bir ölçeğe indir.
- [ ] Boşluk: kart iç padding'i (`p-4/p-5/p-6/p-3.5` karışık) 2-3 standarda indir.
- [ ] Köşe yarıçapı: `rounded-xl/2xl/3xl` karışık — kart `2xl`, buton/rozet `xl`, çip `lg` kuralı.
- [ ] Gölge: `shadow-sm/md/lg/2xl/shadow-indigo-600/20` karışık — 2 seviyeli sistem
  (`--shadow-card`, `--shadow-pop`).
- [ ] `text-white` (451×) → başlıklarda `text-fg`, gövdede `text-fg-secondary`. Saf beyaz yalnız
  1-2 kelimelik vurgu.
- [ ] Font: `index.css` `-apple-system…` yığını kalır; opsiyonel `Inter` (self-host, Google Fonts
  CSP riski yok — bkz. proje statik host değil).

**Kabul kriterleri:** Tek `@theme` bloğu renk kaynağı · `theme.ts`'te yüzey/metin/status yok ·
grep `\[#[0-9A-Fa-f]` → 0 (SVG marka logoları hariç) · `!important` yalnız `@media print` ·
`npm run lint` 0 · `npm run build` başarılı · WCAG AA: tüm metin/zemin çiftleri gerçek zeminde
≥4.5:1 (gövde ≥7:1) · mobil + masaüstü görsel regresyon onaylı · `text-white` ≤ ~40.

---

## Faz 10b — Işık (gündüz) teması  🚧 PLANLANDI (Faz 10 sonrası)

- [ ] `@theme`'i `:root` (light) + `@media (prefers-color-scheme: dark)` + `[data-theme]` yapısına
  böl; koyu paleti dark bloğa taşı.
- [ ] `SettingsModal`'a tema geçişi (Sistem / Gündüz / Gece), `localStorage` + `<html data-theme>`.
- [ ] `color-scheme` dinamik; recharts renkleri iki temada da AA.
- [ ] Print CSS zaten beyaz — light tema ile tutarlılığı doğrula.

---

## Öneri sıralama

1. Faz 0 → 1 → 2 (production'da gerçek kırılma/maliyet)
2. Faz 3 (ürün kararı gerektirir — paralel düşünülebilir)
3. Faz 4 → 5 → 6
4. Faz 7 (teknik borç, aceleye gerek yok)
5. Faz 8 → 8b (mekanik temizlik) ✅
6. Faz 2b, 3b — **emulator gerektirir** (Java kurulu bir ortam). Yukarıda tam spec var;
   `firebase emulators:start` (firestore+auth) ile uygulanmalı, kör yazılmamalı.

## Durum özeti (2026-08-30)

| Faz | Durum | Commit |
|-----|-------|--------|
| 0–7 | ✅ | `faa78ea`…`3b5fd93` |
| 8 — ölü import temizliği | ✅ | `7a533f5` |
| 8b — ölü local + `noUnusedLocals` | ✅ | `ed9c1c4` |
| 2b — alt-koleksiyon migrasyonu | ✅ emulator ile test edildi (7/7) | `8cde320` |
| 3b — kurum portalı gerçek auth (Google+üyelik) | ✅ emulator ile test edildi (11/11) | — |
| 9 — UI/UX bug & davranış | 🟢 9.1–9.6 + tam tablist ARIA tamam | — |
| 10 — renk sistemi + tasarım ölçeği | 🟢 10.1/10.2/10.3/10.5 + tipografi + gölge ölçeği tamam; 10.4 moot | — |
| 10b — gündüz teması | 🟢 tamam (Sistem/Gündüz/Gece, token blokları, no-flash, elevasyon, grafik senkronu) | — |
| Ölü bileşen temizliği | 🟢 3 bileşen (~1000 satır) silindi | — |

---

## Faz 11 — YKS konu havuzu + çıkmış soru ağırlıkları + Defter Notları (2026-08-31)

**İstek:** (1) konular eksikti, tam YKS konu listesi gelsin; (2) çıkmış soru
dağılımı/yılları eklensin; (3) çıkmış soruya göre ağırlık; (4) el yazısı ders
notları modülü (ekip notları gömülü + öğrenci ekleyebilir), yeni sekme "Defter
Notları" + anasayfa kartı.

- **F1 — Tam YKS konu havuzu.** `INITIAL_YKS_SUBJECTS` 4 ders → **20 ders**
  (TYT+AYT ayrı: Türkçe/Matematik/Geometri/Fizik/Kimya/Biyoloji/Tarih/Coğrafya/
  Felsefe/Din + AYT Edebiyat). ~332 konu. `SubjectTopic.statKey` alanı eklendi
  (`src/types.ts`). `mkTopic()` üretici: ağırlık `statKey` varsa çıkmış-soru
  ortalamasından türetilir. `CURRICULUM_VERSION = 2`.
- **F2 — `src/data/examTopicStats.ts` (YENİ).** MEB rehberlik derlemesi
  PDF'lerinden (Psk. Dan. N. Gizem Toker) çözümlenmiş **TYT 2018–2025 + AYT
  2019–2025** konu×yıl soru sayıları (296 satır). `getTopicStat`,
  `deriveWeight` (derse göre normalize eşik), `topTopicsForSubject`.
- **F3 — `CurriculumTracker`.** Her konuda yıl sparkline + "yıllık ort. / son
  çıkış / toplam / trend" + açılır yıl kırılımı. Sırala (ağırlık/eksik/müfredat),
  filtre (tümü/son 3 yıl/hiç çıkmamış/eksik). "En Kritik 5 Konu" paneli. Kaynak
  dipnotu. Ortak statKey paylaşan alt başlıklar için "ana başlık geneli" uyarısı.
- **F4 — Not veri katmanı.** `src/types.ts`: `LectureNote*`, `UserNote`,
  `NoteProgress`. `src/data/lectureNotes.ts` (YENİ) küratörlü manifest +
  `public/lecture-notes/` (README + `_ornek/` yer tutucu SVG'ler).
  `src/lib/noteStore.ts` (YENİ) — vanilla IndexedDB (görsel Blob + downscale/webp
  + user note meta). `storage.ts`: `loadNoteProgress`/`saveNoteProgress`.
- **F5 — `src/components/LectureNotes.tsx` (YENİ, lazy).** Ders→konu→sayfa
  görüntüleyici (zoom, sayfa nav), Ekip/Benim sekmeleri, "Okundu"/"Tekrar lazım",
  tekrar listesi, dosyadan not ekleme modalı, konu↔müfredat köprüsü. Sekme
  kaydı: `Header` CATEGORY_DEFINITIONS, `App` getCategoryForTab+render,
  `BottomNav`, `CommandSearch`. `Dashboard`'a "Defter Notları" kartı.
- **F6 — Göç & senkron.** `storage.loadSubjects` `CURRICULUM_VERSION` kontrolü +
  `migrateSubjects` (kullanıcı işaretlerini konu id'sine göre taşır; tarayıcıda
  test edildi — eski id düşer, eşleşen id işareti korur). `noteProgress`
  Firestore ana dokümanına (`firestoreSync` + `AuthContext` fetch/seed);
  görseller ASLA senkronlanmaz. Firestore kuralları değişmedi (owner write yeter).

`npm run lint` + `npm run build` temiz. Tarayıcıda doğrulandı (konu takip
frekans UI, migrasyon, defter görüntüleyici, konsol temiz).
