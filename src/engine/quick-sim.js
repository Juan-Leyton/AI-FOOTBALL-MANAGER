import { store } from "../core/state.js";
import { getNextUserEvent, completeRoundWithUserResult } from "./competitions.js";
import { processRoundProgression, recordMatchInCareer } from "./progression.js";
import { advanceMedicalRecovery, isPlayerUnavailable } from "./medical.js";
import { assignPlayersToSlots } from "./match-live.js";
import { getDefaultRoleForPos, getRoleConfig } from "./tactics-roles.js";
import { triggerPostMatchEvent } from "../ai/director.js";
import { maybeGenerateIncomingOffer } from "./transfers.js";

function samplePoissonGoals(lambda) {
  let g = 0;
  let p = Math.exp(-lambda);
  let s = p;
  const r = Math.random();
  while (r > s && g < 7) {
    g++;
    p *= lambda / g;
    s += p;
  }
  return g;
}

/**
 * Calcula la fuerza real ofensiva y defensiva de un club según su XI titular disponible,
 * penalizaciones por jugar fuera de posición, fatiga (stamina), moral y roles tácticos.
 */
function evaluateClubLineupStrength(state, clubId) {
  const club = state.clubs?.[clubId];
  const formation = club?.formation || "4-3-3";
  let starters = Object.values(state.players || {}).filter(
    p => p.clubId === clubId && p.starter && !isPlayerUnavailable(p)
  );

  // Si es un club de la IA con menos de 11 marcados, completamos con sus mejores disponibles
  if (starters.length < 11) {
    const extras = Object.values(state.players || {})
      .filter(p => p.clubId === clubId && !p.starter && !isPlayerUnavailable(p))
      .sort((a, b) => b.ovr - a.ovr);
    starters = [...starters, ...extras.slice(0, 11 - starters.length)];
  }

  if (starters.length === 0) {
    const base = club?.ovr || 75;
    return { atkOvr: base, defOvr: base, overallOvr: base };
  }

  const assigned = assignPlayersToSlots(starters.slice(0, 11), formation);
  let totalAtk = 0;
  let totalDef = 0;
  let count = 0;

  assigned.forEach(({ slot, player, outOfPosition }, idx) => {
    if (!player) return;
    const posPenalty = outOfPosition ? 8 : 0;
    const stamina = player.stamina ?? 95;
    // Penalización progresiva si juega cansado (< 75% de energía)
    const fatiguePenalty = stamina < 75 ? (75 - stamina) * 0.14 : 0;
    const morale = player.morale ?? 80;
    const moraleMod = (morale - 75) * 0.05;

    const roleId = club?.slotRoles?.[idx] || getDefaultRoleForPos(slot.pos);
    const roleCfg = getRoleConfig(slot.pos, roleId);

    const effectiveBase = Math.max(50, player.ovr - posPenalty - fatiguePenalty + moraleMod);
    const isAttackingUnit = slot.pos === "DEL" || slot.pos === "MED";
    const isDefendingUnit = slot.pos === "POR" || slot.pos === "DEF" || slot.pos === "MED";

    const atkVal = effectiveBase + (roleCfg.atkBonus || 0) * (isAttackingUnit ? 0.55 : 0.25);
    const defVal = effectiveBase + (roleCfg.defBonus || 0) * (isDefendingUnit ? 0.55 : 0.25);

    totalAtk += atkVal;
    totalDef += defVal;
    count++;
  });

  const atkOvr = count > 0 ? totalAtk / count : (club?.ovr || 75);
  const defOvr = count > 0 ? totalDef / count : (club?.ovr || 75);
  return {
    atkOvr,
    defOvr,
    overallOvr: (atkOvr + defOvr) / 2
  };
}

export function simulateQuickMatch() {
  const state = store.get();
  const uid = state.userClubId;
  const nextEvent = getNextUserEvent(state);
  if (!uid || !nextEvent) {
    return { ok: false, msg: "No hay ningún partido pendiente en este momento." };
  }

  const userSquad = Object.values(state.players || {}).filter(p => p.clubId === uid);
  const validStarters = userSquad.filter(p => p.starter && !isPlayerUnavailable(p));
  if (validStarters.length !== 11) {
    return {
      ok: false,
      needsLineup: true,
      msg: `Necesitas 11 titulares disponibles (tienes ${validStarters.length}). Usa "⚡ Mejor XI" o ajusta tu plantilla.`
    };
  }

  const [homeId, awayId] = nextEvent.match;
  const homeClub = state.clubs[homeId];
  const awayClub = state.clubs[awayId];
  const isUserHome = homeId === uid;
  const isKnockout = nextEvent.compId === "cup_1" || nextEvent.compId === "cont_1";

  const userMentality = state.clubs[uid]?.tactics?.mentality ?? 55;
  const mentalityBoost = (userMentality - 50) * 0.008;

  // Evaluamos el XI titular real de ambos equipos (ataque vs defensa rival + localía)
  const homeStrength = evaluateClubLineupStrength(state, homeId);
  const awayStrength = evaluateClubLineupStrength(state, awayId);

  const homeAtkEdge = (homeStrength.atkOvr + 2.2) - awayStrength.defOvr;
  const awayAtkEdge = awayStrength.atkOvr - (homeStrength.defOvr + 1.8);

  const homeLambda = Math.max(0.35, 1.38 + homeAtkEdge * 0.065 + (isUserHome ? mentalityBoost : -mentalityBoost * 0.5));
  const awayLambda = Math.max(0.35, 1.15 + awayAtkEdge * 0.055 + (!isUserHome ? mentalityBoost : -mentalityBoost * 0.5));

  let gh = samplePoissonGoals(homeLambda);
  let ga = samplePoissonGoals(awayLambda);
  let penNote = "";

  if (isKnockout && gh === ga) {
    if (Math.random() < 0.52) {
      gh += 1;
      penNote = " (Tras prórroga/penales)";
    } else {
      ga += 1;
      penNote = " (Tras prórroga/penales)";
    }
  }

  // Desgaste físico post-partido para los 11 titulares del usuario
  store.update(["players"], draft => {
    validStarters.forEach(sp => {
      const p = draft.players[sp.id];
      if (p) {
        p.stamina = Math.max(42, (p.stamina ?? 95) - (14 + Math.floor(Math.random() * 10)));
      }
    });
  });

  advanceMedicalRecovery();
  completeRoundWithUserResult(homeId, awayId, gh, ga, nextEvent.compId);
  recordMatchInCareer(gh, ga);
  processRoundProgression(isUserHome);
  triggerPostMatchEvent();
  maybeGenerateIncomingOffer();

  const userGoals = isUserHome ? gh : ga;
  const rivalGoals = isUserHome ? ga : gh;
  const outcomeTag = userGoals > rivalGoals ? "Victoria" : userGoals < rivalGoals ? "Derrota" : "Empate";

  const afterState = store.get();
  const seasonFinished = (afterState.competitions?.league_1?.currentRound || 0) >= (afterState.competitions?.league_1?.schedule?.length || 22);

  return {
    ok: true,
    seasonFinished,
    outcome: userGoals > rivalGoals ? "success" : userGoals < rivalGoals ? "error" : "info",
    msg: `${outcomeTag} en Simulación Rápida: <b>${homeClub.name} ${gh} - ${ga} ${awayClub.name}</b>${penNote}`
  };
}