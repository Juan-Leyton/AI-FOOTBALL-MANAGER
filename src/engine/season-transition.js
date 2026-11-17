import { store } from "../core/state.js";
import { initCompetitions, initLeagueCoefficients, isSouthAmericanClub } from "./competitions.js";
import { grantTitleLegendReward, spawnEliteLegendRegen } from "./legends-pool.js";

function getSortedStandings(leagueObj) {
  if (!leagueObj?.standings) return [];
  return Object.entries(leagueObj.standings)
    .map(([cid, st]) => ({ cid, ...st }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
}

function getTopLeagueClubs(leagueObj, count = 2) {
  return getSortedStandings(leagueObj)
    .slice(0, count)
    .map(item => item.cid);
}

function simulateTwoLegTie(clubA, clubB) {
  const diff = ((clubA?.ovr || 72) - (clubB?.ovr || 72)) / 12;
  const leg1A = Math.max(0, Math.round((1.35 + diff) * (0.4 + Math.random() * 1.2)));
  const leg1B = Math.max(0, Math.round((1.1 - diff) * (0.4 + Math.random() * 1.2)));
  const leg2B = Math.max(0, Math.round((1.35 - diff) * (0.4 + Math.random() * 1.2)));
  const leg2A = Math.max(0, Math.round((1.1 + diff) * (0.4 + Math.random() * 1.2)));

  const aggA = leg1A + leg2A;
  const aggB = leg1B + leg2B;
  const winnerId = aggA > aggB ? clubA.id : aggB > aggA ? clubB.id : Math.random() < 0.55 ? clubA.id : clubB.id;
  return { winnerId, scoreText: `${aggA}-${aggB} global` };
}

function processPromotionRelegation(draft, comps) {
  const allLeagues = [comps.league_1, ...Object.values(comps.otherLeagues || {})].filter(Boolean);
  const tier1Leagues = allLeagues.filter(lg => (lg.tier ?? 1) === 1 && lg.childLeagueId);
  const summaryLines = [];

  tier1Leagues.forEach(t1 => {
    const t2 = allLeagues.find(lg => lg.realId === t1.childLeagueId || lg.id === t1.childLeagueId);
    if (!t2) return;

    const sorted1 = getSortedStandings(t1);
    const sorted2 = getSortedStandings(t2);
    if (sorted1.length < 6 || sorted2.length < 6) return;

    // 3 últimos de 1ª descienden; 2 primeros de 2ª ascienden directo + ganador Playoff (3º al 6º ida y vuelta)
    const relegatedIds = sorted1.slice(-3).map(x => x.cid);
    const directPromotedIds = sorted2.slice(0, 2).map(x => x.cid);

    const c3 = draft.clubs[sorted2[2].cid];
    const c4 = draft.clubs[sorted2[3].cid];
    const c5 = draft.clubs[sorted2[4].cid];
    const c6 = draft.clubs[sorted2[5].cid];

    const semi1 = simulateTwoLegTie(c3, c6);
    const semi2 = simulateTwoLegTie(c4, c5);
    const finalTie = simulateTwoLegTie(draft.clubs[semi1.winnerId], draft.clubs[semi2.winnerId]);
    const playoffWinnerId = finalTie.winnerId;

    const promotedIds = [...directPromotedIds, playoffWinnerId];

    // Intercambiar ligas en los clubes
    relegatedIds.forEach(cid => {
      if (draft.clubs[cid]) {
        draft.clubs[cid].leagueId = t2.realId || t2.id;
        draft.clubs[cid].leagueName = t2.name;
        draft.clubs[cid].tier = 2;
        draft.clubs[cid].parentLeagueId = t1.realId || t1.id;
        draft.clubs[cid].childLeagueId = null;
      }
    });

    promotedIds.forEach(cid => {
      if (draft.clubs[cid]) {
        draft.clubs[cid].leagueId = t1.realId || t1.id;
        draft.clubs[cid].leagueName = t1.name;
        draft.clubs[cid].tier = 1;
        draft.clubs[cid].parentLeagueId = null;
        draft.clubs[cid].childLeagueId = t2.realId || t2.id;
      }
    });

    const promNames = promotedIds.map(id => draft.clubs[id]?.name || id).join(", ");
    const relNames = relegatedIds.map(id => draft.clubs[id]?.name || id).join(", ");
    summaryLines.push(`• <b>${t1.country}:</b> Suben <i>${promNames}</i> (Playoff: ${draft.clubs[playoffWinnerId]?.name}) | Bajan <i>${relNames}</i>`);
  });

  return summaryLines;
}

export function runEndOfSeasonTransition() {
  const state = store.get();
  const prevSeason = state.season || 1;
  const nextSeason = prevSeason + 1;
  const uid = state.userClubId;
  const comps = state.competitions || {};

  // 1. Calcular Bota de Oro y Balón de Oro
  const allPlayers = Object.values(state.players || {}).filter(p => p.clubId !== "legend_vault");
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

  // 2. Clasificados reales por méritos de 1ª División (Top 2 → Élite, 3º-4º → Challenge)
  const allLeagues = [comps.league_1, ...Object.values(comps.otherLeagues || {})].filter(Boolean);
  const tier1Leagues = allLeagues.filter(lg => (lg.tier ?? 1) === 1);

  const euroTier1 = tier1Leagues.filter(lg => !isSouthAmericanClub({ leagueId: lg.realId || lg.id }));
  const saTier1 = tier1Leagues.filter(lg => isSouthAmericanClub({ leagueId: lg.realId || lg.id }));

  const qualifiedEuroElite = euroTier1.flatMap(lg => getTopLeagueClubs(lg, 2)).slice(0, 16);
  const qualifiedEuroChallenge = euroTier1.flatMap(lg => getSortedStandings(lg).slice(2, 4).map(x => x.cid)).slice(0, 16);
  const qualifiedSaElite = saTier1.flatMap(lg => getTopLeagueClubs(lg, 4)).slice(0, 16);
  const qualifiedSaChallenge = saTier1.flatMap(lg => getSortedStandings(lg).slice(4, 8).map(x => x.cid)).slice(0, 16);

  // 3. Comprobar si el usuario ganó Liga o Copa
  const l1Sorted = getTopLeagueClubs(comps.league_1, 1);
  const wonLeague = l1Sorted[0] === uid;
  const wonCup = comps.cup_1?.championId === uid;
  const supercupWon = wonLeague || wonCup;
  const supercupPrize = supercupWon ? 4000000 : 0;

  // 4. Generar Regen Élite heredero de un Ícono Mundial
  const regenInfo = spawnEliteLegendRegen(supercupWon);

  store.update(["season", "players", "clubs", "competitions", "budget", "boardConfidence", "trophies", "inbox", "lastYouthSeason"], draft => {
    draft.season = nextSeason;
    draft.lastYouthSeason = 0;

    // Envejecimiento, devolución de cesiones, evolución y retiros
    Object.values(draft.players || {}).forEach(p => {
      if (p.clubId === "legend_vault") return;

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

      if (p.age <= 23) {
        p.ovr = Math.min(94, p.ovr + (Math.random() < 0.7 ? 2 : 1));
      } else if (p.age <= 28) {
        p.ovr = Math.min(94, p.ovr + (Math.random() < 0.35 ? 1 : 0));
      } else if (p.age >= 33) {
        p.ovr = Math.max(65, p.ovr - 1);
      }

      if (p.age >= 37) {
        p.age = 18;
        p.ovr = Math.max(68, (draft.clubs[p.clubId]?.ovr || 75) - 6);
        p.contractYears = 4;
        p.starter = false;
      }
    });

    // Actualizar Coeficientes Dinámicos de Ligas según campeones continentales
    const coeffs = { ...(comps.leagueCoefficients || initLeagueCoefficients()) };
    [comps.cont_1?.championId, comps.cont_2?.championId].filter(Boolean).forEach(champId => {
      const champClub = draft.clubs[champId];
      if (champClub && coeffs[champClub.leagueId]) {
        coeffs[champClub.leagueId].pts = Number((coeffs[champClub.leagueId].pts + 4.5).toFixed(1));
      }
    });
    [comps.cont_challenge?.championId, comps.cont_2_challenge?.championId].filter(Boolean).forEach(champId => {
      const champClub = draft.clubs[champId];
      if (champClub && coeffs[champClub.leagueId]) {
        coeffs[champClub.leagueId].pts = Number((coeffs[champClub.leagueId].pts + 2.5).toFixed(1));
      }
    });

    // Ejecutar ascensos, descensos y Playoffs antes de reconstruir los calendarios
    const promoLines = processPromotionRelegation(draft, comps);

    const newComps = initCompetitions(draft.clubs, uid, coeffs);

    // Poblar grupos continentales de la nueva temporada con los clasificados por mérito
    const userIsSA = isSouthAmericanClub(draft.clubs[uid]);
    const assignGroups = (tourney, teamIds) => {
      if (!tourney || teamIds.length < 16) return;
      const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
      tourney.groups.forEach((grp, gIdx) => {
        const gTeams = shuffled.slice(gIdx * 4, gIdx * 4 + 4);
        grp.teams = gTeams;
        grp.schedule = newComps.league_1.schedule.length ? grp.schedule : [];
        const newStandings = {};
        gTeams.forEach(cid => {
          newStandings[cid] = { pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        });
        grp.standings = newStandings;
        // Reconstruir calendario de 6 fechas para los nuevos 4 equipos
        grp.schedule = [
          [[gTeams[0], gTeams[1]], [gTeams[2], gTeams[3]]],
          [[gTeams[1], gTeams[2]], [gTeams[3], gTeams[0]]],
          [[gTeams[0], gTeams[2]], [gTeams[1], gTeams[3]]],
          [[gTeams[1], gTeams[0]], [gTeams[3], gTeams[2]]],
          [[gTeams[2], gTeams[1]], [gTeams[0], gTeams[3]]],
          [[gTeams[2], gTeams[0]], [gTeams[3], gTeams[1]]]
        ];
      });
    };

    if (userIsSA) {
      assignGroups(newComps.cont_1, qualifiedSaElite);
      assignGroups(newComps.cont_challenge, qualifiedSaChallenge);
      assignGroups(newComps.cont_2, qualifiedEuroElite);
      assignGroups(newComps.cont_2_challenge, qualifiedEuroChallenge);
    } else {
      assignGroups(newComps.cont_1, qualifiedEuroElite);
      assignGroups(newComps.cont_challenge, qualifiedEuroChallenge);
      assignGroups(newComps.cont_2, qualifiedSaElite);
      assignGroups(newComps.cont_2_challenge, qualifiedSaChallenge);
    }

    draft.competitions = newComps;

    const userTier = draft.clubs[uid]?.tier ?? 1;
    const tvRights = userTier === 1 ? 22000000 : 9000000;
    draft.budget = (draft.budget || 0) + tvRights + awardBonus + supercupPrize;
    draft.boardConfidence = Math.min(100, (draft.boardConfidence || 80) + confBonus);

    if (supercupWon) {
      draft.trophies = [...(draft.trophies || []), { title: "Supercopa de Apertura", season: nextSeason }];
    }

    const gbClub = draft.clubs[goldenBootWinner?.clubId]?.name || "-";
    const bdClub = draft.clubs[ballonDorWinner?.clubId]?.name || "-";
    const inElite = qualifiedEuroElite.includes(uid) || qualifiedSaElite.includes(uid);
    const inChallenge = qualifiedEuroChallenge.includes(uid) || qualifiedSaChallenge.includes(uid);
    const contMsg = inElite
      ? "¡Clasificado a la Copa Continental Élite (Fase de Grupos)!"
      : inChallenge
      ? "¡Clasificado a la Copa Continental Challenge (Fase de Grupos)!"
      : "Sin cupo continental esta campaña.";

    const regenLine = regenInfo
      ? `<br>👑 <b>Regen Élite Nacido:</b> ${regenInfo.flag || ""} ${regenInfo.regenName} (17a, OVR ${regenInfo.ovr}, heredero de ${regenInfo.mentorName}) en <i>${regenInfo.clubName}</i>`
      : "";

    const promoSection = promoLines.length
      ? `<br><br>📊 <b>Ascensos y Descensos (Playoffs incluidos):</b><br>${promoLines.slice(0, 4).join("<br>")}`
      : "";

    draft.inbox = [
      {
        id: `season_gala_${nextSeason}_${Date.now()}`,
        title: `🏆 Gala Oficial Fin de Temporada ${prevSeason} → Inicio T${nextSeason}`,
        date: `Temporada ${nextSeason}`,
        body: `
          🌟 <b>Balón de Oro:</b> ${ballonDorWinner?.name || "-"} (${bdClub}, OVR ${ballonDorWinner?.ovr || "-"})<br>
          👟 <b>Bota de Oro:</b> ${goldenBootWinner?.name || "-"} (${gbClub}, ${goldenBootWinner?.goals || 0} goles)<br>
          🌍 <b>Competición Internacional T${nextSeason}:</b> ${contMsg}<br>
          💰 <b>Ingresos Derechos TV:</b> +${(tvRights / 1e6).toFixed(1)} M€ ${supercupWon ? `| 🏆 Supercopa ganada (+4.00 M€)` : ""} ${awardBonus > 0 ? `| 🏅 Bono Premios (+${(awardBonus / 1e6).toFixed(1)} M€)` : ""}${regenLine}${promoSection}
        `,
        choices: [],
        resolved: true
      },
      ...(draft.inbox || [])
    ];
  });

  if (wonLeague) {
    grantTitleLegendReward(comps.league_1?.name || "Liga Nacional");
  } else if (wonCup) {
    grantTitleLegendReward(comps.cup_1?.name || "Copa Nacional");
  }
}