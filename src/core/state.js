/**
 * src/core/state.js - Gestor Centralizado de Estado (Store en RAM + IndexedDB)
 */

const DB_NAME = "wswm_26_db";
const STORE_NAME = "saves";
const SAVE_ID = "active_career_v1";
const LEGACY_LS_KEY = "ai_fm_save_v1";

let state = {
  season: 1,
  userClubId: null,
  activeCompId: null,
  budget: 50000000,
  boardConfidence: 85,
  clubs: {},
  players: {},
  competitions: {}
};

const listeners = new Set();
let persistTimer = null;

// --- Capa de Persistencia Asíncrona (IndexedDB) ---
function openSaveDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB no disponible en este entorno"));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function writeToIndexedDB(snapshot) {
  try {
    const db = await openSaveDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(snapshot, SAVE_ID);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Fallback silencioso a localStorage si el navegador bloquea IndexedDB (ej. modo incógnito estricto)
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(snapshot));
      } catch (_) {}
    }
  }
}

async function readFromIndexedDB() {
  try {
    const db = await openSaveDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(SAVE_ID);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return null;
  }
}

function createPersistableSnapshot() {
  // Excluimos el estado efímero de cancha en vivo para no inflar la base de datos
  const { liveMatch, ...cleanState } = state;
  return structuredClone ? structuredClone(cleanState) : JSON.parse(JSON.stringify(cleanState));
}

function schedulePersist(immediate = false) {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);

  if (immediate) {
    writeToIndexedDB(createPersistableSnapshot());
    return;
  }

  // Agrupamos ráfagas rápidas de cambios en los menús (debounce 180ms)
  persistTimer = setTimeout(() => {
    writeToIndexedDB(createPersistableSnapshot());
  }, 180);
}

// Hidratación inicial al arrancar (migra automáticamente partidas previas de localStorage a IndexedDB)
export const hydrationReady = (async () => {
  if (typeof window === "undefined") return;

  const idbSaved = await readFromIndexedDB();
  if (idbSaved) {
    state = { ...state, ...idbSaved };
    listeners.forEach(fn => fn(state));
    return;
  }

  if (typeof localStorage !== "undefined") {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_LS_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        state = { ...state, ...parsed };
        await writeToIndexedDB(createPersistableSnapshot());
        localStorage.removeItem(LEGACY_LS_KEY);
        listeners.forEach(fn => fn(state));
      }
    } catch (e) {
      console.warn("No se pudo migrar partida previa:", e);
    }
  }
})();

export const store = {
  get() {
    return state;
  },
  getState() {
    return state;
  },
  /**
   * Actualiza el estado en RAM y, salvo que { persist: false }, persiste en IndexedDB.
   */
  update(slices, updaterFn, options = { persist: true, immediate: false }) {
    updaterFn(state);
    if (options.persist !== false) {
      schedulePersist(Boolean(options.immediate));
    }
    listeners.forEach(fn => fn(state));
  },
  /**
   * Atajo ultrarrápido 100% en RAM para bucles de 30-60 FPS (partidos en vivo).
   */
  updateMemory(slices, updaterFn) {
    updaterFn(state);
    listeners.forEach(fn => fn(state));
  },
  /**
   * Fuerza el guardado inmediato en IndexedDB (ej. pitazo final del partido).
   */
  flush() {
    schedulePersist(true);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async reset() {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(LEGACY_LS_KEY);
      } catch (_) {}
    }
    try {
      const db = await openSaveDB();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(SAVE_ID);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    } catch (_) {}
    if (typeof location !== "undefined") {
      location.reload();
    }
  }
};

export const selectors = {
  getUserClub: () => state.clubs[state.userClubId] || null,
  getActiveComp: () => state.competitions[state.activeCompId] || null
};