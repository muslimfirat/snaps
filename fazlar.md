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

## Faz 3b — Kurum portalını gerçek özelliğe çevir (PLANLANDI — 2026-08-30, uygulanmadı)

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
| 2b — alt-koleksiyon migrasyonu | ✅ emulator ile test edildi (7/7) | — |
| 3b — kurum portalı gerçek auth (Google+üyelik) | 📋 spec hazır (emulator artık kurulu) | — |
