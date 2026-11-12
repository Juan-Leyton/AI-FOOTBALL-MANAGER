import { store } from "../core/state.js";

export const MANAGER_PERKS = {
  negotiator: {
    key: "negotiator",
    name: "🤝 Negociador Maestro",
    desc: "Reduce un 8% adicional el coste de traspasos y primas de fichaje.",
    maxLevel: 3
  },
  physio: {
    key: "physio",
    name: "⚡ Preparador de Élite",
    desc: "Recupera +6% extra de energía física tras cada jornada.",
    maxLevel: 3
  },
  talent_eye: {
    key: "talent_eye",
    name: "🔭 Ojo Clínico",
    desc: "Aumenta +2 el potencial de los juveniles descubiertos y promovidos.",
    maxLevel: 3
  },
  commercial: {
    key: "commercial",
    name: "💰 Imán Comercial",
    desc: "Genera +1.20 M€ extra de patrocinio cada 5 jornadas.",
    maxLevel: 3
  }
};

export function ensureCareerHooksState() {
  const state = store.get();
  if (!state.userClubId) return;

  const userClub = state.clubs?.[state.userClubId];
  const season = state.season || 1;
  const hasCurrentObjectives = (state.seasonObjectives || []).some(o => o.season === season);

  if (!state.managerProfile || !hasCurrentObjectives) {
    store.update(["managerProfile", "seasonObjectives"], draft => {
      if (!draft.managerProfile) {
        draft.managerProfile = {
          level: 1,
          xp: 0,
          nextLevelXp: 1000,
          skillPoints: 1,
          perks: { negotiator: 0, physio: 0, talent_eye: 0, commercial: 0 }
        };
      }

      if (!hasCurrentObjectives) {
        const ovr = userClub?.ovr || 78;
        const targetRank = ovr >= 83 ? 2 : ovr >= 79 ? 4 : 6;
        const prizeBase = ovr >= 83 ? 8000000 : 5000000;

        draft.seasonObjectives = [
          {
            id: `obj_league_${season}`,
            season,
            type: "league_rank",
            title: `Terminar en el Top ${targetRank} de Liga`,
            target: targetRank,
            rewardCash: prizeBase,
            rewardXp: 450,
            completed: false
          },
          {
            id: `obj_wins_${season}`,
            season,
            type: "season_wins",
            title: `Conseguir al menos ${ovr >= 82 ? 14 : 10} victorias en la temporada`,
            target: ovr >= 82 ? 14 : 10,
            current: 0,
            rewardCash: Math.round(prizeBase * 0.6),
            rewardXp: 350,
            completed: false
          },
          {
            id: `obj_youth_${season}`,
            season,
            type: "youth_signings",
            title: "Incorporar o ascender 2 jugadores Sub-21",
            target: 2,
            current: 0,
            rewardCash: Math.round(prizeBase * 0.5),
            rewardXp: 300,
            completed: false
          }
        ];
      }
    });
  }
}

export function grantManagerXp(amount, reason = "") {
  ensureCareerHooksState();
  let leveledUp = false;
  let newLevel = 1;

  store.update(["managerProfile", "inbox"], draft => {
    const mp = draft.managerProfile;
    mp.xp += amount;
    while (mp.xp >= mp.nextLevelXp) {
      mp.xp -= mp.nextLevelXp;
      mp.level += 1;
      mp.skillPoints += 1;
      mp.nextLevelXp = Math.round(mp.nextLevelXp * 1.25);
      leveledUp = true;
      newLevel = mp.level;
    }

    if (leveledUp) {
      draft.inbox = [
        {
          id: `lvl_up_${Date.now()}`,
          title: `🎖️ ¡Nivel de Mánager ${newLevel} alcanzado!`,
          date: `Temporada ${store.get().season || 1}`,
          body: `Tu reputación en Europa sigue creciendo${reason ? ` (${reason})` : ""}. Has ganado <b>+1 Punto de Habilidad</b> para mejorar tus perks en el Centro del Club.`,
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    }
  });

  return { leveledUp, newLevel };
}

export function unlockManagerPerk(perkKey) {
  ensureCareerHooksState();
  const state = store.get();
  const perk = MANAGER_PERKS[perkKey];
  const mp = state.managerProfile;

  if (!perk || !mp) return { ok: false, msg: "Habilidad no válida." };
  if ((mp.skillPoints || 0) <= 0) {
    return { ok: false, msg: "No tienes Puntos de Habilidad disponibles. Sube de nivel ganando partidos y cumpliendo objetivos." };
  }

  const curLvl = mp.perks?.[perkKey] || 0;
  if (curLvl >= perk.maxLevel) {
    return { ok: false, msg: "Esta habilidad ya está al nivel máximo." };
  }

  store.update(["managerProfile"], draft => {
    draft.managerProfile.skillPoints -= 1;
    draft.managerProfile.perks[perkKey] = curLvl + 1;
  });

  return {
    ok: true,
    msg: `¡Habilidad mejorada! ${perk.name} (Nivel ${curLvl + 1}/${perk.maxLevel}).`
  };
}

export function evaluateObjectivesProgress({ wonMatch = false, signedU21 = false } = {}) {
  ensureCareerHooksState();
  const state = store.get();
  const season = state.season || 1;
  const uid = state.userClubId;

  // Calcular posición actual en liga
  const standings = state.competitions?.league_1?.standings || {};
  const sorted = Object.entries(standings)
    .map(([cid, s]) => ({ cid, pts: s.pts || 0, dg: (s.gf || 0) - (s.ga || 0) }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg);
  const currentRank = sorted.findIndex(x => x.cid === uid) + 1;

  let completedList = [];

  store.update(["seasonObjectives", "budget", "boardConfidence"], draft => {
    (draft.seasonObjectives || []).forEach(obj => {
      if (obj.season !== season || obj.completed) return;

      if (obj.type === "season_wins" && wonMatch) {
        obj.current = (obj.current || 0) + 1;
        if (obj.current >= obj.target) {
          obj.completed = true;
          completedList.push(obj);
        }
      }

      if (obj.type === "youth_signings" && signedU21) {
        obj.current = (obj.current || 0) + 1;
        if (obj.current >= obj.target) {
          obj.completed = true;
          completedList.push(obj);
        }
      }

      if (obj.type === "league_rank" && currentRank > 0 && currentRank <= obj.target) {
        obj.current = currentRank;
      }
    });

    completedList.forEach(obj => {
      draft.budget = (draft.budget || 0) + obj.rewardCash;
      draft.boardConfidence = Math.min(100, (draft.boardConfidence || 80) + 6);
    });
  });

  completedList.forEach(obj => {
    grantManagerXp(obj.rewardXp, `Objetivo cumplido: ${obj.title}`);
  });

  return completedList;
}