import { store } from "../core/state.js";

export function calculateMarketValue(player, scoutLevel = 1) {
  const base = Math.pow(Math.max(1, player.ovr - 62), 2.15) * 42000;
  const ageFactor = player.age <= 22 ? 1.25 : player.age >= 31 ? 0.65 : 1.0;
  const discount = 1 - ((scoutLevel - 1) * 0.06);
  return Math.max(500000, Math.round((base * ageFactor * discount) / 100000) * 100000);
}

export function buyPlayer(playerId, forceOverpay = false) {
  const state = store.get();
  const player = state.players[playerId];
  const scoutLevel = state.staff?.scout || 1;
  if (!player) return { ok: false, msg: "Jugador no encontrado." };

  const basePrice = calculateMarketValue(player, scoutLevel);
  const finalPrice = forceOverpay ? Math.round(basePrice * 1.15) : basePrice;

  if (state.budget < finalPrice) {
    return { ok: false, msg: "Presupuesto insuficiente para este fichaje." };
  }

  if (!forceOverpay && player.ovr >= 84 && Math.random() < 0.45) {
    return {
      ok: false,
      needsCounter: true,
      counterPrice: Math.round(basePrice * 1.15),
      msg: `El ${state.clubs[player.clubId]?.name || "club rival"} rechazó ${(basePrice / 1e6).toFixed(2)} M€ y exige ${(Math.round(basePrice * 1.15) / 1e6).toFixed(2)} M€.`
    };
  }

  store.update(["players", "budget", "inbox"], draft => {
    draft.budget -= finalPrice;
    draft.players[playerId].clubId = draft.userClubId;
    draft.players[playerId].starter = false;
    draft.players[playerId].contractYears = 4;
    draft.inbox.unshift({
      id: `tr_${Date.now()}`,
      title: `Fichaje Confirmado: ${player.name}`,
      body: `El club ha cerrado la incorporación de ${player.name} (${player.pos}, OVR ${player.ovr}) por ${(finalPrice / 1e6).toFixed(2)} M€.`,
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

  const otherClubs = Object.keys(state.clubs).filter(id => id !== state.userClubId && !id.startsWith("ext_"));
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

export function maybeGenerateIncomingOffer() {
  const state = store.get();
  if (Math.random() > 0.28) return;

  const mySquad = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
  if (mySquad.length <= 13) return;

  const target = mySquad[Math.floor(Math.random() * mySquad.length)];
  const otherClubs = Object.keys(state.clubs || {}).filter(id => id !== state.userClubId && !id.startsWith("ext_"));
  if (otherClubs.length === 0) return;

  const buyerId = otherClubs[Math.floor(Math.random() * otherClubs.length)];
  const buyerName = state.clubs[buyerId]?.name || "Club Europeo";
  const offerAmount = Math.round(calculateMarketValue(target, 1) * 1.12);

  store.update(["inbox"], draft => {
    draft.unshift({
      id: `offer_${target.id}_${Date.now()}`,
      type: "transfer_offer",
      playerId: target.id,
      buyerId,
      offerAmount,
      title: `💰 Oferta Formal por ${target.name}`,
      body: `El ${buyerName} ofrece ${(offerAmount / 1e6).toFixed(2)} M€ por el traspaso inmediato de ${target.name} (${target.pos}, OVR ${target.ovr}).`,
      date: `Temporada ${draft.season || 1}`,
      resolved: false,
      choices: [
        { label: `Aceptar Venta (+${(offerAmount / 1e6).toFixed(2)} M€)` },
        { label: "Rechazar Oferta" }
      ]
    });
  });
}

export function respondToTransferOffer(eventId, choiceIdx) {
  const state = store.get();
  const ev = (state.inbox || []).find(m => m.id === eventId);
  if (!ev || ev.resolved) return;

  if (choiceIdx === 0) {
    const mySquad = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
    if (mySquad.length <= 13) {
      alert("No puedes aceptar: necesitas al menos 13 jugadores en plantilla.");
      return;
    }
    store.update(["players", "budget", "inbox"], draft => {
      if (draft.players[ev.playerId]) {
        draft.players[ev.playerId].clubId = ev.buyerId;
        draft.players[ev.playerId].starter = false;
        draft.budget += ev.offerAmount;
      }
      const item = draft.inbox.find(m => m.id === eventId);
      if (item) {
        item.resolved = true;
        item.chosenLabel = `Vendido por ${(ev.offerAmount / 1e6).toFixed(2)} M€`;
      }
    });
  } else {
    store.update(["inbox"], draft => {
      const item = draft.inbox.find(m => m.id === eventId);
      if (item) {
        item.resolved = true;
        item.chosenLabel = "Oferta rechazada";
      }
    });
  }
}