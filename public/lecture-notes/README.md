# Defter Notları — küratörlü el yazısı ders notları

Bu klasördeki görseller uygulamada **Defter Notları** sekmesinde öğrenciye
gösterilir. Vite bunları paketlemez; tarayıcı doğrudan `/lecture-notes/...`
yolundan çeker.

## Yeni not ekleme

1. **Görselleri koy.** Ders başına bir klasör aç, dosyaları konu-slug + sıra
   numarası ile adlandır:

   ```
   public/lecture-notes/tyt-matematik/problemler-hareket-01.webp
   public/lecture-notes/tyt-matematik/problemler-hareket-02.webp
   public/lecture-notes/tyt-turkce/paragraf-ana-dusunce-01.webp
   ```

   - Biçim: **.webp** (tercih) veya .jpg/.png. Uzun kenar ~1600px, < 400 KB.
   - El yazısı taramaları düz, iyi ışıklı ve kırpılmış olsun.

2. **Manifeste ekle.** `src/data/lectureNotes.ts` içinde ilgili dersin
   `topics` dizisine kayıt gir:

   ```ts
   {
     topicId: 'tyt-matematik-problemler--4', // curriculumData'daki SubjectTopic.id
     title: 'Hareket – Hız Problemleri',
     pages: [
       { src: '/lecture-notes/tyt-matematik/problemler-hareket-01.webp' },
       { src: '/lecture-notes/tyt-matematik/problemler-hareket-02.webp', caption: 'Kovalama' },
     ],
   }
   ```

   `subjectId` = `curriculumData.ts`'deki `Subject.id` (ör. `yks-tyt-matematik`).
   `topicId` = o dersin `topics[].id` değeri. Yanlış id verilirse not, konuya
   bağlanmaz ama yine listelenir.

## Konu id'lerini bulma

`src/data/curriculumData.ts` → `INITIAL_YKS_SUBJECTS`. Çıkmış soru tablosundan
gelen konuların id'si `statKey` ile aynıdır (ör. `tyt-turkce-paragraf`).
Alt başlıklarda `--1`, `--2` … eki bulunur.

## `_ornek/`

Yer tutucu SVG'ler. Gerçek notlar eklendiğinde `lectureNotes.ts`'teki örnek
kayıtları silin.
