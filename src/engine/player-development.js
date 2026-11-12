import { store } from "../core/state.js";

const FREE_AGENT_POOL_TEMPLATES = [
  { name: "Sergio Ramos", age: 39, pos: "DEF", ovr: 81, flag: "🇪🇸" },
  { name: "Keylor Navas", age: 38, pos: "POR", ovr: 80, flag: "🇨🇷" },
  { name: "Memphis Depay", age: 31, pos: "DEL", ovr: 82, flag: "🇳🇱" },
  { name: "Adrien Rabiot", age: 30, pos: "MED", ovr: 83, flag: "🇫🇷" },
  { name: "Mats Hummels", age: 36, pos: "DEF", ovr: 82, flag: "🇩🇪" },
  { name: "Alexis Sánchez", age: 36, pos: "DEL", ovr: 79, flag: "🇨🇱" },
  { name: "Dele Alli", age: 29, pos: "MED", ovr: 76, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Mario Hermoso", age: 30, pos: "DEF", ovr: 80, flag: "🇪🇸" },
  { name: "Anthony Martial", age: 29, pos: "DEL", ovr: 78, flag: "🇫🇷" },
  { name: "Wissam Ben Yedder", age: 34, pos: "DEL", ovr: 80, flag: "🇫🇷" },
  { name: "Iker Muniain", age: 32, pos: "MED", ovr: 78, flag: "🇪🇸" },
  { name: "Mariano Díaz", age: 31, pos: "DEL", ovr: 75, flag: "🇩🇴" },
  { name: "Cédric Soares", age: 33, pos: "DEF", ovr: 75, flag: "🇵🇹" },
  { name: "Loris Karius", age: 31, pos: "POR", ovr: 75, flag: "🇩🇪" },
  { name: "Rafinha Alcântara", age: 32, pos: "MED", ovr: 77, flag: "🇧🇷" },
  { name: "Brandon Williams", age: 24, pos: "DEF", ovr: 74, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" }
];

export const DEVELOPMENT_FOCUSES = {
  pace: { key: "pace", name: "⚡ Velocidad y Desborde", statBoost: { RIT: 3, TIR: 1 } },
  finishing: { key: "finishing", name: "🎯 Finalización Clínica", statBoost: { TIR: 3, PAS: 1 } },
  playmaker: { key: "playmaker", name: "🧠 Visión y Pase Filtrado", statBoost: { PAS: 3, RIT: 1 } },
  stopper: { key: "stopper", name: "🛡️ Solidez y Anticipación", statBoost: { DEF: 3, PAS: 1 } }
};

export function ensureFreeAgentsPool() {
  const state = store.get();
  const existingFree = Object.values(state.players || {}).filter(p => p.clubId === "free_agent");
  if (existingFree.length >= 6) return;

  store.update(["players"], draft => {
    FREE_AGENT_POOL_TEMPLATES.forEach((tpl, idx) => {
      const id = `fa_${idx}_${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      if (!draft.players[id]) {
        draft.players[id] = {
          id,
          name: tpl.name,
          age: tpl.age,
          pos: tpl.pos,
          ovr: tpl.ovr,
          clubId: "free_agent",
          isFreeAgent: true,
          starter: false,
          stamina: 92,
          morale: 85,
          contractYears: 1,
          goals: 0
        };
      }
    });
  });
}

export function getFreeAgentSignBonus(player) {
  const base = Math.max(350000, ((player.ovr || 74) - 70) * 180000);
  return Math.round(base / 10000) * 10000;
}

export function signFreeAgent(playerId) {
  const state = store.get();
  const uid = state.userClubId;
  const player = state.players?.[playerId];

  if (!uid || !player || player.clubId !== "free_agent") {
    return { ok: false, msg: "Este agente libre ya no está disponible." };
  }

  const squadCount = Object.values(state.players || {}).filter(p => p.clubId === uid).length;
  if (squadCount >= 28) {
    return { ok: false, msg: "Plantilla completa (28 jugadores). Vende o libera a alguien primero." };
  }

  const bonusFee = getFreeAgentSignBonus(player);
  if ((state.budget || 0) < bonusFee) {
    return { ok: false, msg: `Necesitas ${(bonusFee / 1e6).toFixed(2)} M€ para cubrir la prima de fichaje libre.` };
  }

  store.update(["budget", "players", "inbox"], draft => {
    draft.budget -= bonusFee;
    draft.players[playerId].clubId = uid;
    draft.players[playerId].isFreeAgent = false;
    draft.players[playerId].starter = false;
    draft.players[playerId].contractYears = 2;
    draft.players[playerId].morale = 90;

    draft.inbox = [
      {
        id: `fa_sign_${Date.now()}`,
        title: `✍️ Agente Libre fichado: ${player.name}`,
        date: `Temporada ${state.season || 1}`,
        body: `Has incorporado a <b>${player.name}</b> (${player.pos}, OVR ${player.ovr}) a coste cero de traspaso, abonando una prima de firma de ${(bonusFee / 1e6).toFixed(2)} M€.`,
        choices: [],
        resolved: true
      },
      ...(draft.inbox || [])
    ];
  });

  return {
    ok: true,
    msg: `¡${player.name} fichado como Agente Libre por ${(bonusFee / 1e6).toFixed(2)} M€ de prima!`
  };
}

export function retrainPlayerPosition(playerId, newPos) {
  const state = store.get();
  const player = state.players?.[playerId];
  const validFieldPos = ["DEF", "MED", "DEL"];

  if (!player || player.clubId !== state.userClubId) {
    return { ok: false, msg: "Jugador no encontrado en tu plantilla." };
  }
  if (player.pos === "POR" || !validFieldPos.includes(newPos)) {
    return { ok: false, msg: "Los porteros no pueden reconvertirse a jugadores de campo." };
  }
  if (player.pos === newPos) {
    return { ok: false, msg: `${player.name} ya juega como ${newPos}.` };
  }

  const cost = 850000;
  if ((state.budget || 0) < cost) {
    return { ok: false, msg: "Necesitas 0.85 M€ para financiar el programa táctico de reconversión." };
  }

  const oldPos = player.pos;
  store.update(["budget", "players"], draft => {
    draft.budget -= cost;
    const p = draft.players[playerId];
    p.secondaryPos = oldPos;
    p.pos = newPos;
    p.morale = Math.min(100, (p.morale ?? 85) + 4);
  });

  return {
    ok: true,
    msg: `¡Reconversión completada! ${player.name} ahora es ${newPos} (antes ${oldPos}).`
  };
}

export function applyIndividualFocus(playerId, focusKey) {
  const state = store.get();
  const player = state.players?.[playerId];
  const focus = DEVELOPMENT_FOCUSES[focusKey];

  if (!player || !focus || player.clubId !== state.userClubId) {
    return { ok: false, msg: "No se pudo aplicar el plan de desarrollo." };
  }

  const cost = 500000;
  if ((state.budget || 0) < cost) {
    return { ok: false, msg: "Necesitas 0.50 M€ para sesiones personalizadas de entrenamiento." };
  }

  store.update(["budget", "players"], draft => {
    draft.budget -= cost;
    const p = draft.players[playerId];
    p.devFocus = focus.key;
    p.customBoosts = {
      RIT: (p.customBoosts?.RIT || 0) + (focus.statBoost.RIT || 0),
      TIR: (p.customBoosts?.TIR || 0) + (focus.statBoost.TIR || 0),
      PAS: (p.customBoosts?.PAS || 0) + (focus.statBoost.PAS || 0),
      DEF: (p.customBoosts?.DEF || 0) + (focus.statBoost.DEF || 0)
    };
    if (Math.random() < 0.45 && p.ovr < 93) {
      p.ovr += 1;
    }
  });

  return {
    ok: true,
    msg: `Plan "${focus.name}" aplicado a ${player.name}.`
  };
}