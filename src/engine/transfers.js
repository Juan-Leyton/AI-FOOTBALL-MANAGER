import { store } from "../core/state.js";

export function calculateMarketValue(player, scoutLevel = 1) {
  const base = Math.pow(Math.max(1, player.ovr - 62), 2.15) * 42000;
  const ageFactor = player.age <= 22 ? 1.25 : player.age >= 31 ? 0.65 : 1.0;
  const discount = 1 - ((scoutLevel - 1) * 0.06);
  return Math.max(500000, Math.round((base * ageFactor * discount) / 100000) * 100000);
}

export function buyPlayer(playerId) {
  const state = store.get();
  const player = state.players[playerId];
  const scoutLevel = state.staff?.scout || 1;
  if (!player) return { ok: false, msg: "Jugador no encontrado." };

  const price = calculateMarketValue(player, scoutLevel);
  if (state.budget < price) {
    return { ok: false, msg: "Presupuesto insuficiente para este fichaje." };
  }

  store.update(["players", "budget", "inbox"], draft => {
    draft.budget -= price;
    draft.players[playerId].clubId = draft.userClubId;
    draft.players[playerId].starter = false;
    draft.inbox.unshift({
      id: `tr_${Date.now()}`,
      title: `Fichaje Confirmado: ${player.name}`,
      body: `El club ha cerrado la incorporación de ${player.name} (${player.pos}, OVR ${player.ovr}) por ${(price / 1e6).toFixed(2)} M€.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: true,
      choices: []
    });
  });

  return { ok: true };
}

export function sellPlayer(playerId) {
  const state = store.get();
  const player = state.players[playerId];
  if (!player || player.clubId !== state.userClubId) {
    return { ok: false, msg: "El jugador no pertenece a tu club." };
  }

  const mySquad = Object.values(state.players).filter(p => p.clubId === state.userClubId);
  if (mySquad.length <= 13) {
    return { ok: false, msg: "Necesitas mantener al menos 13 jugadores en plantilla." };
  }

  const otherClubs = Object.keys(state.clubs).filter(id => id !== state.userClubId);
  const buyerClubId = otherClubs[Math.floor(Math.random() * otherClubs.length)];
  const sellPrice = Math.round(calculateMarketValue(player, 1) * 0.85);

  store.update(["players", "budget", "inbox"], draft => {
    draft.budget += sellPrice;
    draft.players[playerId].clubId = buyerClubId;
    draft.players[playerId].starter = false;
    draft.inbox.unshift({
      id: `sell_${Date.now()}`,
      title: `Venta Cerrada: ${player.name}`,
      body: `${draft.clubs[buyerClubId]?.name || "Un club rival"} ha pagado ${(sellPrice / 1e6).toFixed(2)} M€ por ${player.name}.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: true,
      choices: []
    });
  });

  return { ok: true };
}