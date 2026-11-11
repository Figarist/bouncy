/**
 * IndexedDB storage for custom sound files.
 * Database: 'tyhyi-klas-audio', Store: 'sounds'.
 * Completely resilient: if IndexedDB is disabled, unavailable, or corrupted,
 * methods return empty arrays / null and never crash the app.
 */

import { MAX_CUSTOM_SOUNDS, prepareSamples, encodeWav } from './sound-process.js';

const DB_NAME = 'tyhyi-klas-audio';
const DB_VERSION = 1;
const STORE_NAME = 'sounds';

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Lists all custom sounds metadata (id, name, addedAt, byteLength).
 * @returns {Promise<Array<{id: string, name: string, addedAt: string, size: number}>>}
 */
export async function listCustomSounds() {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const res = (req.result || []).map((item) => ({
          id: item.id,
          name: item.name,
          addedAt: item.addedAt,
          size: item.wav?.byteLength || 0,
        }));
        resolve(res);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Returns all custom sound records with their ArrayBuffer wav data.
 * @returns {Promise<Array<{id: string, name: string, addedAt: string, wav: ArrayBuffer}>>}
 */
export async function getAllCustomSounds() {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Adds a new custom sound from an audio File/Blob or raw AudioBuffer.
 * Preprocesses, normalizes, and encodes to WAV 22.05kHz.
 *
 * @param {File|Blob} file
 * @param {AudioContext} audioCtx
 * @returns {Promise<{id: string, name: string, wav: ArrayBuffer}|{error: string}>}
 */
export async function addCustomSoundFile(file, audioCtx) {
  if (!file) return { error: 'Файл не обрано' };
  if (file.size > 15 * 1024 * 1024) {
    return { error: 'Файл завеликий (максимум 15 МБ)' };
  }

  const existing = await listCustomSounds();
  if (existing.length >= MAX_CUSTOM_SOUNDS) {
    return { error: `Досягнуто ліміт (${MAX_CUSTOM_SOUNDS} звуків). Видаліть непотрібний звук.` };
  }

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    return { error: 'Не вдалося прочитати файл' };
  }

  let decoded;
  try {
    // decodeAudioData consumes arrayBuffer; slice copy to be safe
    decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    return { error: 'Цей файл не схожий на аудіо, або формат не підтримується' };
  }

  const channels = [];
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    channels.push(decoded.getChannelData(ch));
  }

  const processedSamples = prepareSamples(channels, decoded.sampleRate);
  const wavBuffer = encodeWav(processedSamples);

  // Generate safe ID and display name
  const rawName = (file.name || 'Свій звук').replace(/\.[a-z0-9]+$/i, '').trim();
  const name = rawName.slice(0, 30) || 'Свій звук';
  const id = `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const record = {
    id,
    name,
    addedAt: new Date().toISOString(),
    wav: wavBuffer,
  };

  const db = await openDb();
  if (!db) return { error: 'Сховище браузера (IndexedDB) недоступне' };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve({ error: 'Помилка збереження в базу даних' });
    } catch {
      resolve({ error: 'Помилка збереження звуку' });
    }
  });
}

/**
 * Saves a sound record directly (used by backup restore and migration).
 * @param {{id: string, name: string, addedAt?: string, wav: ArrayBuffer}} record
 */
export async function putCustomSoundRecord(record) {
  if (!record || !record.id || !record.wav) return false;
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: record.id,
        name: (record.name || 'Свій звук').slice(0, 30),
        addedAt: record.addedAt || new Date().toISOString(),
        wav: record.wav,
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Renames an existing custom sound.
 */
export async function renameCustomSound(id, newName) {
  const cleanName = (newName || '').trim().slice(0, 30);
  if (!cleanName) return false;
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve(false);
        item.name = cleanName;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => resolve(false);
      };
      getReq.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Deletes a custom sound by ID.
 */
export async function deleteCustomSound(id) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
