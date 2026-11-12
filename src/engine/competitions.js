import { store } from "../core/state.js";
import { LEAGUES_CATALOG } from "../data/world-database.js";

export const CONTINENTAL_RIVALS = [];

function generateRoundRobin(clubIds) {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;
  const half = n / 2;
  const firstLeg = [];

  for (let round = 0; round < n - 1; round++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home && away) {
        matches.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    firstLeg.push(matches);
    const last = teams.pop();
    teams.splice(1, 0, last);
  }

  const secondLeg = firstLeg.map(r => r.map(([h, a]) => [a, h]));
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
    clubIds,
    schedule: generateRoundRobin(clubIds),
    currentRound: 0,
    standings
  };
}

function createCupBracket(name, clubIds, stageNames) {
  const shuffled = [...clubIds].sort(() => Math.random() - 0.5);
  const round1 = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i] && shuffled[i + 1]) {
      round1.push([shuffled[i], shuffled[i + 1]]);
    }
  }
  return {
    name,
    type: "cup",
    stageNames,
    currentStage: 0,
    rounds: [round1],
    championId: null
  };
}

export function initContinentalCup(clubs, userClubId = null) {
  const allClubs = Object.values(clubs || {});
  const elitePool = [...allClubs]
    .sort((a, b) => (b.ovr || 75) - (a.ovr || 75))
    .slice(0, 8)
    .map(c => c.id);
  if (userClubId && !elitePool.includes(userClubId)) {
    elitePool[elitePool.length - 1] = userClubId;
  }
  return createCupBracket("Copa Continental Élite", elitePool, ["Cuartos Continentales", "Semifinales", "Final Continental"]);
}

export function initCompetitions(clubs, userClubId = null) {
  const allClubs = Object.values(clubs || {});
  const userClub = userClubId ? clubs[userClubId] : null;
  const activeLeagueId = userClub?.leagueId || "esp_1";

  const activeLeagueMeta = LEAGUES_CATALOG.find(l => l.id === activeLeagueId) || LEAGUES_CATALOG[0];
  const userLeagueClubIds = allClubs
    .filter(c => (c.leagueId || "esp_1") === activeLeagueId)
    .map(c => c.id);

  const league_1 = buildLeagueObject("league_1", `${activeLeagueMeta.flag} ${activeLeagueMeta.name}`, userLeagueClubIds);

  const otherLeagues = {};
  LEAGUES_CATALOG.filter(l => l.id !== activeLeagueId).forEach(l => {
    const cids = allClubs.filter(c => c.leagueId === l.id).map(c => c.id);
    if (cids.length >= 4) {
      otherLeagues[l.id] = buildLeagueObject(l.id, `${l.flag} ${l.name}`, cids);
    }
  });

  const cupTeams = [...userLeagueClubIds]
    .sort((a, b) => (clubs[b]?.ovr || 75) - (clubs[a]?.ovr || 75))
    .slice(0, 8);
  const cup_1 = createCupBracket("Copa Nacional", cupTeams, ["Cuartos de Final", "Semifinales", "Gran Final"]);

  const cont_1 = initContinentalCup(clubs, userClubId);

  return { league_1, otherLeagues, cup_1, cont_1 };
}

function simulateAiScore(homeClub, awayClub, allowDraw = true) {
  const diff = ((homeClub?.ovr || 75) + 2) - (awayClub?.ovr || 75);
  const homeExp = Math.max(0.3, 1.35 + diff * 0.06);
  const awayExp = Math.max(0.3, 1.15 - diff * 0.05);

  const sampleGoals = lambda => {
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
  };

  let gh = sampleGoals(homeExp);
  let ga = sampleGoals(awayExp);
  if (!allowDraw && gh === ga) {
    if (Math.random() < 0.5) gh += 1;
    else ga += 1;
  }
  return { gh, ga };
}

function recordLeagueMatch(leagueObj, hId, aId, gh, ga, clubs, players) {
  const stH = leagueObj.standings[hId];
  const stA = leagueObj.standings[aId];
  if (!stH || !stA) return;

  stH.pj += 1;
  stA.pj += 1;
  stH.gf += gh;
  stH.ga += ga;
  stA.gf += ga;
  stA.ga += gh;

  if (gh > ga) {
    stH.w += 1;
    stH.pts += 3;
    stA.l += 1;
  } else if (ga > gh) {
    stA.w += 1;
    stA.pts += 3;
    stH.l += 1;
  } else {
    stH.d += 1;
    stA.d += 1;
    stH.pts += 1;
    stA.pts += 1;
  }

  if (players) {
    const creditGoals = (cid, count) => {
      if (count <= 0) return;
      const scorers = Object.values(players).filter(p => p.clubId === cid && p.pos !== "POR");
      if (!scorers.length) return;
      for (let i = 0; i < count; i++) {
        const pick = scorers[Math.floor(Math.random() * Math.min(6, scorers.length))];
        if (pick) pick.goals = (pick.goals || 0) + 1;
      }
    };
    creditGoals(hId, gh);
    creditGoals(aId, ga);
  }
}

export function getNextUserEvent(state) {
  const uid = state.userClubId;
  const comps = state.competitions;
  if (!uid || !comps?.league_1) return null;

  const l1 = comps.league_1;
  const round = l1.currentRound || 0;

  const cupStageTarget = round === 6 ? 0 : round === 13 ? 1 : round === 19 ? 2 : -1;
  if (cupStageTarget >= 0 && comps.cup_1 && comps.cup_1.currentStage === cupStageTarget && !comps.cup_1.championId) {
    const stageMatches = comps.cup_1.rounds[cupStageTarget] || [];
    const userMatch = stageMatches.find(([h, a]) => h === uid || a === uid);
    if (userMatch) {
      return {
        compId: "cup_1",
        compName: `${comps.cup_1.name} • ${comps.cup_1.stageNames[cupStageTarget]}`,
        match: userMatch
      };
    }
  }

  const contStageTarget = round === 8 ? 0 : round === 15 ? 1 : round === 21 ? 2 : -1;
  if (contStageTarget >= 0 && comps.cont_1 && comps.cont_1.currentStage === contStageTarget && !comps.cont_1.championId) {
    const stageMatches = comps.cont_1.rounds[contStageTarget] || [];
    const userMatch = stageMatches.find(([h, a]) => h === uid || a === uid);
    if (userMatch) {
      return {
        compId: "cont_1",
        compName: `${comps.cont_1.name} • ${comps.cont_1.stageNames[contStageTarget]}`,
        match: userMatch
      };
    }
  }

  if (round < l1.schedule.length) {
    const matches = l1.schedule[round] || [];
    const userMatch = matches.find(([h, a]) => h === uid || a === uid);
    if (userMatch) {
      return {
        compId: "league_1",
        compName: `${l1.name} • Jornada ${round + 1}`,
        match: userMatch
      };
    }
  }

  return null;
}

export function completeRoundWithUserResult(homeId, awayId, gh, ga, compId = "league_1") {
  store.update(["competitions", "liveMatch", "trophies", "budget"], draft => {
    const comps = draft.competitions;
    const clubs = draft.clubs;
    const players = draft.players;

    if (compId === "cup_1" || compId === "cont_1") {
      const cup = comps[compId];
      const stageIdx = cup.currentStage;
      const matches = cup.rounds[stageIdx] || [];
      const winners = [];

      matches.forEach(([hId, aId]) => {
        if ((hId === homeId && aId === awayId) || (hId === awayId && aId === homeId)) {
          winners.push(gh >= ga ? homeId : awayId);
        } else {
          const sim = simulateAiScore(clubs[hId], clubs[aId], false);
          winners.push(sim.gh > sim.ga ? hId : aId);
        }
      });

      if (winners.length === 1) {
        cup.championId = winners[0];
        if (winners[0] === draft.userClubId) {
          draft.trophies = [...(draft.trophies || []), { title: cup.name, season: draft.season || 1 }];
          draft.budget = (draft.budget || 0) + (compId === "cont_1" ? 18000000 : 8000000);
        }
      } else {
        const nextRound = [];
        for (let i = 0; i < winners.length; i += 2) {
          if (winners[i] && winners[i + 1]) nextRound.push([winners[i], winners[i + 1]]);
        }
        cup.rounds.push(nextRound);
        cup.currentStage += 1;
      }
      draft.liveMatch = null;
      return;
    }

    const l1 = comps.league_1;
    const roundIdx = l1.currentRound || 0;
    const roundMatches = l1.schedule[roundIdx] || [];

    roundMatches.forEach(([hId, aId]) => {
      if (hId === homeId && aId === awayId) {
        recordLeagueMatch(l1, hId, aId, gh, ga, clubs, players);
      } else {
        const sim = simulateAiScore(clubs[hId], clubs[aId], true);
        recordLeagueMatch(l1, hId, aId, sim.gh, sim.ga, clubs, players);
      }
    });
    l1.currentRound = roundIdx + 1;

    Object.values(comps.otherLeagues || {}).forEach(otherL => {
      if ((otherL.currentRound || 0) < otherL.schedule.length) {
        const oMatches = otherL.schedule[otherL.currentRound] || [];
        oMatches.forEach(([hId, aId]) => {
          const sim = simulateAiScore(clubs[hId], clubs[aId], true);
          recordLeagueMatch(otherL, hId, aId, sim.gh, sim.ga, clubs, players);
        });
        otherL.currentRound += 1;
      }
    });

    if (l1.currentRound >= l1.schedule.length) {
      const sorted = Object.entries(l1.standings).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga));
      if (sorted[0]?.[0] === draft.userClubId) {
        draft.trophies = [...(draft.trophies || []), { title: l1.name, season: draft.season || 1 }];
        draft.budget = (draft.budget || 0) + 15000000;
      }
    }

    draft.liveMatch = null;
  });
}