/**
 * Defter Notları — öğrencinin kendi eklediği not sayfaları için yerel depo.
 *
 * Görseller (Blob) ve not meta verisi IndexedDB'de tutulur; buluta ASLA
 * gönderilmez (yalnızca okuma/tekrar durumu localStorage + Firestore'a gider,
 * bkz. src/lib/storage.ts). Küratörlü ekip notları ise statik dosyalardır
 * (public/lecture-notes/…), bkz. src/data/lectureNotes.ts.
 */
import type { UserNote } from '../types';

const DB_NAME = 'snaps-notes';
const DB_VERSION = 1;
const STORE_IMAGES = 'images';
const STORE_NOTES = 'userNotes';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB bu ortamda kullanılamıyor'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES);
      if (!db.objectStoreNames.contains(STORE_NOTES)) db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function isNoteStoreAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// ── Görseller ──

export function putImage(id: string, blob: Blob): Promise<void> {
  return tx<IDBValidKey>(STORE_IMAGES, 'readwrite', (s) => s.put(blob, id)).then(() => undefined);
}

export function getImage(id: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>(STORE_IMAGES, 'readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
}

export function deleteImage(id: string): Promise<void> {
  return tx<undefined>(STORE_IMAGES, 'readwrite', (s) => s.delete(id) as IDBRequest<undefined>).then(() => undefined);
}

// ── Öğrenci notları ──

export function putUserNote(note: UserNote): Promise<void> {
  return tx<IDBValidKey>(STORE_NOTES, 'readwrite', (s) => s.put(note)).then(() => undefined);
}

export function getUserNotes(): Promise<UserNote[]> {
  return tx<UserNote[]>(STORE_NOTES, 'readonly', (s) => s.getAll() as IDBRequest<UserNote[]>).then((list) =>
    (list || []).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
  );
}

export async function deleteUserNote(id: string): Promise<void> {
  const notes = await getUserNotes();
  const note = notes.find((n) => n.id === id);
  if (note) {
    await Promise.all(note.imageKeys.map((k) => deleteImage(k).catch(() => undefined)));
  }
  await tx<undefined>(STORE_NOTES, 'readwrite', (s) => s.delete(id) as IDBRequest<undefined>);
}

/**
 * Bir dosya listesini sıkıştırıp (uzun kenar 1600px, WebP) IndexedDB'ye yazar,
 * blob anahtarlarını döndürür.
 */
export async function storeImageFiles(noteId: string, files: File[]): Promise<string[]> {
  const keys: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const key = `${noteId}::${Date.now()}-${i}`;
    const blob = await downscale(files[i]).catch(() => files[i]);
    await putImage(key, blob);
    keys.push(key);
  }
  return keys;
}

async function downscale(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || file), 'image/webp', quality);
  });
}
