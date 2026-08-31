/**
 * ÖSYM YKS — konu bazlı yıllara göre çıkmış soru dağılımı.
 *
 * Kaynak: MEB okul rehberlik servisleri için derlenen "Yıllara Göre Soru
 * Dağılımı" tabloları (Psk. Dan. N. Gizem Toker) — TYT 2018-2025, AYT 2019-2025.
 * Bu modül SALT-OKUNUR statik veridir; kullanıcı nesnesine (Subject/SubjectTopic)
 * girmez, Firestore'a senkronlanmaz. Konu ile eşleşme `SubjectTopic.statKey`
 * üzerinden yapılır.
 *
 * Not: 2026 YKS verisi yayınlandığında ilgili satırlara `'2026': n` eklemek ve
 * STAT_YEARS listelerine 2026 koymak yeterli.
 */
import type { SubjectTopic } from '../types';

export type ExamSection = 'TYT' | 'AYT';
export type TopicWeight = SubjectTopic['weight'];

export interface TopicYearStat {
  /** SubjectTopic.statKey ile birebir eşleşen anahtar. */
  statKey: string;
  section: ExamSection;
  subjectSlug: string;
  /** Kaynak tablodaki konu adı (müfredat adı farklı olabilir). */
  topic: string;
  /** Yıl -> o yıl çıkan soru sayısı. Sıfır olan yıllar yazılmaz. */
  counts: Record<string, number>;
}

/** İstatistiğin kapsadığı sınav yılları (grafik hizalaması için). */
export const STAT_YEARS: Record<ExamSection, number[]> = {
  TYT: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  AYT: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
};

export const STAT_SOURCE_LABEL =
  'MEB rehberlik servisi derlemesi · TYT 2018-2025, AYT 2019-2025';

/**
 * Bir sınav bölümündeki dersin toplam soru sayısı (güncel YKS formatı).
 * `deriveWeight` eşiklerini derse göre normalize etmek için kullanılır.
 * Anahtar: `${section}-${subjectSlug}`.
 */
export const SECTION_SUBJECT_QUESTION_COUNT: Record<string, number> = {
  'TYT-turkce': 40,
  'TYT-matematik': 30,
  'TYT-geometri': 10,
  'TYT-fizik': 7,
  'TYT-kimya': 7,
  'TYT-biyoloji': 6,
  'TYT-tarih': 5,
  'TYT-cografya': 5,
  'TYT-felsefe': 5,
  'TYT-din': 5,
  'AYT-matematik': 30,
  'AYT-geometri': 10,
  'AYT-fizik': 14,
  'AYT-kimya': 13,
  'AYT-biyoloji': 13,
  'AYT-edebiyat': 24,
  'AYT-tarih': 21,
  'AYT-cografya': 17,
  'AYT-felsefe': 12,
  'AYT-din': 6,
};

export const EXAM_TOPIC_STATS: TopicYearStat[] = [
  // ── TYT · turkce ──
  { statKey: 'tyt-turkce-ses-bilgisi', section: 'TYT', subjectSlug: 'turkce', topic: 'Ses Bilgisi', counts: { '2018': 3, '2019': 1, '2021': 1, '2023': 1 } },
  { statKey: 'tyt-turkce-dil-bilgisi', section: 'TYT', subjectSlug: 'turkce', topic: 'Dil Bilgisi', counts: { '2018': 1, '2019': 8, '2020': 3, '2021': 2, '2022': 3, '2023': 2, '2024': 3, '2025': 3 } },
  { statKey: 'tyt-turkce-noktalama-isaretleri', section: 'TYT', subjectSlug: 'turkce', topic: 'Noktalama İşaretleri', counts: { '2018': 1, '2019': 1, '2020': 2, '2021': 2, '2022': 2, '2023': 2, '2024': 2, '2025': 2 } },
  { statKey: 'tyt-turkce-yazim-kurallari', section: 'TYT', subjectSlug: 'turkce', topic: 'Yazım Kuralları', counts: { '2018': 2, '2019': 2, '2020': 2, '2021': 2, '2022': 2, '2023': 2, '2024': 2, '2025': 2 } },
  { statKey: 'tyt-turkce-anlatim-bozuklugu', section: 'TYT', subjectSlug: 'turkce', topic: 'Anlatım Bozukluğu', counts: { '2018': 1 } },
  { statKey: 'tyt-turkce-paragraf', section: 'TYT', subjectSlug: 'turkce', topic: 'Paragraf', counts: { '2018': 22, '2019': 22, '2020': 26, '2021': 25, '2022': 26, '2023': 26, '2024': 26, '2025': 26 } },
  { statKey: 'tyt-turkce-cumlede-anlam', section: 'TYT', subjectSlug: 'turkce', topic: 'Cümlede Anlam', counts: { '2018': 7, '2019': 3, '2020': 6, '2021': 3, '2022': 3, '2023': 4, '2024': 3, '2025': 3 } },
  { statKey: 'tyt-turkce-sozcukte-anlam', section: 'TYT', subjectSlug: 'turkce', topic: 'Sözcükte Anlam', counts: { '2018': 3, '2019': 3, '2020': 1, '2021': 5, '2022': 4, '2023': 3, '2024': 4, '2025': 4 } },
  // ── TYT · geometri ──
  { statKey: 'tyt-geometri-analitik-geometri', section: 'TYT', subjectSlug: 'geometri', topic: 'Analitik Geometri', counts: { '2018': 1, '2019': 1, '2021': 1, '2022': 1 } },
  { statKey: 'tyt-geometri-cember-daire', section: 'TYT', subjectSlug: 'geometri', topic: 'Çember-Daire', counts: { '2018': 1, '2019': 2 } },
  { statKey: 'tyt-geometri-kati-cisimler', section: 'TYT', subjectSlug: 'geometri', topic: 'Katı Cisimler', counts: { '2018': 1, '2019': 2, '2020': 2, '2021': 2, '2022': 2, '2023': 2, '2024': 2, '2025': 2 } },
  { statKey: 'tyt-geometri-yamuk', section: 'TYT', subjectSlug: 'geometri', topic: 'Yamuk', counts: { '2018': 1, '2020': 2, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-geometri-cokgenler', section: 'TYT', subjectSlug: 'geometri', topic: 'Çokgenler', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-geometri-acilar-ve-ucgenler', section: 'TYT', subjectSlug: 'geometri', topic: 'Açılar ve Üçgenler', counts: { '2018': 3, '2019': 1, '2020': 2, '2021': 4, '2022': 4, '2023': 5, '2024': 5, '2025': 4 } },
  { statKey: 'tyt-geometri-eskenar-dortgen', section: 'TYT', subjectSlug: 'geometri', topic: 'Eşkenar Dörtgen', counts: { '2021': 1, '2022': 1 } },
  { statKey: 'tyt-geometri-kare', section: 'TYT', subjectSlug: 'geometri', topic: 'Kare', counts: { '2018': 1, '2019': 1, '2020': 1, '2025': 1 } },
  { statKey: 'tyt-geometri-dikdortgen', section: 'TYT', subjectSlug: 'geometri', topic: 'Dikdörtgen', counts: { '2018': 2, '2019': 2, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  // ── TYT · matematik ──
  { statKey: 'tyt-matematik-olasilik', section: 'TYT', subjectSlug: 'matematik', topic: 'Olasılık', counts: { '2018': 2, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-permutasyon-kombinasyon', section: 'TYT', subjectSlug: 'matematik', topic: 'Permütasyon-Kombinasyon', counts: { '2018': 1, '2019': 1, '2020': 2, '2023': 1, '2024': 3, '2025': 1 } },
  { statKey: 'tyt-matematik-oran-oranti', section: 'TYT', subjectSlug: 'matematik', topic: 'Oran-Orantı', counts: { '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-mutlak-deger', section: 'TYT', subjectSlug: 'matematik', topic: 'Mutlak Değer', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 2, '2025': 1 } },
  { statKey: 'tyt-matematik-problemler', section: 'TYT', subjectSlug: 'matematik', topic: 'Problemler', counts: { '2018': 11, '2019': 12, '2020': 13, '2021': 13, '2022': 13, '2023': 10, '2024': 11, '2025': 12 } },
  { statKey: 'tyt-matematik-temel-kavramlar', section: 'TYT', subjectSlug: 'matematik', topic: 'Temel Kavramlar', counts: { '2018': 4, '2019': 1, '2020': 1, '2021': 3, '2022': 3, '2023': 2, '2024': 1, '2025': 3 } },
  { statKey: 'tyt-matematik-sayi-basamaklari', section: 'TYT', subjectSlug: 'matematik', topic: 'Sayı Basamakları', counts: { '2018': 1, '2019': 2, '2020': 1, '2021': 2, '2022': 1, '2023': 1, '2024': 2, '2025': 1 } },
  { statKey: 'tyt-matematik-islem', section: 'TYT', subjectSlug: 'matematik', topic: 'İşlem', counts: { '2021': 1 } },
  { statKey: 'tyt-matematik-kumeler-kartezyen-carpim', section: 'TYT', subjectSlug: 'matematik', topic: 'Kümeler- Kartezyen Çarpım', counts: { '2018': 2, '2019': 2, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-mantik', section: 'TYT', subjectSlug: 'matematik', topic: 'Mantık', counts: { '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-fonksiyonlar', section: 'TYT', subjectSlug: 'matematik', topic: 'Fonksiyonlar', counts: { '2018': 1, '2019': 2, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-bolunebilme-kurallari', section: 'TYT', subjectSlug: 'matematik', topic: 'Bölünebilme Kuralları', counts: { '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-basit-esitsizlikler', section: 'TYT', subjectSlug: 'matematik', topic: 'Basit Eşitsizlikler', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 3, '2025': 1 } },
  { statKey: 'tyt-matematik-denklem-cozme', section: 'TYT', subjectSlug: 'matematik', topic: 'Denklem Çözme', counts: { '2020': 2, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-uslu-ifadeler', section: 'TYT', subjectSlug: 'matematik', topic: 'Üslü İfadeler', counts: { '2018': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-carpanlara-ayirma', section: 'TYT', subjectSlug: 'matematik', topic: 'Çarpanlara Ayırma', counts: { '2020': 1 } },
  { statKey: 'tyt-matematik-koklu-ifadeler', section: 'TYT', subjectSlug: 'matematik', topic: 'Köklü İfadeler', counts: { '2018': 2, '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-matematik-obeb-okek', section: 'TYT', subjectSlug: 'matematik', topic: 'OBEB-OKEK', counts: { '2020': 2, '2024': 1 } },
  { statKey: 'tyt-matematik-rasyonel-sayilar', section: 'TYT', subjectSlug: 'matematik', topic: 'Rasyonel Sayılar', counts: { '2018': 1, '2020': 3, '2021': 3, '2022': 1, '2023': 2, '2024': 2, '2025': 1 } },
  { statKey: 'tyt-matematik-polinomlar', section: 'TYT', subjectSlug: 'matematik', topic: 'Polinomlar', counts: { '2019': 1, '2020': 1 } },
  { statKey: 'tyt-matematik-istatistik', section: 'TYT', subjectSlug: 'matematik', topic: 'İstatistik', counts: { '2020': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  // ── TYT · fizik ──
  { statKey: 'tyt-fizik-fizik-bilimine-giris', section: 'TYT', subjectSlug: 'fizik', topic: 'Fizik Bilimine Giriş', counts: { '2018': 1, '2020': 1 } },
  { statKey: 'tyt-fizik-madde-ve-ozellikleri', section: 'TYT', subjectSlug: 'fizik', topic: 'Madde ve Özellikleri', counts: { '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-fizik-hareket-ve-kuvvet', section: 'TYT', subjectSlug: 'fizik', topic: 'Hareket ve Kuvvet', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2025': 1 } },
  { statKey: 'tyt-fizik-is-guc-enerji', section: 'TYT', subjectSlug: 'fizik', topic: 'İş, Güç, Enerji', counts: { '2019': 1 } },
  { statKey: 'tyt-fizik-isi-sicaklik-ve-genlesme', section: 'TYT', subjectSlug: 'fizik', topic: 'Isı, Sıcaklık ve Genleşme', counts: { '2018': 1, '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-fizik-elektrostatik', section: 'TYT', subjectSlug: 'fizik', topic: 'Elektrostatik', counts: { '2018': 1, '2022': 1, '2025': 1 } },
  { statKey: 'tyt-fizik-elektrik-ve-manyetizma', section: 'TYT', subjectSlug: 'fizik', topic: 'Elektrik ve Manyetizma', counts: { '2019': 1, '2020': 1, '2021': 1, '2023': 2, '2024': 2 } },
  { statKey: 'tyt-fizik-basinc', section: 'TYT', subjectSlug: 'fizik', topic: 'Basınç', counts: { '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'tyt-fizik-kaldirma-kuvveti', section: 'TYT', subjectSlug: 'fizik', topic: 'Kaldırma Kuvveti', counts: { '2018': 1, '2020': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-fizik-dalgalar', section: 'TYT', subjectSlug: 'fizik', topic: 'Dalgalar', counts: { '2020': 1, '2021': 1, '2022': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-fizik-optik', section: 'TYT', subjectSlug: 'fizik', topic: 'Optik', counts: { '2018': 2, '2019': 2, '2020': 1, '2021': 1, '2022': 1, '2023': 2, '2024': 1, '2025': 1 } },
  // ── TYT · kimya ──
  { statKey: 'tyt-kimya-kimya-bilimi', section: 'TYT', subjectSlug: 'kimya', topic: 'Kimya Bilimi', counts: { '2018': 2, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-kimya-atomun-yapisi', section: 'TYT', subjectSlug: 'kimya', topic: 'Atomun Yapısı', counts: { '2019': 1, '2020': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-kimya-periyodik-tablo', section: 'TYT', subjectSlug: 'kimya', topic: 'Periyodik Tablo', counts: { '2018': 1, '2019': 1, '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'tyt-kimya-maddenin-halleri', section: 'TYT', subjectSlug: 'kimya', topic: 'Maddenin Halleri', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-kimya-kimyasal-turler-arasi-etkilesimler', section: 'TYT', subjectSlug: 'kimya', topic: 'Kimyasal Türler Arası Etkileşimler', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-kimya-kimyasal-hesaplamalar', section: 'TYT', subjectSlug: 'kimya', topic: 'Kimyasal Hesaplamalar', counts: { '2020': 1, '2021': 1, '2024': 1 } },
  { statKey: 'tyt-kimya-kimyanin-temel-kanunlari', section: 'TYT', subjectSlug: 'kimya', topic: 'Kimyanın Temel Kanunları', counts: { '2018': 1, '2022': 1, '2023': 1 } },
  { statKey: 'tyt-kimya-asit-baz-ve-tuzlar', section: 'TYT', subjectSlug: 'kimya', topic: 'Asit, Baz ve Tuzlar', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-kimya-karisimlar', section: 'TYT', subjectSlug: 'kimya', topic: 'Karışımlar', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-kimya-kimya-her-yerde', section: 'TYT', subjectSlug: 'kimya', topic: 'Kimya Her Yerde', counts: { '2018': 1, '2019': 1 } },
  // ── TYT · biyoloji ──
  { statKey: 'tyt-biyoloji-canlilarin-ortak-ozellikleri', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Canlıların Ortak Özellikleri', counts: { '2019': 1, '2022': 1, '2025': 1 } },
  { statKey: 'tyt-biyoloji-canlilarin-temel-bilesenleri', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Canlıların Temel Bileşenleri', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2023': 1, '2024': 1 } },
  { statKey: 'tyt-biyoloji-hucre-ve-organelleri', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Hücre ve Organelleri', counts: { '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'tyt-biyoloji-madde-gecisleri', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Madde Geçişleri', counts: { '2019': 1, '2025': 1 } },
  { statKey: 'tyt-biyoloji-canlilarin-siniflandirilmasi', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Canlıların Sınıflandırılması', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-biyoloji-hucre-bolunmeleri-ve-ureme', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Hücre Bölünmeleri ve Üreme', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-biyoloji-ekosistem-ekoloji', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Ekosistem Ekoloji', counts: { '2018': 1, '2019': 1, '2021': 1, '2023': 1, '2024': 1 } },
  { statKey: 'tyt-biyoloji-guncel-cevre-sorunlari', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Güncel Çevre Sorunları', counts: { '2018': 1, '2020': 1, '2022': 1, '2025': 1 } },
  { statKey: 'tyt-biyoloji-kalitim', section: 'TYT', subjectSlug: 'biyoloji', topic: 'Kalıtım', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  // ── TYT · tarih ──
  { statKey: 'tyt-tarih-ilk-ve-orta-caglarda-turk-dunyasi', section: 'TYT', subjectSlug: 'tarih', topic: 'İlk ve Orta Çağlarda Türk Dünyası', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-tarih-turklerin-islamiyet-i-kabulu-ve-ilk-turk-islam-d', section: 'TYT', subjectSlug: 'tarih', topic: 'Türklerin İslamiyet’i Kabulü ve İlk Türk İslam Devletleri', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-tarih-beylikten-devlete-osmanli', section: 'TYT', subjectSlug: 'tarih', topic: 'Beylikten Devlete Osmanlı', counts: { '2019': 1, '2022': 1, '2025': 1 } },
  { statKey: 'tyt-tarih-dunya-gucu-osmanli', section: 'TYT', subjectSlug: 'tarih', topic: 'Dünya Gücü Osmanlı', counts: { '2024': 1 } },
  { statKey: 'tyt-tarih-uluslararasi-iliskilerde-denge-stratejisi-1774-1', section: 'TYT', subjectSlug: 'tarih', topic: 'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)', counts: { '2020': 1, '2021': 1, '2023': 1 } },
  { statKey: 'tyt-tarih-xx-yuzyil-baslarinda-osmanli-devleti-ve-dunya', section: 'TYT', subjectSlug: 'tarih', topic: 'XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya', counts: { '2020': 1 } },
  { statKey: 'tyt-tarih-milli-mucadele', section: 'TYT', subjectSlug: 'tarih', topic: 'Milli Mücadele', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 2, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-tarih-ataturkculuk-ve-turk-inkilabi', section: 'TYT', subjectSlug: 'tarih', topic: 'Atatürkçülük ve Türk İnkılabı', counts: { '2019': 1, '2021': 1, '2022': 1, '2024': 1, '2025': 1 } },
  // ── TYT · cografya ──
  { statKey: 'tyt-cografya-doga-ve-insan', section: 'TYT', subjectSlug: 'cografya', topic: 'Doğa ve İnsan', counts: { '2018': 1, '2019': 1 } },
  { statKey: 'tyt-cografya-dunyanin-sekli-ve-hareketleri', section: 'TYT', subjectSlug: 'cografya', topic: 'Dünyanın Şekli ve Hareketleri', counts: { '2021': 1 } },
  { statKey: 'tyt-cografya-harita-bilgisi', section: 'TYT', subjectSlug: 'cografya', topic: 'Harita Bilgisi', counts: { '2018': 1, '2020': 1, '2022': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-cografya-iklim-bilgisi', section: 'TYT', subjectSlug: 'cografya', topic: 'İklim Bilgisi', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-cografya-ic-ve-dis-kuvvetler', section: 'TYT', subjectSlug: 'cografya', topic: 'İç ve Dış Kuvvetler', counts: { '2020': 1, '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'tyt-cografya-nufus-ve-yerlesme', section: 'TYT', subjectSlug: 'cografya', topic: 'Nüfus ve Yerleşme', counts: { '2018': 1, '2019': 2, '2020': 1, '2021': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-cografya-ekonomik-faaliyetler', section: 'TYT', subjectSlug: 'cografya', topic: 'Ekonomik Faaliyetler', counts: { '2022': 1 } },
  { statKey: 'tyt-cografya-bolgeler', section: 'TYT', subjectSlug: 'cografya', topic: 'Bölgeler', counts: { '2020': 1, '2021': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-cografya-dogal-afetler', section: 'TYT', subjectSlug: 'cografya', topic: 'Doğal Afetler', counts: { '2018': 1, '2019': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  // ── TYT · felsefe ──
  { statKey: 'tyt-felsefe-felsefe-alani', section: 'TYT', subjectSlug: 'felsefe', topic: 'Felsefe Alanı', counts: { '2019': 1, '2021': 2, '2022': 1, '2023': 2, '2024': 1 } },
  { statKey: 'tyt-felsefe-bilgi-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Bilgi Felsefesi', counts: { '2018': 2, '2019': 1, '2020': 1, '2022': 2, '2023': 2, '2024': 1, '2025': 3 } },
  { statKey: 'tyt-felsefe-bilim-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Bilim Felsefesi', counts: { '2019': 1, '2025': 1 } },
  { statKey: 'tyt-felsefe-varlik-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Varlık Felsefesi', counts: { '2018': 1, '2020': 1, '2021': 1, '2024': 1 } },
  { statKey: 'tyt-felsefe-ahlak-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Ahlak Felsefesi', counts: { '2018': 1, '2019': 1, '2020': 2, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-felsefe-siyaset-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Siyaset Felsefesi', counts: { '2019': 1, '2021': 1, '2022': 1 } },
  { statKey: 'tyt-felsefe-din-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Din Felsefesi', counts: { '2018': 1, '2020': 1, '2024': 1 } },
  { statKey: 'tyt-felsefe-sanat-felsefesi', section: 'TYT', subjectSlug: 'felsefe', topic: 'Sanat Felsefesi', counts: { '2021': 1 } },
  // ── TYT · din ──
  { statKey: 'tyt-din-bilgi-ve-inanc', section: 'TYT', subjectSlug: 'din', topic: 'Bilgi ve İnanç', counts: { '2018': 1, '2019': 2, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-din-din-ve-islam', section: 'TYT', subjectSlug: 'din', topic: 'Din ve İslam', counts: { '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-din-islam-ve-ibadet', section: 'TYT', subjectSlug: 'din', topic: 'İslam ve İbadet', counts: { '2018': 1, '2019': 1, '2021': 1, '2022': 1 } },
  { statKey: 'tyt-din-genclik-ve-degerler', section: 'TYT', subjectSlug: 'din', topic: 'Gençlik ve Değerler', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1 } },
  { statKey: 'tyt-din-allah-insan-iliskisi', section: 'TYT', subjectSlug: 'din', topic: 'Allah İnsan İlişkisi', counts: { '2022': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-din-hz-muhammed-s-a-v', section: 'TYT', subjectSlug: 'din', topic: 'Hz. Muhammed (S.A.V)', counts: { '2018': 1, '2019': 1, '2020': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'tyt-din-vahiy-ve-akil', section: 'TYT', subjectSlug: 'din', topic: 'Vahiy ve Akıl', counts: { '2018': 1, '2020': 2, '2021': 1 } },
  { statKey: 'tyt-din-islam-dusuncesinde-yorumlar-mezhepler', section: 'TYT', subjectSlug: 'din', topic: 'İslam Düşüncesinde Yorumlar, Mezhepler', counts: { '2023': 1, '2024': 1 } },
  { statKey: 'tyt-din-din-kultur-ve-medeniyet-2019-2025', section: 'TYT', subjectSlug: 'din', topic: 'Din, Kültür ve Medeniyet (2019-2025)', counts: { '2021': 1, '2022': 1, '2023': 1, '2025': 1 } },
  // ── AYT · edebiyat ──
  { statKey: 'ayt-edebiyat-anlam-bilgisi', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Anlam Bilgisi', counts: { '2019': 4, '2020': 6, '2021': 3, '2022': 6, '2023': 6, '2024': 6, '2025': 6 } },
  { statKey: 'ayt-edebiyat-metinlerin-siniflandirilmasi', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Metinlerin Sınıflandırılması', counts: { '2024': 1 } },
  { statKey: 'ayt-edebiyat-siir-bilgisi', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Şiir Bilgisi', counts: { '2019': 3, '2020': 3, '2021': 2, '2022': 3, '2023': 3, '2024': 2, '2025': 3 } },
  { statKey: 'ayt-edebiyat-soz-sanatlari', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Söz Sanatları', counts: { '2019': 1, '2020': 1, '2021': 2, '2022': 2, '2023': 2, '2024': 2, '2025': 1 } },
  { statKey: 'ayt-edebiyat-edebi-akimlar', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Edebi Akımlar', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-edebiyat-islamiyet-oncesi-ve-gecis-donemi-turk-edebiyati', section: 'AYT', subjectSlug: 'edebiyat', topic: 'İslamiyet Öncesi ve Geçiş Dönemi Türk Edebiyatı', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-edebiyat-halk-edebiyati', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Halk Edebiyatı', counts: { '2019': 2, '2020': 2, '2021': 2, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-edebiyat-divan-edebiyati', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Divan Edebiyatı', counts: { '2019': 3, '2020': 4, '2021': 6, '2022': 4, '2023': 4, '2024': 4, '2025': 3 } },
  { statKey: 'ayt-edebiyat-tanzimat-edebiyati', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Tanzimat Edebiyatı', counts: { '2019': 2, '2020': 1, '2021': 2, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-edebiyat-servetifunun-ve-fecriati-edebiyati', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Servetifünun ve Fecriati Edebiyatı', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-edebiyat-milli-edebiyat', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Milli Edebiyat', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-edebiyat-cumhuriyet-donemi-turk-edebiyati', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Cumhuriyet Dönemi Türk Edebiyatı', counts: { '2019': 5, '2020': 2, '2021': 3, '2022': 3, '2023': 3, '2024': 3, '2025': 2 } },
  { statKey: 'ayt-edebiyat-masal-fabl-destan-halk-hikayesi', section: 'AYT', subjectSlug: 'edebiyat', topic: 'Masal/Fabl/Destan/Halk Hikayesi', counts: { '2019': 2, '2020': 1, '2021': 1, '2022': 1, '2024': 1, '2025': 1 } },
  // ── AYT · tarih ──
  { statKey: 'ayt-tarih-tarih-ve-zaman', section: 'AYT', subjectSlug: 'tarih', topic: 'Tarih ve Zaman', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-tarih-insanligin-ilk-donemleri', section: 'AYT', subjectSlug: 'tarih', topic: 'İnsanlığın İlk Dönemleri', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-tarih-ilk-ve-orta-caglarda-turk-dunyasi', section: 'AYT', subjectSlug: 'tarih', topic: 'İlk ve Orta Çağlarda Türk Dünyası', counts: { '2019': 2, '2020': 2, '2021': 1, '2022': 2, '2023': 2, '2024': 2 } },
  { statKey: 'ayt-tarih-islam-medeniyetinin-dogusu', section: 'AYT', subjectSlug: 'tarih', topic: 'İslam Medeniyetinin Doğuşu', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-tarih-turklerin-islamiyet-i-kabulu-ve-ilk-turk-islam-d', section: 'AYT', subjectSlug: 'tarih', topic: 'Türklerin İslamiyet’i Kabulü ve İlk Türk İslam Dev', counts: { '2019': 1, '2020': 1, '2021': 3, '2022': 1, '2023': 1, '2024': 2 } },
  { statKey: 'ayt-tarih-yerlesme-ve-devletlesme-surecinde-selcuklu-turki', section: 'AYT', subjectSlug: 'tarih', topic: 'Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi', counts: { '2019': 1, '2022': 1, '2023': 1 } },
  { statKey: 'ayt-tarih-beylikten-devlete-osmanli', section: 'AYT', subjectSlug: 'tarih', topic: 'Beylikten Devlete Osmanlı', counts: { '2019': 1, '2020': 1, '2022': 3, '2024': 2 } },
  { statKey: 'ayt-tarih-devletlesme-surecinde-savascilar-ve-askerler', section: 'AYT', subjectSlug: 'tarih', topic: 'Devletleşme Sürecinde Savaşçılar ve Askerler', counts: { '2020': 1, '2022': 1 } },
  { statKey: 'ayt-tarih-dunya-gucu-osmanli', section: 'AYT', subjectSlug: 'tarih', topic: 'Dünya Gücü Osmanlı', counts: { '2019': 1, '2021': 1, '2023': 2 } },
  { statKey: 'ayt-tarih-sultan-ve-osmanli-merkez-teskilati', section: 'AYT', subjectSlug: 'tarih', topic: 'Sultan ve Osmanlı Merkez Teşkilatı', counts: { '2021': 1, '2022': 1 } },
  { statKey: 'ayt-tarih-degisen-dunya-dengeleri-karsisinda-osmanli-siyas', section: 'AYT', subjectSlug: 'tarih', topic: 'Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti', counts: { '2020': 1, '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'ayt-tarih-degisim-caginda-avrupa-ve-osmanli', section: 'AYT', subjectSlug: 'tarih', topic: 'Değişim Çağında Avrupa ve Osmanlı', counts: { '2019': 2, '2020': 2, '2021': 1, '2023': 1 } },
  { statKey: 'ayt-tarih-uluslararasi-iliskilerde-denge-stratejisi-1774-1', section: 'AYT', subjectSlug: 'tarih', topic: 'Uluslararası İlişkilerde Denge Stratejisi (1774 1912)', counts: { '2021': 1, '2023': 1, '2024': 2, '2025': 1 } },
  { statKey: 'ayt-tarih-devrimler-caginda-degisen-devlet-toplum-iliskile', section: 'AYT', subjectSlug: 'tarih', topic: 'Devrimler Çağında Değişen Devlet- Toplum İlişkileri', counts: { '2021': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-tarih-sermaye-ve-emek', section: 'AYT', subjectSlug: 'tarih', topic: 'Sermaye ve Emek', counts: { '2019': 1, '2020': 1 } },
  { statKey: 'ayt-tarih-xx-yuzyil-baslarinda-osmanli-devleti-ve-dunya', section: 'AYT', subjectSlug: 'tarih', topic: 'XX. Yüzyıl Başlarında Osmanlı Devleti ve Dünya', counts: { '2019': 4, '2020': 2, '2021': 1, '2023': 2, '2024': 3, '2025': 1 } },
  { statKey: 'ayt-tarih-milli-mucadele', section: 'AYT', subjectSlug: 'tarih', topic: 'Milli Mücadele', counts: { '2019': 2, '2020': 4, '2021': 4, '2022': 5, '2023': 6, '2024': 3, '2025': 2 } },
  { statKey: 'ayt-tarih-ataturkculuk-ve-turk-inkilabi', section: 'AYT', subjectSlug: 'tarih', topic: 'Atatürkçülük ve Türk İnkılabı', counts: { '2019': 2, '2020': 2, '2021': 3, '2022': 1, '2024': 2 } },
  { statKey: 'ayt-tarih-iki-savas-arasindaki-donemde-turkiye-ve-dunya', section: 'AYT', subjectSlug: 'tarih', topic: 'İki Savaş Arasındaki Dönemde Türkiye ve Dünya', counts: { '2025': 1 } },
  { statKey: 'ayt-tarih-ii-dunya-savasi-surecinde-sonrasinda-turkiye-ve-', section: 'AYT', subjectSlug: 'tarih', topic: 'II. Dünya Savaşı Sürecinde- Sonrasında Türkiye ve Dünya', counts: { '2022': 2, '2024': 1 } },
  // ── AYT · cografya ──
  { statKey: 'ayt-cografya-ekosistemlerin-ozellikleri-ve-isleyisi', section: 'AYT', subjectSlug: 'cografya', topic: 'Ekosistemlerin Özellikleri ve İşleyişi', counts: { '2019': 1, '2020': 1, '2021': 2, '2022': 1, '2023': 2, '2024': 1, '2025': 2 } },
  { statKey: 'ayt-cografya-ekstrem-doga-olaylari', section: 'AYT', subjectSlug: 'cografya', topic: 'Ekstrem Doğa Olayları', counts: { '2019': 2, '2020': 2, '2021': 1, '2022': 2, '2023': 1 } },
  { statKey: 'ayt-cografya-kuresel-iklim-degisikligi-ve-doga-olaylarinin-ge', section: 'AYT', subjectSlug: 'cografya', topic: 'Küresel İklim Değişikliği ve Doğa Olaylarının Geleceği', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-nufus-politikalari-ve-projeksiyonlari', section: 'AYT', subjectSlug: 'cografya', topic: 'Nüfus Politikaları ve Projeksiyonları', counts: { '2020': 2, '2023': 1, '2024': 2 } },
  { statKey: 'ayt-cografya-sehirler-ve-kirsal-yerlesmeler', section: 'AYT', subjectSlug: 'cografya', topic: 'Şehirler ve Kırsal Yerleşmeler', counts: { '2019': 1, '2020': 1, '2021': 2, '2022': 1, '2023': 1, '2024': 1, '2025': 2 } },
  { statKey: 'ayt-cografya-dunyada-dogal-kaynak-ve-ekonomi', section: 'AYT', subjectSlug: 'cografya', topic: 'Dünyada Doğal Kaynak ve Ekonomi', counts: { '2019': 1, '2020': 1, '2021': 1, '2023': 3 } },
  { statKey: 'ayt-cografya-turkiye-de-tarim-sanayi-maden-ve-enerji-kaynakla', section: 'AYT', subjectSlug: 'cografya', topic: 'Türkiye’de Tarım, Sanayi, Maden ve Enerji Kaynakları', counts: { '2019': 1, '2020': 3, '2022': 2, '2023': 2, '2025': 2 } },
  { statKey: 'ayt-cografya-ekonomi-sehirlesme-ve-goc', section: 'AYT', subjectSlug: 'cografya', topic: 'Ekonomi, Şehirleşme ve Göç', counts: { '2019': 2, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-islevsel-bolge-ve-kalkinma-projeleri', section: 'AYT', subjectSlug: 'cografya', topic: 'İşlevsel Bölge ve Kalkınma Projeleri', counts: { '2019': 1, '2021': 1, '2022': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-hizmet-sektorunun-ekonomideki-yeri-ve-ulasim', section: 'AYT', subjectSlug: 'cografya', topic: 'Hizmet Sektörünün Ekonomideki Yeri ve Ulaşım', counts: { '2021': 1, '2022': 1 } },
  { statKey: 'ayt-cografya-turkiye-de-ve-dunyada-ticaret', section: 'AYT', subjectSlug: 'cografya', topic: 'Türkiye’de ve Dünyada Ticaret', counts: { '2019': 1 } },
  { statKey: 'ayt-cografya-turkiye-de-turizm', section: 'AYT', subjectSlug: 'cografya', topic: 'Türkiye’de Turizm', counts: { '2019': 1, '2020': 1, '2022': 1, '2023': 1, '2024': 2, '2025': 2 } },
  { statKey: 'ayt-cografya-kultur-bolgeleri-ve-turk-kulturu', section: 'AYT', subjectSlug: 'cografya', topic: 'Kültür Bölgeleri ve Türk Kültürü', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 2, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-kuresellesen-dunya', section: 'AYT', subjectSlug: 'cografya', topic: 'Küreselleşen Dünya', counts: { '2019': 1, '2020': 1, '2021': 2, '2022': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-uluslararasi-orgutler', section: 'AYT', subjectSlug: 'cografya', topic: 'Uluslararası Örgütler', counts: { '2019': 1, '2020': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-ulkeler-arasi-etkilesim', section: 'AYT', subjectSlug: 'cografya', topic: 'Ülkeler Arası Etkileşim', counts: { '2019': 1, '2021': 1, '2022': 1, '2024': 1 } },
  { statKey: 'ayt-cografya-jeopolitik-konum', section: 'AYT', subjectSlug: 'cografya', topic: 'Jeopolitik Konum', counts: { '2021': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-cevre-sorunlari-ve-geri-donusum', section: 'AYT', subjectSlug: 'cografya', topic: 'Çevre Sorunları ve Geri Dönüşüm', counts: { '2019': 2, '2020': 2, '2021': 2, '2022': 3, '2023': 3, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-cografya-cevre-sorunlarinin-cozumune-yonelik-yaklasimlar', section: 'AYT', subjectSlug: 'cografya', topic: 'Çevre Sorunlarının Çözümüne Yönelik Yaklaşımlar', counts: { '2019': 2, '2024': 2, '2025': 1 } },
  // ── AYT · din ──
  { statKey: 'ayt-din-islamda-ibadet', section: 'AYT', subjectSlug: 'din', topic: 'İslamda İbadet', counts: { '2024': 1 } },
  { statKey: 'ayt-din-allah-insan-iliskisi', section: 'AYT', subjectSlug: 'din', topic: 'Allah, İnsan İlişkisi', counts: { '2021': 1, '2025': 1 } },
  { statKey: 'ayt-din-kuran-a-gore-hz-muhammed', section: 'AYT', subjectSlug: 'din', topic: 'Kuran’a Göre Hz. Muhammed', counts: { '2019': 1, '2020': 1, '2023': 1, '2024': 2, '2025': 1 } },
  { statKey: 'ayt-din-kuran-da-bazi-kavramlar', section: 'AYT', subjectSlug: 'din', topic: 'Kuran’da Bazı Kavramlar', counts: { '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-din-kuran-dan-mesajlar', section: 'AYT', subjectSlug: 'din', topic: 'Kuran’dan Mesajlar', counts: { '2019': 1, '2020': 1 } },
  { statKey: 'ayt-din-inancla-ilgili-meseleler', section: 'AYT', subjectSlug: 'din', topic: 'İnançla İlgili Meseleler', counts: { '2020': 1, '2021': 1, '2022': 1, '2024': 1 } },
  { statKey: 'ayt-din-islam-ve-bilim', section: 'AYT', subjectSlug: 'din', topic: 'İslam ve Bilim', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 3, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-din-anadolu-da-islam', section: 'AYT', subjectSlug: 'din', topic: 'Anadolu’da İslam', counts: { '2021': 1, '2023': 2 } },
  { statKey: 'ayt-din-islam-dusuncesinde-tasavvufi-yorumlar-ve-mezhepl', section: 'AYT', subjectSlug: 'din', topic: 'İslam Düşüncesinde Tasavvufi Yorumlar ve Mezhepler', counts: { '2019': 2, '2021': 1, '2024': 1, '2025': 2 } },
  { statKey: 'ayt-din-guncel-dini-meseleler', section: 'AYT', subjectSlug: 'din', topic: 'Güncel Dini Meseleler', counts: { '2023': 1 } },
  { statKey: 'ayt-din-yasayan-dinler', section: 'AYT', subjectSlug: 'din', topic: 'Yaşayan Dinler', counts: { '2019': 1, '2022': 1 } },
  // ── AYT · felsefe ──
  { statKey: 'ayt-felsefe-bilgi-felsefesi', section: 'AYT', subjectSlug: 'felsefe', topic: 'Bilgi Felsefesi', counts: { '2019': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-varlik-felsefesi', section: 'AYT', subjectSlug: 'felsefe', topic: 'Varlık Felsefesi', counts: { '2019': 1, '2020': 2, '2025': 2 } },
  { statKey: 'ayt-felsefe-ahlak-felsefesi', section: 'AYT', subjectSlug: 'felsefe', topic: 'Ahlak Felsefesi', counts: { '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'ayt-felsefe-sanat-felsefesi', section: 'AYT', subjectSlug: 'felsefe', topic: 'Sanat Felsefesi', counts: { '2024': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-din-felsefesi', section: 'AYT', subjectSlug: 'felsefe', topic: 'Din Felsefesi', counts: { '2020': 1, '2024': 1 } },
  { statKey: 'ayt-felsefe-20-yuzyil-felsefesi', section: 'AYT', subjectSlug: 'felsefe', topic: '20. Yüzyıl Felsefesi', counts: { '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'ayt-felsefe-mantiga-giris', section: 'AYT', subjectSlug: 'felsefe', topic: 'Mantığa Giriş', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-klasik-mantik', section: 'AYT', subjectSlug: 'felsefe', topic: 'Klasik Mantık', counts: { '2019': 2, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 2 } },
  { statKey: 'ayt-felsefe-mantik-ve-dil', section: 'AYT', subjectSlug: 'felsefe', topic: 'Mantık ve Dil', counts: { '2021': 1, '2022': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-psikoloji-bilimini-taniyalim', section: 'AYT', subjectSlug: 'felsefe', topic: 'Psikoloji Bilimini Tanıyalım', counts: { '2019': 1, '2020': 3, '2024': 1 } },
  { statKey: 'ayt-felsefe-psikolojinin-temel-surecleri', section: 'AYT', subjectSlug: 'felsefe', topic: 'Psikolojinin Temel Süreçleri', counts: { '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2025': 2 } },
  { statKey: 'ayt-felsefe-ogrenme-bellek-dusunme', section: 'AYT', subjectSlug: 'felsefe', topic: 'Öğrenme Bellek Düşünme', counts: { '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-ruh-sagliginin-temelleri', section: 'AYT', subjectSlug: 'felsefe', topic: 'Ruh Sağlığının Temelleri', counts: { '2021': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-felsefe-sosyolojiye-giris', section: 'AYT', subjectSlug: 'felsefe', topic: 'Sosyolojiye Giriş', counts: { '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-birey-ve-toplum', section: 'AYT', subjectSlug: 'felsefe', topic: 'Birey ve Toplum', counts: { '2019': 1, '2020': 2, '2025': 1 } },
  { statKey: 'ayt-felsefe-toplumsal-yapi', section: 'AYT', subjectSlug: 'felsefe', topic: 'Toplumsal Yapı', counts: { '2020': 1, '2024': 1 } },
  { statKey: 'ayt-felsefe-toplumsal-degisme-ve-gelisme', section: 'AYT', subjectSlug: 'felsefe', topic: 'Toplumsal Değişme ve Gelişme', counts: { '2021': 1, '2022': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-felsefe-toplum-ve-kultur', section: 'AYT', subjectSlug: 'felsefe', topic: 'Toplum ve Kültür', counts: { '2019': 1, '2024': 1 } },
  { statKey: 'ayt-felsefe-toplumsal-kurumlar', section: 'AYT', subjectSlug: 'felsefe', topic: 'Toplumsal Kurumlar', counts: { '2021': 1, '2022': 1, '2023': 1 } },
  // ── AYT · matematik ──
  { statKey: 'ayt-matematik-temel-kavramlar', section: 'AYT', subjectSlug: 'matematik', topic: 'Temel Kavramlar', counts: { '2018': 4, '2019': 2, '2020': 2, '2021': 3, '2022': 2, '2023': 4, '2024': 2, '2025': 1 } },
  { statKey: 'ayt-matematik-sayi-basamaklari', section: 'AYT', subjectSlug: 'matematik', topic: 'Sayı Basamakları', counts: { '2020': 3, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-uslu-sayilar', section: 'AYT', subjectSlug: 'matematik', topic: 'Üslü Sayılar', counts: { '2020': 1, '2021': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-bolme-ve-bolunebilme', section: 'AYT', subjectSlug: 'matematik', topic: 'Bölme ve Bölünebilme', counts: { '2019': 1, '2023': 1 } },
  { statKey: 'ayt-matematik-fonksiyonlar', section: 'AYT', subjectSlug: 'matematik', topic: 'Fonksiyonlar', counts: { '2018': 3, '2019': 2, '2020': 2, '2021': 2, '2022': 2, '2023': 2, '2024': 2, '2025': 2 } },
  { statKey: 'ayt-matematik-2-dereceden-denklemler', section: 'AYT', subjectSlug: 'matematik', topic: '2. Dereceden Denklemler', counts: { '2020': 1, '2021': 1, '2022': 2, '2023': 2, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-mantik', section: 'AYT', subjectSlug: 'matematik', topic: 'Mantık', counts: { '2018': 2, '2019': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-parabol', section: 'AYT', subjectSlug: 'matematik', topic: 'Parabol', counts: { '2019': 1, '2020': 1, '2021': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-matematik-trigonometri', section: 'AYT', subjectSlug: 'matematik', topic: 'Trigonometri', counts: { '2018': 3, '2019': 3, '2020': 4, '2021': 5, '2022': 4, '2023': 5, '2024': 5, '2025': 5 } },
  { statKey: 'ayt-matematik-karmasik-sayilar', section: 'AYT', subjectSlug: 'matematik', topic: 'Karmaşık Sayılar', counts: { '2018': 1, '2019': 1, '2020': 2 } },
  { statKey: 'ayt-matematik-polinomlar', section: 'AYT', subjectSlug: 'matematik', topic: 'Polinomlar', counts: { '2018': 2, '2019': 2, '2020': 2, '2021': 1, '2022': 1, '2023': 2, '2025': 1 } },
  { statKey: 'ayt-matematik-logaritma', section: 'AYT', subjectSlug: 'matematik', topic: 'Logaritma', counts: { '2018': 2, '2019': 3, '2020': 3, '2021': 1, '2022': 2, '2023': 3, '2024': 1, '2025': 2 } },
  { statKey: 'ayt-matematik-diziler', section: 'AYT', subjectSlug: 'matematik', topic: 'Diziler', counts: { '2018': 1, '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 2, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-permutasyon-kombinasyon-olasilik-binom', section: 'AYT', subjectSlug: 'matematik', topic: 'Permütasyon- Kombinasyon- Olasılık Binom', counts: { '2018': 2, '2019': 2, '2020': 3, '2021': 2, '2022': 3, '2023': 3, '2024': 3, '2025': 3 } },
  { statKey: 'ayt-matematik-limit', section: 'AYT', subjectSlug: 'matematik', topic: 'Limit', counts: { '2018': 1, '2019': 2, '2021': 2, '2022': 2, '2024': 2, '2025': 2 } },
  { statKey: 'ayt-matematik-turev', section: 'AYT', subjectSlug: 'matematik', topic: 'Türev', counts: { '2018': 1, '2019': 4, '2021': 3, '2022': 4, '2024': 3, '2025': 3 } },
  { statKey: 'ayt-matematik-integral', section: 'AYT', subjectSlug: 'matematik', topic: 'İntegral', counts: { '2018': 3, '2019': 4, '2021': 4, '2022': 4, '2024': 5, '2025': 3 } },
  { statKey: 'ayt-matematik-koklu-sayilar', section: 'AYT', subjectSlug: 'matematik', topic: 'Köklü Sayılar', counts: { '2018': 1 } },
  { statKey: 'ayt-matematik-kumeler-ve-kartezyen-carpim', section: 'AYT', subjectSlug: 'matematik', topic: 'Kümeler ve Kartezyen Çarpım', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-basit-esitsizlikler', section: 'AYT', subjectSlug: 'matematik', topic: 'Basit Eşitsizlikler', counts: { '2019': 1, '2020': 1, '2021': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-mutlak-deger', section: 'AYT', subjectSlug: 'matematik', topic: 'Mutlak Değer', counts: { '2019': 1, '2020': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-ebob-ekok', section: 'AYT', subjectSlug: 'matematik', topic: 'EBOB-EKOK', counts: { '2021': 1, '2022': 1, '2025': 1 } },
  { statKey: 'ayt-matematik-carpanlara-ayirma', section: 'AYT', subjectSlug: 'matematik', topic: 'Çarpanlara Ayırma', counts: { '2022': 1, '2024': 1 } },
  // ── AYT · geometri ──
  { statKey: 'ayt-geometri-dogruda-ve-ucgende-aci', section: 'AYT', subjectSlug: 'geometri', topic: 'Doğruda ve Üçgende Açı', counts: { '2018': 1, '2020': 1, '2022': 1, '2023': 2, '2024': 1 } },
  { statKey: 'ayt-geometri-ozel-ucgenler', section: 'AYT', subjectSlug: 'geometri', topic: 'Özel Üçgenler', counts: { '2018': 2, '2020': 2 } },
  { statKey: 'ayt-geometri-aci-kenar-baglantilari', section: 'AYT', subjectSlug: 'geometri', topic: 'Açı Kenar Bağlantıları', counts: { '2019': 1 } },
  { statKey: 'ayt-geometri-ucgende-alan-ve-benzerlik', section: 'AYT', subjectSlug: 'geometri', topic: 'Üçgende Alan ve Benzerlik', counts: { '2023': 1, '2025': 1 } },
  { statKey: 'ayt-geometri-cokgenler', section: 'AYT', subjectSlug: 'geometri', topic: 'Çokgenler', counts: { '2018': 1, '2019': 2, '2020': 1 } },
  { statKey: 'ayt-geometri-noktanin-analitigi', section: 'AYT', subjectSlug: 'geometri', topic: 'Noktanın Analitiği', counts: { '2020': 1, '2021': 2, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-geometri-dogrunun-analitigi', section: 'AYT', subjectSlug: 'geometri', topic: 'Doğrunun Analitiği', counts: { '2018': 2, '2019': 1, '2020': 1, '2021': 2, '2022': 1, '2024': 3, '2025': 2 } },
  { statKey: 'ayt-geometri-donusum-geometrisi', section: 'AYT', subjectSlug: 'geometri', topic: 'Dönüşüm Geometrisi', counts: { '2018': 1, '2019': 1, '2020': 1, '2022': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-geometri-cember-ve-daire', section: 'AYT', subjectSlug: 'geometri', topic: 'Çember ve Daire', counts: { '2018': 1, '2019': 2, '2020': 2, '2021': 3, '2022': 2, '2023': 2, '2024': 2, '2025': 2 } },
  { statKey: 'ayt-geometri-ozel-dortgenler', section: 'AYT', subjectSlug: 'geometri', topic: 'Özel Dörtgenler', counts: { '2018': 1, '2023': 1 } },
  { statKey: 'ayt-geometri-kati-cisimler', section: 'AYT', subjectSlug: 'geometri', topic: 'Katı Cisimler', counts: { '2018': 1, '2019': 1, '2020': 1, '2021': 1, '2022': 2, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-geometri-cemberin-analitigi', section: 'AYT', subjectSlug: 'geometri', topic: 'Çemberin Analitiği', counts: { '2018': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  // ── AYT · fizik ──
  { statKey: 'ayt-fizik-vektorler', section: 'AYT', subjectSlug: 'fizik', topic: 'Vektörler', counts: { '2023': 1 } },
  { statKey: 'ayt-fizik-bagil-hareket', section: 'AYT', subjectSlug: 'fizik', topic: 'Bağıl Hareket', counts: { '2019': 1, '2020': 1, '2024': 1 } },
  { statKey: 'ayt-fizik-newton-un-hareket-yasalari', section: 'AYT', subjectSlug: 'fizik', topic: 'Newton’un Hareket Yasaları', counts: { '2020': 2, '2022': 2, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-bir-boyutta-sabit-ivmeli-hareket', section: 'AYT', subjectSlug: 'fizik', topic: 'Bir Boyutta Sabit İvmeli Hareket', counts: { '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-iki-boyutta-hareket', section: 'AYT', subjectSlug: 'fizik', topic: 'İki Boyutta Hareket', counts: { '2019': 1, '2020': 1, '2021': 2, '2025': 1 } },
  { statKey: 'ayt-fizik-enerji-ve-hareket', section: 'AYT', subjectSlug: 'fizik', topic: 'Enerji ve Hareket', counts: { '2020': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-itme-ve-cizgisel-momentum', section: 'AYT', subjectSlug: 'fizik', topic: 'İtme ve Çizgisel Momentum', counts: { '2019': 1, '2020': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-fizik-tork', section: 'AYT', subjectSlug: 'fizik', topic: 'Tork', counts: { '2023': 1 } },
  { statKey: 'ayt-fizik-denge-ve-denge-sartlari', section: 'AYT', subjectSlug: 'fizik', topic: 'Denge ve Denge Şartları', counts: { '2019': 1, '2021': 1 } },
  { statKey: 'ayt-fizik-basit-makineler', section: 'AYT', subjectSlug: 'fizik', topic: 'Basit Makineler', counts: { '2022': 1, '2024': 1 } },
  { statKey: 'ayt-fizik-elektriksel-kuvvet-ve-elektrik-alan', section: 'AYT', subjectSlug: 'fizik', topic: 'Elektriksel Kuvvet ve Elektrik Alan', counts: { '2021': 1 } },
  { statKey: 'ayt-fizik-elektriksel-potansiyel', section: 'AYT', subjectSlug: 'fizik', topic: 'Elektriksel Potansiyel', counts: { '2019': 1, '2021': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-duzgun-elektrik-alan-ve-siga', section: 'AYT', subjectSlug: 'fizik', topic: 'Düzgün Elektrik Alan ve Sığa', counts: { '2020': 1, '2023': 1 } },
  { statKey: 'ayt-fizik-manyetizma-ve-elektromanyetik-induklenme', section: 'AYT', subjectSlug: 'fizik', topic: 'Manyetizma ve Elektromanyetik İndüklenme', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-alternatif-akim', section: 'AYT', subjectSlug: 'fizik', topic: 'Alternatif Akım', counts: { '2019': 1, '2020': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-transformatorler', section: 'AYT', subjectSlug: 'fizik', topic: 'Transformatörler', counts: { '2021': 1, '2022': 1, '2023': 1 } },
  { statKey: 'ayt-fizik-duzgun-cembersel-hareket', section: 'AYT', subjectSlug: 'fizik', topic: 'Düzgün Çembersel Hareket', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-donerek-oteleme-hareketi', section: 'AYT', subjectSlug: 'fizik', topic: 'Dönerek Öteleme Hareketi', counts: { '2020': 1, '2023': 1 } },
  { statKey: 'ayt-fizik-acisal-momentum', section: 'AYT', subjectSlug: 'fizik', topic: 'Açısal Momentum', counts: { '2019': 1 } },
  { statKey: 'ayt-fizik-kutle-cekim-kuvveti', section: 'AYT', subjectSlug: 'fizik', topic: 'Kütle Çekim Kuvveti', counts: { '2021': 1, '2024': 1 } },
  { statKey: 'ayt-fizik-kepler-kanunlari', section: 'AYT', subjectSlug: 'fizik', topic: 'Kepler Kanunları', counts: { '2022': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-basit-harmonik-hareket', section: 'AYT', subjectSlug: 'fizik', topic: 'Basit Harmonik Hareket', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-dalgalarda-kirinim-girisim-ve-doppler', section: 'AYT', subjectSlug: 'fizik', topic: 'Dalgalarda Kırınım, Girişim ve Doppler', counts: { '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-elektromanyetik-dalgalar', section: 'AYT', subjectSlug: 'fizik', topic: 'Elektromanyetik Dalgalar', counts: { '2019': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-buyuk-patlama-ve-evrenin-olusumu', section: 'AYT', subjectSlug: 'fizik', topic: 'Büyük Patlama ve Evrenin Oluşumu', counts: { '2022': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-radyoaktivite', section: 'AYT', subjectSlug: 'fizik', topic: 'Radyoaktivite', counts: { '2019': 1, '2021': 1, '2024': 1 } },
  { statKey: 'ayt-fizik-ozel-gorelilik', section: 'AYT', subjectSlug: 'fizik', topic: 'Özel Görelilik', counts: { '2022': 1 } },
  { statKey: 'ayt-fizik-fotoelektrik-olayi', section: 'AYT', subjectSlug: 'fizik', topic: 'Fotoelektrik Olayı', counts: { '2019': 1, '2021': 1, '2024': 1 } },
  { statKey: 'ayt-fizik-compton-sacilmasi-ve-de-broglie', section: 'AYT', subjectSlug: 'fizik', topic: 'Compton Saçılması ve De Broglie', counts: { '2022': 1 } },
  { statKey: 'ayt-fizik-goruntuleme-teknolojileri', section: 'AYT', subjectSlug: 'fizik', topic: 'Görüntüleme Teknolojileri', counts: { '2019': 1, '2022': 1, '2025': 1 } },
  { statKey: 'ayt-fizik-super-iletkenler', section: 'AYT', subjectSlug: 'fizik', topic: 'Süper İletkenler', counts: { '2024': 1 } },
  { statKey: 'ayt-fizik-lazer-isinlari', section: 'AYT', subjectSlug: 'fizik', topic: 'Lazer Işınları', counts: { '2021': 1 } },
  // ── AYT · kimya ──
  { statKey: 'ayt-kimya-atomun-kuantum-modeli', section: 'AYT', subjectSlug: 'kimya', topic: 'Atomun Kuantum Modeli', counts: { '2019': 1, '2020': 2, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-yukseltgenme-basamaklari', section: 'AYT', subjectSlug: 'kimya', topic: 'Yükseltgenme Basamakları', counts: { '2021': 1 } },
  { statKey: 'ayt-kimya-gazlarin-ozellikleri-ve-gaz-yasalari', section: 'AYT', subjectSlug: 'kimya', topic: 'Gazların Özellikleri ve Gaz Yasaları', counts: { '2022': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-ideal-gaz-yasasi', section: 'AYT', subjectSlug: 'kimya', topic: 'İdeal Gaz Yasası', counts: { '2022': 1, '2023': 1 } },
  { statKey: 'ayt-kimya-gazlarda-kinetik-teori', section: 'AYT', subjectSlug: 'kimya', topic: 'Gazlarda Kinetik Teori', counts: { '2019': 1, '2020': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-kimya-gaz-karisimlari', section: 'AYT', subjectSlug: 'kimya', topic: 'Gaz Karışımları', counts: { '2019': 1, '2020': 1 } },
  { statKey: 'ayt-kimya-derisim-birimleri', section: 'AYT', subjectSlug: 'kimya', topic: 'Derişim Birimleri', counts: { '2020': 1, '2021': 1, '2022': 1, '2023': 2, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-koligatif-ozellikler', section: 'AYT', subjectSlug: 'kimya', topic: 'Koligatif Özellikler', counts: { '2019': 1, '2020': 1, '2022': 1, '2024': 1 } },
  { statKey: 'ayt-kimya-cozunurluk', section: 'AYT', subjectSlug: 'kimya', topic: 'Çözünürlük', counts: { '2021': 1 } },
  { statKey: 'ayt-kimya-tepkimelerde-isi-degisimi', section: 'AYT', subjectSlug: 'kimya', topic: 'Tepkimelerde Isı Değişimi', counts: { '2023': 1 } },
  { statKey: 'ayt-kimya-olusum-entalpisi', section: 'AYT', subjectSlug: 'kimya', topic: 'Oluşum Entalpisi', counts: { '2019': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-tepkime-isilarinin-toplanabilirligi', section: 'AYT', subjectSlug: 'kimya', topic: 'Tepkime Isılarının Toplanabilirliği', counts: { '2020': 1, '2021': 1, '2022': 1, '2024': 1 } },
  { statKey: 'ayt-kimya-tepkime-hizlari', section: 'AYT', subjectSlug: 'kimya', topic: 'Tepkime Hızları', counts: { '2019': 1, '2020': 1, '2022': 1, '2024': 1 } },
  { statKey: 'ayt-kimya-tepkime-hizini-etkileyen-faktorler', section: 'AYT', subjectSlug: 'kimya', topic: 'Tepkime Hızını Etkileyen Faktörler', counts: { '2019': 1, '2021': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-kimyasal-denge', section: 'AYT', subjectSlug: 'kimya', topic: 'Kimyasal Denge', counts: { '2022': 1, '2024': 1 } },
  { statKey: 'ayt-kimya-dengeyi-etkileyen-faktorler', section: 'AYT', subjectSlug: 'kimya', topic: 'Dengeyi Etkileyen Faktörler', counts: { '2021': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-sulu-cozelti-dengeleri', section: 'AYT', subjectSlug: 'kimya', topic: 'Sulu Çözelti Dengeleri', counts: { '2019': 2, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-indirgenme-yukseltgenme-tepkimelerinde-elektrik-', section: 'AYT', subjectSlug: 'kimya', topic: 'İndirgenme - Yükseltgenme Tepkimelerinde Elektrik Akımı', counts: { '2021': 1 } },
  { statKey: 'ayt-kimya-elektrotlar-ve-elektrokimyasal-hucreler', section: 'AYT', subjectSlug: 'kimya', topic: 'Elektrotlar ve Elektrokimyasal Hücreler', counts: { '2020': 1, '2021': 1, '2022': 1 } },
  { statKey: 'ayt-kimya-elektrot-potansiyelleri', section: 'AYT', subjectSlug: 'kimya', topic: 'Elektrot Potansiyelleri', counts: { '2019': 1, '2020': 1, '2022': 1, '2023': 2, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-elektroliz', section: 'AYT', subjectSlug: 'kimya', topic: 'Elektroliz', counts: { '2019': 1, '2021': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-korozyon', section: 'AYT', subjectSlug: 'kimya', topic: 'Korozyon', counts: { '2020': 1 } },
  { statKey: 'ayt-kimya-basit-formul-ve-molekul-formulu', section: 'AYT', subjectSlug: 'kimya', topic: 'Basit Formül ve Molekül Formülü', counts: { '2022': 1 } },
  { statKey: 'ayt-kimya-dogada-karbon', section: 'AYT', subjectSlug: 'kimya', topic: 'Doğada Karbon', counts: { '2019': 1, '2023': 1 } },
  { statKey: 'ayt-kimya-hibritlesme-molekul-geometrisi', section: 'AYT', subjectSlug: 'kimya', topic: 'Hibritleşme - Molekül Geometrisi', counts: { '2020': 1, '2021': 1, '2024': 1, '2025': 2 } },
  { statKey: 'ayt-kimya-hidrokarbonlar', section: 'AYT', subjectSlug: 'kimya', topic: 'Hidrokarbonlar', counts: { '2019': 1, '2020': 2, '2021': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-fonksiyonel-gruplar', section: 'AYT', subjectSlug: 'kimya', topic: 'Fonksiyonel Gruplar', counts: { '2019': 1 } },
  { statKey: 'ayt-kimya-alkoller-eterler', section: 'AYT', subjectSlug: 'kimya', topic: 'Alkoller - Eterler', counts: { '2021': 1, '2025': 1 } },
  { statKey: 'ayt-kimya-karbonil-bilesikleri', section: 'AYT', subjectSlug: 'kimya', topic: 'Karbonil Bileşikleri', counts: { '2023': 1 } },
  { statKey: 'ayt-kimya-karboksilik-asitler', section: 'AYT', subjectSlug: 'kimya', topic: 'Karboksilik Asitler', counts: { '2024': 4 } },
  { statKey: 'ayt-kimya-esterler', section: 'AYT', subjectSlug: 'kimya', topic: 'Esterler', counts: { '2022': 1 } },
  // ── AYT · biyoloji ──
  { statKey: 'ayt-biyoloji-denetleyici-ve-duzenleyici-sistem-duyu-organlari', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Denetleyici ve Düzenleyici Sistem, Duyu Organları', counts: { '2019': 1, '2020': 2, '2021': 1, '2022': 1, '2023': 3, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-destek-ve-hareket-sistemi', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Destek ve Hareket Sistemi', counts: { '2021': 1, '2022': 1 } },
  { statKey: 'ayt-biyoloji-sindirim-sistemi', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Sindirim Sistemi', counts: { '2019': 1, '2020': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-dolasim-sistemi', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Dolaşım Sistemi', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-solunum-sistemi', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Solunum Sistemi', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-biyoloji-uriner-sistem', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Üriner Sistem', counts: { '2019': 1, '2020': 1, '2023': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-ureme-sistemi-ve-embriyonik-gelisim', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Üreme Sistemi ve Embriyonik Gelişim', counts: { '2022': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-komunite-ve-populasyon-ekolojisi', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Komünite ve Popülasyon Ekolojisi', counts: { '2020': 2, '2021': 2, '2022': 2, '2023': 2, '2024': 2, '2025': 1 } },
  { statKey: 'ayt-biyoloji-genden-proteine', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Genden Proteine', counts: { '2019': 2, '2020': 3, '2021': 2, '2022': 2, '2023': 1, '2024': 2, '2025': 2 } },
  { statKey: 'ayt-biyoloji-canlilik-ve-enerji', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Canlılık ve Enerji', counts: { '2022': 1, '2023': 1, '2024': 1 } },
  { statKey: 'ayt-biyoloji-fotosentez-ve-kemosentez', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Fotosentez ve Kemosentez', counts: { '2019': 1, '2020': 1, '2021': 1, '2022': 1, '2024': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-hucresel-solunum', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Hücresel Solunum', counts: { '2019': 1, '2020': 1, '2021': 1, '2023': 1, '2025': 1 } },
  { statKey: 'ayt-biyoloji-bitki-biyolojisi', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Bitki Biyolojisi', counts: { '2019': 3, '2021': 2, '2022': 2, '2024': 2, '2025': 2 } },
  { statKey: 'ayt-biyoloji-canlilar-ve-cevre', section: 'AYT', subjectSlug: 'biyoloji', topic: 'Canlılar ve Çevre', counts: { '2019': 1, '2021': 1, '2023': 1, '2025': 1 } },
];

const STAT_BY_KEY = new Map<string, TopicYearStat>(
  EXAM_TOPIC_STATS.map((s) => [s.statKey, s]),
);

export interface TopicStatSummary {
  statKey: string;
  /** Kaynak tablodaki konu adı. */
  topic: string;
  section: ExamSection;
  years: number[];
  /** STAT_YEARS[section] ile aynı sırada; olmayan yıl için 0. */
  sparkline: number[];
  total: number;
  /** Kapsanan yıl sayısına bölünmüş ortalama. */
  avgPerYear: number;
  /** Son 3 sınav yılının ortalaması. */
  recentAvg: number;
  lastAskedYear: number | null;
  /** Kaç farklı yılda en az 1 soru çıktığı. */
  askedYearCount: number;
  trend: 'artıyor' | 'sabit' | 'azalıyor';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function getTopicStat(statKey?: string | null): TopicStatSummary | null {
  if (!statKey) return null;
  const stat = STAT_BY_KEY.get(statKey);
  if (!stat) return null;

  const years = STAT_YEARS[stat.section];
  const sparkline = years.map((y) => stat.counts[String(y)] || 0);
  const total = sparkline.reduce((a, b) => a + b, 0);
  const avgPerYear = round1(total / years.length);

  const recentYears = years.slice(-3);
  const recentTotal = recentYears.reduce(
    (a, y) => a + (stat.counts[String(y)] || 0),
    0,
  );
  const recentAvg = round1(recentTotal / recentYears.length);

  const askedYearCount = sparkline.filter((n) => n > 0).length;
  let lastAskedYear: number | null = null;
  for (let i = years.length - 1; i >= 0; i--) {
    if (sparkline[i] > 0) {
      lastAskedYear = years[i];
      break;
    }
  }

  const firstHalf = sparkline.slice(0, Math.floor(sparkline.length / 2));
  const secondHalf = sparkline.slice(Math.ceil(sparkline.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const avgSecond =
    secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
  let trend: TopicStatSummary['trend'] = 'sabit';
  if (avgSecond - avgFirst >= 0.75) trend = 'artıyor';
  else if (avgFirst - avgSecond >= 0.75) trend = 'azalıyor';

  return {
    statKey: stat.statKey,
    topic: stat.topic,
    section: stat.section,
    years,
    sparkline,
    total,
    avgPerYear,
    recentAvg,
    lastAskedYear,
    askedYearCount,
    trend,
  };
}

/**
 * Çıkmış soru frekansından konu ağırlığı türetir. Eşikler dersin toplam soru
 * sayısına göre normalize edilir: bir konu, dersin sorularının ~%12'sini veya
 * daha fazlasını oluşturuyorsa YÜKSEK, ~%4'ünü oluşturuyorsa ORTA.
 */
export function deriveWeight(
  avgPerYear: number,
  sectionSubjectKey: string,
): TopicWeight {
  const subjectSize = SECTION_SUBJECT_QUESTION_COUNT[sectionSubjectKey] || 20;
  const share = avgPerYear / subjectSize;
  if (share >= 0.1 || avgPerYear >= 2.2) return 'YÜKSEK';
  if (share >= 0.035 || avgPerYear >= 0.7) return 'ORTA';
  return 'DÜŞÜK';
}

/** Bir dersin en sık çıkan konularını (statKey listesi) döndürür. */
export function topTopicsForSubject(
  section: ExamSection,
  subjectSlug: string,
  limit = 5,
): { statKey: string; topic: string; avgPerYear: number }[] {
  return EXAM_TOPIC_STATS.filter(
    (s) => s.section === section && s.subjectSlug === subjectSlug,
  )
    .map((s) => {
      const summary = getTopicStat(s.statKey)!;
      return { statKey: s.statKey, topic: s.topic, avgPerYear: summary.avgPerYear };
    })
    .sort((a, b) => b.avgPerYear - a.avgPerYear)
    .slice(0, limit);
}
