import { store } from "../core/state.js";
import { calculateMarketValue } from "./transfers.js";
import { getRealisticWeeklyWage, getTransferWindowStatus } from "./economy-market.js";

export function makeLowballOffer(playerId) {
  const state = store.get();
  const player = state.players?.[playerId];
  if (!player) return { ok: false, msg: "Jugador no encontrado." };
  if (player.clubId === state.userClubId) return { ok: false, msg: "Este jugador ya pertenece a tu plantilla." };

  const scoutLvl = state.staff?.scout || 1;
  const fullVal = calculateMarketValue(player, scoutLvl, state);
  const lowOffer = Math.round(fullVal * 0.82);

  if ((state.budget || 0) < lowOffer) {
    return { ok: false, msg: `Presupuesto insuficiente. Necesitas ${(lowOffer / 1e6).toFixed(2)} M€ para lanzar esta oferta.` };
  }

  const successChance = Math.min(0.88, 0.38 + (scoutLvl - 1) * 0.11);
  const sellerClub = state.clubs[player.clubId]?.name || "El club vendedor";

  if (Math.random() <= successChance) {
    store.update(["players", "budget", "inbox"], draft => {
      draft.budget -= lowOffer;
      draft.players[playerId].clubId = draft.userClubId;
      draft.players[playerId].starter = false;
      draft.players[playerId].contractYears = 3;
      draft.players[playerId].morale = 88;
      draft.inbox = [
        {
          id: `trf_low_${Date.now()}`,
          title: `🤝 ¡Oferta a la baja aceptada por ${player.name}!`,
          date: `Temporada ${state.season || 1}`,
          body: `${sellerClub} ha aceptado tu propuesta reducida de ${(lowOffer / 1e6).toFixed(2)} M€ (ahorraste ${((fullVal - lowOffer) / 1e6).toFixed(2)} M€).`,
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    });
    return { ok: true, msg: `¡${sellerClub} aceptó tu oferta de ${(lowOffer / 1e6).toFixed(2)} M€!` };
  }

  return {
    ok: false,
    msg: `❌ ${sellerClub} rechazó tu oferta a la baja de ${(lowOffer / 1e6).toFixed(2)} M€. Exigen el valor completo de ${(fullVal / 1e6).toFixed(2)} M€.`
  };
}

export function loanPlayer(playerId) {
  const state = store.get();
  const player = state.players?.[playerId];
  if (!player) return { ok: false, msg: "Jugador no encontrado." };
  if (player.clubId === state.userClubId) return { ok: false, msg: "Este jugador ya está en tu club." };
  if (player.isLoaned) return { ok: false, msg: "Este futbolista ya se encuentra cedido esta temporada." };

  const userLoansCount = Object.values(state.players || {}).filter(
    p => p.clubId === state.userClubId && p.isLoaned
  ).length;
  if (userLoansCount >= 4) {
    return { ok: false, msg: "Has alcanzado el límite máximo de 4 jugadores cedidos en plantilla." };
  }

  const scoutLvl = state.staff?.scout || 1;
  const fullVal = calculateMarketValue(player, scoutLvl, state);
  const loanFee = Math.max(400000, Math.round(fullVal * 0.25));

  if ((state.budget || 0) < loanFee) {
    return { ok: false, msg: `Necesitas ${(loanFee / 1e6).toFixed(2)} M€ para cubrir la tarifa de cesión.` };
  }

  const originClubId = player.clubId;
  const originClubName = state.clubs[originClubId]?.name || "su club de origen";

  store.update(["players", "budget", "inbox"], draft => {
    draft.budget -= loanFee;
    draft.players[playerId].clubId = draft.userClubId;
    draft.players[playerId].starter = false;
    draft.players[playerId].isLoaned = true;
    draft.players[playerId].loanFromClubId = originClubId;
    draft.players[playerId].contractYears = 1;

    draft.inbox = [
      {
        id: `loan_${Date.now()}`,
        title: `📋 Cesión completada: ${player.name}`,
        date: `Temporada ${state.season || 1}`,
        body: `${player.name} (${player.pos}, OVR ${player.ovr}) llega cedido desde ${originClubName} por 1 temporada a cambio de ${(loanFee / 1e6).toFixed(2)} M€.`,
        choices: [],
        resolved: true
      },
      ...(draft.inbox || [])
    ];
  });

  return { ok: true, msg: `${player.name} llega cedido por ${(loanFee / 1e6).toFixed(2)} M€.` };
}

/**
 * Negociación interactiva personalizada (Oferta directa + exigencia salarial del agente + contraoferta)
 */
export function submitInteractiveOffer(playerId, offeredCash, contractYears = 4) {
  const state = store.get();
  const player = state.players?.[playerId];
  if (!player) return { ok: false, msg: "Jugador no encontrado." };
  if (player.clubId === state.userClubId || player.clubId === "free_agent" || player.clubId === "legend_vault") {
    return { ok: false, msg: "Jugador no disponible para negociación directa." };
  }

  const squadSize = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId).length;
  if (squadSize >= 28) return { ok: false, msg: "Plantilla completa (máximo 28 jugadores)." };

  const offer = Math.max(300000, Math.round(Number(offeredCash) || 0));
  const agentBonus = Math.round(getRealisticWeeklyWage(player) * 6);
  const totalUpfront = offer + agentBonus;

  if ((state.budget || 0) < totalUpfront) {
    return {
      ok: false,
      msg: `Fondos insuficientes: oferta (${(offer / 1e6).toFixed(2)}M) + comisión agente (${(agentBonus / 1e6).toFixed(2)}M) = ${(totalUpfront / 1e6).toFixed(2)} M€.`
    };
  }

  const scoutLvl = state.staff?.scout || 1;
  const targetPrice = calculateMarketValue(player, scoutLvl, state);
  const sellerClub = state.clubs[player.clubId]?.name || "Club Vendedor";
  const ratio = offer / Math.max(1, targetPrice);

  // Aceptación directa si ofrece >= 97% (o >= 90% con buen ojeador y azar)
  const acceptThreshold = Math.max(0.88, 0.98 - (scoutLvl - 1) * 0.02);
  if (ratio >= acceptThreshold) {
    const newWage = Math.round(getRealisticWeeklyWage(player) * 1.08);
    store.update(["players", "budget", "clubs", "inbox"], draft => {
      draft.budget -= totalUpfront;
      if (draft.clubs[player.clubId]) {
        draft.clubs[player.clubId].budget = (draft.clubs[player.clubId].budget || 0) + offer;
      }
      const p = draft.players[playerId];
      p.clubId = draft.userClubId;
      p.starter = false;
      p.contractYears = contractYears;
      p.wage = newWage;
      p.morale = 92;

      draft.inbox = [
        {
          id: `neg_ok_${Date.now()}`,
          title: `✍️ Acuerdo Cerrado: ${player.name}`,
          date: `Temporada ${draft.season || 1}`,
          body: `${sellerClub} aceptó tu oferta negociada de <b>${(offer / 1e6).toFixed(2)} M€</b> (+${(agentBonus / 1e6).toFixed(2)} M€ prima de agente, salario ${(newWage / 1000).toFixed(0)}k €/sem).`,
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    });
    return { ok: true, msg: `✅ ¡Traspaso cerrado! ${player.name} firma por ${contractYears} años.` };
  }

  // Contraoferta si ofrece entre 76% y el umbral de aceptación
  if (ratio >= 0.76) {
    const counterPrice = Math.round(((offer + targetPrice * 1.04) / 2) / 100000) * 100000;
    store.update(["inbox"], draft => {
      if (!Array.isArray(draft.inbox)) draft.inbox = [];
      draft.inbox.unshift({
        id: `counter_${player.id}_${Date.now()}`,
        type: "negotiation_counter",
        playerId: player.id,
        counterPrice,
        agentBonus,
        contractYears,
        title: `📨 Contraoferta de ${sellerClub} por ${player.name}`,
        body: `${sellerClub} considera insuficiente tu propuesta de ${(offer / 1e6).toFixed(2)} M€, pero acepta cerrar el trato por <b>${(counterPrice / 1e6).toFixed(2)} M€</b> (+${(agentBonus / 1e6).toFixed(2)} M€ comisión del agente).`,
        date: `Temporada ${draft.season || 1}`,
        resolved: false,
        choices: [
          { label: `Aceptar Contraoferta (${((counterPrice + agentBonus) / 1e6).toFixed(2)} M€ total)` },
          { label: "Romper Negociación" }
        ]
      });
    });
    return {
      ok: true,
      isCounter: true,
      msg: `📨 ${sellerClub} respondió con una contraoferta de ${(counterPrice / 1e6).toFixed(2)} M€. Revisa tu Bandeja IA.`
    };
  }

  return {
    ok: false,
    msg: `❌ ${sellerClub} rechazó de plano los ${(offer / 1e6).toFixed(2)} M€ por ser demasiado bajos (valoración ~${(targetPrice / 1e6).toFixed(2)} M€).`
  };
}

export function resolveNegotiationCounter(eventId, choiceIdx) {
  const state = store.get();
  const ev = (state.inbox || []).find(m => m.id === eventId);
  if (!ev || ev.resolved) return { ok: false };

  const player = state.players?.[ev.playerId];
  if (choiceIdx === 0) {
    if (!player || player.clubId === state.userClubId || player.clubId === "legend_vault") {
      store.update(["inbox"], draft => {
        const item = draft.inbox.find(m => m.id === eventId);
        if (item) {
          item.resolved = true;
          item.chosenLabel = "Jugador ya no disponible";
        }
      });
      return { ok: false, msg: "El jugador ya fue transferido a otro club." };
    }

    const totalCost = (ev.counterPrice || 0) + (ev.agentBonus || 0);
    if ((state.budget || 0) < totalCost) {
      return { ok: false, msg: `Presupuesto insuficiente (necesitas ${(totalCost / 1e6).toFixed(2)} M€).` };
    }

    store.update(["players", "budget", "clubs", "inbox"], draft => {
      draft.budget -= totalCost;
      const p = draft.players[player.id];
      if (draft.clubs[p.clubId]) {
        draft.clubs[p.clubId].budget = (draft.clubs[p.clubId].budget || 0) + ev.counterPrice;
      }
      p.clubId = draft.userClubId;
      p.starter = false;
      p.contractYears = ev.contractYears || 4;
      p.morale = 91;

      const item = draft.inbox.find(m => m.id === eventId);
      if (item) {
        item.resolved = true;
        item.chosenLabel = `Fichado por ${(ev.counterPrice / 1e6).toFixed(2)} M€`;
      }
    });

    return { ok: true, msg: `✅ ¡Contraoferta aceptada! ${player.name} ya es jugador de tu club.` };
  }

  store.update(["inbox"], draft => {
    const item = draft.inbox.find(m => m.id === eventId);
    if (item) {
      item.resolved = true;
      item.chosenLabel = "Negociación cancelada";
    }
  });
  return { ok: true, msg: "Negociación cancelada." };
}

/**
 * Mercado vivo de IA: traspasos autónomos entre clubes rivales cada jornada
 */
export function simulateAiMarketActivity() {
  const state = store.get();
  const winStatus = getTransferWindowStatus(state);
  const triggerChance = winStatus.isDeadlineDay ? 0.78 : 0.34;
  if (Math.random() > triggerChance) return null;

  const humanClubIds = new Set([
    state.userClubId,
    ...(state.mpManagers || []).map(m => m.clubId)
  ]);

  const aiClubs = Object.values(state.clubs || {}).filter(
    c => !humanClubIds.has(c.id) && !c.id.startsWith("ext_")
  );
  if (aiClubs.length < 4) return null;

  const transfersCount = winStatus.isDeadlineDay ? 2 : 1;
  const headlines = [];

  store.update(["players", "clubs", "inbox"], draft => {
    for (let i = 0; i < transfersCount; i++) {
      const buyer = aiClubs[Math.floor(Math.random() * aiClubs.length)];
      const candidates = Object.values(draft.players || {}).filter(
        p =>
          !humanClubIds.has(p.clubId) &&
          p.clubId !== buyer.id &&
          p.clubId !== "legend_vault" &&
          !p.isLoaned &&
          p.ovr >= 76 &&
          p.ovr <= Math.min(89, (buyer.ovr || 78) + 4)
      );
      if (candidates.length === 0) continue;

      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const sellerId = target.clubId;
      const sellerSquadCount = Object.values(draft.players).filter(x => x.clubId === sellerId).length;
      if (sellerId !== "free_agent" && sellerSquadCount <= 14) continue;

      const fee = calculateMarketValue(target, 1, draft);
      const sellerName = sellerId === "free_agent" ? "Agente Libre" : (draft.clubs[sellerId]?.name || "Club Europeo");

      target.clubId = buyer.id;
      target.starter = false;
      target.contractYears = 4;

      if (sellerId !== "free_agent" && draft.clubs[sellerId]) {
        draft.clubs[sellerId].budget = (draft.clubs[sellerId].budget || 0) + fee;
      }

      headlines.push(
        `• <b>${target.name}</b> (${target.pos}, OVR ${target.ovr}): <i>${sellerName}</i> → <b>${buyer.name}</b> por <b>${(fee / 1e6).toFixed(1)} M€</b>`
      );
    }

    if (headlines.length > 0) {
      if (!Array.isArray(draft.inbox)) draft.inbox = [];
      draft.inbox.unshift({
        id: `ai_mkt_${Date.now()}`,
        title: winStatus.isDeadlineDay
          ? "🚨 Boletín Deadline Day: Movimientos Oficiales"
          : "📰 Mercado Internacional: Fichajes de Rivales",
        body: `Los clubes europeos siguen reforzándose:<br><br>${headlines.join("<br>")}`,
        date: `Temporada ${draft.season || 1}`,
        resolved: true,
        choices: []
      });
    }
  });

  return headlines;
}