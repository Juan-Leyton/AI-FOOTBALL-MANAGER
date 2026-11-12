import { store } from "../core/state.js";
import { calculateMarketValue } from "./transfers.js";

export const SPONSORS_CATALOG = [
  { id: "sp_local", name: "Banco Regional", weekly: 350000, winBonus: 120000, minOvr: 0, desc: "Ingreso fijo seguro cada jornada." },
  { id: "sp_aero", name: "SkyFly Airlines", weekly: 650000, winBonus: 250000, minOvr: 76, desc: "Patrocinio continental con buena prima por victoria." },
  { id: "sp_tech", name: "NovaTech Global", weekly: 1050000, winBonus: 420000, minOvr: 81, desc: "Contrato élite para clubes aspirantes al título." },
  { id: "sp_titan", name: "Apex Sovereign Energy", weekly: 1550000, winBonus: 650000, minOvr: 85, desc: "Megacontrato exclusivo para potencias mundiales." }
];

// Salario semanal realista según OVR y edad
export function getRealisticWeeklyWage(player) {
  if (!player) return 25000;
  if (player.wage && player.wage > 0) return player.wage;
  const ovr = player.ovr || 75;
  const base = Math.pow(Math.max(1, ovr - 62), 2.35) * 420;
  const ageFactor = player.age >= 32 ? 0.85 : player.age <= 20 ? 0.65 : 1.0;
  return Math.round((base * ageFactor) / 1000) * 1000;
}

// Cláusula de rescisión realista (1.45x a 2.1x valor de mercado según edad y contrato)
export function getReleaseClause(player) {
  const baseVal = calculateMarketValue(player, 1);
  const youthMult = player.age <= 22 ? 1.85 : player.age <= 27 ? 1.60 : 1.35;
  const contractMult = 1 + ((player.contractYears || 2) * 0.08);
  return Math.round((baseVal * youthMult * contractMult) / 100000) * 100000;
}

// Detecta si estamos en ventana de fichajes o Deadline Day
export function getTransferWindowStatus(state) {
  const round = (state.competitions?.league_1?.currentRound || 0) + 1;
  if (round === 2 || round === 12) {
    return {
      isOpen: true,
      isDeadlineDay: true,
      label: "🚨 DEADLINE DAY (Último día de mercado — precios volátiles)",
      priceMult: 1.12
    };
  }
  if (round === 1 || round === 11) {
    return {
      isOpen: true,
      isDeadlineDay: false,
      label: "🟢 Ventana de Fichajes Abierta",
      priceMult: 1.0
    };
  }
  return {
    isOpen: true,
    isDeadlineDay: false,
    label: "🟡 Mercado Regular (Precios estándar)",
    priceMult: 1.0
  };
}

// Resumen financiero completo del club del usuario
export function getClubFinancialBreakdown(state) {
  const club = state.clubs?.[state.userClubId];
  if (!club) return null;

  const squad = Object.values(state.players || {}).filter(p => p.clubId === club.id);
  const totalWeeklyWages = squad.reduce((sum, p) => sum + getRealisticWeeklyWage(p), 0);
  const staff = state.staff || { fitness: 1, scout: 1, youth: 1, stadium: 1 };
  const staffUpkeep = ((staff.fitness + staff.scout + staff.youth + staff.stadium) - 4) * 55000;

  const sponsorId = club.sponsorId || "sp_local";
  const sponsor = SPONSORS_CATALOG.find(s => s.id === sponsorId) || SPONSORS_CATALOG[0];

  const stadiumLvl = staff.stadium || 1;
  const estTicketAvg = Math.round((28000 + stadiumLvl * 9500) * (14 + (club.ovr - 70) * 0.9) * 0.45);
  const projectedWeeklyNet = (sponsor.weekly + estTicketAvg) - (totalWeeklyWages + staffUpkeep);

  return {
    squadCount: squad.length,
    totalWeeklyWages,
    staffUpkeep,
    sponsor,
    estTicketAvg,
    projectedWeeklyNet
  };
}

export function selectClubSponsor(sponsorId) {
  const state = store.get();
  const club = state.clubs?.[state.userClubId];
  const sp = SPONSORS_CATALOG.find(s => s.id === sponsorId);
  if (!club || !sp) return { ok: false, msg: "Patrocinador no válido." };
  if ((club.ovr || 75) < sp.minOvr) {
    return { ok: false, msg: `${sp.name} exige un club con OVR mínimo de ${sp.minOvr}.` };
  }

  store.update(["clubs"], draft => {
    draft.clubs[club.id].sponsorId = sp.id;
  });
  return { ok: true, msg: `🤝 Nuevo patrocinador firmado: ${sp.name} (+${(sp.weekly / 1e6).toFixed(2)} M€/sem).` };
}

// Pagar cláusula de rescisión (fichaje directo sin que el club rival pueda negarse)
export function payReleaseClause(targetPlayerId) {
  const state = store.get();
  const target = state.players?.[targetPlayerId];
  const userClub = state.clubs?.[state.userClubId];
  if (!target || !userClub || target.clubId === userClub.id || target.clubId === "free_agent") {
    return { ok: false, msg: "Este jugador no tiene cláusula activa." };
  }

  const squadSize = Object.values(state.players || {}).filter(p => p.clubId === userClub.id).length;
  if (squadSize >= 28) return { ok: false, msg: "Plantilla llena (máximo 28 jugadores)." };

  const clause = getReleaseClause(target);
  if ((state.budget || 0) < clause) {
    return { ok: false, msg: `Fondos insuficientes. La cláusula es de ${(clause / 1e6).toFixed(2)} M€.` };
  }

  const sellerClub = state.clubs[target.clubId];
  store.update(["budget", "players", "clubs", "inbox"], draft => {
    draft.budget -= clause;
    if (sellerClub && draft.clubs[sellerClub.id]) {
      draft.clubs[sellerClub.id].budget = (draft.clubs[sellerClub.id].budget || 0) + clause;
    }
    draft.players[target.id].clubId = userClub.id;
    draft.players[target.id].starter = false;
    draft.players[target.id].contractYears = 4;
    draft.players[target.id].morale = 94;

    draft.inbox = [
      {
        id: `clause_${Date.now()}`,
        title: `💣 ¡Cláusula Ejecutada! ${target.name}`,
        body: `Has depositado los ${(clause / 1e6).toFixed(2)} M€ de la cláusula de rescisión de ${target.name}. El ${sellerClub?.name || "club vendedor"} no pudo bloquear la operación.`,
        date: `T${draft.season || 1}`,
        resolved: true
      },
      ...(draft.inbox || [])
    ].slice(0, 25);
  });

  return { ok: true, msg: `💣 ¡Cláusula pagada! ${target.name} es nuevo jugador de ${userClub.name}.` };
}

// Oferta de Trueque: Jugador propio + Dinero por Jugador objetivo
export function proposePlayerSwap(targetPlayerId, offeredPlayerId, cashOffered) {
  const state = store.get();
  const target = state.players?.[targetPlayerId];
  const offered = state.players?.[offeredPlayerId];
  const userClub = state.clubs?.[state.userClubId];

  if (!target || !offered || !userClub) return { ok: false, msg: "Selecciona ambos jugadores para el intercambio." };
  if (target.clubId === userClub.id || target.clubId === "free_agent") return { ok: false, msg: "El jugador objetivo no pertenece a un club negociable." };
  if (offered.clubId !== userClub.id) return { ok: false, msg: "El jugador ofrecido debe pertenecer a tu plantilla." };
  if (offered.isLoaned) return { ok: false, msg: "No puedes incluir un jugador cedido en un trueque." };

  const cash = Math.max(0, Number(cashOffered) || 0);
  if ((state.budget || 0) < cash) return { ok: false, msg: "No tienes suficiente presupuesto para el efectivo incluido." };

  const scoutLvl = state.staff?.scout || 1;
  const winStatus = getTransferWindowStatus(state);
  const targetVal = Math.round(calculateMarketValue(target, scoutLvl) * winStatus.priceMult);
  const offeredVal = Math.round(calculateMarketValue(offered, 1) * 0.92);

  // El club rival valora si necesita esa posición
  const sellerClub = state.clubs[target.clubId];
  const sellerSquad = Object.values(state.players || {}).filter(p => p.clubId === target.clubId);
  const samePosCount = sellerSquad.filter(p => p.pos === offered.pos).length;
  const posNeedBonus = samePosCount <= 3 ? 1.12 : 0.95;

  const totalPackageValue = (offeredVal * posNeedBonus) + cash;
  const ratio = totalPackageValue / Math.max(1, targetVal);

  if (ratio < 0.94) {
    const missing = Math.ceil((targetVal * 0.96 - totalPackageValue) / 100000) * 100000;
    return {
      ok: false,
      msg: `❌ ${sellerClub?.name || "El club rival"} rechaza el trueque: consideran que faltan aprox. ${(missing / 1e6).toFixed(2)} M€ adicionales.`
    };
  }

  store.update(["budget", "players", "clubs", "inbox"], draft => {
    draft.budget -= cash;
    if (sellerClub && draft.clubs[sellerClub.id]) {
      draft.clubs[sellerClub.id].budget = (draft.clubs[sellerClub.id].budget || 0) + cash;
    }

    // Jugador objetivo llega al club del usuario
    draft.players[target.id].clubId = userClub.id;
    draft.players[target.id].starter = false;
    draft.players[target.id].contractYears = 4;
    draft.players[target.id].morale = 90;

    // Jugador ofrecido va al club rival
    draft.players[offered.id].clubId = target.clubId;
    draft.players[offered.id].starter = false;
    draft.players[offered.id].morale = 80;

    draft.inbox = [
      {
        id: `swap_${Date.now()}`,
        title: `🔄 Trueque Cerrado con ${sellerClub?.name || "Rival"}`,
        body: `Intercambio oficial: ${target.name} (OVR ${target.ovr}) llega a tu club a cambio de ${offered.name} (OVR ${offered.ovr})${cash > 0 ? ` + ${(cash / 1e6).toFixed(2)} M€` : ""}.`,
        date: `T${draft.season || 1}`,
        resolved: true
      },
      ...(draft.inbox || [])
    ].slice(0, 25);
  });

  return {
    ok: true,
    msg: `✅ ¡Trueque aceptado! ${target.name} llega por ${offered.name}${cash > 0 ? ` + ${(cash / 1e6).toFixed(2)} M€` : ""}.`
  };
}