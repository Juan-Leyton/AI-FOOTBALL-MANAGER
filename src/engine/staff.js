import { store } from "../core/state.js";

export const STAFF_CATALOG = {
  fitness: {
    key: "fitness",
    name: "Preparador Físico",
    desc: "Acelera la recuperación de estamina tras cada jornada y reduce el riesgo de fatiga.",
    baseCost: 2500000,
    maxLevel: 5
  },
  scout: {
    key: "scout",
    name: "Red de Ojeadores",
    desc: "Reduce un 6% por nivel el coste de fichajes en el mercado global.",
    baseCost: 3000000,
    maxLevel: 5
  },
  youth: {
    key: "youth",
    name: "Academia Juvenil",
    desc: "Mejora la calidad y potencial de las promesas sub-18 promovidas cada temporada.",
    baseCost: 2800000,
    maxLevel: 5
  },
  stadium: {
    key: "stadium",
    name: "Ampliación de Estadio",
    desc: "Añade +6.000 localidades y mejora zonas VIP, aumentando los ingresos por taquilla.",
    baseCost: 4500000,
    maxLevel: 5
  }
};

export function getStaffUpgradeCost(key, currentLevel) {
  const item = STAFF_CATALOG[key];
  if (!item || currentLevel >= item.maxLevel) return null;
  return Math.round(item.baseCost * Math.pow(1.45, currentLevel - 1));
}

export function upgradeStaff(key) {
  const state = store.get();
  const staff = state.staff || { fitness: 1, scout: 1, youth: 1, stadium: 1 };
  const currentLevel = staff[key] || 1;
  const cost = getStaffUpgradeCost(key, currentLevel);

  if (!cost) return { ok: false, msg: "Ya alcanzó el nivel máximo." };
  if ((state.budget || 0) < cost) return { ok: false, msg: "Presupuesto insuficiente." };

  store.update(["budget", "staff", "clubs"], draft => {
    draft.budget -= cost;
    if (!draft.staff) draft.staff = { fitness: 1, scout: 1, youth: 1, stadium: 1 };
    draft.staff[key] = currentLevel + 1;

    if (key === "stadium" && draft.clubs[draft.userClubId]) {
      const club = draft.clubs[draft.userClubId];
      if (!club.stadium) {
        club.stadium = { name: `Estadio ${club.name}`, capacity: 32000 };
      }
      club.stadium.capacity += 6000;
    }
  });

  return { ok: true };
}