import { store } from "../core/state.js";
import { initCompetitions, initContinentalCup, CONTINENTAL_RIVALS } from "./competitions.js";
import { TRAINING_PLANS } from "./training.js";
import { SPONSORS_CATALOG, getRealisticWeeklyWage } from "./economy-market.js";

export function renewPlayerContract(playerId) {
  const state = store.get();
  const player = state.players?.[playerId];
  if (!player || player.clubId !== state.userClubId) {
    return { ok: false, msg: "Jugador no encontrado en tu plantilla." };
  }

  const baseWage = getRealisticWeeklyWage(player);
  const newWage = Math.round(baseWage * 1.12);
  const signingBonus = Math.round(newWage * 16);

  if ((state.budget || 0) < signingBonus) {
    return { ok: false, msg: `Necesitas ${(signingBonus / 1e6).toFixed(2)} M€ para la prima de renovación.` };
  }

  store.update(["players", "budget", "inbox"], draft => {
    const p = draft.players[playerId];
    p.contractYears = 4;
    p.wage = newWage;
    p.morale = Math.min(100, (p.morale || 80) + 15);
    draft.budget -= signingBonus;

    draft.inbox.unshift({
      id: `renew_${p.id}_${Date.now()}`,
      title: `✍️ Contrato Renovado: ${p.name}`,
      body: `${p.name} ha firmado por 4 temporadas más con un salario de ${(newWage / 1000).toFixed(0)}k €/sem (Prima: ${(signingBonus / 1e6).toFixed(2)} M€).`,
      date: `Temporada ${draft.season || 1}`,
      resolved: true,
      choices: []
    });
  });

  return { ok: true, msg: `✍️ Contrato de ${player.name} renovado por 4 años.` };
}

export function recordMatchInCareer(gh, ga) {
  store.update(["careerStats", "lastMatchWon"], draft => {
    if (!draft.careerStats) {
      draft.careerStats = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 };
    }
    draft.careerStats.played += 1;
    draft.careerStats.gf += gh;
    draft.careerStats.ga += ga;
    if (gh > ga) {
      draft.careerStats.wins += 1;
      draft.lastMatchWon = true;
    } else if (gh === ga) {
      draft.careerStats.draws += 1;
      draft.lastMatchWon = false;
    } else {
      draft.careerStats.losses += 1;
      draft.lastMatchWon = false;
    }
  });
}

export function processRoundProgression(wasUserHome = true) {
  store.update(["players", "inbox", "budget", "lastFinanceReport"], draft => {
    const fitnessLvl = draft.staff?.fitness || 1;
    const youthLvl = draft.staff?.youth || 1;
    const stadiumLvl = draft.staff?.stadium || 1;
    const plan = TRAINING_PLANS[draft.trainingPlan || "balanced"] || TRAINING_PLANS.balanced;

    const userClub = draft.clubs?.[draft.userClubId];
    const myPlayers = Object.values(draft.players).filter(p => p.clubId === draft.userClubId);

    // Gastos semanales realistas: salarios + mantenimiento de instalaciones/staff
    const weeklyWages = myPlayers.reduce((sum, p) => sum + getRealisticWeeklyWage(p), 0);
    const staffUpkeep = ((fitnessLvl + (draft.staff?.scout || 1) + youthLvl + stadiumLvl) - 4) * 55000;
    const totalExpenses = weeklyWages + staffUpkeep;

    // Ingresos semanales: taquilla escalada por estadio + patrocinador + bonus por victoria
    const confidenceBonus = 1 + ((draft.boardConfidence || 85) - 50) / 100;
    const stadiumMult = 1 + (stadiumLvl - 1) * 0.28;
    const ticketRevenue = wasUserHome
      ? Math.round(1350000 * confidenceBonus * stadiumMult)
      : 320000;

    const sponsor = SPONSORS_CATALOG.find(s => s.id === (userClub?.sponsorId || "sp_local")) || SPONSORS_CATALOG[0];
    const sponsorIncome = sponsor.weekly + (draft.lastMatchWon ? sponsor.winBonus : 0);

    const totalIncome = ticketRevenue + sponsorIncome;
    const netBalance = totalIncome - totalExpenses;

    draft.budget = Math.max(0, (draft.budget || 0) + netBalance);
    draft.lastFinanceReport = {
      ticketRevenue: totalIncome,
      weeklyWages: totalExpenses,
      netBalance
    };

    Object.values(draft.players).forEach(p => {
      if (p.contractYears === undefined) p.contractYears = Math.floor(Math.random() * 4) + 1;

      if (p.clubId === draft.userClubId) {
        if (p.starter) {
          const baseDrain = Math.floor(Math.random() * 5) + 7;
          const netDrain = Math.max(2, baseDrain - (fitnessLvl - 1) - plan.staminaMod);
          p.stamina = Math.max(30, Math.min(100, p.stamina - netDrain));
        } else {
          const recovery = 18 + (fitnessLvl - 1) * 4 + Math.max(0, plan.staminaMod);
          p.stamina = Math.min(100, p.stamina + recovery);
        }

        const isTargetPos = !plan.targetPositions || plan.targetPositions.includes(p.pos);
        const growthChance = 0.04 * youthLvl * (isTargetPos ? plan.growthBonus : 0.8);

        if (p.age <= 24 && p.ovr < 93 && Math.random() < growthChance) {
          p.ovr += 1;
          p.wage = getRealisticWeeklyWage({ ...p, wage: 0 });
          draft.inbox.unshift({
            id: `youth_${p.id}_${Date.now()}`,
            title: `📈 Progreso Semanal (${plan.name}): ${p.name}`,
            body: `Bajo el plan de ${plan.name}, ${p.name} (${p.pos}, ${p.age} años) ha subido su media a ${p.ovr} OVR.`,
            date: `Temporada ${draft.season || 1}`,
            resolved: true,
            choices: []
          });
        }
      } else {
        p.stamina = p.starter ? Math.max(40, p.stamina - 7) : Math.min(100, p.stamina + 18);
      }
    });
  });
}

export function advanceSeason() {
  store.update(["season", "players", "competitions", "budget", "inbox", "trophies", "clubs"], draft => {
    if (!draft.trophies) draft.trophies = [];

    CONTINENTAL_RIVALS.forEach(r => {
      if (!draft.clubs[r.id]) {
        draft.clubs[r.id] = {
          ...r,
          budget: 90000000,
          formation: "4-3-3",
          tactics: { mentality: 65, tempo: 65, press: 65 }
        };
      }
    });

    const league = draft.competitions.league_1;
    const sorted = Object.entries(league.standings)
      .map(([clubId, s]) => ({ clubId, ...s }))
      .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

    const userRank = sorted.findIndex(t => t.clubId === draft.userClubId) + 1;
    const prizeMoney = userRank === 1 ? 30000000 : userRank <= 4 ? 22000000 : 15000000;

    if (userRank === 1) {
      draft.trophies.push({ season: draft.season || 1, title: "Primera División" });
    }

    draft.season = (draft.season || 1) + 1;
    draft.budget = (draft.budget || 0) + prizeMoney;

    const otherClubIds = Object.keys(draft.clubs).filter(id => id !== draft.userClubId && !id.startsWith("ext_"));
    const expiredNames = [];

    Object.values(draft.players).forEach(p => {
      p.age += 1;
      p.stamina = 100;
      p.goals = 0;
      p.contractYears = (p.contractYears ?? 2) - 1;

      if (p.age <= 23) p.ovr = Math.min(94, p.ovr + Math.floor(Math.random() * 3) + 1);
      else if (p.age >= 32) p.ovr = Math.max(65, p.ovr - Math.floor(Math.random() * 2) - 1);
      p.wage = getRealisticWeeklyWage({ ...p, wage: 0 });

      if (p.clubId === draft.userClubId && p.contractYears <= 0) {
        const myRemaining = Object.values(draft.players).filter(x => x.clubId === draft.userClubId).length;
        if (myRemaining > 13 && otherClubIds.length > 0) {
          p.clubId = otherClubIds[Math.floor(Math.random() * otherClubIds.length)];
          p.starter = false;
          p.contractYears = 3;
          expiredNames.push(p.name);
        } else {
          p.contractYears = 1;
        }
      } else if (p.contractYears <= 0) {
        p.contractYears = 3;
      }
    });

    const nextComps = initCompetitions(draft.clubs);
    const top4Ids = sorted.slice(0, 4).map(t => t.clubId);
    if (top4Ids.includes(draft.userClubId)) {
      nextComps.cont_1 = initContinentalCup(top4Ids);
    }

    draft.competitions = nextComps;

    const expiredNotice = expiredNames.length > 0
      ? ` ⚠️ Fin de contrato: ${expiredNames.join(", ")} dejaron el club libres.`
      : "";

    draft.inbox.unshift({
      id: `season_${draft.season}`,
      title: `Inicio de Temporada ${draft.season}`,
      body: `Finalizaste #${userRank}. Recibes ${(prizeMoney / 1e6).toFixed(0)} M€.${top4Ids.includes(draft.userClubId) ? " 🌍 ¡Clasificado a la Copa Continental Élite!" : ""}${expiredNotice}`,
      date: `Temporada ${draft.season}`,
      resolved: true,
      choices: []
    });
  });
}