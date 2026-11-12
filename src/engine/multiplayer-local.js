import { store } from "../core/state.js";
import { initCompetitions } from "./competitions.js";
import { ensureFreeAgentsPool } from "./player-development.js";
import { injectCustomLegends } from "../data/custom-legends.js";
import { ensureCareerHooksState } from "./career-hooks.js";

export function startMultiplayerCareer(managersList) {
  // managersList: [{ name: "Ángel", clubId: "esp_madrid" }, { name: "Santiago", clubId: "eng_city" }, ...]
  if (!Array.isArray(managersList) || managersList.length < 2) {
    return { ok: false, msg: "Selecciona al menos 2 mánagers con clubes distintos." };
  }

  const uniqueClubs = new Set(managersList.map(m => m.clubId));
  if (uniqueClubs.size !== managersList.length) {
    return { ok: false, msg: "Cada mánager debe dirigir un club diferente." };
  }

  const state = store.get();
  const primaryClubId = managersList[0].clubId;

  const mpManagers = managersList.map((m, idx) => {
    const club = state.clubs[m.clubId];
    return {
      id: `mgr_${idx + 1}`,
      name: m.name.trim() || `Mánager ${idx + 1}`,
      clubId: m.clubId,
      budget: club?.budget || 60000000,
      boardConfidence: 85,
      trainingPlan: "balanced",
      staff: { fitness: 1, scout: 1, youth: 1, stadium: 1 },
      managerProfile: {
        level: 1,
        xp: 0,
        nextLevelXp: 1000,
        skillPoints: 1,
        perks: { negotiator: 0, physio: 0, talent_eye: 0, commercial: 0 }
      },
      careerStats: { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 },
      trophies: []
    };
  });

  store.update(
    [
      "isMultiplayer",
      "mpManagers",
      "activeManagerIndex",
      "userClubId",
      "budget",
      "boardConfidence",
      "trainingPlan",
      "staff",
      "managerProfile",
      "careerStats",
      "trophies",
      "competitions",
      "activeCompId",
      "activeTab"
    ],
    draft => {
      const first = mpManagers[0];
      draft.isMultiplayer = true;
      draft.mpManagers = mpManagers;
      draft.activeManagerIndex = 0;
      draft.userClubId = first.clubId;
      draft.budget = first.budget;
      draft.boardConfidence = first.boardConfidence;
      draft.trainingPlan = first.trainingPlan;
      draft.staff = { ...first.staff };
      draft.managerProfile = JSON.parse(JSON.stringify(first.managerProfile));
      draft.careerStats = { ...first.careerStats };
      draft.trophies = [];
      draft.competitions = initCompetitions(draft.clubs, primaryClubId, mpManagers.map(m => m.clubId));
      draft.activeCompId = "league_1";
      draft.activeTab = "home";
    }
  );

  ensureFreeAgentsPool();
  injectCustomLegends();
  ensureCareerHooksState();

  return { ok: true, msg: `¡Carrera Multijugador iniciada con ${mpManagers.length} mánagers!` };
}

export function syncCurrentManagerSnapshot() {
  const state = store.get();
  if (!state.isMultiplayer || !state.mpManagers?.length) return;

  const idx = state.activeManagerIndex || 0;
  store.update(["mpManagers"], draft => {
    const cur = draft.mpManagers[idx];
    if (!cur) return;
    cur.budget = state.budget;
    cur.boardConfidence = state.boardConfidence;
    cur.trainingPlan = state.trainingPlan;
    cur.staff = { ...(state.staff || {}) };
    cur.managerProfile = JSON.parse(JSON.stringify(state.managerProfile || {}));
    cur.careerStats = { ...(state.careerStats || {}) };
    cur.trophies = [...(state.trophies || [])];
  });
}

export function switchActiveManager(targetIndex) {
  const state = store.get();
  if (!state.isMultiplayer || !state.mpManagers?.[targetIndex]) {
    return { ok: false, msg: "Mánager no encontrado." };
  }

  // Guardar progreso actual antes de cambiar de turno
  syncCurrentManagerSnapshot();

  const updatedState = store.get();
  const nextMgr = updatedState.mpManagers[targetIndex];

  store.update(
    [
      "activeManagerIndex",
      "userClubId",
      "budget",
      "boardConfidence",
      "trainingPlan",
      "staff",
      "managerProfile",
      "careerStats",
      "trophies",
      "activeTab"
    ],
    draft => {
      draft.activeManagerIndex = targetIndex;
      draft.userClubId = nextMgr.clubId;
      draft.budget = nextMgr.budget;
      draft.boardConfidence = nextMgr.boardConfidence ?? 85;
      draft.trainingPlan = nextMgr.trainingPlan || "balanced";
      draft.staff = { ...(nextMgr.staff || { fitness: 1, scout: 1, youth: 1, stadium: 1 }) };
      draft.managerProfile = JSON.parse(
        JSON.stringify(
          nextMgr.managerProfile || {
            level: 1,
            xp: 0,
            nextLevelXp: 1000,
            skillPoints: 1,
            perks: { negotiator: 0, physio: 0, talent_eye: 0, commercial: 0 }
          }
        )
      );
      draft.careerStats = { ...(nextMgr.careerStats || { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }) };
      draft.trophies = [...(nextMgr.trophies || [])];
      draft.activeTab = "home";
    }
  );

  ensureCareerHooksState();
  const clubName = store.get().clubs[nextMgr.clubId]?.name || nextMgr.clubId;
  return { ok: true, msg: `Turno de ${nextMgr.name} (${clubName})` };
}

export function getActiveManagerInfo(state) {
  if (!state.isMultiplayer || !state.mpManagers?.length) return null;
  const idx = state.activeManagerIndex || 0;
  return {
    index: idx,
    manager: state.mpManagers[idx],
    all: state.mpManagers
  };
}