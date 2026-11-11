import { store } from "../core/state.js";

export const STAFF_CATALOG = {
  fitness: {
    key: "fitness",
    name: "Preparador Físico",
    desc: "Reduce la fatiga por partido y acelera la recuperación entre jornadas.",
    maxLevel: 5,
    baseCost: 2500000
  },
  scout: {
    key: "scout",
    name: "Ojeador Jefe",
    desc: "Negocia mejores precios de traspaso (-6% de descuento por nivel).",
    maxLevel: 5,
    baseCost: 3000000
  },
  youth: {
    key: "youth",
    name: "Entrenador de Cantera",
    desc: "Acelera el progreso de jugadores Sub-23 tras cada partido.",
    maxLevel: 5,
    baseCost: 2800000
  }
};

export function getStaffUpgradeCost(key, currentLevel) {
  const item = STAFF_CATALOG[key];
  if (!item || currentLevel >= item.maxLevel) return null;
  return item.baseCost * currentLevel;
}

export function upgradeStaff(key) {
  const state = store.get();
  const staff = state.staff || { fitness: 1, scout: 1, youth: 1 };
  const currentLevel = staff[key] || 1;
  const cost = getStaffUpgradeCost(key, currentLevel);

  if (!cost) return { ok: false, msg: "Nivel máximo alcanzado." };
  if ((state.budget || 0) < cost) return { ok: false, msg: "Presupuesto insuficiente." };

  store.update(["staff", "budget", "inbox"], draft => {
    if (!draft.staff) draft.staff = { fitness: 1, scout: 1, youth: 1 };
    draft.staff[key] = currentLevel + 1;
    draft.budget -= cost;
    draft.inbox.unshift({
      id: `staff_${Date.now()}`,
      title: `Mejora de Cuerpo Técnico: ${STAFF_CATALOG[key].name}`,
      body: `Has ascendido a tu ${STAFF_CATALOG[key].name} al Nivel ${currentLevel + 1} por ${(cost / 1e6).toFixed(2)} M€.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: true,
      choices: []
    });
  });

  return { ok: true };
}