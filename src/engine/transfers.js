import { store } from "../core/state.js";

/**
 * Motor de valoración dinámica e interactiva con desglose transparente
 */
export function getDynamicValuationBreakdown(player, scoutLevel = 1, state = null) {
  const ovr = player.ovr || 75;
  const expBase = Math.pow(Math.max(1, ovr - 60), 2.55) * 20500;
  const eliteMult = ovr >= 88 ? 1 + (ovr - 87) * 0.08 : 1.0;
  const baseValue = Math.max(500000, Math.round((expBase * eliteMult) / 100000) * 100000);

  const modifiers = [];
  let mult = 1.0;

  // 1. Edad y Potencial
  if (player.age <= 21) {
    mult *= 1.24;
    modifiers.push({ label: "🌟 Promesa Sub-21", pct: "+24%", tone: "up" });
  } else if (player.age === 22) {
    mult *= 1.15;
    modifiers.push({ label: "⚡ Joven Proyección", pct: "+15%", tone: "up" });
  } else if (player.age >= 32) {
    mult *= 0.58;
    modifiers.push({ label: "⏳ Veterano (32+)", pct: "-42%", tone: "down" });
  } else if (player.age >= 30) {
    mult *= 0.75;
    modifiers.push({ label: "📉 Edad Avanzada", pct: "-25%", tone: "down" });
  }

  if ((player.potential || 0) >= 91 && player.age <= 23) {
    mult *= 1.08;
    modifiers.push({ label: "💎 Potencial Generacional", pct: "+8%", tone: "up" });
  }

  // 2. Años de contrato restantes
  const years = player.contractYears ?? 2;
  if (years <= 1 && player.clubId !== "free_agent" && player.clubId !== "legend_vault") {
    mult *= 0.74;
    modifiers.push({ label: "📄 Contrato por expirar", pct: "-26%", tone: "down" });
  } else if (years >= 4 && player.clubId !== "free_agent") {
    mult *= 1.10;
    modifiers.push({ label: "🔒 Blindado (4+ años)", pct: "+10%", tone: "up" });
  }

  // 3. Moral / Estado anímico
  const morale = player.morale ?? 85;
  if (morale < 60) {
    mult *= 0.82;
    modifiers.push({ label: "😠 Jugador descontento", pct: "-18%", tone: "down" });
  } else if (morale >= 93) {
    mult *= 1.06;
    modifiers.push({ label: "🔥 Compromiso total", pct: "+6%", tone: "up" });
  }

  // 4. Forma física y lesiones
  if ((player.injuredMatches || 0) > 0) {
    mult *= 0.78;
    modifiers.push({ label: `🚑 Lesionado (${player.injuredMatches}j)`, pct: "-22%", tone: "down" });
  } else if ((player.stamina ?? 95) < 60) {
    mult *= 0.90;
    modifiers.push({ label: "🔋 Baja forma física", pct: "-10%", tone: "down" });
  }

  // 5. Deadline Day (si se pasa state)
  const round = (state?.competitions?.league_1?.currentRound || 0) + 1;
  if (state && (round === 2 || round === 12)) {
    mult *= 1.12;
    modifiers.push({ label: "🚨 Sobrecoste Deadline Day", pct: "+12%", tone: "up" });
  }

  // 6. Descuento de Red de Ojeadores
  if (scoutLevel > 1) {
    const disc = (scoutLevel - 1) * 0.06;
    mult *= (1 - disc);
    modifiers.push({ label: `🔭 Ojeador Nvl ${scoutLevel}`, pct: `-${Math.round(disc * 100)}%`, tone: "down" });
  }

  const raw = baseValue * mult;
  const capped = Math.min(200000000, raw);
  const finalPrice = Math.max(500000, Math.round(capped / 100000) * 100000);

  return {
    baseValue,
    finalPrice,
    modifiers
  };
}

export function calculateMarketValue(player, scoutLevel = 1, state = null) {
  return getDynamicValuationBreakdown(player, scoutLevel, state).finalPrice;
}

export function buyPlayer(playerId, forceOverpay = false) {
  const state = store.get();
  const player = state.players[playerId];
  const scoutLevel = state.staff?.scout || 1;
  if (!player) return { ok: false, msg: "Jugador no encontrado." };
  if (player.clubId === "legend_vault") {
    return { ok: false, msg: "Las leyendas históricas solo se obtienen mediante títulos, subastas secretas o regens élite." };
  }

  const basePrice = calculateMarketValue(player, scoutLevel, state);
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
    draft.players[playerId].morale = 90;
    if (!Array.isArray(draft.inbox)) draft.inbox = [];
    draft.inbox.unshift({
      id: `tr_${Date.now()}`,
      title: `Fichaje Confirmado: ${player.name}`,
      body: `El club ha cerrado la incorporación de ${player.name} (${player.pos}, OVR ${player.ovr}) por ${(finalPrice / 1e6).toFixed(2)} M€.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: true,
      choices: []
    });
  });

  return { ok: true, msg: `¡${player.name} fichado por ${(finalPrice / 1e6).toFixed(2)} M€!` };
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
  const sellPrice = Math.round(calculateMarketValue(player, 1, state) * 0.85);

  store.update(["players", "budget", "inbox"], draft => {
    draft.budget += sellPrice;
    draft.players[playerId].clubId = buyerClubId;
    draft.players[playerId].starter = false;
    if (!Array.isArray(draft.inbox)) draft.inbox = [];
    draft.inbox.unshift({
      id: `sell_${Date.now()}`,
      title: `Venta Cerrada: ${player.name}`,
      body: `${draft.clubs[buyerClubId]?.name || "Un club rival"} ha pagado ${(sellPrice / 1e6).toFixed(2)} M€ por ${player.name}.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: true,
      choices: []
    });
  });

  return { ok: true, msg: `${player.name} vendido por ${(sellPrice / 1e6).toFixed(2)} M€.` };
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
  const offerAmount = Math.round(calculateMarketValue(target, 1, state) * 1.12);

  store.update(["inbox"], draft => {
    if (!Array.isArray(draft.inbox)) draft.inbox = [];
    draft.inbox.unshift({
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
  if (!ev || ev.resolved) return { ok: false };

  if (choiceIdx === 0) {
    const mySquad = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
    if (mySquad.length <= 13) {
      if (typeof alert === "function") {
        alert("No puedes aceptar: necesitas al menos 13 jugadores en plantilla.");
      }
      return { ok: false, msg: "Necesitas al menos 13 jugadores en plantilla." };
    }
    store.update(["players", "budget", "inbox"], draft => {
      if (draft.players[ev.playerId]) {
        draft.players[ev.playerId].clubId = ev.buyerId;
        draft.players[ev.playerId].starter = false;
        draft.budget += ev.offerAmount;
      }
      if (!Array.isArray(draft.inbox)) draft.inbox = [];
      const item = draft.inbox.find(m => m.id === eventId);
      if (item) {
        item.resolved = true;
        item.chosenLabel = `Vendido por ${(ev.offerAmount / 1e6).toFixed(2)} M€`;
      }
    });
    return { ok: true };
  } else {
    store.update(["inbox"], draft => {
      if (!Array.isArray(draft.inbox)) draft.inbox = [];
      const item = draft.inbox.find(m => m.id === eventId);
      if (item) {
        item.resolved = true;
        item.chosenLabel = "Oferta rechazada";
      }
    });
    return { ok: true };
  }
}