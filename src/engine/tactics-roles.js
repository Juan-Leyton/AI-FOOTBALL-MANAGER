import { store } from "../core/state.js";

export const PLAYER_ROLES = {
  POR: [
    { id: "gk_classic", name: "Portero Clásico", desc: "+3 paradas bajo palos", xShift: 0, atkBonus: 0, defBonus: 3 },
    { id: "gk_sweeper", name: "Portero Líbero", desc: "Juega adelantado y corta balones largos", xShift: 0.04, atkBonus: 2, defBonus: 1 }
  ],
  DEF: [
    { id: "def_stopper", name: "Central Marcador", desc: "+3 solidez defensiva en el área", xShift: -0.02, atkBonus: -1, defBonus: 3 },
    { id: "def_ballplay", name: "Central con Salida", desc: "+2 construcción desde atrás", xShift: 0.02, atkBonus: 2, defBonus: 1 },
    { id: "def_wingback", name: "Lateral Carrilero", desc: "Sube constantemente al ataque por banda", xShift: 0.11, atkBonus: 4, defBonus: -2 }
  ],
  MED: [
    { id: "mid_anchor", name: "Pivote Defensivo", desc: "Protege a los centrales (+3 DEF)", xShift: -0.08, atkBonus: -1, defBonus: 3 },
    { id: "mid_box2box", name: "Todoterreno (Box-to-Box)", desc: "Equilibrio total ida y vuelta (+2/+2)", xShift: 0.01, atkBonus: 2, defBonus: 2 },
    { id: "mid_playmaker", name: "Organizador Adelantado", desc: "Filtra pases de gol entre líneas (+4 ATK)", xShift: 0.09, atkBonus: 4, defBonus: -1 }
  ],
  DEL: [
    { id: "fwd_poacher", name: "Cazagoles / Área", desc: "Fija centrales y remata todo (+4 ATK)", xShift: 0.04, atkBonus: 4, defBonus: -1 },
    { id: "fwd_false9", name: "Falso 9", desc: "Baja a recibir y genera superioridad", xShift: -0.08, atkBonus: 3, defBonus: 1 },
    { id: "fwd_winger", name: "Extremo Desbordador", desc: "Abre el campo y busca el 1vs1 (+3 ATK)", xShift: 0.02, atkBonus: 3, defBonus: 0 }
  ]
};

export const TOUCHLINE_SHOUTS = [
  {
    id: "press_high",
    label: "🔥 ¡Presionen Arriba!",
    desc: "+6% ataque y recuperación durante 10 min (-4% físico)",
    atkMod: 1.07,
    defMod: 1.04,
    staminaCost: 3.5,
    logText: "🗣️ El míster pide desde la banda: '¡Todos a morder arriba, no los dejen salir!'"
  },
  {
    id: "keep_calm",
    label: "🧊 ¡Calma y Posesión!",
    desc: "+7% control defensivo y ahorro de energía durante 10 min",
    atkMod: 0.96,
    defMod: 1.08,
    staminaCost: 1.0,
    logText: "🗣️ Orden desde el banquillo: '¡Cabeza fría, muevan el balón de lado a lado!'"
  },
  {
    id: "all_out",
    label: "⚡ ¡A por el Gol!",
    desc: "+11% pegada ofensiva durante 10 min (deja espacios atrás)",
    atkMod: 1.11,
    defMod: 0.91,
    staminaCost: 4.5,
    logText: "🗣️ ¡Todos al ataque! El entrenador manda líneas arriba buscando el gol."
  }
];

export function getDefaultRoleForPos(pos) {
  const list = PLAYER_ROLES[pos] || PLAYER_ROLES.MED;
  return list[0].id;
}

export function getRoleConfig(pos, roleId) {
  const list = PLAYER_ROLES[pos] || PLAYER_ROLES.MED;
  return list.find(r => r.id === roleId) || list[0];
}

export function setSlotRole(slotIndex, roleId) {
  const state = store.get();
  const clubId = state.userClubId;
  if (!clubId) return;

  store.update(["clubs"], draft => {
    const club = draft.clubs[clubId];
    if (!club.slotRoles) club.slotRoles = {};
    club.slotRoles[slotIndex] = roleId;
  });
}

export function setSetPieceTaker(type, playerId) {
  const state = store.get();
  const clubId = state.userClubId;
  if (!clubId) return;

  store.update(["clubs"], draft => {
    const club = draft.clubs[clubId];
    if (!club.setPieces) club.setPieces = {};
    club.setPieces[type] = playerId;
  });
}

export function getEffectiveSetPieces(state, clubId) {
  const club = state.clubs?.[clubId];
  const squad = Object.values(state.players || {}).filter(p => p.clubId === clubId && p.starter);
  const fallback = squad.sort((a, b) => b.ovr - a.ovr)[0]?.id || null;
  const sp = club?.setPieces || {};
  return {
    penalty: squad.some(p => p.id === sp.penalty) ? sp.penalty : fallback,
    freekick: squad.some(p => p.id === sp.freekick) ? sp.freekick : fallback,
    corner: squad.some(p => p.id === sp.corner) ? sp.corner : fallback
  };
}

export function triggerTouchlineShout(shoutId) {
  const state = store.get();
  const m = state.liveMatch;
  if (!m || m.finished) return { ok: false, msg: "No hay partido activo." };

  const shout = TOUCHLINE_SHOUTS.find(s => s.id === shoutId);
  if (!shout) return { ok: false, msg: "Instrucción no válida." };

  const lastMin = m.lastShoutMinute ?? -15;
  if (m.minute - lastMin < 8) {
    const wait = 8 - (m.minute - lastMin);
    return { ok: false, msg: `Espera ${wait}' antes de dar otro grito desde la banda.` };
  }

  const isUserHome = m.homeId === state.userClubId;

  store.update(["liveMatch"], draft => {
    const lm = draft.liveMatch;
    if (!lm) return;
    lm.lastShoutMinute = lm.minute;
    lm.activeShout = {
      id: shout.id,
      label: shout.label,
      isHome: isUserHome,
      expiresAt: Math.min(90, lm.minute + 10),
      atkMod: shout.atkMod,
      defMod: shout.defMod
    };
    const agents = isUserHome ? lm.homeAgents : lm.awayAgents;
    agents.forEach(a => {
      if (!a.expelled) {
        a.stamina = Math.max(20, (a.stamina ?? 90) - shout.staminaCost);
      }
    });
    lm.events.unshift(`⏱️ ${lm.minute}' ${shout.logText}`);
    if (lm.events.length > 35) lm.events.pop();
  });

  return { ok: true, msg: `${shout.label} aplicado por 10 minutos.` };
}