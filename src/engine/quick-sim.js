import { store } from "../core/state.js";
import { getNextUserEvent, completeRoundWithUserResult } from "./competitions.js";
import { processRoundProgression, recordMatchInCareer } from "./progression.js";
import { advanceMedicalRecovery, isPlayerUnavailable } from "./medical.js";
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

  const homeOvr = (homeClub?.ovr || 75) + 2.2;
  const awayOvr = awayClub?.ovr || 75;
  const diff = homeOvr - awayOvr;

  const homeLambda = Math.max(0.35, 1.38 + diff * 0.065 + (isUserHome ? mentalityBoost : -mentalityBoost * 0.5));
  const awayLambda = Math.max(0.35, 1.15 - diff * 0.055 + (!isUserHome ? mentalityBoost : -mentalityBoost * 0.5));

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

  // Desgaste físico ligero post-partido para los 11 titulares del usuario
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