/**
 * src/engine/legends-pool.js - Pool exclusivo de Leyendas Mundiales
 * Vías de obtención: Recompensas por títulos, Subastas Secretas y Regens Élite.
 */

import { store } from "../core/state.js";
import { calculateMarketValue } from "./transfers.js";
import { getRealisticWeeklyWage } from "./economy-market.js";

export function getLockedWorldIcons(state) {
  return Object.values(state.players || {}).filter(
    p => p.isWorldIcon && p.clubId === "legend_vault"
  );
}

/**
 * 1. Recompensa por Título: Desbloquea una Leyenda en Bandeja IA al ganar un trofeo
 */
export function grantTitleLegendReward(trophyTitle) {
  const state = store.get();
  const locked = getLockedWorldIcons(state);
  if (locked.length === 0) return null;

  // Evitar duplicar oferta si ya hay una subasta/recompensa pendiente por esa leyenda
  const pendingIds = new Set(
    (state.inbox || [])
      .filter(m => !m.resolved && m.legendId)
      .map(m => m.legendId)
  );
  const candidates = locked.filter(ic => !pendingIds.has(ic.id));
  if (candidates.length === 0) return null;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const cashAlt = 25000000;

  store.update(["inbox"], draft => {
    if (!Array.isArray(draft.inbox)) draft.inbox = [];
    draft.inbox.unshift({
      id: `legend_reward_${chosen.id}_${Date.now()}`,
      type: "legend_unlock",
      legendId: chosen.id,
      price: 0,
      cashAlt,
      title: `👑 Recompensa de Campeón: ${chosen.flag || ""} ${chosen.name} (${chosen.ovr} OVR)`,
      body: `Tras conquistar <b>${trophyTitle}</b>, la Fundación Mundial de Leyendas ha desbloqueado a <b>${chosen.flag || ""} ${chosen.name}</b> (${chosen.pos}, OVR ${chosen.ovr}) para que se una a tu proyecto histórico sin coste de traspaso.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: false,
      choices: [
        { label: `👑 Incorporar a ${chosen.name} (0 M€)` },
        { label: `💰 Canjear por Bono de Título (+${(cashAlt / 1e6).toFixed(0)} M€)` }
      ]
    });
  });

  return chosen;
}

/**
 * 2. Subasta Secreta: Invitación exclusiva en Bandeja IA para pujar por un Ícono
 */
export function maybeTriggerSecretLegendAuction() {
  const state = store.get();
  const locked = getLockedWorldIcons(state);
  if (locked.length === 0) return false;

  // Probabilidad moderada (14%) y requiere tener músculo financiero (>= 65M€) o confianza >= 85
  const hasFinancialMuscle = (state.budget || 0) >= 65000000;
  const hasPrestige = (state.boardConfidence || 80) >= 88 && (state.careerStats?.wins || 0) >= 5;
  if (!hasFinancialMuscle && !hasPrestige) return false;
  if (Math.random() > 0.14) return false;

  const pendingIds = new Set(
    (state.inbox || [])
      .filter(m => !m.resolved && m.legendId)
      .map(m => m.legendId)
  );
  const candidates = locked.filter(ic => !pendingIds.has(ic.id));
  if (candidates.length === 0) return false;

  const icon = candidates[Math.floor(Math.random() * candidates.length)];
  const auctionPrice = Math.min(200000000, Math.max(115000000, calculateMarketValue(icon, 1)));

  store.update(["inbox"], draft => {
    if (!Array.isArray(draft.inbox)) draft.inbox = [];
    draft.inbox.unshift({
      id: `legend_auction_${icon.id}_${Date.now()}`,
      type: "legend_unlock",
      legendId: icon.id,
      price: auctionPrice,
      cashAlt: 0,
      title: `🕶️ Subasta Secreta VIP: ${icon.flag || ""} ${icon.name} (${icon.ovr} OVR)`,
      body: `Un consorcio privado ha abierto una subasta confidencial de 24 horas por los derechos federativos de <b>${icon.flag || ""} ${icon.name}</b> (${icon.pos}, ${icon.age} años, OVR ${icon.ovr}). Precio de adjudicación directa: <b>${(auctionPrice / 1e6).toFixed(1)} M€</b>.`,
      date: `Temporada ${draft.season || 1}`,
      resolved: false,
      choices: [
        { label: `🔨 Ganar Subasta (-${(auctionPrice / 1e6).toFixed(1)} M€)` },
        { label: "Declinar Invitación" }
      ]
    });
  });

  return true;
}

/**
 * Resolución de elección en Bandeja IA para Subastas Secretas y Recompensas por Títulos
 */
export function resolveLegendUnlockChoice(eventId, choiceIdx) {
  const state = store.get();
  const ev = (state.inbox || []).find(m => m.id === eventId);
  if (!ev || ev.resolved) return { ok: false };

  const legend = state.players?.[ev.legendId];

  if (choiceIdx === 0) {
    if (!legend || legend.clubId !== "legend_vault") {
      store.update(["inbox"], draft => {
        const item = draft.inbox.find(m => m.id === eventId);
        if (item) {
          item.resolved = true;
          item.chosenLabel = "Leyenda ya adquirida por otro club";
        }
      });
      return { ok: false, msg: "Esta leyenda ya no está disponible en la bóveda." };
    }

    const price = ev.price || 0;
    if ((state.budget || 0) < price) {
      if (typeof alert === "function") {
        alert(`Presupuesto insuficiente: necesitas ${(price / 1e6).toFixed(1)} M€ para adjudicarte a ${legend.name}.`);
      }
      return { ok: false, msg: `Necesitas ${(price / 1e6).toFixed(1)} M€.` };
    }

    const squadSize = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId).length;
    if (squadSize >= 28) {
      if (typeof alert === "function") {
        alert("Plantilla completa (28 jugadores). Vende o libera a un jugador antes de incorporar a la leyenda.");
      }
      return { ok: false, msg: "Plantilla completa (máximo 28 jugadores)." };
    }

    store.update(["budget", "players", "inbox"], draft => {
      draft.budget -= price;
      const p = draft.players[legend.id];
      p.clubId = draft.userClubId;
      p.starter = false;
      p.contractYears = 4;
      p.morale = 98;
      p.wage = getRealisticWeeklyWage({ ...p, wage: 0 });

      const item = draft.inbox.find(m => m.id === eventId);
      if (item) {
        item.resolved = true;
        item.chosenLabel = price > 0
          ? `👑 Fichado en Subasta (-${(price / 1e6).toFixed(1)} M€)`
          : `👑 Incorporado como Recompensa de Campeón`;
      }
    });

    return { ok: true, msg: `👑 ¡${legend.name} se une a tu club!` };
  }

  // Opción 1: Canjear bono en efectivo o declinar subasta
  store.update(["budget", "inbox"], draft => {
    if (ev.cashAlt > 0) {
      draft.budget += ev.cashAlt;
    }
    const item = draft.inbox.find(m => m.id === eventId);
    if (item) {
      item.resolved = true;
      item.chosenLabel = ev.cashAlt > 0
        ? `💰 Bono cobrado (+${(ev.cashAlt / 1e6).toFixed(0)} M€)`
        : "Subasta declinada";
    }
  });

  return { ok: true };
}

/**
 * 3. Regens Élite de Leyendas: Genera una promesa joven heredera al cierre de temporada
 */
export function spawnEliteLegendRegen(preferUserClub = false) {
  const state = store.get();
  const locked = getLockedWorldIcons(state);
  if (locked.length === 0) return null;

  const templateIcon = locked[Math.floor(Math.random() * locked.length)];
  const allClubIds = Object.keys(state.clubs || {}).filter(id => !id.startsWith("ext_"));
  if (allClubIds.length === 0) return null;

  const targetClubId = (preferUserClub && state.userClubId)
    ? state.userClubId
    : allClubIds[Math.floor(Math.random() * allClubIds.length)];

  const regenId = `regen_${templateIcon.id}_s${state.season || 1}_${Date.now()}`;
  const lastName = templateIcon.name.split(" ").pop();
  const regenName = `${lastName} Jr.`;
  const regenOvr = 77 + Math.floor(Math.random() * 4); // 77 - 80 OVR inicial con 17 años

  store.update(["players"], draft => {
    draft.players[regenId] = {
      id: regenId,
      name: regenName,
      age: 17,
      pos: templateIcon.pos,
      ovr: regenOvr,
      potential: 95,
      nationality: templateIcon.nationality,
      natCode: templateIcon.natCode,
      flag: templateIcon.flag,
      clubId: targetClubId,
      starter: false,
      stamina: 99,
      morale: 92,
      contractYears: 4,
      goals: 0,
      isYouth: true,
      isRegen: true,
      isEliteLegendRegen: true,
      mentorLegendName: templateIcon.name,
      customBoosts: { ...templateIcon.customBoosts }
    };
  });

  return {
    regenName,
    mentorName: templateIcon.name,
    pos: templateIcon.pos,
    ovr: regenOvr,
    flag: templateIcon.flag,
    clubName: state.clubs[targetClubId]?.name || "-"
  };
}