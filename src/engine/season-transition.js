import { store } from "../core/state.js";
import { initCompetitions } from "./competitions.js";
import { processSeasonRetirementsAndRegens } from "./world-longevity.js";
import { grantManagerXp, ensureCareerHooksState } from "./career-hooks.js";

function getTopLeagueClubs(leagueObj, count = 2) {
  if (!leagueObj?.standings) return [];
  return Object.entries(leagueObj.standings)
    .map(([cid, st]) => ({ cid, ...st }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga))
    .slice(0, count)
    .map(item => item.cid);
}

export function runEndOfSeasonTransition() {
  const state = store.get();
  const prevSeason = state.season || 1;
  const nextSeason = prevSeason + 1;
  const uid = state.userClubId;
  const comps = state.competitions || {};

  // 1. Calcular Bota de Oro y Balón de Oro entre los 864 jugadores
  const allPlayers = Object.values(state.players || {});
  const goldenBootWinner = [...allPlayers].sort((a, b) => (b.goals || 0) - (a.goals || 0) || b.ovr - a.ovr)[0];
  const ballonDorWinner = [...allPlayers].sort((a, b) => (b.ovr + (b.goals || 0) * 0.45) - (a.ovr + (a.goals || 0) * 0.45))[0];

  let awardBonus = 0;
  let confBonus = 0;
  if (goldenBootWinner?.clubId === uid && (goldenBootWinner.goals || 0) > 0) {
    awardBonus += 3000000;
    confBonus += 5;
  }
  if (ballonDorWinner?.clubId === uid) {
    awardBonus += 5000000;
    confBonus += 8;
  }

  // 2. Obtener los 8 clasificados reales por méritos (Top 2 de cada una de las 4 ligas)
  const qualifiedEurope = [
    ...getTopLeagueClubs(comps.league_1, 2),
    ...Object.values(comps.otherLeagues || {}).flatMap(ol => getTopLeagueClubs(ol, 2))
  ].slice(0, 8);

  // 3. Comprobar si el usuario ganó Liga o Copa para Supercopa de Apertura
  const l1Sorted = getTopLeagueClubs(comps.league_1, 1);
  const wonLeague = l1Sorted[0] === uid;
  const wonCup = comps.cup_1?.championId === uid;
  const supercupWon = wonLeague || wonCup;
  const supercupPrize = supercupWon ? 4000000 : 0;

  store.update(["season", "players", "clubs", "competitions", "budget", "boardConfidence", "trophies", "inbox", "lastYouthSeason"], draft => {
    draft.season = nextSeason;
    draft.lastYouthSeason = 0;

    // Devolver cedidos, envejecer 1 año, evolucionar OVR y reiniciar goles/tarjetas
    Object.values(draft.players || {}).forEach(p => {
      if (p.isLoaned && p.loanFromClubId && draft.clubs[p.loanFromClubId]) {
        p.clubId = p.loanFromClubId;
        p.isLoaned = false;
        p.loanFromClubId = null;
        p.starter = false;
      }

      p.age = (p.age || 24) + 1;
      p.goals = 0;
      p.yellowCardsSeason = 0;
      p.injuredMatches = 0;
      p.suspendedMatches = 0;
      p.stamina = 98;

      if (p.contractYears && p.contractYears > 1) {
        p.contractYears -= 1;
      }

      // Evolución de OVR según edad
      if (p.age <= 23) {
        p.ovr = Math.min(94, p.ovr + (Math.random() < 0.7 ? 2 : 1));
      } else if (p.age <= 28) {
        p.ovr = Math.min(94, p.ovr + (Math.random() < 0.35 ? 1 : 0));
      } else if (p.age >= 33) {
        p.ovr = Math.max(65, p.ovr - 1);
      }

      // Si un veterano llega a 37, se regenera como promesa joven de 18 años en el mismo club
      if (p.age >= 37) {
        p.age = 18;
        p.ovr = Math.max(68, (draft.clubs[p.clubId]?.ovr || 75) - 6);
        p.contractYears = 4;
        p.starter = false;
      }
    });

    // Reiniciar competiciones para la nueva temporada
    const newComps = initCompetitions(draft.clubs, uid);

    // Inyectar los 8 clasificados reales por mérito deportivo en la Copa Continental Élite
    if (qualifiedEurope.length === 8 && newComps.cont_1) {
      const shuffled = [...qualifiedEurope].sort(() => Math.random() - 0.5);
      const qf = [];
      for (let i = 0; i < 8; i += 2) {
        qf.push([shuffled[i], shuffled[i + 1]]);
      }
      newComps.cont_1.rounds = [qf];
      newComps.cont_1.currentStage = 0;
      newComps.cont_1.championId = null;
    }

    draft.competitions = newComps;

    // Presupuesto base de nueva temporada + premios + Supercopa
    const tvRights = 22000000;
    draft.budget = (draft.budget || 0) + tvRights + awardBonus + supercupPrize;
    draft.boardConfidence = Math.min(100, (draft.boardConfidence || 80) + confBonus);

    if (supercupWon) {
      draft.trophies = [...(draft.trophies || []), { title: "Supercopa de Apertura", season: nextSeason }];
    }

    const gbClub = draft.clubs[goldenBootWinner?.clubId]?.name || "-";
    const bdClub = draft.clubs[ballonDorWinner?.clubId]?.name || "-";
    const userInEurope = qualifiedEurope.includes(uid);

    draft.inbox = [
      {
        id: `season_gala_${nextSeason}_${Date.now()}`,
        title: `🏆 Gala Oficial Fin de Temporada ${prevSeason} → Inicio T${nextSeason}`,
        date: `Temporada ${nextSeason}`,
        body: `
          🌟 <b>Balón de Oro:</b> ${ballonDorWinner?.name || "-"} (${bdClub}, OVR ${ballonDorWinner?.ovr || "-"})<br>
          👟 <b>Bota de Oro:</b> ${goldenBootWinner?.name || "-"} (${gbClub}, ${goldenBootWinner?.goals || 0} goles)<br>
          🌍 <b>Europa T${nextSeason}:</b> ${userInEurope ? "¡Clasificado por méritos deportivos a la Copa Continental Élite!" : "No entraste en el Top 2 de liga para Europa esta campaña."}<br>
          💰 <b>Ingresos Derechos TV:</b> +22.00 M€ ${supercupWon ? `| 🏆 Supercopa ganada (+4.00 M€)` : ""} ${awardBonus > 0 ? `| 🏅 Bono Premios (+${(awardBonus / 1e6).toFixed(1)} M€)` : ""}
        `,
        choices: [],
        resolved: true
      },
      ...(draft.inbox || [])
    ];
  });
}