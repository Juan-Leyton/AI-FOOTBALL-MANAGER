import { store } from "../core/state.js";

const SOUTH_AMERICAN_LEAGUES = new Set(["bra_1", "arg_1", "col_1"]);

export function isSouthAmericanClub(club) {
  if (!club) return false;
  return SOUTH_AMERICAN_LEAGUES.has(club.leagueId);
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

function buildLeagueObject(id, name, clubIds) {
  const standings = {};
  clubIds.forEach(cid => {
    standings[cid] = { pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  });
  return {
    id,
    name,
    type: "league",
    schedule: generateRoundRobinSchedule(clubIds),
    currentRound: 0,
    playedThisRound: {},
    standings
  };
}

function buildKnockoutBracket(id, name, participantIds) {
  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
  while (shuffled.length < 16) {
    shuffled.push(shuffled[shuffled.length % Math.max(1, participantIds.length)]);
  }
  const round16 = [];
  for (let i = 0; i < 16; i += 2) {
    round16.push([shuffled[i], shuffled[i + 1]]);
  }
  return {
    id,
    name,
    type: "knockout",
    stageNames: ["Octavos de Final", "Cuartos de Final", "Semifinales", "Gran Final"],
    rounds: [round16],
    currentStage: 0,
    championId: null
  };
}

function selectContinentalTeams(clubsMap, isConmebol, preferredClubId = null) {
  const allClubs = Object.values(clubsMap || {});
  const regionClubs = allClubs
    .filter(c => (isConmebol ? isSouthAmericanClub(c) : !isSouthAmericanClub(c)))
    .sort((a, b) => b.ovr - a.ovr);

  const selected = new Set();
  if (preferredClubId && clubsMap[preferredClubId]) {
    const prefIsSA = isSouthAmericanClub(clubsMap[preferredClubId]);
    if (prefIsSA === isConmebol) {
      selected.add(preferredClubId);
    }
  }

  // Asegurar representación equilibrada por liga
  const byLeague = {};
  regionClubs.forEach(c => {
    if (!byLeague[c.leagueId]) byLeague[c.leagueId] = [];
    byLeague[c.leagueId].push(c);
  });

  const quotaPerLeague = isConmebol ? 4 : 2;
  Object.values(byLeague).forEach(list => {
    list.slice(0, quotaPerLeague).forEach(c => {
      if (selected.size < 16) selected.add(c.id);
    });
  });

  for (const c of regionClubs) {
    if (selected.size >= 16) break;
    selected.add(c.id);
  }

  return Array.from(selected).slice(0, 16);
}

export function initCompetitions(clubsMap, userClubId = null) {
  const allClubs = Object.values(clubsMap || {});
  const leaguesMap = {};

  allClubs.forEach(c => {
    const lid = c.leagueId || "esp_1";
    if (!leaguesMap[lid]) {
      leaguesMap[lid] = {
        id: lid,
        name: c.leagueName || "Primera División",
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
    primaryGroup.name,
    primaryGroup.clubs.map(c => c.id)
  );

  const otherLeagues = {};
  Object.values(leaguesMap).forEach(lg => {
    if (lg.id === primaryGroup.id) return;
    otherLeagues[lg.id] = buildLeagueObject(lg.id, lg.name, lg.clubs.map(c => c.id));
  });

  // Copa Nacional del país del usuario
  const cupTeams = [...primaryGroup.clubs].sort((a, b) => b.ovr - a.ovr).map(c => c.id);
  while (cupTeams.length < 16) {
    const extra = allClubs.find(c => !cupTeams.includes(c.id));
    if (!extra) break;
    cupTeams.push(extra.id);
  }
  const cup_1 = buildKnockoutBracket("cup_1", `Copa Nacional (${primaryGroup.name})`, cupTeams.slice(0, 16));

  // Dos Copas Continentales separadas: UEFA Champions League & CONMEBOL Libertadores
  const userIsSA = isSouthAmericanClub(userClub);
  const uefaIds = selectContinentalTeams(clubsMap, false, userIsSA ? null : userClubId);
  const conmebolIds = selectContinentalTeams(clubsMap, true, userIsSA ? userClubId : null);

  const uefaCup = buildKnockoutBracket("cont_uefa", "UEFA Champions League", uefaIds);
  const conmebolCup = buildKnockoutBracket("cont_conmebol", "CONMEBOL Copa Libertadores", conmebolIds);

  // cont_1 siempre apunta a la continental de la región del mánager activo para compatibilidad
  const cont_1 = userIsSA ? { ...conmebolCup, id: "cont_1" } : { ...uefaCup, id: "cont_1" };
  const cont_2 = userIsSA ? { ...uefaCup, id: "cont_2" } : { ...conmebolCup, id: "cont_2" };

  return {
    league_1,
    otherLeagues,
    cup_1,
    cont_1,
    cont_2,
    intercontinental: null
  };
}

export function getNextUserEvent(state) {
  const comps = state.competitions;
  const userClubId = state.userClubId;
  if (!comps || !userClubId) return null;

  const userLeague = getClubLeagueObj(comps, userClubId);
  if (!userLeague) return null;

  const rIdx = userLeague.currentRound || 0;
  if (rIdx >= userLeague.schedule.length) return null;

  // En multijugador, comprobar si el usuario actual ya jugó su partido de esta jornada
  if (state.isMultiplayer && state.mpManagers?.length > 1 && userLeague.playedThisRound?.[userClubId]) {
    return {
      compId: userLeague.id,
      compName: `${userLeague.name} - Jornada ${rIdx + 1}`,
      waitingForOthers: true
    };
  }

  // Verificar si toca Copa Nacional o Continental en jornadas clave (J4, J8, J12, J16)
  const cupRoundsMap = { 3: 0, 7: 1, 11: 2, 15: 3 };
  if (rIdx in cupRoundsMap) {
    const stage = cupRoundsMap[rIdx];
    const cont1 = comps.cont_1;
    if (cont1 && !cont1.championId && cont1.currentStage === stage) {
      const m = cont1.rounds[stage]?.find(pair => pair.includes(userClubId));
      if (m && !userLeague.playedThisRound?.[`cont_${userClubId}`]) {
        return {
          compId: "cont_1",
          compName: `${cont1.name} (${cont1.stageNames[stage]})`,
          match: m
        };
      }
    }

    const cup1 = comps.cup_1;
    if (cup1 && !cup1.championId && cup1.currentStage === stage) {
      const m = cup1.rounds[stage]?.find(pair => pair.includes(userClubId));
      if (m && !userLeague.playedThisRound?.[`cup_${userClubId}`]) {
        return {
          compId: "cup_1",
          compName: `${cup1.name} (${cup1.stageNames[stage]})`,
          match: m
        };
      }
    }
  }

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

export function completeRoundWithUserResult(hId, aId, gh, ga, compId = "league_1") {
  store.update(["competitions", "players", "trophies"], draft => {
    const comps = draft.competitions;
    const clubs = store.get().clubs;
    const userClubId = store.get().userClubId;
    const userLeague = getClubLeagueObj(comps, userClubId) || comps.league_1;
    const rIdx = userLeague.currentRound || 0;

    if (!userLeague.playedThisRound) userLeague.playedThisRound = {};

    // Si es partido de Copa Nacional o Continental
    if (compId === "cont_1" || compId === "cup_1") {
      userLeague.playedThisRound[`${compId === "cont_1" ? "cont" : "cup"}_${userClubId}`] = true;
      const targetCup = comps[compId];
      advanceKnockoutRound(targetCup, clubs, { hId, aId, gh, ga });

      // Si es cont_1, avanzar también cont_2 en paralelo
      if (compId === "cont_1" && comps.cont_2) {
        advanceKnockoutRound(comps.cont_2, clubs, null);
      }

      if (targetCup?.championId === userClubId) {
        draft.trophies = draft.trophies || [];
        draft.trophies.push({
          title: targetCup.name,
          season: store.get().season || 1
        });
      }

      // Comprobar si ambos campeones continentales ya existen para disputar la Final Intercontinental
      if (comps.cont_1?.championId && comps.cont_2?.championId && !comps.intercontinental) {
        const c1 = clubs[comps.cont_1.championId];
        const c2 = clubs[comps.cont_2.championId];
        const simInter = simulateAiMatchScore(c1, c2);
        const winnerId =
          simInter.gh > simInter.ga
            ? c1.id
            : simInter.ga > simInter.gh
            ? c2.id
            : Math.random() < 0.5
            ? c1.id
            : c2.id;
        comps.intercontinental = {
          homeId: c1.id,
          awayId: c2.id,
          gh: simInter.gh,
          ga: simInter.ga,
          winnerId
        };
        if (winnerId === userClubId) {
          draft.trophies = draft.trophies || [];
          draft.trophies.push({
            title: "Copa Intercontinental FIFA",
            season: store.get().season || 1
          });
        }
      }
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

    if (!allHumansReady) {
      return;
    }

    // Simular el resto de partidos de esta jornada en la liga del usuario
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

    // Avanzar una jornada en todas las demás ligas del mundo (Europa y Sudamérica)
    Object.values(comps.otherLeagues || {}).forEach(ol => {
      const orIdx = ol.currentRound || 0;
      if (orIdx >= ol.schedule.length) return;
      const oMatches = ol.schedule[orIdx] || [];
      oMatches.forEach(([mh, ma]) => {
        const sim = simulateAiMatchScore(clubs[mh], clubs[ma]);
        applyLeagueResult(ol, mh, ma, sim.gh, sim.ga);
        creditScorersAndAssists(draft.players, mh, sim.gh);
        creditScorersAndAssists(draft.players, ma, sim.ga);
      });
      ol.currentRound = orIdx + 1;
    });

    // En jornadas clave (4, 8, 12, 16), avanzar las copas continentales si el usuario no jugó en ellas
    const cupRoundsMap = { 3: 0, 7: 1, 11: 2, 15: 3 };
    if (rIdx in cupRoundsMap) {
      const stage = cupRoundsMap[rIdx];
      if (comps.cont_1 && !comps.cont_1.championId && comps.cont_1.currentStage === stage) {
        advanceKnockoutRound(comps.cont_1, clubs, null);
      }
      if (comps.cont_2 && !comps.cont_2.championId && comps.cont_2.currentStage === stage) {
        advanceKnockoutRound(comps.cont_2, clubs, null);
      }
      if (comps.cup_1 && !comps.cup_1.championId && comps.cup_1.currentStage === stage) {
        advanceKnockoutRound(comps.cup_1, clubs, null);
      }

      if (comps.cont_1?.championId && comps.cont_2?.championId && !comps.intercontinental) {
        const c1 = clubs[comps.cont_1.championId];
        const c2 = clubs[comps.cont_2.championId];
        const simInter = simulateAiMatchScore(c1, c2);
        const winnerId =
          simInter.gh > simInter.ga
            ? c1.id
            : simInter.ga > simInter.gh
            ? c2.id
            : Math.random() < 0.5
            ? c1.id
            : c2.id;
        comps.intercontinental = {
          homeId: c1.id,
          awayId: c2.id,
          gh: simInter.gh,
          ga: simInter.ga,
          winnerId
        };
      }
    }
  });
}