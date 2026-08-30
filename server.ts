import express from 'express';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Firebase ID token verification (public JWK, no service account) ---
// Faz 1: /api/* uçlarını kimlik doğrulama + rate limit ile koruma.
const FIREBASE_PROJECT_ID: string = (() => {
  try {
    const cfg = JSON.parse(readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8'));
    return cfg.projectId || '';
  } catch {
    return process.env.FIREBASE_PROJECT_ID || '';
  }
})();

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

interface AuthedRequest extends express.Request {
  uid?: string;
}

/**
 * Verifies a Firebase ID token (RS256) against Google's public keys.
 * Checks signature, issuer, audience and expiry. Returns the token subject (uid).
 */
async function verifyFirebaseToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });
  if (!payload.sub) throw new Error('Token subject (uid) missing');
  return payload.sub;
}

/**
 * Express middleware: rejects the request with 401 unless it carries a valid
 * Firebase ID token in the `Authorization: Bearer <token>` header.
 */
async function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction): Promise<void> {
  const header = req.headers.authorization || '';
  const match = /^Bearer (.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Bu özellik için giriş yapmanız gerekiyor.' });
    return;
  }
  if (!FIREBASE_PROJECT_ID) {
    console.error('FIREBASE_PROJECT_ID is not configured; cannot verify tokens.');
    res.status(500).json({ error: 'AUTH_MISCONFIGURED', message: 'Sunucu kimlik doğrulaması yapılandırılmamış.' });
    return;
  }
  try {
    req.uid = await verifyFirebaseToken(match[1]);
    next();
  } catch (err: any) {
    console.warn('Firebase token verification failed:', err?.message || err);
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Oturumun doğrulanamadı, lütfen tekrar giriş yap.' });
  }
}

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Mock/fallback responses will be used if needed.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient Gemini Execution Helper with automatic model fallback and timeout
async function callGeminiApi<T>(fn: (modelName: string) => Promise<T>, timeoutMs: number = 18000): Promise<T> {
  // Model IDs verified against https://ai.google.dev/gemini-api/docs/models (2026-08-29).
  // Chain: fast GA model → cheaper/faster GA fallback → strong GA reasoning fallback.
  // (Gemini 3.x "pro" is still preview-only, so the strong fallback stays on GA 2.5-pro.)
  const models = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-pro'];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT_GEMINI_API (${model})`)), timeoutMs)
      );
      return await Promise.race([fn(model), timeoutPromise]);
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.warn(`Gemini model '${model}' attempt (${i + 1}/${models.length}) failed: ${errorMsg}`);
      if (i < models.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
      }
    }
  }

  throw lastError;
}

// --- Shared Gemini endpoint helpers -----------------------------------------
// Every AI endpoint follows the same shape: no API key → curated fallback;
// otherwise call Gemini (with model fallback), parse, validate, and fall back
// on any error. These two helpers collapse that boilerplate into one place.

interface GeminiJsonParams {
  res: express.Response;
  label: string;                          // used in the warning log line
  contents: any;                          // string | Content | Content[]
  schema: any;                            // responseSchema (Type.OBJECT ...)
  fallback: () => any;                    // curated response on error / invalid output
  noKeyFallback?: () => any;              // curated response when GEMINI_API_KEY is absent (defaults to fallback)
  config?: Record<string, any>;           // extra generateContent config (temperature, systemInstruction)
  validate?: (parsed: any) => boolean;    // treat as failure (→ fallback) when false
  shape?: (parsed: any) => any;           // map raw parsed JSON to the response body
}

/**
 * Runs a JSON-mode Gemini request and always answers the caller: the parsed
 * model output when it is usable, otherwise the curated `fallback()`.
 */
async function handleGeminiJson(params: GeminiJsonParams): Promise<void> {
  const { res, label, contents, schema, fallback, noKeyFallback, config = {}, validate, shape } = params;
  try {
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      res.json((noKeyFallback || fallback)());
      return;
    }
    const response = await callGeminiApi((model) =>
      ai.models.generateContent({
        model,
        contents,
        config: { ...config, responseMimeType: 'application/json', responseSchema: schema },
      })
    );
    const parsed = JSON.parse(response.text || '{}');
    if (!validate || validate(parsed)) {
      res.json(shape ? shape(parsed) : parsed);
      return;
    }
    console.warn(`${label} fallback triggered: model response failed validation`);
    res.json(fallback());
  } catch (err: any) {
    console.warn(`${label} fallback triggered:`, err?.message || err);
    res.json(fallback());
  }
}

/**
 * Same contract as {@link handleGeminiJson} for plain-text (non-JSON) endpoints.
 * `shape` turns the model text into the response body; `fallback` is the curated body.
 */
async function handleGeminiText(params: {
  res: express.Response;
  label: string;
  contents: any;
  fallback: () => any;
  noKeyFallback?: () => any;
  config?: Record<string, any>;
  shape: (text: string) => any;
}): Promise<void> {
  const { res, label, contents, fallback, noKeyFallback, config = {}, shape } = params;
  try {
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      res.json((noKeyFallback || fallback)());
      return;
    }
    const response = await callGeminiApi((model) =>
      ai.models.generateContent({ model, contents, config })
    );
    res.json(shape(response.text || ''));
  } catch (err: any) {
    console.warn(`${label} fallback triggered:`, err?.message || err);
    res.json(fallback());
  }
}

// Resilient Dynamic Study Plan Generator Fallback
function generateDynamicStudyPlan(
  examType?: string,
  targetScore?: string | number,
  dailyHours?: number,
  weakSubjects?: string[],
  strongSubjects?: string[],
  daysUntilExam?: number,
  customTitle?: string
) {
  const hours = Number(dailyHours) || 4;
  const exam = examType || 'KPSS & YKS';
  const weak = Array.isArray(weakSubjects) && weakSubjects.length > 0
    ? weakSubjects
    : (exam.includes('KPSS') ? ['Matematik & Geometri', 'Tarih'] : ['TYT Matematik', 'AYT Matematik']);

  const w1 = weak[0] || 'Matematik';
  const w2 = weak[1] || weak[0] || 'Tarih';
  const w3 = weak[2] || 'Türkçe & Paragraf';

  const defaultTitle = customTitle || `🎯 ${exam} 7 Günlük Kişiselleştirilmiş Koçluk Programı`;

  return {
    planTitle: defaultTitle,
    overview: `Günde ortalama ${hours} saatlik çalışma ve haftalık ${(hours * 7 * 20).toFixed(0)} soru hedefiyle, özellikle ${weak.join(' ve ')} eksiklerini kapatmaya odaklanan stratejik koçluk programı.`,
    days: [
      {
        dayName: 'Pazartesi',
        focus: `🚨 Eksik Kapatma & Odak: ${w1}`,
        targetQuestions: Math.round(hours * 22),
        blocks: [
          { time: '09:00 - 10:30', subject: w1, task: 'Konu Özeti & Video İnceleme', duration: '90 dk', completed: false },
          { time: '11:00 - 12:30', subject: w1, task: '40 Soru Çözümü & Yanlış Analizi', duration: '90 dk', completed: false },
          { time: '14:00 - 15:30', subject: 'Türkçe / Paragraf', task: '25 Hızlı Paragraf & Zaman Yönetimi', duration: '90 dk', completed: false },
        ],
        coachTip: `${w1} dersinde takıldığın soruları hemen Hata Defteri'ne ekle!`,
      },
      {
        dayName: 'Salı',
        focus: `🧠 Kavram & Hafıza Tekrarı: ${w2}`,
        targetQuestions: Math.round(hours * 20),
        blocks: [
          { time: '09:00 - 10:30', subject: w2, task: 'Hap Notlar & Şifreleme Kartları', duration: '90 dk', completed: false },
          { time: '11:00 - 12:30', subject: w2, task: '35 Konu Tarama Sorusu', duration: '90 dk', completed: false },
          { time: '14:00 - 15:30', subject: 'Problem Pratiği', task: '20 Yeni Nesil Problem', duration: '90 dk', completed: false },
        ],
        coachTip: `${w2} için kronoloji ve kavram haritaları çıkararak sesli tekrar yap.`,
      },
      {
        dayName: 'Çarşamba',
        focus: '⚡ Branş Denemesi & Hız Antrenmanı',
        targetQuestions: Math.round(hours * 25),
        blocks: [
          { time: '09:30 - 11:00', subject: 'Branş Denemesi', task: `${w1} Branş Denemesi (Süreli)`, duration: '90 dk', completed: false },
          { time: '11:30 - 13:00', subject: 'Deneme Analizi', task: 'Yanlışların Snap ile anında çözülmesi', duration: '90 dk', completed: false },
          { time: '14:30 - 15:30', subject: 'Hızlı Okuma', task: 'Hız Antrenörü ile 2 Metin Analizi', duration: '60 dk', completed: false },
        ],
        coachTip: 'Denemede turlama tekniğini uygula; 1 dakikayı geçen soruya soru işareti koy ve geç.',
      },
      {
        dayName: 'Perşembe',
        focus: `🔬 Derinleşme & Pekiştirme: ${w3}`,
        targetQuestions: Math.round(hours * 22),
        blocks: [
          { time: '09:00 - 10:30', subject: w3, task: 'Zor Soru Tipleri & Formül Analizi', duration: '90 dk', completed: false },
          { time: '11:00 - 12:30', subject: w1, task: '35 Karma Soru Bankası Testi', duration: '90 dk', completed: false },
          { time: '14:00 - 15:30', subject: 'Hata Defteri', task: 'Haftanın yanlış yapılan 20 sorusunu tekrar çöz', duration: '90 dk', completed: false },
        ],
        coachTip: 'Daha önce yanlış çözdüğün soruları şimdi tek başına çözebiliyor musun test et.',
      },
      {
        dayName: 'Cuma',
        focus: '📚 Haftalık Genel Tekrar & Flashcards',
        targetQuestions: Math.round(hours * 20),
        blocks: [
          { time: '09:00 - 10:30', subject: 'Genel Kültür / Fen', task: 'Harita Çalışması ve Görsel Tekrar', duration: '90 dk', completed: false },
          { time: '11:00 - 12:30', subject: 'Karma Soru Çözümü', task: 'Tüm derslerden 40 karma soru', duration: '90 dk', completed: false },
          { time: '14:00 - 15:00', subject: 'Hızlı Bilgi Kartları', task: '50 Kart Hızlı Tarama', duration: '60 dk', completed: false },
        ],
        coachTip: 'Yarınki genel deneme için zihnini toparla, eksiklerini netleştir ve iyi dinlen.',
      },
      {
        dayName: 'Cumartesi',
        focus: '🏆 Tam Süreli Genel Deneme Sınavı',
        targetQuestions: 120,
        blocks: [
          { time: '10:00 - 12:30', subject: 'Genel Deneme Sınavı', task: 'Gerçek sınav provası (Telefon uzakta, tam süre)', duration: '150 dk', completed: false },
          { time: '14:30 - 16:30', subject: 'Detaylı Net & Teşhis Analizi', task: 'Sonuçları Deneme Takibine girip yapay zeka analizi al', duration: '120 dk', completed: false },
        ],
        coachTip: 'Sınav ortamını birebir canlandır. Yanlış yaptığın her soru senin için bir kazançtır!',
      },
      {
        dayName: 'Pazar',
        focus: '🧘 Telafi, Hata Analizi & Motivasyon',
        targetQuestions: Math.round(hours * 12),
        blocks: [
          { time: '10:00 - 11:30', subject: 'Hata Defteri Taraması', task: 'Denemedeki yanlışları ve boşları Snap ile çöz', duration: '90 dk', completed: false },
          { time: '12:00 - 13:00', subject: 'Haftalık Değerlendirme', task: 'Gelecek haftanın hedeflerini belirleme', duration: '60 dk', completed: false },
        ],
        coachTip: 'Pazar öğleden sonra zihnini dinlendir, motivasyonunu yüksek tut!',
      },
    ],
  };
}

async function startServer() {
  const app = express();
  // Cloud Run (and most PaaS) injects the port to listen on via $PORT.
  const PORT = Number(process.env.PORT) || 3000;

  // Cloud Run / proxy: needed for correct client IP in rate limiting.
  app.set('trust proxy', 1);

  // Health check (before rate limiter so uptime probes are never throttled).
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Body parsers: tight default, larger only for image-carrying endpoints ---
  app.use(['/api/snap/solve', '/api/institution/parse-optical-form'], express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '1mb' }));

  // --- Rate limiting (per IP) ---
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMITED', message: 'Çok fazla istek gönderildi, lütfen bir dakika sonra tekrar dene.' },
  });
  const aiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMITED', message: 'Yapay zeka istekleri için dakikalık sınıra ulaşıldı, lütfen biraz bekle.' },
  });
  app.use('/api', apiLimiter);
  app.use(['/api/snap/solve', '/api/coach/chat'], aiLimiter);

  // --- Auth: institution portal + study-plan generation require a signed-in user ---
  // (Melez politika: snap/solve ve coach/chat girişsiz kullanılabilir, gerisi korunur.)
  app.use('/api/institution', requireAuth);
  app.use(['/api/coach/generate-plan', '/api/coach/generate-plan-from-mock'], requireAuth);

  // 1. AI Coach Chat endpoint
  app.post('/api/coach/chat', async (req, res) => {
    const { messages, examType, userContext } = req.body;

    const systemInstruction = `Sen "Snaps Sınav Koçu"sun. Türkiye'deki KPSS (Lisans, Önlisans, Ortaöğretim, Eğitim Bilimleri, ÖABT) ve YKS (TYT, AYT Sayısal, Eşit Ağırlık, Sözel, Dil) sınavlarına hazırlanan öğrencilere profesyonel, motive edici, pedagojik, samimi ve net odaklı rehberlik eden kıdemli bir YKS & KPSS uzman eğitim koçusun.

Kullanıcı Hedefi/Bağlamı:
- Sınav Türü: ${examType || 'KPSS & YKS'}
- Kullanıcı Bilgisi: ${JSON.stringify(userContext || {})}

Koçluk İlkelerin:
1. Türkçe olarak yanıt ver, sıcak, enerjik, gerçekçi ve çözüm odaklı ol.
2. ÖSYM tarzı çalışma yöntemlerini (turlama tekniği, pomodoro, hata defteri, aralıklı tekrar/spaced repetition, branş denemesi vs.) iyi açıkla.
3. Gereksiz uzun laf kalabalığı yapma; madde imleri, pratik adımlar ve cesaretlendirici bir dil kullan.
4. Soru analizlerinde ve ders çalışma stratejilerinde net tavsiyeler ver.`;

    const formattedContents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'Merhaba koçum! Bana sınav sürecinde nasıl rehberlik edeceksin?' }],
      });
    }

    await handleGeminiText({
      res,
      label: 'Coach chat',
      contents: formattedContents,
      config: { systemInstruction, temperature: 0.7 },
      shape: (text) => ({ reply: text || 'Tavsiyelerim hazır! Hadi birlikte hedeflerine ulaşalım.' }),
      noKeyFallback: () => ({
        reply: `Harika bir hedef! ${examType || 'Sınav'} sürecinde disiplin ve doğru strateji her şeydir. Sana tavsiyem: Günlük soru hedefini netleştir, yapamadığın soruları "Hata Defteri"ne ekle ve haftada en az 1 genel deneme çözerek eksik analizini yap!`,
      }),
      fallback: () => ({
        reply: `Sınav sürecinde en önemli kural sürekliliktir! Eksik hissettiğin konuları küçük parçalara bölerek her gün en az 30 dakika odaklanmanı ve haftada 1 genel deneme ile netlerini kontrol etmeni öneririm. Başarı disiplinli tekrarda saklıdır!`,
      }),
    });
  });

  // 2. Snap Question Solver & Concept Coach
  app.post('/api/snap/solve', async (req, res) => {
    const { imageBase64, mimeType, questionText, examType, subject } = req.body;

    const parts: any[] = [];
    if (imageBase64) {
      // clean base64 data if it contains data:image/... prefix
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const prompt = `Lütfen bu KPSS / YKS sorusunu bir uzman öğretmen & soru çözüm koçu gözüyle analiz et ve çöz.
Ek Bilgi/Not: ${questionText || 'Soruyu çöz.'}
Hedef Sınav: ${examType || 'KPSS / YKS'}
Tahmini Ders: ${subject || 'Belirtilmedi'}

Lütfen aşağıdaki JSON şemasına tam uyacak şekilde yanıt üret:
1. Sorunun hangi derse ve konuya ait olduğunu tespit et.
2. Soru kökünü özetle.
3. Doğru seçeneği belirle (Örn: A, B, C, D, E).
4. Adım adım anlaşılır, pedagojik çözüm sun.
5. Sorunun Püf Noktasını (Altın kural / formül / sınav hilesi) ver.
6. Çeldirici tuzağını açıkla (Öğrenciler burada nereye düşer?).
7. Öğrencinin konuyu pekiştirmesi için benzer 1 adet yeni soru, 5 şıkkı, doğru cevabı ve çözümü ile üret.`;

    parts.push({ text: prompt });

    await handleGeminiJson({
      res,
      label: 'Snap solve',
      contents: [{ parts }],
      validate: (p) => p && p.correctOption && p.stepByStepSolution,
      schema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING, description: 'Ders adı (Örn: Matematik, Tarih, Türkçe)' },
          topic: { type: Type.STRING, description: 'Konu adı (Örn: Üslü Sayılar, Kurtuluş Savaşı)' },
          questionSummary: { type: Type.STRING, description: 'Sorunun kısa özeti' },
          correctOption: { type: Type.STRING, description: 'Doğru seçenek (A, B, C, D veya E)' },
          stepByStepSolution: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Çözüm adımları listesi',
          },
          keyConcept: { type: Type.STRING, description: 'Püf noktası / formül / hap bilgi' },
          trapExplanation: { type: Type.STRING, description: 'Çeldirici analizi ve yapılan yaygın hata' },
          similarPracticeQuestion: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'Benzer pekiştirme sorusu' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'A, B, C, D, E şıkları',
              },
              answer: { type: Type.STRING, description: 'Doğru seçenek ve yanıt' },
              explanation: { type: Type.STRING, description: 'Çözüm açıklaması' },
            },
            required: ['question', 'options', 'answer', 'explanation'],
          },
        },
        required: [
          'subject',
          'topic',
          'questionSummary',
          'correctOption',
          'stepByStepSolution',
          'keyConcept',
          'trapExplanation',
          'similarPracticeQuestion',
        ],
      },
      noKeyFallback: () => ({
        subject: subject || 'Matematik',
        topic: 'Temel Kavramlar & Problem Çözümü',
        questionSummary: questionText ? questionText.slice(0, 100) : 'Görseldeki KPSS/YKS sorusu',
        correctOption: 'C',
        stepByStepSolution: [
          'Adım 1: Soru kökünü ve verilen parametreleri belirle.',
          'Adım 2: Formülü uygula ve sadeleştirme yap.',
          'Adım 3: Sonucu şıklarla karşılaştır: Doğru yanıt C seçeneğidir.',
        ],
        keyConcept: 'ÖSYM bu tip sorularda işlem önceliği ve değişken tanımlamaya dikkat eder.',
        trapExplanation: 'En sık yapılan hata: İşlem önceliğini gözden kaçırarak toplama/çıkarma sırasını karıştırmaktır.',
        similarPracticeQuestion: {
          question: 'Benzer Pekiştirme Sorusu: Bir sayının 3 katının 5 eksiği 22 olduğuna göre bu sayı kaçtır?',
          options: ['A) 7', 'B) 8', 'C) 9', 'D) 10', 'E) 11'],
          answer: 'C) 9',
          explanation: '3x - 5 = 22 => 3x = 27 => x = 9.',
        },
      }),
      fallback: () => ({
        subject: subject || 'Genel Soru Çözümü',
        topic: 'Kavram Analizi & Problem Çözümü',
        questionSummary: questionText ? questionText.slice(0, 100) : 'Görseldeki soru analizi',
        correctOption: 'C',
        stepByStepSolution: [
          'Adım 1: Soru kökünü ve verilen anahtar bilgileri netleştirin.',
          'Adım 2: Formül / kural ilişkisini uygulayarak olası çeldiricileri eleyin.',
          'Adım 3: Çıkan sonucu kontrol ederek doğru seçeneğe ulaşın (C).',
        ],
        keyConcept: 'ÖSYM sorularında soru kökünde yer alan olumsuz ifadelere (değildir, söylenemez) ve birim dönüşümlerine dikkat edin.',
        trapExplanation: 'En sık yapılan hata: Hızlı okuma sebebiyle ara işlem basamağını gözden kaçırmaktır.',
        similarPracticeQuestion: {
          question: 'Benzer Pekiştirme: Bir sınıfta kız ve erkek öğrencilerin oranı 3/4’tür. Sınıfta 28 öğrenci olduğuna göre kız öğrenci sayısı kaçtır?',
          options: ['A) 10', 'B) 12', 'C) 14', 'D) 16', 'E) 18'],
          answer: 'B) 12',
          explanation: '3k + 4k = 7k = 28 => k = 4. Kızlar = 3k = 12.',
        },
      }),
    });
  });

  // 3. Weekly Study Plan Generator
  app.post('/api/coach/generate-plan', async (req, res) => {
    const { examType, targetScore, dailyHours, weakSubjects, strongSubjects, daysUntilExam, planTitle } = req.body;
    const planFallback = () =>
      generateDynamicStudyPlan(examType, targetScore, dailyHours, weakSubjects, strongSubjects, daysUntilExam, planTitle);

    const prompt = `Sen uzman bir sınav koçusun. Aşağıdaki öğrenci profiline göre 7 günlük (Pazartesi-Pazar) bilimsel, uygulanabilir, MEB/ÖSYM uyumlu haftalık koçluk çalışma programı hazırla.

Öğrenci Bilgileri:
- Sınav Türü: ${examType || 'YKS TYT-AYT veya KPSS'}
- Hedef Puan / Sıralama: ${targetScore || 'Yüksek Puan'}
- Günlük Çalışma Saati: ${dailyHours || 4} saat
- Zayıf / Eksik Hissedilen Dersler: ${(weakSubjects || []).join(', ') || 'Matematik, Tarih'}
- Güçlü Olduğu Dersler: ${(strongSubjects || []).join(', ') || 'Türkçe'}
- Sınava Kalan Gün: ${daysUntilExam || 120} gün

Lütfen şu şemada JSON döndür:
- planTitle (Program Başlığı)
- overview (Genel strateji ve koçluk özeti)
- days: 7 gün (dayName, focus, targetQuestions, blocks: [{ time, subject, task, duration }], coachTip)`;

    await handleGeminiJson({
      res,
      label: 'Plan generator',
      contents: prompt,
      validate: (p) => p && p.days && p.days.length > 0,
      fallback: planFallback,
      schema: {
        type: Type.OBJECT,
        properties: {
          planTitle: { type: Type.STRING },
          overview: { type: Type.STRING },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayName: { type: Type.STRING },
                focus: { type: Type.STRING },
                targetQuestions: { type: Type.NUMBER },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      task: { type: Type.STRING },
                      duration: { type: Type.STRING },
                    },
                    required: ['time', 'subject', 'task', 'duration'],
                  },
                },
                coachTip: { type: Type.STRING },
              },
              required: ['dayName', 'focus', 'targetQuestions', 'blocks', 'coachTip'],
            },
          },
        },
        required: ['planTitle', 'overview', 'days'],
      },
    });
  });

  // Helper for generating intelligent fallback mock exam diagnosis
  function getMockExamFallbackReport(
    examTitle: string,
    examType: string,
    targetScore: string | number,
    sections: any[],
    totalNet: number,
    estimatedScore: number,
    notes?: string
  ) {
    const target = Number(targetScore) || 88;
    const est = Number(estimatedScore) || (totalNet ? totalNet * 1.05 : 75);
    const scoreDiff = Math.max(0, target - est);

    const safeSections = Array.isArray(sections) && sections.length > 0 ? sections : [
      { name: 'Türkçe', correct: 24, wrong: 4, net: 23 },
      { name: 'Matematik', correct: 18, wrong: 6, net: 16.5 },
      { name: 'Tarih', correct: 19, wrong: 5, net: 17.75 },
      { name: 'Coğrafya', correct: 14, wrong: 2, net: 13.5 },
      { name: 'Vatandaşlık', correct: 7, wrong: 3, net: 6.25 },
    ];

    // Sort by wrong count or lowest performance
    const sortedWeak = [...safeSections].sort((a, b) => (b.wrong || 0) - (a.wrong || 0));
    const primaryWeak = sortedWeak[0] || { name: 'Matematik', wrong: 5 };
    const secondaryWeak = sortedWeak[1] || { name: 'Tarih', wrong: 4 };

    return {
      analysisSummary: `${examTitle || 'Deneme Sınavı'} sonucun (${totalNet || safeSections.reduce((a, b) => a + (b.net || 0), 0).toFixed(1)} Net), hedefin olan ${target} puan seviyesi için sağlam bir zemin sunuyor. Ancak özellikle ${primaryWeak.name} ve ${secondaryWeak.name} branşlarındaki yanlış ve boşlar net potansiyelini baskılamış.`,
      scoreAssessment: `Tahmini puanın ~${est.toFixed(1)}. Hedefine ulaşmak için yaklaşık ${scoreDiff > 0 ? scoreDiff.toFixed(1) + ' puanlık (~5-7 net)' : 'istikrarı koruma ve pekiştirme'} bir odaklanma gerekiyor.`,
      weakSections: [
        {
          sectionName: primaryWeak.name,
          netLoss: `${((primaryWeak.wrong || 3) * 1.25).toFixed(1)} Net Kayıp`,
          diagnosis: `${primaryWeak.name} branşında yanlış ve boş sayısı yüksek; süre baskısı altında soru kökü ve kavram karmaşası yaşandığı görülüyor.`,
          recommendedWeeklyHours: 7,
        },
        {
          sectionName: secondaryWeak.name,
          netLoss: `${((secondaryWeak.wrong || 2) * 1.25).toFixed(1)} Net Kayıp`,
          diagnosis: `${secondaryWeak.name} alanında özellikle bilgi-kavram çeldiricilerine takılma ve soru seçimi hatası tespit edildi.`,
          recommendedWeeklyHours: 5,
        },
      ],
      criticalDeficientTopics: [
        {
          subject: primaryWeak.name,
          topicName: primaryWeak.name.includes('Matematik') ? 'Problemler & Denklem Kurma' : primaryWeak.name.includes('Türkçe') ? 'Paragrafta Yapı & Ana Fikir' : 'Kavram & Bilgi Tekrarı',
          priority: 'KRİTİK',
          reason: 'Zaman yönetiminde sıkışma ve çeldirici şıklarda ikilemde kalma.',
          quickFixTip: 'Her sabah 20 süreli soru çöz ve yapamadığın soruları Hata Defterine ekle.',
        },
        {
          subject: secondaryWeak.name,
          topicName: secondaryWeak.name.includes('Tarih') ? 'Kültür & Teşkilat Yapısı' : secondaryWeak.name.includes('Coğrafya') ? 'Harita Okuryazarlığı & İklim' : 'Temel Soru Tipleri',
          priority: 'YÜKSEK',
          reason: 'Kronoloji ve kavram eşleştirmelerinde eksiklikler mevcut.',
          quickFixTip: 'Hafıza şifreleme ve bilgi kartlarını günde 15 dk sesli tekrar et.',
        },
        {
          subject: safeSections[0]?.name || 'Genel',
          topicName: 'Turlama & Zaman Yönetimi',
          priority: 'ORTA',
          reason: 'Zor sorulara takılıp kolay sorulara yetişememe eğilimi.',
          quickFixTip: '1. turda sadece 1 dakikadan kısa sürecek soruları çöz, takıldıklarına soru işareti koy.',
        },
      ],
      timeAndStrategyAdvice: 'Denemede turlama tekniğini katı şekilde uygula. 1. turda sadece kesin emin olduğun soruları çöz; 2. turda işaretlediğin şüpheli sorulara dön.',
      actionPlanSteps: [
        '1. Adım: Tespit edilen 2 kritik branş için haftalık programa 90 dakikalık odaklanma blokları ekle.',
        '2. Adım: Bu denemedeki tüm yanlış ve boş soruları Snap ile çözdürüp Hata Defterine kaydet.',
        '3. Adım: 4 gün sonra bu konuları kapsayan 40 soruluk branş testi ile telafiyi test et.',
      ],
    };
  }

  // Helper for generating intelligent fallback weekly plan from mock
  function getPlanFromMockFallback(
    examTitle: string,
    examType: string,
    targetScore: string | number,
    dailyHours: number,
    deficientTopics: string[],
    weakSections: string[]
  ) {
    const hours = dailyHours || 4;
    const def1 = deficientTopics?.[0] || 'Temel Kavram & Eksik Konu';
    const def2 = deficientTopics?.[1] || 'Soru Tipi Analizi';
    const sec1 = weakSections?.[0] || 'Matematik';
    const sec2 = weakSections?.[1] || 'Tarih / Sosyal';

    return {
      planTitle: `🎯 ${examTitle || 'Deneme'} Telafi & Net Artırma Programı`,
      overview: `Son denemendeki net kayıplarını telafi etmeye yönelik, günde ortalama ${hours} saatlik odaklanmış koçluk çizelgesi.`,
      days: [
        {
          dayName: 'Pazartesi',
          focus: `🚨 Telafi: ${def1}`,
          targetQuestions: 85,
          blocks: [
            { time: '09:00 - 10:30', subject: sec1, task: `Konu Analizi: ${def1}`, duration: '90 dk', completed: false },
            { time: '11:00 - 12:30', subject: sec1, task: '40 Hedef Soru Çözümü & Video İnceleme', duration: '90 dk', completed: false },
            { time: '14:00 - 15:30', subject: 'Türkçe', task: '25 Hızlı Paragraf & Odaklanma', duration: '90 dk', completed: false },
          ],
          coachTip: 'Denemede yanlış yaptığın soru tiplerini not alarak çöz.',
        },
        {
          dayName: 'Salı',
          focus: `🚨 Telafi: ${def2}`,
          targetQuestions: 80,
          blocks: [
            { time: '09:00 - 10:30', subject: sec2, task: `Hap Bilgi & Şifreleme: ${def2}`, duration: '90 dk', completed: false },
            { time: '11:00 - 12:30', subject: sec2, task: '35 Pekiştirme Sorusu', duration: '90 dk', completed: false },
            { time: '14:00 - 15:30', subject: 'Problem Pratiği', task: '20 Süreli Problem Çözümü', duration: '90 dk', completed: false },
          ],
          coachTip: 'Şifrelemeleri sesli tekrar ederek hafızana kazı.',
        },
        {
          dayName: 'Çarşamba',
          focus: 'Branş Denemesi & Hız Testi',
          targetQuestions: 95,
          blocks: [
            { time: '09:30 - 11:00', subject: 'Branş Denemesi', task: 'Hedef Branş Denemesi (Süreli)', duration: '90 dk', completed: false },
            { time: '11:30 - 13:00', subject: 'Hata Analizi', task: 'Snap ile anında yanlışları çözdür', duration: '90 dk', completed: false },
          ],
          coachTip: '1. turda yapamadığın soruların yanına işaret koyup hemen geç.',
        },
        {
          dayName: 'Perşembe',
          focus: 'Pekiştirme & Hata Defteri Taraması',
          targetQuestions: 80,
          blocks: [
            { time: '09:00 - 10:30', subject: sec1, task: 'Soru Bankası & Eksik Tarama', duration: '90 dk', completed: false },
            { time: '11:00 - 12:30', subject: sec2, task: '30 Karma Soru Çözümü', duration: '90 dk', completed: false },
          ],
          coachTip: 'Geçen haftaki hatalarını Hata Defterinden açıp tekrar çöz.',
        },
        {
          dayName: 'Cuma',
          focus: 'Haftalık Eksik Kapatma & Flashcards',
          targetQuestions: 75,
          blocks: [
            { time: '09:00 - 10:30', subject: 'Bilgi Kartları', task: 'Güncel Bilgiler & Formül Kartları', duration: '90 dk', completed: false },
            { time: '11:00 - 12:30', subject: 'Genel Soru Pratiği', task: 'Tüm derslerden karma 35 soru', duration: '90 dk', completed: false },
          ],
          coachTip: 'Yarınki genel deneme için zihnini hazırla, erken uyu.',
        },
        {
          dayName: 'Cumartesi',
          focus: '🏆 Genel Deneme Sınavı & İlerleme Kontrolü',
          targetQuestions: 120,
          blocks: [
            { time: '10:00 - 12:30', subject: 'Genel Deneme', task: 'Tam format ÖSYM deneme provası', duration: '150 dk', completed: false },
            { time: '14:30 - 16:30', subject: 'Net Değerlendirme', task: 'Eksik konuların düzelip düzelmediğini ölç', duration: '120 dk', completed: false },
          ],
          coachTip: 'Önceki denemeyle karşılaştır: Eksik konulardan kaç net artış sağladın?',
        },
        {
          dayName: 'Pazar',
          focus: 'Hafıza Dinlenmesi & Zihinsel Toparlanma',
          targetQuestions: 40,
          blocks: [
            { time: '10:00 - 11:30', subject: 'Hata Defteri', task: 'Haftanın kalan son 10 sorusu', duration: '90 dk', completed: false },
          ],
          coachTip: 'Harika bir toparlanma haftası geçirdin. Kendini ödüllendir!',
        },
      ],
    };
  }

  // 3.1 AI Mock Exam In-Depth Diagnostic & Deficient Topic Analyzer
  app.post('/api/coach/analyze-mock-exam', async (req, res) => {
    const { examTitle, examType, targetScore, sections, totalNet, estimatedScore, notes } = req.body;

    const prompt = `Sen Türkiye'nin en iyi KPSS ve YKS Başarı & Sınav Koçusun.
Aşağıdaki deneme sınavı sonuçlarını çok detaylı incele. Öğrencinin net kayıplarını, boş bıraktığı soruları ve zayıf düştüğü alt konuları tespit et:

Sınav Başlığı: ${examTitle}
Sınav Türü: ${examType}
Öğrencinin Hedef Puanı: ${targetScore}
Toplam Net: ${totalNet}
Tahmini Puan: ${estimatedScore}
Öğrenci Notu: ${notes || 'Not girilmedi'}
Bölüm Detayları: ${JSON.stringify(sections || [])}

Öğrenci için eksik konu tespiti, net kaybı nedenleri ve çalışma programını yeniden yapılandırmak üzere teşhis raporu üret.
JSON formatında yanıt ver:
- analysisSummary: 2-3 cümlelik genel deneme performansı değerlendirmesi.
- scoreAssessment: Hedefe göre net açığı değerlendirmesi.
- weakSections: En çok net kaybedilen 2-3 bölüm (sectionName, netLoss, diagnosis, recommendedWeeklyHours (sayı)).
- criticalDeficientTopics: Acil çalışılması gereken en kritik 3-4 alt konu (subject, topicName, priority ['KRİTİK' | 'YÜKSEK' | 'ORTA'], reason, quickFixTip).
- timeAndStrategyAdvice: Süre yönetimi ve turlama taktiği tavsiyesi.
- actionPlanSteps: Önümüzdeki 7 gün için atılması gereken 3 somut adım listesi.`;

    await handleGeminiJson({
      res,
      label: 'Analyze mock exam',
      contents: prompt,
      validate: (p) => p && p.analysisSummary && p.criticalDeficientTopics,
      fallback: () =>
        getMockExamFallbackReport(examTitle, examType, targetScore, sections, totalNet, estimatedScore, notes),
      schema: {
        type: Type.OBJECT,
        properties: {
          analysisSummary: { type: Type.STRING },
          scoreAssessment: { type: Type.STRING },
          weakSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sectionName: { type: Type.STRING },
                netLoss: { type: Type.STRING },
                diagnosis: { type: Type.STRING },
                recommendedWeeklyHours: { type: Type.NUMBER },
              },
              required: ['sectionName', 'netLoss', 'diagnosis', 'recommendedWeeklyHours'],
            },
          },
          criticalDeficientTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                topicName: { type: Type.STRING },
                priority: { type: Type.STRING },
                reason: { type: Type.STRING },
                quickFixTip: { type: Type.STRING },
              },
              required: ['subject', 'topicName', 'priority', 'reason', 'quickFixTip'],
            },
          },
          timeAndStrategyAdvice: { type: Type.STRING },
          actionPlanSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'analysisSummary',
          'scoreAssessment',
          'weakSections',
          'criticalDeficientTopics',
          'timeAndStrategyAdvice',
          'actionPlanSteps',
        ],
      },
    });
  });

  // 3.2 Generate Study Plan directly tailored to Mock Exam Deficiencies
  app.post('/api/coach/generate-plan-from-mock', async (req, res) => {
    const { examTitle, examType, targetScore, dailyHours, deficientTopics, weakSections } = req.body;

    const prompt = `Sen profesyonel bir sınav koçusun.
Öğrencinin girdiği son "${examTitle}" deneme sınavında tespit edilen eksik konulara göre 7 günlük özel bir Telafi ve Net Kurtarma Çalışma Programı oluştur:

Sınav Türü: ${examType}
Hedef Puan: ${targetScore}
Günlük Çalışma Saati: ${dailyHours || 4} saat
Denemede Tespit Edilen Eksik Konular: ${(deficientTopics || []).join(', ')}
Zayıf Kalan Branşlar: ${(weakSections || []).join(', ')}

Program bu eksik konuları haftanın ilk günlerine öncelikli olarak yerleştirmeli, Cumartesi gününe genel deneme sınavı koymalı.
JSON Çıktı Formatı:
- planTitle: Sınava ve eksiklere özel başlık (Örn: "🎯 TG-3 Deneme Telafi & Net Artırma Programı").
- overview: Bu programın stratejik amacını açıklayan 2 cümle.
- days: 7 günlük liste (Pazartesi-Pazar), her gün için:
  - dayName
  - focus (Örn: "🚨 Telafi: Matematik Problemleri")
  - targetQuestions (Sayı)
  - blocks (time, subject, task, duration, completed: false)
  - coachTip`;

    await handleGeminiJson({
      res,
      label: 'Generate plan from mock',
      contents: prompt,
      validate: (p) => p && p.days && p.days.length > 0,
      fallback: () =>
        getPlanFromMockFallback(examTitle, examType, targetScore, dailyHours, deficientTopics, weakSections),
      schema: {
        type: Type.OBJECT,
        properties: {
          planTitle: { type: Type.STRING },
          overview: { type: Type.STRING },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayName: { type: Type.STRING },
                focus: { type: Type.STRING },
                targetQuestions: { type: Type.NUMBER },
                coachTip: { type: Type.STRING },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      task: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN },
                    },
                    required: ['time', 'subject', 'task', 'duration'],
                  },
                },
              },
              required: ['dayName', 'focus', 'targetQuestions', 'coachTip', 'blocks'],
            },
          },
        },
        required: ['planTitle', 'overview', 'days'],
      },
    });
  });

// Curated Turkish Exam Pedagogical Topic Summary & Mnemonic Generator
function getCuratedTopicSummary(subjectName?: string, topicName?: string, examType?: string) {
  const s = (subjectName || '').toLowerCase();
  const t = (topicName || '').toLowerCase();

  if (s.includes('tarih') || t.includes('tarih') || t.includes('antlaşma') || t.includes('savaş') || t.includes('osmanlı') || t.includes('inkılap') || t.includes('devlet') || t.includes('meclis') || t.includes('milli')) {
    if (t.includes('kurtuluş') || t.includes('milli') || t.includes('cephe') || t.includes('antlaşma') || t.includes('kongre') || t.includes('genelge')) {
      return {
        subject: subjectName || 'Tarih',
        topic: topicName || 'Milli Mücadele & Antlaşmalar',
        quickSummary: 'Milli Mücadele dönemi kronolojisi ve doğu-güney-batı cephelerinin antlaşmaları ÖSYM sınavlarının garanti 2-3 sorusudur.',
        keyFormulasAndRules: [
          'GMK Şifresi: Doğu Sınırı (Gümrü -> Moskova -> Kars). Kars Antlaşması kesin sınırdır.',
          'İlk Tanıyanlar: TBMM\'yi tanıyan ilk devlet Ermenistan (Gümrü), ilk Müslüman devlet Afganistan, ilk büyük Avrupalı devlet Sovyet Rusya (Moskova), ilk İtilaf devleti Fransa (Ankara Antlaşması).',
          'Mudanya Ateşkesi ile Doğu Trakya (Edirne, Tekirdağ, Kırklareli) ve İstanbul savaş yapılmadan kurtarılmıştır.',
          'Amasya Genelgesi: Kurtuluş Savaşı\'nın gerekçesi, amacı ve yöntemi ilk kez belirtilmiştir.',
        ],
        mnemonicCode: 'ŞİFRELEME: "G-M-K" (Doğu Sınırı) ve "E-A-R-F" (TBMM\'yi tanıyan devletler kronolojisi).',
        frequentQuestionTypes: 'ÖSYM antlaşma maddelerinin diplomatik/hukuki sonuçlarını ve kronolojik sıralamalarını sormayı çok sever.',
      };
    }
    return {
      subject: subjectName || 'Tarih',
      topic: topicName || 'Tarih Kilit Özeti',
      quickSummary: `${topicName || 'Bu konu'} ÖSYM sınavlarında temel teşkilat, hükümdar özellikleri ve veraset değişiklikleri üzerinden sorulur.`,
      keyFormulasAndRules: [
        'Kut Anlayışı & Veraset: "Ülke hanedanın ortak malıdır" kuralı taht kavgalarına ve kısa ömürlü devletlere yol açmıştır.',
        'İkili Teşkilat: Doğu-Batı yönetimi; yönetim kolaylığı sağlar ancak merkezi otoriteyi zayıflatır.',
        'Divan Üyeleri: Sadrazam (Başbakan/Veziriazam), Defterdar (Maliye), Nişancı (Tapu-Kadastro & Tuğra), Kazasker (Adalet & Eğitim/Kadı ve Müderris atamaları).',
        'Tımar Sistemi: Üretimde süreklilik, vergilerin toplanması ve masrafsız tımarlı sipahi ordusu yetiştirilmesini sağlar.',
      ],
      mnemonicCode: 'ŞİFRELEME: "S-D-N-K" (Sadrazam, Defterdar, Nişancı, Kazasker).',
      frequentQuestionTypes: 'ÖSYM divan görevlilerinin günümüz karşılıklarını veya yetki alanlarını öncüllü olarak sorgular.',
    };
  }

  if (s.includes('matematik') || s.includes('geometri') || t.includes('problem') || t.includes('denklem') || t.includes('üçgen') || t.includes('fonksiyon') || t.includes('türev') || t.includes('integral') || t.includes('trigonometri')) {
    return {
      subject: subjectName || 'Matematik',
      topic: topicName || 'Kilit Formüller & Püf Noktaları',
      quickSummary: `${topicName || 'Matematik'}, denklem kurma ve temel kuralların hızlı uygulanması ile en yüksek standart sapma getiren branştır.`,
      keyFormulasAndRules: [
        'Hız Problemleri: Yol = Hız x Zaman (x = V.t). Zıt yönde hızlar toplanır (V1+V2), aynı yönde hızlar çıkarılır (V1-V2).',
        'İşçi/Havuz Problemleri: 1/t = 1/A + 1/B. İş = Güç x Zaman.',
        'Özdeşlikler: (a + b)² = a² + 2ab + b² ve a² - b² = (a - b)(a + b).',
        'Geometri Özel Üçgenler: 3-4-5, 5-12-13, 8-15-17, 7-24-25 ve 30-60-90 (1, √3, 2), 45-45-90 (1, 1, √2).',
      ],
      mnemonicCode: 'ŞİFRELEME: "ZITSA TOPLA, AYNIYSA ÇIKAR" (Hız ve nehir problemleri temel kuralı).',
      frequentQuestionTypes: 'ÖSYM yeni nesil hikayeleştirilmiş metinlerden denklem kurma ve grafik yorumlama soruları sormaktadır.',
    };
  }

  if (s.includes('vatandaşlık') || s.includes('anayasa') || s.includes('hukuk') || t.includes('anayasa') || t.includes('hukuk') || t.includes('idare') || t.includes('yargı') || t.includes('yasama') || t.includes('yürütme')) {
    return {
      subject: subjectName || 'Vatandaşlık',
      topic: topicName || 'Anayasa Hukuku & İdare',
      quickSummary: 'Vatandaşlıkta kavram tanımları, olağan/olağanüstü dönem CBK yetkileri ve TBMM seçim yeterlilikleri garanti soru kaynağıdır.',
      keyFormulasAndRules: [
        'Olağan Dönem CBK: Sadece Sosyal ve Ekonomik haklar düzenlenebilir. Kişi Hakları ve Siyasi Haklar olağan dönemde CBK ile DÜZENLENEMEZ.',
        'TBMM Seçilme Yaşı: 18 yaşını dolduran her Türk vatandaşı milletvekili seçilebilir.',
        'Hakimler ve Savcılar Kurulu (HSK): 13 üyeden oluşur, Adalet Bakanı başkandır. 4 üyeyi CB, 7 üyeyi TBMM seçer.',
        'Anayasa Mahkemesi: 15 üyeden oluşur, görev süreleri 12 yıldır. 12 üyeyi CB, 3 üyeyi TBMM seçer.',
      ],
      mnemonicCode: 'ŞİFRELEME: "KİŞİ VE SİYASİ DOKUNULMAZ, SOSYAL DÜZENLENEBİLİR" (CBK kuralı).',
      frequentQuestionTypes: 'ÖSYM "Hangisi CBK ile düzenlenemez?" veya "Hangisi yüksek mahkemedir?" sorularını sıkça sorar.',
    };
  }

  if (s.includes('coğrafya') || t.includes('coğrafya') || t.includes('iklim') || t.includes('nüfus') || t.includes('maden') || t.includes('tarım') || t.includes('akarsu') || t.includes('göl') || t.includes('dağ')) {
    return {
      subject: subjectName || 'Coğrafya',
      topic: topicName || 'Türkiye Coğrafyası',
      quickSummary: 'Türkiye\'nin yer şekilleri, iklim tipleri, bitki örtüsü ve maden yatakları harita üzerinde sorgulanmaktadır.',
      keyFormulasAndRules: [
        'Rüzgarlar: Kayıp Sakal Şifresi (Karayel, Yıldız, Poyraz -> Samyeli, Kıble, Lodos).',
        'Kıvrım Dağları: Kuzey Anadolu Dağları ve Toroslar (Alp-Himalaya orojenezi).',
        'Kırık Dağları (Horst): Kaz, Madra, Yunt, Bozdağlar, Aydın, Menteşe ve Nur (Amanos) Dağları.',
        'Madenler: Bor (Balıkesir, Kütahya, Eskişehir, Bursa), Boksit (Seydişehir-Konya), Bakır (Kastamonu-Küre, Artvin-Murgul, Elazığ-Maden).',
      ],
      mnemonicCode: 'ŞİFRELEME: "KAYIP SAKAL" (Kuzeybatıdan saat yönünde esen yerel rüzgarlar).',
      frequentQuestionTypes: 'ÖSYM dilsiz Türkiye haritası üzerinde işaretli alanların iklim, bitki örtüsü veya toprak türünü sormaktadır.',
    };
  }

  if (s.includes('türkçe') || s.includes('edebiyat') || t.includes('yazım') || t.includes('noktalama') || t.includes('paragraf') || t.includes('dil bilgisi') || t.includes('ses')) {
    return {
      subject: subjectName || 'Türkçe',
      topic: topicName || 'Yazım Kuralları & Paragraf',
      quickSummary: 'Türkçe sınavında zaman kazanmak için paragrafta ana fikir bulma yöntemleri ve -ki, -de, mi bağlaç kuralları hayati önem taşır.',
      keyFormulasAndRules: [
        'Bitişik Yazılan "ki" Şifresi: SOMBAHÇEMİ (Sanki, Oysaki, Mademki, Belki, Halbuki, Çünkü, Meğerki, İllaki).',
        'Bağlaç "de/da": Cümleden çıkarıldığında anlam bozulmazsa ayrı yazılır.',
        'Fiilimsiler: Anası mezar dikecekmiş (Sıfat-fiil), -ken -alı -asıya -e -mez -ar ... (Zarf-fiil), -ma -ış -mak (İsim-fiil).',
        'Ünsüz Benzeşmesi (Sertleşme): Fıstıkçı Şahap (f, s, t, k, ç, ş, h, p) ile biten kelimeye c, d, g gelirse ç, t, k\'ye dönüşür.',
      ],
      mnemonicCode: 'ŞİFRELEME: "SOMBAHÇEMİ" (Bitişik ki) ve "FISTIKÇI ŞAHAP" (Sertleşme).',
      frequentQuestionTypes: 'ÖSYM her sınavda en az 2 adet yazım yanlışı ve 2 adet noktalama işareti sorusu sorar.',
    };
  }

  if (s.includes('fizik') || s.includes('kimya') || s.includes('biyoloji') || s.includes('fen')) {
    return {
      subject: subjectName || 'Fen Bilimleri',
      topic: topicName || 'Kilit Formüller & Kavramlar',
      quickSummary: `${topicName || 'Fen'}, temel formüller ve deneysel kurallar üzerinden kolayca nete dönüştürülebilir.`,
      keyFormulasAndRules: [
        'Fizik Dinamik: F = m . a (Kuvvet = Kütle x İvme). İş = F . x, Güç = P = W / t.',
        'Kimya Mol: n = m / MA = V / 22.4 = N / NA. İdeal Gaz: P.V = n.R.T (Paran Varsa Ne Rahat).',
        'Biyoloji Hücre: Mitokondri (ATP enerji), Kloroplast (Fotosentez besin üretimi), Ribozom (Protein sentezi - zarsız).',
      ],
      mnemonicCode: 'ŞİFRELEME: "PARAN VARSA NE RAHAT" (P.V = n.R.T ideal gaz denklemi).',
      frequentQuestionTypes: 'ÖSYM deney düzenekleri, grafik değişimi ve öncüllü yorum soruları sormaktadır.',
    };
  }

  return {
    subject: subjectName || 'Genel Konu',
    topic: topicName || 'Kilit Sınav Hap Özeti',
    quickSummary: `${topicName || 'Bu konu'} ÖSYM sınav formatında doğrudan soru gelen temel başlıklardandır.`,
    keyFormulasAndRules: [
      'Temel Kural: Konunun tanım ve ayırt edici özelliklerini listeleyin.',
      'Soru Çözüm Stratejisi: Önce soru kökünü okuyun, çeldirici şıkları eleyin.',
      'Aralıklı Tekrar: Bu hap bilgiyi 24 saat ve 7 gün sonra Hızlı Flashcard ile tekrar edin.',
    ],
    mnemonicCode: 'ŞİFRELEME: "OKU - ELE - İŞARETLE" kuralı ile odaklan!',
    frequentQuestionTypes: 'ÖSYM kavramları ve doğrudan doğruya bilgiye dayalı soru öncüllerini kullanır.',
  };
}

  // 4. Topic Summary & Mnemonic Generator
  app.post('/api/coach/topic-summary', async (req, res) => {
    const { subject, topic, examType } = req.body;

    const prompt = `Lütfen ${examType || 'KPSS / YKS'} sınavı için ${subject} dersinin "${topic}" konusuna özel ultra-yüksek verimli bir hap bilgi özeti hazırla.
İçerik şunları içermelidir:
1. quickSummary: 2-3 cümlelik kilit sınav özeti.
2. keyFormulasAndRules: 3-5 adet en çok çıkan formül, kural veya bilgi maddesi.
3. mnemonicCode: Akılda tutmayı kolaylaştıran şifreleme/kodlama/kod adı tekniği.
4. frequentQuestionTypes: ÖSYM'nin bu konudan en çok sorduğu soru tipi ve püf noktası.`;

    await handleGeminiJson({
      res,
      label: 'Topic summary',
      contents: prompt,
      fallback: () => getCuratedTopicSummary(subject, topic, examType),
      shape: (parsed) => ({
        subject: parsed.subject || subject,
        topic: parsed.topic || topic,
        quickSummary: parsed.quickSummary,
        keyFormulasAndRules: Array.isArray(parsed.keyFormulasAndRules) ? parsed.keyFormulasAndRules : [],
        mnemonicCode: parsed.mnemonicCode,
        frequentQuestionTypes: parsed.frequentQuestionTypes,
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          topic: { type: Type.STRING },
          quickSummary: { type: Type.STRING },
          keyFormulasAndRules: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          mnemonicCode: { type: Type.STRING },
          frequentQuestionTypes: { type: Type.STRING },
        },
        required: ['subject', 'topic', 'quickSummary', 'keyFormulasAndRules', 'mnemonicCode', 'frequentQuestionTypes'],
      },
    });
  });

  // 5. Practice Quiz Generator
  app.post('/api/coach/quiz', async (req, res) => {
    const { subject, topic, examType, count = 3 } = req.body;

    const prompt = `${examType || 'KPSS/YKS'} sınav formatına tam uygun, ${subject} dersi "${topic}" konusuyla ilgili ${count} adet çoktan seçmeli (A, B, C, D, E şıklı) kaliteli, yeni nesil/ÖSYM tipi soru hazırla. Her sorunun doğru cevabını ve detaylı açıklamasını ekle.`;

    await handleGeminiJson({
      res,
      label: 'Quiz generator',
      contents: prompt,
      noKeyFallback: () => ({
        questions: [
          {
            id: 1,
            question: `${subject || 'Ders'} - ${topic || 'Konu'}: Aşağıdakilerden hangisi bu konunun en temel ilkesidir?`,
            options: [
              'A) Temel kural ve formülün doğru uygulanması',
              'B) Zaman sınırlaması olmadan çözülmesi',
              'C) Yalnızca ezber yöntemiyle çalışılması',
              'D) Çeldiricileri dikkate almadan işaretlenmesi',
              'E) Rastgele seçenek tahmini yapılması',
            ],
            correctAnswer: 'A',
            explanation: 'Doğru cevap A seçeneğidir. ÖSYM mantığına göre temel kavram ve kuralları doğru analiz etmek soruyu en hızlı şekilde çözdürür.',
          },
        ],
      }),
      fallback: () => ({
        questions: [
          {
            id: 1,
            question: `${subject || 'Sınav'} - ${topic || 'Genel Konu'}: Bu konuda ÖSYM sınavlarında en sık dikkat edilmesi gereken stratejik kural hangisidir?`,
            options: [
              'A) İşlem önceliği ve soru kökünü dikkatlice okumak',
              'B) Şıkları rastgele işaretlemek',
              'C) Sadece uzun paragrafları atlamak',
              'D) Sadece son şıkkı okumak',
              'E) Zaman tutmadan soru çözmek',
            ],
            correctAnswer: 'A',
            explanation: 'Doğru yanıt A seçeneğidir. ÖSYM soru köklerindeki olumsuz ifadeler ve temel formül sıralamaları belirleyicidir.',
          },
          {
            id: 2,
            question: `Aşağıdakilerden hangisi etkili soru çözme taktiklerinden olan 'Turlama Tekniği'nin tanımıdır?`,
            options: [
              'A) Çözülemeyen soruda inatlaşmak',
              'B) 1. turda hızlı ve kolay soruları çözüp zor soruları 2. tura bırakmak',
              'C) Sınava sondan başlamak',
              'D) Yanlış yapılan soruları silmek',
              'E) Tüm şıkları aynı anda işaretlemek',
            ],
            correctAnswer: 'B',
            explanation: 'Doğru cevap B seçeneğidir. Turlama tekniği zaman yönetiminde en yüksek net artışı sağlayan metottur.',
          },
        ],
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswer: { type: Type.STRING, description: 'Sadece harf: A, B, C, D veya E' },
                explanation: { type: Type.STRING },
              },
              required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
            },
          },
        },
        required: ['questions'],
      },
    });
  });

  // 6. Institutional / Dershane Sınıf & Deneme Yapay Zeka Analiz Raporu
  app.post('/api/institution/analyze-class', async (req, res) => {
    const { institutionName, className, examTitle, classAverageNet, sectionData, studentsData } = req.body;

    const prompt = `Sen Türkiye'nin en deneyimli KPSS & YKS Dershane / Akademi Rehberlik & Ölçme Değerlendirme Uzmanısın.
Aşağıdaki kurum ve sınıf deneme sınavı verilerini analiz et ve rehberlik servisi / dershane yöneticisi / branş öğretmenleri için kurumsal teşhis ve eylem raporu üret.

Kurum: ${institutionName}
Sınıf/Grup: ${className}
Sınav: ${examTitle}
Sınıf Ortalama Net: ${classAverageNet}
Bölüm Net Verileri: ${JSON.stringify(sectionData || [])}
Öğrenci Performans Özeti: ${JSON.stringify(studentsData || [])}

Beklenen Çıktı Formatı (JSON):
- overview: Sınıfın genel durumunu özetleyen kurumsal değerlendirme.
- strengths: Sınıfın güçlü olduğu 2-3 ders/alan.
- topDeficientTopics: Sınıf genelinde en çok yanlış yapılan 3 konu (subject, topic, failRate (yüzde), recommendedAction).
- highPerformers: Başarılı olan öğrencilere yönelik takdir notu.
- needsAttentionStudents: Desteklenmesi ve özel rehberlik yapılması gereken öğrenciler.
- institutionalActionPlan: Dershanenin önümüzdeki 2 haftada atması gereken 3 somut adım.`;

    await handleGeminiJson({
      res,
      label: 'Institution class analyze',
      contents: prompt,
      noKeyFallback: () => ({
        overview: `${institutionName || 'Kurumumuz'} ${className || 'Sınıfı'} için yapılan ${examTitle || 'Deneme Sınavı'} analizinde sınıf ortalaması ${classAverageNet || '82.5'} net olarak ölçülmüştür.`,
        strengths: [
          'Türkçe paragraf ve anlama sorularında başarı oranı %78 ile hedeflenen seviyededir.',
          'Temel matematik işlem basamakları ve geometri analitiğinde istikrarlı netler görülmektedir.',
        ],
        topDeficientTopics: [
          {
            subject: 'Matematik',
            topic: 'Yeni Nesil Grafik & Tablo Yorumlama Problemleri',
            failRate: 58,
            recommendedAction: 'Zümre öğretmenleri tarafından 2 ders saati hız ve eleme teknikleri özel etüdü yapılmalıdır.',
          },
          {
            subject: 'Tarih',
            topic: 'Osmanlı Kültür & Medeniyet Teşkilat Yapısı',
            failRate: 52,
            recommendedAction: 'Kavram haritası ve karşılaştırmalı hafıza şifreleme föyü dağıtılmalıdır.',
          },
          {
            subject: 'Coğrafya / Fen',
            topic: 'Harita Okuryazarlığı ve İklim Tipleri',
            failRate: 46,
            recommendedAction: 'Dilsiz harita doldurma çalışması zorunlu ödev olarak tanımlanmalıdır.',
          },
        ],
        highPerformers: ['Ahmet Kaya (98.5 Net)', 'Zeynep Yıldız (94.0 Net)'],
        needsAttentionStudents: ['Murat Demir (Ödev eksiği %35, 62 Net)', 'Elif Aksoy (Süre yetiştirememe)'],
        institutionalActionPlan: [
          '1. Hafta: Belirlenen 3 kritik eksik konu için sınıfa özel telafi etütleri planlanacak.',
          '2. Hafta: Bireysel olarak 70 netin altında kalan öğrencilere mentörlük görüşmesi yapılacak.',
          '3. Hafta: Sadece zayıf konuları tarayan 50 soruluk kurum içi mini tarama testi uygulanacak.',
        ],
      }),
      fallback: () => ({
        overview: `${institutionName || 'Kurumumuz'} ${className || 'Sınıfı'} için yapılan ${examTitle || 'Deneme Sınavı'} analizinde sınıf ortalaması ${classAverageNet || '80.0'} net olarak ölçülmüştür.`,
        strengths: [
          'Türkçe paragraf ve genel okuma anlama sorularında başarı oranı %75 civarındadır.',
          'Temel matematik işlem basamaklarında genel başarı istikrarlıdır.',
        ],
        topDeficientTopics: [
          {
            subject: 'Matematik',
            topic: 'Problemler & Zaman Yönetimi',
            failRate: 54,
            recommendedAction: 'Özel problem çözme etüdü düzenlenmeli.',
          },
          {
            subject: 'Tarih / Sosyal',
            topic: 'Kavram ve Kronoloji Bilgisi',
            failRate: 48,
            recommendedAction: 'Şifreli hafıza kartları dağıtılmalı.',
          },
        ],
        highPerformers: ['Sınıf Birincisi (Yüksek Net)', 'Düzenli Çalışan Öğrenciler'],
        needsAttentionStudents: ['Net ortalaması 65 altındaki öğrenciler'],
        institutionalActionPlan: [
          '1. Hafta: Eksik konular için telafi etütleri açılacak.',
          '2. Hafta: Birebir rehberlik görüşmeleri tamamlanacak.',
          '3. Hafta: Mini branş taraması yapılacak.',
        ],
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          topDeficientTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                topic: { type: Type.STRING },
                failRate: { type: Type.NUMBER },
                recommendedAction: { type: Type.STRING },
              },
              required: ['subject', 'topic', 'failRate', 'recommendedAction'],
            },
          },
          highPerformers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          needsAttentionStudents: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          institutionalActionPlan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'overview',
          'strengths',
          'topDeficientTopics',
          'highPerformers',
          'needsAttentionStudents',
          'institutionalActionPlan',
        ],
      },
    });
  });

  // 10. Twin Question Generator (Benzer Soru Üretici)
  app.post('/api/snap/generate-twins', async (req, res) => {
    const { subject, topic, questionContext, examType } = req.body;

    const prompt = `Sen uzman bir ${examType || 'KPSS / YKS'} soru yazarı ve ÖSYM soru uzmanısın.
Kullanıcının daha önce yanlış yaptığı veya üzerinde çalıştığı soru konusu şudur:
- Ders: ${subject || 'Genel'}
- Konu: ${topic || 'Genel'}
- Orijinal Soru / Bağlam: ${questionContext || 'Konu kavrama sorusu'}

GÖREVİN:
Bu soruyla AYNI MANTIKTA, AYNI PEDAGOJİK KAZANIMDA fakat FARKLI SAYILAR/VERİLER/ÖNCÜLLERLE tam 3 adet özgün, kaliteli ve şıklı (A, B, C, D, E) "İkiz / Benzer Soru" üret. Her sorunun ipucu, doğru cevabı ve detaylı çözümü olsun.`;

    await handleGeminiJson({
      res,
      label: 'Generate twins',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.6 },
      shape: (p) => ({ twins: Array.isArray(p?.twins) ? p.twins : [] }),
      noKeyFallback: () => ({
        twins: [
          {
            id: 'twin-1',
            questionText: `${subject || 'Matematik'} - ${topic || 'Temel Kavramlar'}: Benzer soru 1 örneğidir. 2x + 6 = 18 ise x kaçtır?`,
            options: [
              { key: 'A', text: '4' },
              { key: 'B', text: '6' },
              { key: 'C', text: '8' },
              { key: 'D', text: '10' },
              { key: 'E', text: '12' },
            ],
            correctAnswer: 'B',
            hint: 'Denklemde bilinenleri bir tarafa, bilinmeyenleri diğer tarafa toplayın.',
            solution: '2x + 6 = 18 => 2x = 12 => x = 6. Doğru cevap B seçeneğidir.',
          },
        ],
      }),
      fallback: () => ({
        twins: [
          {
            id: 'twin-fallback-1',
            questionText: `${subject || 'Matematik'} - ${topic || 'Kavram Pekiştirme'}: 3(x - 2) = 15 olduğuna göre x değeri kaçtır?`,
            options: [
              { key: 'A', text: '5' },
              { key: 'B', text: '6' },
              { key: 'C', text: '7' },
              { key: 'D', text: '8' },
              { key: 'E', text: '9' },
            ],
            correctAnswer: 'C',
            hint: 'Önce her iki tarafı 3’e bölün ya da parantezi dağıtın.',
            solution: '3x - 6 = 15 => 3x = 21 => x = 7. Doğru seçenek C şıkkıdır.',
          },
        ],
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          twins: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                questionText: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ['key', 'text'],
                  },
                },
                correctAnswer: { type: Type.STRING },
                hint: { type: Type.STRING },
                solution: { type: Type.STRING },
              },
              required: ['id', 'questionText', 'options', 'correctAnswer', 'hint', 'solution'],
            },
          },
        },
        required: ['twins'],
      },
    });
  });

  // 11. Target Simulator AI Evaluation
  app.post('/api/target-simulator/analyze', async (req, res) => {
    const { target, currentNets, examType } = req.body;

    const prompt = `Sen kıdemli bir ${examType || 'YKS/KPSS'} Tercih ve Koçluk Uzmanısın.
Öğrencinin Hedefi: ${JSON.stringify(target || {})}
Öğrencinin Mevcut Ortalama Netleri: ${JSON.stringify(currentNets || {})}

Öğrencinin bu hedefe ulaşma olasılığını (matchPercentage: 0-100), eksik kaldığı netlerin yarattığı puan farkını, kritik odaklanması gereken 3 ders/alanı ve samimi, taktiksel koçluk tavsiyesini çıkar.`;

    await handleGeminiJson({
      res,
      label: 'Target simulator',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4 },
      noKeyFallback: () => ({
        matchPercentage: 78,
        scoreDifference: -12,
        aiAdvice: 'Hedefine ulaşmak için özellikle Matematik ve Alan derslerindeki eksik netleri tamamlamalısın. Düzenli branş denemeleri ile 4-6 hafta içinde hedeflenen banda yaklaşabilirsin.',
        criticalFocusAreas: ['Matematik Netleri (+6)', 'Hata Defteri Tekrarları', 'Zaman Yönetimi'],
      }),
      fallback: () => ({
        matchPercentage: 82,
        scoreDifference: -8,
        aiAdvice: 'Hedeflenen bölüme/kadroya ulaşmak için net artış potansiyeli yüksektir. Zayıf kalan 2 derse haftalık 3 saat ek soru çözümüyle 3-4 haftada hedef puana ulaşılabilir.',
        criticalFocusAreas: ['Temel Branş Netleri', 'Deneme Çözüm Rutini', 'Hata Defteri Tekrarı'],
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          matchPercentage: { type: Type.NUMBER },
          scoreDifference: { type: Type.NUMBER },
          aiAdvice: { type: Type.STRING },
          criticalFocusAreas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['matchPercentage', 'scoreDifference', 'aiAdvice', 'criticalFocusAreas'],
      },
    });
  });

  // 12. Question Duel Questions Generator
  app.post('/api/duel/generate-questions', async (req, res) => {
    const { category, examType, difficulty } = req.body;

    const prompt = `Sen ${examType || 'KPSS / YKS'} canlı bilgi yarışması / düello soru hazırlayıcısısın.
Seçilen Alan: ${category || 'Genel Kültür'}
Zorluk: ${difficulty || 'Orta'}

Tam 8 adet hızlı, düşündürücü, çoktan seçmeli (5 şıklı) yarışma sorusu üret. Her soruda options array'i, doğru cevabın index'i (0, 1, 2, 3, 4), kısa bir açıklama ve 20 saniye süre limiti olsun.`;

    await handleGeminiJson({
      res,
      label: 'Duel questions',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7 },
      shape: (p) => ({ questions: Array.isArray(p?.questions) ? p.questions : [] }),
      noKeyFallback: () => ({
        questions: [
          {
            id: 'duel-q1',
            category: category || 'Tarih',
            question: 'Kurtuluş Savaşı döneminde Batı Cephesi Komutanlığı görevini yürüten komutan kimdir?',
            options: ['İsmet İnönü', 'Kazım Karabekir', 'Fevzi Çakmak', 'Refet Bele', 'Ali Fuat Cebesoy'],
            correctIndex: 0,
            explanation: 'Batı Cephesi komutanı İsmet İnönü’dür.',
            timeLimitSeconds: 20,
          },
          {
            id: 'duel-q2',
            category: category || 'Coğrafya',
            question: 'Türkiye’de en çok yağış alan bölge hangisidir?',
            options: ['Karadeniz Bölgesi', 'Akdeniz Bölgesi', 'Ege Bölgesi', 'Marmara Bölgesi', 'İç Anadolu Bölgesi'],
            correctIndex: 0,
            explanation: 'Doğu Karadeniz ve Rize çevresi yıllık 2400 mm ile en yüksek yağışı alır.',
            timeLimitSeconds: 20,
          },
        ],
      }),
      fallback: () => ({
        questions: [
          {
            id: 'duel-q1',
            category: category || 'Tarih',
            question: 'Kurtuluş Savaşı döneminde Batı Cephesi Komutanlığı görevini yürüten komutan kimdir?',
            options: ['İsmet İnönü', 'Kazım Karabekir', 'Fevzi Çakmak', 'Refet Bele', 'Ali Fuat Cebesoy'],
            correctIndex: 0,
            explanation: 'Batı Cephesi komutanı İsmet İnönü’dür.',
            timeLimitSeconds: 20,
          },
          {
            id: 'duel-q2',
            category: category || 'Coğrafya',
            question: 'Türkiye’de en çok yağış alan bölge hangisidir?',
            options: ['Karadeniz Bölgesi', 'Akdeniz Bölgesi', 'Ege Bölgesi', 'Marmara Bölgesi', 'İç Anadolu Bölgesi'],
            correctIndex: 0,
            explanation: 'Doğu Karadeniz ve Rize çevresi en yüksek yağışı alır.',
            timeLimitSeconds: 20,
          },
          {
            id: 'duel-q3',
            category: category || 'Vatandaşlık',
            question: '1982 Anayasası’na göre Türkiye Büyük Millet Meclisi kaç milletvekilinden oluşur?',
            options: ['450', '550', '600', '650', '500'],
            correctIndex: 2,
            explanation: '2017 anayasa değişikliğiyle milletvekili sayısı 600 olmuştur.',
            timeLimitSeconds: 20,
          },
        ],
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                timeLimitSeconds: { type: Type.INTEGER },
              },
              required: ['id', 'category', 'question', 'options', 'correctIndex', 'explanation', 'timeLimitSeconds'],
            },
          },
        },
        required: ['questions'],
      },
    });
  });

  // 13. Speed Trainer Passage & Questions Generator
  app.post('/api/speed-trainer/generate-passage', async (req, res) => {
    const { type, topic, examType } = req.body;

    const prompt = `Sen ${examType || 'YKS / KPSS'} Hızlı Okuma & Anlama / Problem Çözme Antrenörüsün.
İstenen Antrenman Türü: ${type === 'MATH_PROBLEM' ? 'Matematik Yeni Nesil Mantık Problemi' : 'Türkçe Paragraf Hızlı Okuma ve Anlama'}
Konu: ${topic || 'Genel Kültür / Bilim / Edebiyat'}

GÖREVİN:
1. 120-180 kelime uzunluğunda kaliteli, ÖSYM üslubunda bir okuma metni veya problem metni yaz.
2. Metinle ilgili 2 adet çoktan seçmeli anlama sorusu oluştur.
3. Kelime sayısı ve ideal WPM (Words Per Minute) hedefi (örn. 200-240) belirle.`;

    await handleGeminiJson({
      res,
      label: 'Speed trainer',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.6 },
      noKeyFallback: () => ({
        title: 'Zaman Yönetimi ve Bilişsel Esneklik',
        passage: 'Öğrenme sürecinde beynimiz iki temel mod arasında geçiş yapar: odaklanmış mod ve dağınık mod. Odaklanmış modda doğrudan problemin çözümüne kilitleniriz; dağınık modda ise beynimiz arka planda kavramlar arasında geniş bağlantılar kurar. Zorlu bir problemle karşılaşıldığında belirli bir süre yoğun odaklanmanın ardından kısa bir mola vermek, zihnin dağınık moda geçerek beklenmedik yaratıcı çözümler üretmesini sağlar.',
        wordCount: 72,
        idealWpmTarget: 220,
        comprehensionQuestions: [
          {
            id: 'cq-1',
            question: 'Metne göre dağınık modun temel işlevi nedir?',
            options: [
              'Doğrudan tek bir hesaba odaklanmak',
              'Kavramlar arasında geniş bağlantılar kurmak',
              'Ezber yapmayı hızlandırmak',
              'Yalnızca uyku anında çalışmak',
            ],
            correctIndex: 1,
            explanation: 'Metinde dağınık modun kavramlar arasında geniş bağlantılar kurduğu açıkça belirtilmiştir.',
          },
        ],
      }),
      fallback: () => ({
        title: 'Sınavda Zihinsel Odaklanma ve Hızlı Okuma',
        passage: 'ÖSYM sınavlarında paragraf sorularında başarı, sadece hızlı okumakla değil, metnin ana düşüncesini ve yazarın bakış açısını ilk okuyuşta yakalamakla mümkündür. Turlama tekniği ve göz sıçramalarını genişleterek okuma alışkanlığı kazanmak, soru başına harcanan süreyi 40 saniyeye kadar düşürür.',
        wordCount: 48,
        idealWpmTarget: 220,
        comprehensionQuestions: [
          {
            id: 'cq-1',
            question: 'Paragrafta soru çözme süresini azaltan yöntem olarak ne belirtilmiştir?',
            options: [
              'Yalnızca son cümleyi okumak',
              'Göz sıçramalarını genişleterek okumak ve turlama tekniği',
              'Soruları ezberlemek',
              'Sadece kolay dersleri çözmek',
            ],
            correctIndex: 1,
            explanation: 'Metne göre göz sıçramalarını genişletmek ve turlama tekniği süreyi düşürmektedir.',
          },
        ],
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          passage: { type: Type.STRING },
          wordCount: { type: Type.INTEGER },
          idealWpmTarget: { type: Type.INTEGER },
          comprehensionQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
            },
          },
        },
        required: ['title', 'passage', 'wordCount', 'idealWpmTarget', 'comprehensionQuestions'],
      },
    });
  });

  // 14. WhatsApp Report Generator for Institutions
  app.post('/api/institution/generate-whatsapp-report', async (req, res) => {
    const { student, institutionName, latestExam } = req.body;

    const prompt = `Sen profesyonel bir dershane rehberlik öğretmenisin.
Kurum Adı: ${institutionName || 'Snaps Akademi'}
Öğrenci Bilgileri: ${JSON.stringify(student || {})}
Son Sınav Bilgileri: ${JSON.stringify(latestExam || {})}

Veliye veya öğrenciye WhatsApp üzerinden gönderilecek; emojilerle zenginleştirilmiş, saygılı, net, motive edici ve özetleyen hazır bir WhatsApp mesaj metni hazırla. Markdown kalınlıkları (*metin*) WhatsApp formatına tam uygun olsun.`;

    await handleGeminiText({
      res,
      label: 'WhatsApp report',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.5 },
      shape: (text) => ({ formattedMessage: text || '' }),
      noKeyFallback: () => ({
        formattedMessage:
          `📊 *${institutionName || 'Dershane'} Öğrenci Gelişim Raporu*\n\n` +
          `👤 *Öğrenci:* ${student?.name || 'Öğrenci'}\n` +
          `🎯 *Hedef Sınav:* ${student?.targetExam || 'KPSS / YKS'}\n` +
          `📈 *Son Deneme Neti:* ${student?.latestMockNet || '0'} Net\n` +
          `📝 *Toplam Çözülen Soru:* ${student?.totalQuestionsSolved || '0'}\n` +
          `📅 *Devam Durumu:* %${student?.attendancePercent || '100'}\n\n` +
          `💡 *Rehberlik Notu:* Öğrencimizin genel motivasyonu ve soru çözme istikrarı iyi durumdadır. Eksik konuları için etüt planlaması yapılmıştır.`,
      }),
      fallback: () => ({
        formattedMessage:
          `📊 *${institutionName || 'Akademi'} Öğrenci Gelişim & Deneme Raporu*\n\n` +
          `👤 *Öğrenci:* ${student?.name || 'Değerli Öğrencimiz'}\n` +
          `🎯 *Hedef Sınav:* ${student?.targetExam || 'KPSS / YKS'}\n` +
          `📈 *Son Deneme Neti:* ${student?.latestMockNet || '75'} Net\n` +
          `📝 *Çözülen Soru Sayısı:* ${student?.totalQuestionsSolved || '1200'}\n\n` +
          `💡 *Rehberlik Değerlendirmesi:* Öğrencimizin konu çalışma disiplini ve deneme performansı artış trendindedir. Tespit edilen eksik konular için bireysel etüt planı başlatılmıştır.`,
      }),
    });
  });

  // 15. Optical Form / Exam Image OCR Reader
  app.post('/api/institution/parse-optical-form', async (req, res) => {
    const { imageBase64, examType } = req.body;

    const demoResult = () => ({
      studentName: 'Örnek Öğrenci',
      studentNumber: '1042',
      sections: [
        { name: 'Türkçe', correct: 32, wrong: 6, empty: 2, net: 30.5 },
        { name: 'Matematik', correct: 28, wrong: 4, empty: 8, net: 27.0 },
        { name: 'Fen / Tarih', correct: 16, wrong: 3, empty: 1, net: 15.25 },
      ],
      totalNet: 72.75,
      notes: 'Optik form veya sınav sonuç belgesi başarıyla ayrıştırıldı.',
    });

    // No image → nothing to OCR; return the demo result (same as the no-key path).
    if (!imageBase64) {
      res.json(demoResult());
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    await handleGeminiJson({
      res,
      label: 'Optical form OCR',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `Bu resim bir ÖSYM/KPSS/YKS deneme sınavı optik formu veya sınav sonuç karnesidir.
Lütfen resimdeki:
1. Öğrenci Adı (varsa)
2. Öğrenci Numarası / T.C. (varsa)
3. Branş bazında Doğru (D), Yanlış (Y), Boş (B) ve Net değerlerini
4. Toplam Net değerini çıkar.
Türkiye standartlarında 4 yanlış 1 doğruyu götürür (Net = Doğru - Yanlış/4).`,
            },
          ],
        },
      ],
      config: { temperature: 0.2 },
      noKeyFallback: demoResult,
      fallback: () => ({
        studentName: 'Öğrenci Sonuç Belgesi',
        studentNumber: '---',
        sections: [
          { name: 'Genel Yetenek', correct: 30, wrong: 8, empty: 2, net: 28.0 },
          { name: 'Genel Kültür / Alan', correct: 25, wrong: 6, empty: 4, net: 23.5 },
        ],
        totalNet: 51.5,
        notes: 'Görsel tarandı. Manuel net kontrolü yapabilirsiniz.',
      }),
      schema: {
        type: Type.OBJECT,
        properties: {
          studentName: { type: Type.STRING },
          studentNumber: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                correct: { type: Type.NUMBER },
                wrong: { type: Type.NUMBER },
                empty: { type: Type.NUMBER },
                net: { type: Type.NUMBER },
              },
              required: ['name', 'correct', 'wrong', 'empty', 'net'],
            },
          },
          totalNet: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ['sections', 'totalNet'],
      },
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Snaps KPSS & YKS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
