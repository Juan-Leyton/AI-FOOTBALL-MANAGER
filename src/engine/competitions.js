import { store } from "../core/state.js";

export function generateRoundRobinSchedule(clubIds) {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push("BYE");
  const n = teams.length;
  const firstLeg = [];
  const secondLeg = [];

  for (let round = 0; round < n - 1; round++) {
    const leg1Matches = [];
    const leg2Matches = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        leg1Matches.push(round % 2 === 0 ? [home, away] : [away, home]);
        leg2Matches.push(round % 2 === 0 ? [away, home] : [home, away]);
      }
    }
    firstLeg.push(leg1Matches);
    secondLeg.push(leg2Matches);
    teams.splice(1, 0, teams.pop());
  }

  return [...firstLeg, ...secondLeg];
}

export const generateSchedule = generateRoundRobinSchedule;

export function initCompetitions(clubs) {
  const clubIds = Object.keys(clubs);
  const standings = {};
  clubIds.forEach(id => {
    standings[id] = { pj: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  });

  const cupTeams = [...clubIds].slice(0, 8);
  const qfMatches = [];
  for (let i = 0; i < cupTeams.length; i += 2) {
    qfMatches.push([cupTeams[i], cupTeams[i + 1]]);
  }

  return {
    league_1: {
      id: "league_1",
      type: "league",
      name: "Primera División",
      currentRound: 0,
      schedule: generateRoundRobinSchedule(clubIds),
      standings
    },
    cup_1: {
      id: "cup_1",
      type: "cup",
      name: "Copa Nacional",
      stageNames: ["Cuartos de Final", "Semifinales", "Gran Final"],
      currentStage: 0,
      rounds: [qfMatches],
      eliminated: false,
      championId: null
    }
  };
}

export function getNextUserEvent(state) {
  const league = state.competitions?.league_1;
  const cup = state.competitions?.cup_1;
  const uid = state.userClubId;

  if (!league || !Array.isArray(league.schedule) || league.schedule.length === 0) {
    return null;
  }

  const cupTriggerRounds = [4, 8, 12];
  if (cup && !cup.eliminated && !cup.championId && cupTriggerRounds.includes(league.currentRound)) {
    const stageMatches = cup.rounds[cup.currentStage] || [];
    const userCupMatch = stageMatches.find(m => m[0] === uid || m[1] === uid);
    if (userCupMatch) {
      return {
        compId: "cup_1",
        compName: `${cup.name} (${cup.stageNames[cup.currentStage]})`,
        match: userCupMatch
      };
    }
  }

  if (league.currentRound < league.schedule.length) {
    const roundMatches = league.schedule[league.currentRound] || [];
    const userLeagueMatch = roundMatches.find(m => m[0] === uid || m[1] === uid);
    if (userLeagueMatch) {
      return {
        compId: "league_1",
        compName: `${league.name} • Jornada ${league.currentRound + 1}`,
        match: userLeagueMatch
      };
    }
  }

  return null;
}

export function getNextUserMatch(state) {
  return getNextUserEvent(state)?.match || null;
}

export function simulateAIMatch(homeClub, awayClub, mustHaveWinner = false) {
  const diff = (homeClub.ovr - awayClub.ovr) * 0.08 + 0.25;
  let gh = Math.max(0, Math.round(Math.random() * 2.5 + diff));
  let ga = Math.max(0, Math.round(Math.random() * 2.2 - diff * 0.5));
  if (mustHaveWinner && gh === ga) {
    Math.random() > 0.45 ? gh++ : ga++;
  }
  return [gh, ga];
}

function creditClubGoals(draft, clubId, goals) {
  if (goals <= 0 || !draft.players) return;
  const squad = Object.values(draft.players).filter(p => p.clubId === clubId && p.pos !== "POR");
  if (squad.length === 0) return;

  for (let i = 0; i < goals; i++) {
    // Delanteros y mediocampistas tienen mayor peso al anotar
    const weighted = [];
    squad.forEach(p => {
      const weight = p.pos === "DEL" ? 5 : p.pos === "MED" ? 3 : 1;
      for (let w = 0; w < weight; w++) weighted.push(p);
    });
    const scorer = weighted[Math.floor(Math.random() * weighted.length)];
    scorer.goals = (scorer.goals || 0) + 1;
  }
}

export function completeRoundWithUserResult(homeId, awayId, userGh, userGa, compId = "league_1") {
  store.update(["competitions", "liveMatch", "budget", "inbox", "players"], draft => {
    if (compId === "cup_1") {
      resolveCupRound(draft, homeId, awayId, userGh, userGa);
    } else {
      resolveLeagueRound(draft, homeId, awayId, userGh, userGa);
    }
    draft.liveMatch = null;
  });
}

function resolveLeagueRound(draft, homeId, awayId, userGh, userGa) {
  const comp = draft.competitions.league_1;
  const roundMatches = comp.schedule[comp.currentRound] || [];

  roundMatches.forEach(([hId, aId]) => {
    let gh, ga;
    if (hId === homeId && aId === awayId) {
      gh = userGh;
      ga = userGa;
    } else {
      [gh, ga] = simulateAIMatch(draft.clubs[hId], draft.clubs[aId], false);
    }

    creditClubGoals(draft, hId, gh);
    creditClubGoals(draft, aId, ga);

    const hStat = comp.standings[hId];
    const aStat = comp.standings[aId];
    hStat.pj++; aStat.pj++;
    hStat.gf += gh; hStat.ga += ga;
    aStat.gf += ga; aStat.ga += gh;

    if (gh > ga) {
      hStat.w++; hStat.pts += 3; aStat.l++;
    } else if (gh < ga) {
      aStat.w++; aStat.pts += 3; hStat.l++;
    } else {
      hStat.d++; hStat.pts += 1; aStat.d++; aStat.pts += 1;
    }
  });

  comp.currentRound++;
}

function resolveCupRound(draft, homeId, awayId, userGh, userGa) {
  const cup = draft.competitions.cup_1;
  const stageMatches = cup.rounds[cup.currentStage] || [];
  const winners = [];

  stageMatches.forEach(([hId, aId]) => {
    let gh, ga;
    if (hId === homeId && aId === awayId) {
      gh = userGh;
      ga = userGa;
      if (gh === ga) Math.random() > 0.5 ? gh++ : ga++;
    } else {
      [gh, ga] = simulateAIMatch(draft.clubs[hId], draft.clubs[aId], true);
    }

    creditClubGoals(draft, hId, gh);
    creditClubGoals(draft, aId, ga);

    const winnerId = gh > ga ? hId : aId;
    winners.push(winnerId);

    if ((hId === draft.userClubId || aId === draft.userClubId) && winnerId !== draft.userClubId) {
      cup.eliminated = true;
    }
  });

  if (winners.length === 1) {
    cup.championId = winners[0];
    if (winners[0] === draft.userClubId) {
      draft.budget = (draft.budget || 0) + 12000000;
      draft.inbox.unshift({
        id: `cup_win_${Date.now()}`,
        title: "🏆 ¡CAMPEONES DE LA COPA NACIONAL!",
        body: "La afición celebra el título en las calles. La directiva ingresa 12.00 M€ extra en tu presupuesto.",
        date: `Temporada ${draft.season || 1}`,
        resolved: true,
        choices: []
      });
    }
  } else {
    const nextMatches = [];
    for (let i = 0; i < winners.length; i += 2) {
      nextMatches.push([winners[i], winners[i + 1]]);
    }
    cup.rounds.push(nextMatches);
    cup.currentStage++;
  }
}