import { store } from "../core/state.js";
import { initCompetitions } from "./competitions.js";

export function processRoundProgression() {
  store.update(["players"], draft => {
    Object.values(draft.players).forEach(p => {
      if (p.starter) {
        const drain = Math.floor(Math.random() * 6) + 7;
        p.stamina = Math.max(30, p.stamina - drain);
      } else {
        p.stamina = Math.min(100, p.stamina + 18);
      }
    });
  });
}

export function advanceSeason() {
  store.update(["season", "players", "competitions", "budget", "inbox"], draft => {
    const league = draft.competitions.league_1;
    const sorted = Object.entries(league.standings)
      .map(([clubId, s]) => ({ clubId, ...s }))
      .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

    const userRank = sorted.findIndex(t => t.clubId === draft.userClubId) + 1;
    const prizeMoney = userRank === 1 ? 30000000 : userRank <= 4 ? 22000000 : 15000000;

    draft.season = (draft.season || 1) + 1;
    draft.budget = (draft.budget || 0) + prizeMoney;

    Object.values(draft.players).forEach(p => {
      p.age += 1;
      p.stamina = 100;
      if (p.age <= 23) p.ovr = Math.min(94, p.ovr + Math.floor(Math.random() * 3) + 1);
      else if (p.age >= 32) p.ovr = Math.max(65, p.ovr - Math.floor(Math.random() * 2) - 1);
      p.wage = Math.round(p.ovr * 1150);
    });

    draft.competitions = initCompetitions(draft.clubs);

    draft.inbox.unshift({
      id: `season_${draft.season}`,
      title: `Inicio de Temporada ${draft.season}`,
      body: `Finalizaste en el puesto #${userRank}. Recibes ${(prizeMoney / 1e6).toFixed(0)} M€ por derechos de TV y premios.`,
      date: `Temporada ${draft.season}`,
      resolved: true,
      choices: []
    });
  });
}