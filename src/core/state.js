/**
 * src/core/state.js - Gestor Centralizado de Estado (Store)
 */

const STORAGE_KEY = "ai_fm_save_v1";

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

// Cargar partida guardada si existe
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
  }
} catch (e) {
  console.warn("No se pudo leer localStorage:", e);
}

const listeners = new Set();

export const store = {
  // Soporta ambos nombres para evitar errores
  get() {
    return state;
  },
  getState() {
    return state;
  },
  update(slices, updaterFn) {
    updaterFn(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Error al autoguardar:", e);
    }
    listeners.forEach(fn => fn(state));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};

export const selectors = {
  getUserClub: () => state.clubs[state.userClubId] || null,
  getActiveComp: () => state.competitions[state.activeCompId] || null
};