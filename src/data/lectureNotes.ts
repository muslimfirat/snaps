/**
 * Defter Notları — ekip tarafından hazırlanan el yazısı ders notları manifesti.
 *
 * Görseller `public/lecture-notes/<ders>/<konu>-NN.webp` altında statik dosya
 * olarak durur (Vite bundle'a girmez). Ekip yeni not eklerken:
 *   1. Görselleri public/lecture-notes/<ders>/ altına koyar (bkz. o klasördeki README).
 *   2. Buraya ilgili { subjectId, topics:[{ topicId, pages:[...] }] } kaydını ekler.
 *
 * subjectId / topicId, src/data/curriculumData.ts içindeki Subject.id /
 * SubjectTopic.id ile birebir eşleşmelidir — böylece not ↔ konu ↔ çıkmış soru
 * ağırlığı bağlanır.
 */
import type { LectureNoteSubject, LectureNoteTopic } from '../types';

export const LECTURE_NOTES: LectureNoteSubject[] = [
  {
    subjectId: 'yks-tyt-matematik',
    label: 'TYT Temel Matematik',
    section: 'TYT',
    topics: [
      {
        topicId: 'tyt-matematik-problemler--4',
        title: 'Hareket – Hız Problemleri (örnek not)',
        pages: [
          { src: '/lecture-notes/_ornek/ornek-sayfa-01.svg', caption: 'Temel bağıntılar: yol = hız × zaman' },
          { src: '/lecture-notes/_ornek/ornek-sayfa-02.svg', caption: 'Karşılıklı / aynı yönde hareket kalıpları' },
        ],
      },
    ],
  },
  {
    subjectId: 'yks-tyt-turkce',
    label: 'TYT Türkçe',
    section: 'TYT',
    topics: [
      {
        topicId: 'tyt-turkce-paragraf',
        title: 'Paragrafta Anlam — Ana Düşünce (örnek not)',
        pages: [{ src: '/lecture-notes/_ornek/ornek-sayfa-01.svg', caption: 'Ana düşünce bulma adımları' }],
      },
    ],
  },
];

const BY_SUBJECT = new Map<string, LectureNoteSubject>(LECTURE_NOTES.map((s) => [s.subjectId, s]));
const BY_TOPIC = new Map<string, { subject: LectureNoteSubject; topic: LectureNoteTopic }>();
for (const s of LECTURE_NOTES) {
  for (const t of s.topics) BY_TOPIC.set(t.topicId, { subject: s, topic: t });
}

export function getLectureNotesForSubject(subjectId: string): LectureNoteSubject | undefined {
  return BY_SUBJECT.get(subjectId);
}

export function getLectureNoteTopic(topicId: string) {
  return BY_TOPIC.get(topicId);
}

export function hasLectureNotes(topicId: string): boolean {
  return BY_TOPIC.has(topicId);
}

export function lectureNoteCounts() {
  let topics = 0;
  let pages = 0;
  for (const s of LECTURE_NOTES) {
    topics += s.topics.length;
    for (const t of s.topics) pages += t.pages.length;
  }
  return { subjects: LECTURE_NOTES.length, topics, pages };
}
