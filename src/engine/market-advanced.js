import { store } from "../core/state.js";
import { calculateMarketValue } from "./transfers.js";

export function makeLowballOffer(playerId) {
  const state = store.get();
  const player = state.players?.[playerId];
  if (!player) return { ok: false, msg: "Jugador no encontrado." };
  if (player.clubId === state.userClubId) return { ok: false, msg: "Este jugador ya pertenece a tu plantilla." };

  const scoutLvl = state.staff?.scout || 1;
  const fullVal = calculateMarketValue(player, scoutLvl);
  const lowOffer = Math.round(fullVal * 0.82);

  if ((state.budget || 0) < lowOffer) {
    return { ok: false, msg: `Presupuesto insuficiente. Necesitas ${(lowOffer / 1e6).toFixed(2)} M€ para lanzar esta oferta.` };
  }

  // Probabilidad base 38% + 11% por cada nivel de Ojeador
  const successChance = Math.min(0.88, 0.38 + (scoutLvl - 1) * 0.11);
  const sellerClub = state.clubs[player.clubId]?.name || "El club vendedor";

  if (Math.random() <= successChance) {
    store.update(["players", "budget", "inbox"], draft => {
      draft.budget -= lowOffer;
      draft.players[playerId].clubId = draft.userClubId;
      draft.players[playerId].starter = false;
      draft.players[playerId].contractYears = 3;
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
  const fullVal = calculateMarketValue(player, scoutLvl);
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