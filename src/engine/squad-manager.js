import { store } from "../core/state.js";
import { FORMATIONS } from "./match-live.js";
import { isPlayerUnavailable } from "./medical.js";

export function autoPickBestXI() {
  const state = store.get();
  const uid = state.userClubId;
  if (!uid) return { ok: false, msg: "No hay club seleccionado." };

  const userClub = state.clubs?.[uid];
  const formation = userClub?.formation || "4-3-3";
  const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];

  const available = Object.values(state.players || {})
    .filter(p => p.clubId === uid && !isPlayerUnavailable(p))
    .sort((a, b) => (b.ovr + (b.stamina ?? 90) * 0.08) - (a.ovr + (a.stamina ?? 90) * 0.08));

  if (available.length < 11) {
    return {
      ok: false,
      msg: `Solo tienes ${available.length} jugadores disponibles (necesitas 11 sanos y sin sanción).`
    };
  }

  const chosenIds = new Set();

  // 1. Asignar el mejor disponible por cada puesto de la formación
  slots.forEach(slot => {
    const exactMatch = available.find(p => !chosenIds.has(p.id) && p.pos === slot.pos);
    if (exactMatch) {
      chosenIds.add(exactMatch.id);
    }
  });

  // 2. Completar huecos restantes hasta 11 con los jugadores de mayor media disponibles
  for (const p of available) {
    if (chosenIds.size >= 11) break;
    if (!chosenIds.has(p.id)) {
      chosenIds.add(p.id);
    }
  }

  store.update(["players"], draft => {
    Object.values(draft.players || {}).forEach(p => {
      if (p.clubId === uid) {
        p.starter = chosenIds.has(p.id);
      }
    });
  });

  return {
    ok: true,
    msg: `Mejor XI alineado automáticamente para la formación ${formation}.`
  };
}