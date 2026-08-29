export interface StudyInsight {
  id: string;
  category: 'MEMORY_RECALL' | 'EXAM_TACTICS' | 'FOCUS_ENERGY' | 'ERROR_ANALYSIS' | 'BIO_PERFORMANCE';
  categoryLabel: string;
  badgeColor: string;
  icon: string;
  title: string;
  insight: string;
  actionStep: string;
  scientificReference?: string;
}

export const STUDY_INSIGHTS: StudyInsight[] = [
  // 1. MEMORY & ACTIVE RECALL
  {
    id: 'feynman-technique',
    category: 'MEMORY_RECALL',
    categoryLabel: 'Bilişsel Hafıza',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: 'Brain',
    title: 'Feynman Tekniği ile Aktif Anlatım',
    insight: 'Bir konuyu gerçekten öğrenip öğrenmediğini anlamanın en hızlı yolu, onu 10 yaşındaki birine anlatır gibi terimlerden arındırıp özetlemektir.',
    actionStep: 'Çözdüğün sorunun mantığını sesli olarak 30 saniyede kendi cümlelerinle ifade et.',
    scientificReference: 'Nobel Ödüllü Richard Feynman Öğrenme Modeli'
  },
  {
    id: 'active-recall-blank-sheet',
    category: 'MEMORY_RECALL',
    categoryLabel: 'Bilişsel Hafıza',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: 'FileText',
    title: 'Boş Sayfa Metodu (Blurting)',
    insight: 'Kitabın altını çizmek pasif bir tanıma yanılsaması yaratır. Sayfayı kapatıp boş bir kağıda aklında kalanları yazmak kalıcılığı %50 artırır.',
    actionStep: 'Konu çalıştıktan sonra boş bir kağıda 1 dakika boyunca anahtar kavramları karala.',
    scientificReference: 'Karpicke & Roediger Bilişsel Hatırlama Araştırması'
  },
  {
    id: 'spaced-repetition-curve',
    category: 'MEMORY_RECALL',
    categoryLabel: 'Bilişsel Hafıza',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: 'TrendingUp',
    title: 'Aralıklı Tekrar (Spaced Repetition)',
    insight: 'Öğrenilen bilginin %70\'i ilk 24 saatte unutulur. 1. gün, 3. gün ve 7. gün yapılan 10\'ar dakikalık tekrarlar hafıza izini nöronlara kilitler.',
    actionStep: 'Dün çözdüğün hatalı sorulardan rastgele 3 tanesini şimdi 2 dakikada gözden geçir.',
    scientificReference: 'Ebbinghaus Unutma Eğrisi'
  },
  {
    id: 'dual-coding-spatial',
    category: 'MEMORY_RECALL',
    categoryLabel: 'Bilişsel Hafıza',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    icon: 'Sparkles',
    title: 'İkili Kodlama (Dual Coding)',
    insight: 'Sözel bir kavramı küçük bir şema, ok veya geometrik kutuyla eşleştirdiğinde beynin hem sol hem sağ hemisferi aynı anda devreye girer.',
    actionStep: 'Karışık kuralları uzun cümleler yerine 3 oklu küçük bir akış şemasına dönüştür.',
    scientificReference: 'Paivio Çift Kodlama Hipotezi'
  },

  // 2. EXAM TACTICS & TIME MANAGEMENT
  {
    id: 'turlama-first-pass',
    category: 'EXAM_TACTICS',
    categoryLabel: 'Sınav Taktikleri',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: 'Clock',
    title: 'Turlama Tekniği & Kolay Net Kuralı',
    insight: 'Zor soru ile kolay soru aynı puanı getirir. Bir soruya 60 saniyeden fazla saplanıp kalmak, arkadaki 3 kolay soruyu feda etmektir.',
    actionStep: 'Çıkmaza girdiğin soruya hemen daire işareti koy ve tereddütsüz sonraki soruya geç.',
    scientificReference: 'Sınav Psikolojisi & Zaman Dağılım Modelleri'
  },
  {
    id: 'question-stem-anchor',
    category: 'EXAM_TACTICS',
    categoryLabel: 'Sınav Taktikleri',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: 'Target',
    title: 'Önce Soru Kökünü Kilitle',
    insight: 'Paragraf veya karmaşık problem metinlerini okumadan önce soru kökünü ("değinilmemiştir", "kesinlikle yanlıştır") netleştirirsen, beynin metni hedefe yönelik filtreler.',
    actionStep: 'Soru kökündeki olumsuz ifadenin altını iki kez çiz ve ne aradığını bilerek paragrafa başla.',
    scientificReference: 'Seçici Dikkat & Görsel Tarama Hızı'
  },
  {
    id: 'two-options-heuristic',
    category: 'EXAM_TACTICS',
    categoryLabel: 'Sınav Taktikleri',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: 'Zap',
    title: 'İki Şık Arasında Kalınca Somut Kanıt Ara',
    insight: 'İki şık arasında kaldığında hislerine göre cevap değiştirmek hata oranını yükseltir. Doğru şık, metinde kelime veya sayısal dayanağı olan şıktır.',
    actionStep: 'Kalan iki şıkkı metindeki kesin bir cümleyle eşleştir; dayanağı olmayan sübjektif şıkkı ele.',
    scientificReference: 'Bilişsel Yanılgılar & İlk İçgüdü Yanılgısı'
  },
  {
    id: 'optical-batch-marking',
    category: 'EXAM_TACTICS',
    categoryLabel: 'Sınav Taktikleri',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: 'CheckCircle2',
    title: 'Sayfa Sayfa Optik Kodlama',
    insight: 'Her soruda optik forma dönmek odak dağıtır, en sona bırakmak ise kaydırma riskini katlar. En ideal ritim, her sayfa bittiğinde kodlamaktır.',
    actionStep: 'Kitapçıkta 1 sayfayı bitirdiğinde 5-10 saniye nefes alarak optiği doldur.',
    scientificReference: 'Bilişsel Geçiş Maliyeti (Task-Switching Cost)'
  },

  // 3. FOCUS & COGNITIVE ENDURANCE
  {
    id: 'pomodoro-20-20-20',
    category: 'FOCUS_ENERGY',
    categoryLabel: 'Zihinsel Odak',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: 'Eye',
    title: '20-20-20 Göz ve Dikkat Dinlendirme',
    insight: 'Sürekli kitaba veya ekrana odaklanmak siliyer göz kaslarını kilitler ve baş ağrısına yol açar.',
    actionStep: '20 saniye boyunca başını kaldır ve en az 6 metre (20 feet) uzaktaki bir noktaya bak.',
    scientificReference: 'Amerikan Oftalmoloji Akademisi Yönergesi'
  },
  {
    id: 'brain-dump-parking-lot',
    category: 'FOCUS_ENERGY',
    categoryLabel: 'Zihinsel Odak',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: 'Layers',
    title: 'Düşünce Parkı (Parking Lot Notu)',
    insight: 'Ders çalışırken aklına aniden gelen "şunu yapmam lazım" düşünceleri çalışma belleğini (RAM) işgal eder.',
    actionStep: 'Yanına boş bir karalama kağıdı koy; aklına gelen ders dışı düşünceyi tek kelimeyle yaz ve hemen derse dön.',
    scientificReference: 'Zeigarnik Etkisi & Bilişsel Yük Yönetimi'
  },
  {
    id: 'box-breathing-focus',
    category: 'FOCUS_ENERGY',
    categoryLabel: 'Zihinsel Odak',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: 'Flame',
    title: 'Kutu Nefesi ile Zihinsel Reset',
    insight: 'Soru çözerken nefesimiz sığlaşır ve beyne giden oksijen azalır. 4 saniye al, 4 tut, 4 ver ritmi parasempatik sinir sistemini aktive eder.',
    actionStep: 'Şimdi dik otur, 4 saniye derin nefes al, 4 saniye tut ve sakince 4 saniyede bırak.',
    scientificReference: 'Vagus Siniri & Kalp Hızı Değişkenliği (HRV)'
  },
  {
    id: 'frictionless-start-5min',
    category: 'FOCUS_ENERGY',
    categoryLabel: 'Zihinsel Odak',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: 'Zap',
    title: '5 Dakika Kuralı (Başlama İvmesi)',
    insight: 'Ertelemenin en büyük sebebi görevin büyüklüğüdür. Beyin "sadece 5 dakika deneyeceğim" dediğinde direnç kırılır ve dopamin akışı başlar.',
    actionStep: 'Zorlandığın testten sadece 1 soru çözmeyi hedefle; momentum gerisini getirecektir.',
    scientificReference: 'Eylemsizlik Prensibi & Nöral Başlatma Maliyeti'
  },

  // 4. ERROR ANALYSIS & MISTAKE NOTEBOOK
  {
    id: 'classify-mistake-types',
    category: 'ERROR_ANALYSIS',
    categoryLabel: 'Hata Analizi',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: 'AlertCircle',
    title: 'Hatanı 3 Kategoride Sınıflandır',
    insight: 'Her yanlış aynı değildir: (1) Bilgi eksikliği, (2) Soru kökü okuma hatası, (3) İşlem/dikkat hatası. Hatayı etiketlemek tekrarlanmasını engeller.',
    actionStep: 'Son yanlış soruna bak: Hangi kategorideydi? Doğru sebebi belirle.',
    scientificReference: 'Metabilişsel (Metacognitive) Hata Farkındalığı'
  },
  {
    id: 'reverse-solve-after-video',
    category: 'ERROR_ANALYSIS',
    categoryLabel: 'Hata Analizi',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: 'RotateCcw',
    title: 'Video Çözümünü İzledikten Sonra Kendin Çöz',
    insight: 'Video çözümü izlerken anlamak ile o soruyu tek başına çözebilmek arasında büyük bir uçurum vardır.',
    actionStep: 'Çözüm videosunu kapat ve aynı soruyu baştan sona boş bir kağıda tek başına çöz.',
    scientificReference: 'Yetkinlik İllüzyonu (Illusion of Competence)'
  },
  {
    id: 'mistake-triad-solve',
    category: 'ERROR_ANALYSIS',
    categoryLabel: 'Hata Analizi',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: 'Award',
    title: 'Hata Defterindeki Sorunun İkizini Çöz',
    insight: 'Hatalı bir soruyu kavradıktan sonra aynı kazanıma ait 2 benzer soru daha çözüldüğünde o konudaki net kaybı %90 oranında telafi edilir.',
    actionStep: 'Akıllı Hata Defterindeki bir sorunun benzerini soru bankasından hemen aç ve çöz.',
    scientificReference: 'Kazanım Pekiştirme & Genelleme Eğrisi'
  },

  // 5. BIOLOGICAL PERFORMANCE & SLEEP
  {
    id: 'hydration-brain-boost',
    category: 'BIO_PERFORMANCE',
    categoryLabel: 'Fizyolojik Verim',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: 'Sparkles',
    title: 'Su Tüketimi & Dikkat Kapasitesi',
    insight: 'Vücuttaki %1-2\'lik hafif su kaybı (dehidrasyon), odaklanma süresini ve işlem hızını %15 oranında düşürür.',
    actionStep: 'Masandaki su bardağından şimdi büyük bir yudum su iç ve postürünü düzelt.',
    scientificReference: 'Bilişsel Nörobilim & Hidrasyon Araştırmaları'
  },
  {
    id: 'sleep-memory-consolidation',
    category: 'BIO_PERFORMANCE',
    categoryLabel: 'Fizyolojik Verim',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: 'Clock',
    title: 'Uyku Sırasında Hafıza Konsolidasyonu',
    insight: 'Gece uykusunda hipokampüs, gün boyu çözülen soruları ve formülleri neokortekse (kalıcı belleğe) yazar. Uykusuz çalışılan 2 saat, ertesi günün 6 saatini yok eder.',
    actionStep: 'Gece uyumadan 30 dk önce mavi ışıklı ekranları kapatıp sadece günün önemli formüllerine göz at.',
    scientificReference: 'Harvard Tıp Fakültesi Nörobiyoloji & Uyku Araştırması'
  }
];
