import { store } from "../core/state.js";

const FIRST_NAMES = ["Mateo", "Lucas", "Thiago", "Nicolás", "Julián", "Valentín", "Gael", "Iker", "Bruno", "Enzo", "Dylan", "Martín"];
const LAST_NAMES = ["Rojas", "Mendoza", "Paredes", "Acosta", "Salazar", "Vargas", "Castillo", "Quintero", "Herrera", "Navarro", "Cárdenas", "Morales"];

export function getPlayerAttributes(p) {
  if (p.attrs) return p.attrs;

  // Determinístico basado en ID, posición y OVR para que cada jugador tenga perfil único
  const seed = (p.id || p.name || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const v = (offset) => ((seed + offset) % 9) - 4;
  const clamp = (n) => Math.max(40, Math.min(99, Math.round(n)));
  const base = p.ovr || 75;

  if (p.pos === "POR") {
    return {
      RIT: clamp(base - 18 + v(1)),
      TIR: clamp(base - 24 + v(2)),
      PAS: clamp(base - 6 + v(3)),
      DEF: clamp(base + 4 + v(4))
    };
  }
  if (p.pos === "DEF") {
    return {
      RIT: clamp(base - 4 + v(1)),
      TIR: clamp(base - 16 + v(2)),
      PAS: clamp(base - 5 + v(3)),
      DEF: clamp(base + 5 + v(4))
    };
  }
  if (p.pos === "MED") {
    return {
      RIT: clamp(base - 2 + v(1)),
      TIR: clamp(base - 3 + v(2)),
      PAS: clamp(base + 5 + v(3)),
      DEF: clamp(base - 4 + v(4))
    };
  }
  // DEL
  return {
    RIT: clamp(base + 4 + v(1)),
    TIR: clamp(base + 5 + v(2)),
    PAS: clamp(base - 4 + v(3)),
    DEF: clamp(base - 22 + v(4))
  };
}

export function promoteYouthProspect() {
  const state = store.get();
  const youthLvl = state.staff?.youth || 1;
  const lastScoutSeason = state.lastYouthSeason || 0;
  const currentSeason = state.season || 1;

  if (lastScoutSeason >= currentSeason) {
    return { ok: false, msg: "Ya promoviste a la promesa de esta temporada. Mejora la Academia o espera a la próxima campaña." };
  }

  const cost = 1500000;
  if ((state.budget || 0) < cost) {
    return { ok: false, msg: "Necesitas 1.50 M€ para financiar la promoción del juvenil." };
  }

  const positions = ["POR", "DEF", "MED", "DEL"];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
  const age = 16 + Math.floor(Math.random() * 3); // 16 a 18 años
  const baseOvr = 66 + (youthLvl * 3) + Math.floor(Math.random() * 5); // Nvl 1: 69-73 | Nvl 5: 81-85
  const newId = `youth_${currentSeason}_${Date.now()}`;

  const prospect = {
    id: newId,
    clubId: state.userClubId,
    name,
    pos,
    age,
    ovr: Math.min(86, baseOvr),
    stamina: 100,
    morale: 95,
    contractYears: 4,
    starter: false,
    goals: 0,
    isYouth: true
  };

  store.update(["players", "budget", "lastYouthSeason", "inbox"], draft => {
    draft.players[newId] = prospect;
    draft.budget -= cost;
    draft.lastYouthSeason = currentSeason;
    draft.inbox.unshift({
      id: `ev_youth_${Date.now()}`,
      title: `🎓 Nueva Joya de la Cantera: ${name}`,
      body: `La Academia Juvenil (Nvl ${youthLvl}) ha promovido al primer equipo a ${name} (${pos}, ${age} años, OVR ${prospect.ovr}) con contrato de 4 años.`,
      date: `Temporada ${currentSeason}`,
      resolved: true
    });
  });

  return { ok: true, prospect };
}