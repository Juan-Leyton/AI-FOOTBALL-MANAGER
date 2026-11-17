import { store } from "../core/state.js";

const SOUTH_AMERICAN_LEAGUES = new Set(["bra_1", "bra_2", "arg_1", "arg_2", "col_1", "col_2"]);

export function isSouthAmericanClub(club) {
  if (!club) return false;
  return SOUTH_AMERICAN_LEAGUES.has(club.leagueId) || club.continent === "Sudamérica";
}

export function getClubLeagueObj(competitions, clubId) {
  if (!competitions) return null;
  if (competitions.league_1?.standings?.[clubId]) return competitions.league_1;
  return Object.values(competitions.otherLeagues || {}).find(ol => ol?.standings?.[clubId]) || null;
}

export function generateRoundRobinSchedule(clubIds) {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push("BYE");
  const n = teams.length;
  const half = n / 2;
  const firstLeg = [];
  const secondLeg = [];

  for (let r = 0; r < n - 1; r++) {
    const roundA = [];
    const roundB = [];
    for (let i = 0; i < half; i++) {
      const t1 = teams[i];
      const t2 = teams[n - 1 - i];
      if (t1 !== "BYE" && t2 !== "BYE") {
        roundA.push(r % 2 === 0 ? [t1, t2] : [t2, t1]);
        roundB.push(r % 2 === 0 ? [t2, t1] : [t1, t2]);
      }
    }
    firstLeg.push(roundA);
    secondLeg.push(roundB);
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop());
    teams.splice(0, teams.length, fixed, ...rest);
  }

  return [...firstLeg, ...secondLeg];
}

function buildLeagueObject(id, realId, name, country, tier, parentLeagueId, childLeagueId, clubIds) {
  const standings = {};
  clubIds.forEach(cid => {
    standings[cid] = { pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  });
  return {
    id,
    realId,
    name,
    country,
    tier: tier ?? 1,
    parentLeagueId: parentLeagueId || null,
    childLeagueId: childLeagueId || null,
    type: "league",
    schedule: generateRoundRobinSchedule(clubIds),
    currentRound: 0,
    playedThisRound: {},
    standings
  };
}

function buildKnockoutBracket(id, name, participantIds) {
  const targetSize = participantIds.length > 16 ? 32 : 16;
  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
  while (shuffled.length < targetSize) {
    shuffled.push(shuffled[shuffled.length % Math.max(1, participantIds.length)]);
  }
  const firstRound = [];
  for (let i = 0; i < targetSize; i += 2) {
    firstRound.push([shuffled[i], shuffled[i + 1]]);
  }
  const stageNames =
    targetSize === 32
      ? ["Dieciseisavos de Final", "Octavos de Final", "Cuartos de Final", "Semifinales", "Gran Final"]
      : ["Octavos de Final", "Cuartos de Final", "Semifinales", "Gran Final"];

  return {
    id,
    name,
    type: "knockout",
    stageNames,
    rounds: [firstRound],
    currentStage: 0,
    championId: null
  };
}

function buildGroupAndKnockoutTournament(id, name, participantIds) {
  const teams = [...participantIds].slice(0, 16);
  while (teams.length < 16) {
    teams.push(participantIds[teams.length % Math.max(1, participantIds.length)]);
  }

  const groupNames = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];
  const groups = [];

  for (let g = 0; g < 4; g++) {
    const gTeams = teams.slice(g * 4, g * 4 + 4);
    const standings = {};
    gTeams.forEach(cid => {
      standings[cid] = { pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });
    groups.push({
      name: groupNames[g],
      teams: gTeams,
      schedule: generateRoundRobinSchedule(gTeams),
      standings
    });
  }

  return {
    id,
    name,
    type: "group_knockout",
    phase: "groups", // "groups" (6 jornadas) -> "knockout" (Cuartos, Semis, Final)
    groupRound: 0,
    groups,
    stageNames: ["Cuartos de Final", "Semifinales", "Gran Final"],
    rounds: [],
    currentStage: 0,
    championId: null
  };
}

function selectContinentalTiers(clubsMap, isConmebol, preferredClubId = null) {
  const allClubs = Object.values(clubsMap || {});
  const regionClubs = allClubs
    .filter(c => {
      if (c.tier === 2) return false;
      if (isConmebol) {
        return isSouthAmericanClub(c) || ["penarol_mvd", "nacional_mvd", "colo_colo", "ldu_quito"].includes(c.id);
      }
      return !isSouthAmericanClub(c) && !["penarol_mvd", "nacional_mvd", "colo_colo", "ldu_quito", "inter_miami", "la_galaxy", "club_america", "monterrey_cf", "tigres_uanl", "al_hilal_riy", "al_nassr_riy", "al_ahly_cai"].includes(c.id);
    })
    .sort((a, b) => b.ovr - a.ovr);

  const eliteSet = new Set();
  const challengeSet = new Set();

  if (preferredClubId && clubsMap[preferredClubId]) {
    const prefClub = clubsMap[preferredClubId];
    if (isSouthAmericanClub(prefClub) === isConmebol && prefClub.tier !== 2) {
      if (prefClub.ovr >= 78) eliteSet.add(preferredClubId);
      else challengeSet.add(preferredClubId);
    }
  }

  const byLeague = {};
  regionClubs.forEach(c => {
    if (!byLeague[c.leagueId]) byLeague[c.leagueId] = [];
    byLeague[c.leagueId].push(c);
  });

  Object.values(byLeague).forEach(list => {
    list.slice(0, 2).forEach(c => {
      if (eliteSet.size < 16) eliteSet.add(c.id);
    });
    list.slice(2, 4).forEach(c => {
      if (!eliteSet.has(c.id) && challengeSet.size < 16) challengeSet.add(c.id);
    });
  });

  for (const c of regionClubs) {
    if (eliteSet.size < 16) eliteSet.add(c.id);
    else if (!eliteSet.has(c.id) && challengeSet.size < 16) challengeSet.add(c.id);
  }

  return {
    eliteIds: Array.from(eliteSet).slice(0, 16),
    challengeIds: Array.from(challengeSet).slice(0, 16)
  };
}

export function initLeagueCoefficients() {
  return {
    eng_1: { name: "Premier Británica", country: "Inglaterra", pts: 92.5 },
    esp_1: { name: "Liga Ibérica", country: "España", pts: 89.0 },
    ita_1: { name: "Serie A Italiana", country: "Italia", pts: 84.5 },
    ger_1: { name: "Bundesliga Germana", country: "Alemania", pts: 83.0 },
    fra_1: { name: "Ligue Hexagone", country: "Francia", pts: 74.0 },
    por_1: { name: "Liga Lusitana", country: "Portugal", pts: 64.5 },
    ned_1: { name: "Eredivisie Oranje", country: "Países Bajos", pts: 62.0 },
    bra_1: { name: "Brasileirão Série A", country: "Brasil", pts: 82.0 },
    arg_1: { name: "Liga Profesional Argentina", country: "Argentina", pts: 78.5 },
    col_1: { name: "Liga BetPlay Colombia", country: "Colombia", pts: 66.0 }
  };
}

export function initCompetitions(clubsMap, userClubId = null, existingCoefficients = null) {
  const allClubs = Object.values(clubsMap || {});
  const leaguesMap = {};

  allClubs.forEach(c => {
    const lid = c.leagueId || "esp_1";
    if (!leaguesMap[lid]) {
      leaguesMap[lid] = {
        id: lid,
        name: c.leagueName || "Primera División",
        country: c.country || "España",
        tier: c.tier ?? 1,
        parentLeagueId: c.parentLeagueId || null,
        childLeagueId: c.childLeagueId || null,
        clubs: []
      };
    }
    leaguesMap[lid].clubs.push(c);
  });

  const userClub = userClubId ? clubsMap[userClubId] : allClubs[0];
  const primaryLeagueId = userClub?.leagueId || "esp_1";
  const primaryGroup = leaguesMap[primaryLeagueId] || Object.values(leaguesMap)[0];

  const league_1 = buildLeagueObject(
    "league_1",
    primaryGroup.id,
    primaryGroup.name,
    primaryGroup.country,
    primaryGroup.tier,
    primaryGroup.parentLeagueId,
    primaryGroup.childLeagueId,
    primaryGroup.clubs.map(c => c.id)
  );

  const otherLeagues = {};
  Object.values(leaguesMap).forEach(lg => {
    if (lg.id === primaryGroup.id) return;
    otherLeagues[lg.id] = buildLeagueObject(
      lg.id,
      lg.id,
      lg.name,
      lg.country,
      lg.tier,
      lg.parentLeagueId,
      lg.childLeagueId,
      lg.clubs.map(c => c.id)
    );
  });

  // Copa Nacional mezclando 1ª y 2ª División del país del usuario (hasta 32 clubes)
  const countryClubs = allClubs
    .filter(c => c.country === primaryGroup.country)
    .sort((a, b) => b.ovr - a.ovr)
    .map(c => c.id);

  while (countryClubs.length < 16) {
    const extra = allClubs.find(c => !countryClubs.includes(c.id));
    if (!extra) break;
    countryClubs.push(extra.id);
  }
  const cupSize = countryClubs.length >= 28 ? 32 : 16;
  const cup_1 = buildKnockoutBracket(
    "cup_1",
    `Copa Nacional de ${primaryGroup.country}`,
    countryClubs.slice(0, cupSize)
  );

  // Doble escalón continental con Fase de Grupos
  const userIsSA = isSouthAmericanClub(userClub);
  const uefaTiers = selectContinentalTiers(clubsMap, false, userIsSA ? null : userClubId);
  const conmebolTiers = selectContinentalTiers(clubsMap, true, userIsSA ? userClubId : null);

  const uefaElite = buildGroupAndKnockoutTournament("uefa_elite", "UEFA Champions Élite", uefaTiers.eliteIds);
  const uefaChallenge = buildGroupAndKnockoutTournament("uefa_challenge", "UEFA Europa Challenge", uefaTiers.challengeIds);
  const conmebolElite = buildGroupAndKnockoutTournament("conmebol_elite", "CONMEBOL Copa Libertadores", conmebolTiers.eliteIds);
  const conmebolChallenge = buildGroupAndKnockoutTournament("conmebol_challenge", "CONMEBOL Copa Sudamericana", conmebolTiers.challengeIds);

  const cont_1 = userIsSA ? { ...conmebolElite, id: "cont_1" } : { ...uefaElite, id: "cont_1" };
  const cont_challenge = userIsSA ? { ...conmebolChallenge, id: "cont_challenge" } : { ...uefaChallenge, id: "cont_challenge" };
  const cont_2 = userIsSA ? { ...uefaElite, id: "cont_2" } : { ...conmebolElite, id: "cont_2" };
  const cont_2_challenge = userIsSA ? { ...uefaChallenge, id: "cont_2_challenge" } : { ...conmebolChallenge, id: "cont_2_challenge" };

  return {
    league_1,
    otherLeagues,
    cup_1,
    cont_1,
    cont_challenge,
    cont_2,
    cont_2_challenge,
    clubWorldCup: null,
    leagueCoefficients: existingCoefficients || initLeagueCoefficients()
  };
}

function getContinentalScheduleRounds(totalLeagueRounds) {
  // 6 fechas de Fase de Grupos + 3 rondas eliminatorias (Cuartos, Semis, Final)
  if (totalLeagueRounds >= 28) {
    return [2, 5, 8, 11, 14, 17, 21, 25, 28];
  }
  return [1, 3, 5, 7, 9, 11, 14, 17, 20];
}

function getNationalCupScheduleRounds(totalLeagueRounds, stageCount) {
  if (stageCount === 5) {
    return totalLeagueRounds >= 28 ? [3, 7, 12, 18, 26] : [2, 5, 9, 14, 19];
  }
  return totalLeagueRounds >= 28 ? [4, 10, 18, 26] : [3, 7, 13, 19];
}

function findUserGroupMatch(tourney, userClubId) {
  if (!tourney || tourney.phase !== "groups") return null;
  const gIdx = tourney.groupRound || 0;
  for (const grp of tourney.groups || []) {
    const roundMatches = grp.schedule?.[gIdx] || [];
    const match = roundMatches.find(pair => pair.includes(userClubId));
    if (match) return { match, groupName: grp.name, roundNum: gIdx + 1 };
  }
  return null;
}

export function getNextUserEvent(state) {
  const comps = state.competitions;
  const userClubId = state.userClubId;
  if (!comps || !userClubId) return null;

  const userLeague = getClubLeagueObj(comps, userClubId);
  if (!userLeague) return null;

  const rIdx = userLeague.currentRound || 0;
  const totalRounds = userLeague.schedule.length;
  if (rIdx >= totalRounds) return null;

  if (state.isMultiplayer && state.mpManagers?.length > 1 && userLeague.playedThisRound?.[userClubId]) {
    return {
      compId: userLeague.id,
      compName: `${userLeague.name} - Jornada ${rIdx + 1}`,
      waitingForOthers: true
    };
  }

  // 1. Verificar Copas Continentales (Élite y Challenge)
  const contRounds = getContinentalScheduleRounds(totalRounds);
  const contStepIdx = contRounds.indexOf(rIdx);
  if (contStepIdx !== -1) {
    for (const cKey of ["cont_1", "cont_challenge"]) {
      const tourney = comps[cKey];
      if (!tourney || tourney.championId) continue;

      if (tourney.phase === "groups" && tourney.groupRound === contStepIdx) {
        const found = findUserGroupMatch(tourney, userClubId);
        if (found && !userLeague.playedThisRound?.[`${cKey}_${userClubId}`]) {
          return {
            compId: cKey,
            compName: `${tourney.name} (${found.groupName} · J${found.roundNum})`,
            match: found.match
          };
        }
      } else if (tourney.phase === "knockout") {
        const koStage = contStepIdx - 6;
        if (koStage >= 0 && tourney.currentStage === koStage) {
          const m = tourney.rounds[koStage]?.find(pair => pair.includes(userClubId));
          if (m && !userLeague.playedThisRound?.[`${cKey}_${userClubId}`]) {
            return {
              compId: cKey,
              compName: `${tourney.name} (${tourney.stageNames[koStage]})`,
              match: m
            };
          }
        }
      }
    }
  }

  // 2. Verificar Copa Nacional
  const cup1 = comps.cup_1;
  if (cup1 && !cup1.championId) {
    const cupRounds = getNationalCupScheduleRounds(totalRounds, cup1.stageNames.length);
    const cupStage = cupRounds.indexOf(rIdx);
    if (cupStage !== -1 && cup1.currentStage === cupStage) {
      const m = cup1.rounds[cupStage]?.find(pair => pair.includes(userClubId));
      if (m && !userLeague.playedThisRound?.[`cup_${userClubId}`]) {
        return {
          compId: "cup_1",
          compName: `${cup1.name} (${cup1.stageNames[cupStage]})`,
          match: m
        };
      }
    }
  }

  // 3. Partido de Liga regular
  const roundMatches = userLeague.schedule[rIdx] || [];
  const userMatch = roundMatches.find(pair => pair.includes(userClubId));

  if (userMatch) {
    return {
      compId: userLeague.id,
      compName: `${userLeague.name} - Jornada ${rIdx + 1}`,
      match: userMatch
    };
  }

  return null;
}

function simulateAiMatchScore(homeClub, awayClub) {
  const hOvr = homeClub?.ovr || 75;
  const aOvr = awayClub?.ovr || 75;
  const diff = (hOvr + 2.5 - aOvr) / 14;
  const gh = Math.max(0, Math.round((1.35 + diff) * (0.4 + Math.random() * 1.2)));
  const ga = Math.max(0, Math.round((1.15 - diff) * (0.4 + Math.random() * 1.2)));
  return { gh, ga };
}

function creditScorersAndAssists(playersMap, clubId, goals) {
  if (goals <= 0 || !playersMap) return;
  const squad = Object.values(playersMap).filter(p => p.clubId === clubId && p.pos !== "POR");
  if (!squad.length) return;
  for (let i = 0; i < goals; i++) {
    const weighted = squad.map(p => ({
      p,
      w: p.pos === "DEL" ? 5 : p.pos === "MED" ? 2.5 : 0.7
    }));
    const totalW = weighted.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * totalW;
    let scorer = weighted[0].p;
    for (const item of weighted) {
      r -= item.w;
      if (r <= 0) {
        scorer = item.p;
        break;
      }
    }
    scorer.goals = (scorer.goals || 0) + 1;
  }
}

function applyLeagueResult(leagueObj, hId, aId, gh, ga) {
  if (!leagueObj?.standings?.[hId] || !leagueObj?.standings?.[aId]) return;
  const hs = leagueObj.standings[hId];
  const as = leagueObj.standings[aId];

  hs.pj += 1;
  as.pj += 1;
  hs.gf += gh;
  hs.ga += ga;
  as.gf += ga;
  as.ga += gh;

  if (gh > ga) {
    hs.w += 1;
    hs.pts += 3;
    as.l += 1;
  } else if (ga > gh) {
    as.w += 1;
    as.pts += 3;
    hs.l += 1;
  } else {
    hs.d += 1;
    as.d += 1;
    hs.pts += 1;
    as.pts += 1;
  }
}

function advanceKnockoutRound(cupObj, clubsMap, userMatchOverride = null) {
  if (!cupObj || cupObj.championId) return;
  const stage = cupObj.currentStage;
  const matches = cupObj.rounds[stage];
  if (!matches) return;

  const winners = [];
  matches.forEach(([hId, aId]) => {
    let gh, ga;
    if (
      userMatchOverride &&
      ((userMatchOverride.hId === hId && userMatchOverride.aId === aId) ||
        (userMatchOverride.hId === aId && userMatchOverride.aId === hId))
    ) {
      gh = userMatchOverride.hId === hId ? userMatchOverride.gh : userMatchOverride.ga;
      ga = userMatchOverride.hId === hId ? userMatchOverride.ga : userMatchOverride.gh;
    } else {
      const sim = simulateAiMatchScore(clubsMap[hId], clubsMap[aId]);
      gh = sim.gh;
      ga = sim.ga;
    }

    if (gh > ga) winners.push(hId);
    else if (ga > gh) winners.push(aId);
    else winners.push(Math.random() < 0.5 ? hId : aId);
  });

  if (winners.length === 1) {
    cupObj.championId = winners[0];
    cupObj.currentStage = stage + 1;
  } else {
    const nextPairs = [];
    for (let i = 0; i < winners.length; i += 2) {
      nextPairs.push([winners[i], winners[i + 1] || winners[0]]);
    }
    cupObj.rounds.push(nextPairs);
    cupObj.currentStage = stage + 1;
  }
}

function advanceGroupAndKnockoutStep(tourney, clubsMap, userMatchOverride = null) {
  if (!tourney || tourney.championId) return;

  if (tourney.phase === "groups") {
    const gIdx = tourney.groupRound || 0;
    tourney.groups.forEach(grp => {
      const matches = grp.schedule[gIdx] || [];
      matches.forEach(([hId, aId]) => {
        let gh, ga;
        if (
          userMatchOverride &&
          ((userMatchOverride.hId === hId && userMatchOverride.aId === aId) ||
            (userMatchOverride.hId === aId && userMatchOverride.aId === hId))
        ) {
          gh = userMatchOverride.hId === hId ? userMatchOverride.gh : userMatchOverride.ga;
          ga = userMatchOverride.hId === hId ? userMatchOverride.ga : userMatchOverride.gh;
        } else {
          const sim = simulateAiMatchScore(clubsMap[hId], clubsMap[aId]);
          gh = sim.gh;
          ga = sim.ga;
        }
        applyLeagueResult(grp, hId, aId, gh, ga);
      });
    });

    tourney.groupRound = gIdx + 1;

    // Al terminar las 6 jornadas de grupos, clasificar Top 2 de cada grupo a Cuartos de Final
    if (tourney.groupRound >= 6) {
      const qualifiers = [];
      tourney.groups.forEach(grp => {
        const sorted = Object.entries(grp.standings)
          .map(([cid, st]) => ({ cid, ...st }))
          .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
        qualifiers.push(sorted[0]?.cid, sorted[1]?.cid);
      });

      // Cruces cruzados: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C
      tourney.rounds = [
        [
          [qualifiers[0], qualifiers[3]],
          [qualifiers[2], qualifiers[1]],
          [qualifiers[4], qualifiers[7]],
          [qualifiers[6], qualifiers[5]]
        ]
      ];
      tourney.phase = "knockout";
      tourney.currentStage = 0;
    }
    return;
  }

  advanceKnockoutRound(tourney, clubsMap, userMatchOverride);
}

function trySimulateClubWorldCupFinalFour(comps, clubsMap, userClubId, draft) {
  if (comps.clubWorldCup) return;
  if (!comps.cont_1?.championId || !comps.cont_2?.championId) return;

  const uefaChamp = isSouthAmericanClub(clubsMap[comps.cont_1.championId])
    ? comps.cont_2.championId
    : comps.cont_1.championId;
  const conmebolChamp = isSouthAmericanClub(clubsMap[comps.cont_1.championId])
    ? comps.cont_1.championId
    : comps.cont_2.championId;

  const invitedPool = ["al_hilal_riy", "club_america", "inter_miami", "al_ahly_cai"].filter(
    id => clubsMap[id] && id !== uefaChamp && id !== conmebolChamp
  );
  const guest1 = invitedPool[0] || Object.keys(clubsMap)[0];
  const guest2 = invitedPool[1] || Object.keys(clubsMap)[1];

  const simSemi1 = simulateAiMatchScore(clubsMap[uefaChamp], clubsMap[guest1]);
  const fin1 = simSemi1.gh >= simSemi1.ga ? uefaChamp : guest1;

  const simSemi2 = simulateAiMatchScore(clubsMap[conmebolChamp], clubsMap[guest2]);
  const fin2 = simSemi2.gh >= simSemi2.ga ? conmebolChamp : guest2;

  const simFinal = simulateAiMatchScore(clubsMap[fin1], clubsMap[fin2]);
  const winnerId =
    simFinal.gh > simFinal.ga
      ? fin1
      : simFinal.ga > simFinal.gh
      ? fin2
      : Math.random() < 0.5
      ? fin1
      : fin2;

  comps.clubWorldCup = {
    semis: [
      { homeId: uefaChamp, awayId: guest1, gh: simSemi1.gh, ga: simSemi1.ga, winnerId: fin1 },
      { homeId: conmebolChamp, awayId: guest2, gh: simSemi2.gh, ga: simSemi2.ga, winnerId: fin2 }
    ],
    final: { homeId: fin1, awayId: fin2, gh: simFinal.gh, ga: simFinal.ga, winnerId },
    winnerId
  };

  if (winnerId === userClubId) {
    draft.trophies = draft.trophies || [];
    draft.trophies.push({
      title: "Mundial de Clubes FIFA",
      season: store.get().season || 1
    });
  }
}

export function completeRoundWithUserResult(hId, aId, gh, ga, compId = "league_1") {
  store.update(["competitions", "players", "trophies"], draft => {
    const comps = draft.competitions;
    const clubs = store.get().clubs;
    const userClubId = store.get().userClubId;
    const userLeague = getClubLeagueObj(comps, userClubId) || comps.league_1;
    const rIdx = userLeague.currentRound || 0;
    const totalRounds = userLeague.schedule.length;

    if (!userLeague.playedThisRound) userLeague.playedThisRound = {};

    // Partido de Copa Nacional o Continental
    if (compId === "cont_1" || compId === "cont_challenge" || compId === "cup_1") {
      userLeague.playedThisRound[`${compId === "cup_1" ? "cup" : compId}_${userClubId}`] = true;
      const targetTourney = comps[compId];

      if (compId === "cup_1") {
        advanceKnockoutRound(targetTourney, clubs, { hId, aId, gh, ga });
      } else {
        advanceGroupAndKnockoutStep(targetTourney, clubs, { hId, aId, gh, ga });
        // Avanzar los demás torneos continentales en paralelo
        ["cont_1", "cont_challenge", "cont_2", "cont_2_challenge"].forEach(otherKey => {
          if (otherKey !== compId && comps[otherKey]) {
            advanceGroupAndKnockoutStep(comps[otherKey], clubs, null);
          }
        });
      }

      if (targetTourney?.championId === userClubId) {
        draft.trophies = draft.trophies || [];
        draft.trophies.push({
          title: targetTourney.name,
          season: store.get().season || 1
        });
      }

      trySimulateClubWorldCupFinalFour(comps, clubs, userClubId, draft);
      return;
    }

    // Partido de Liga
    applyLeagueResult(userLeague, hId, aId, gh, ga);
    userLeague.playedThisRound[userClubId] = true;

    const state = store.get();
    const humanClubsInThisLeague = (state.mpManagers || [])
      .map(m => m.clubId)
      .filter(cid => userLeague.standings?.[cid]);

    const allHumansReady =
      humanClubsInThisLeague.length <= 1 ||
      humanClubsInThisLeague.every(cid => userLeague.playedThisRound[cid]);

    if (!allHumansReady) return;

    // Simular resto de partidos de esta jornada en la liga del usuario
    const roundMatches = userLeague.schedule[rIdx] || [];
    roundMatches.forEach(([mh, ma]) => {
      if ((mh === hId && ma === aId) || (mh === aId && ma === hId)) return;
      if (userLeague.playedThisRound[mh] && userLeague.playedThisRound[ma]) return;
      const sim = simulateAiMatchScore(clubs[mh], clubs[ma]);
      applyLeagueResult(userLeague, mh, ma, sim.gh, sim.ga);
      creditScorersAndAssists(draft.players, mh, sim.gh);
      creditScorersAndAssists(draft.players, ma, sim.ga);
    });

    userLeague.currentRound = rIdx + 1;
    userLeague.playedThisRound = {};

    // Avanzar el resto de ligas del mundo sincronizando su ritmo con la temporada del usuario
    const progressRatio = (rIdx + 1) / totalRounds;
    Object.values(comps.otherLeagues || {}).forEach(ol => {
      const targetRound = Math.min(ol.schedule.length, Math.round(progressRatio * ol.schedule.length));
      while ((ol.currentRound || 0) < targetRound) {
        const orIdx = ol.currentRound || 0;
        const oMatches = ol.schedule[orIdx] || [];
        oMatches.forEach(([mh, ma]) => {
          const sim = simulateAiMatchScore(clubs[mh], clubs[ma]);
          applyLeagueResult(ol, mh, ma, sim.gh, sim.ga);
          creditScorersAndAssists(draft.players, mh, sim.gh);
          creditScorersAndAssists(draft.players, ma, sim.ga);
        });
        ol.currentRound = orIdx + 1;
      }
    });

    // Avanzar torneos continentales si tocaba fecha europea/sudamericana y el usuario no la jugó
    const contRounds = getContinentalScheduleRounds(totalRounds);
    const contStepIdx = contRounds.indexOf(rIdx);
    if (contStepIdx !== -1) {
      ["cont_1", "cont_challenge", "cont_2", "cont_2_challenge"].forEach(cKey => {
        const t = comps[cKey];
        if (!t || t.championId) return;
        const alreadyPlayed = userLeague.playedThisRound?.[`${cKey}_${userClubId}`];
        if (alreadyPlayed) return;
        if ((t.phase === "groups" && t.groupRound === contStepIdx) || (t.phase === "knockout" && t.currentStage === contStepIdx - 6)) {
          advanceGroupAndKnockoutStep(t, clubs, null);
        }
      });
      trySimulateClubWorldCupFinalFour(comps, clubs, userClubId, draft);
    }

    // Avanzar Copa Nacional si tocaba fecha copera y el usuario no la jugó
    const cup1 = comps.cup_1;
    if (cup1 && !cup1.championId) {
      const cupRounds = getNationalCupScheduleRounds(totalRounds, cup1.stageNames.length);
      const cupStage = cupRounds.indexOf(rIdx);
      if (cupStage !== -1 && cup1.currentStage === cupStage && !userLeague.playedThisRound?.[`cup_${userClubId}`]) {
        advanceKnockoutRound(cup1, clubs, null);
      }
    }
  });
}