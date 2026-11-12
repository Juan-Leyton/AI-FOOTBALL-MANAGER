import { store } from "../core/state.js";
import { switchActiveManager, syncCurrentManagerSnapshot } from "./multiplayer-local.js";

// Pega aquí tus credenciales públicas (anon) de Supabase:
const SUPABASE_URL = "https://miabfzwoyplulmewqrbo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Uhw4NwIxH6fwZVDr7c8_lw_v7yIkJ4G";

let pollTimer = null;
let lastRemoteUpdatedAt = null;

export function isOnlineConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("TU_SUPABASE_URL") &&
    SUPABASE_ANON_KEY.length > 20
  );
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildSerializableWorld(state) {
  return {
    season: state.season || 1,
    clubs: state.clubs,
    players: state.players,
    competitions: state.competitions,
    mpManagers: state.mpManagers,
    hallOfFame: state.hallOfFame || [],
    youthAcademy: state.youthAcademy || []
  };
}

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createOnlineRoom() {
  if (!isOnlineConfigured()) {
    return { ok: false, msg: "Configura SUPABASE_URL y SUPABASE_ANON_KEY en multiplayer-online.js primero." };
  }

  syncCurrentManagerSnapshot();
  const state = store.get();
  if (!state.isMultiplayer || !state.mpManagers?.length) {
    return { ok: false, msg: "Inicia primero una Carrera con Amigos (2–6 mánagers)." };
  }

  const roomCode = generateRoomCode();
  const myManagerId = state.mpManagers[state.activeManagerIndex || 0]?.id || "mgr_1";
  const payload = {
    room_code: roomCode,
    host_name: state.mpManagers[0]?.name || "Host",
    season: state.season || 1,
    round: (state.competitions?.league_1?.currentRound || 0) + 1,
    state_json: buildSerializableWorld(state),
    updated_at: new Date().toISOString()
  };

  try {
    const rows = await supabaseFetch("wfm_rooms", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    lastRemoteUpdatedAt = rows?.[0]?.updated_at || payload.updated_at;

    store.update(["onlineRoomCode", "onlineMyManagerId"], draft => {
      draft.onlineRoomCode = roomCode;
      draft.onlineMyManagerId = myManagerId;
    });

    startOnlineAutoSync();
    return { ok: true, code: roomCode, msg: `☁️ Sala Online creada: ${roomCode}. ¡Compártela con tus amigos!` };
  } catch (err) {
    return { ok: false, msg: `Error al crear sala: ${err.message}` };
  }
}

export async function fetchOnlineRoom(rawCode) {
  if (!isOnlineConfigured()) {
    return { ok: false, msg: "Falta configurar las credenciales de Supabase." };
  }

  const code = (rawCode || "").trim().toUpperCase();
  if (code.length < 4) {
    return { ok: false, msg: "Ingresa un código de sala válido." };
  }

  try {
    const rows = await supabaseFetch(`wfm_rooms?room_code=eq.${encodeURIComponent(code)}&select=*`);
    if (!rows || !rows.length) {
      return { ok: false, msg: `No existe ninguna sala con el código ${code}.` };
    }
    return { ok: true, room: rows[0] };
  } catch (err) {
    return { ok: false, msg: `Error conectando a la sala: ${err.message}` };
  }
}

export function joinOnlineRoomAsManager(roomRow, managerId) {
  const world = roomRow.state_json;
  if (!world || !world.mpManagers?.length) {
    return { ok: false, msg: "La sala no contiene datos válidos." };
  }

  const mgrIdx = world.mpManagers.findIndex(m => m.id === managerId);
  if (mgrIdx < 0) {
    return { ok: false, msg: "Mánager no encontrado en la sala." };
  }

  lastRemoteUpdatedAt = roomRow.updated_at;

  store.update(
    [
      "isMultiplayer",
      "onlineRoomCode",
      "onlineMyManagerId",
      "season",
      "clubs",
      "players",
      "competitions",
      "mpManagers",
      "hallOfFame",
      "activeManagerIndex",
      "userClubId",
      "activeTab"
    ],
    draft => {
      draft.isMultiplayer = true;
      draft.onlineRoomCode = roomRow.room_code;
      draft.onlineMyManagerId = managerId;
      draft.season = world.season || 1;
      draft.clubs = world.clubs;
      draft.players = world.players;
      draft.competitions = world.competitions;
      draft.mpManagers = world.mpManagers;
      draft.hallOfFame = world.hallOfFame || [];
      draft.activeManagerIndex = mgrIdx;
      draft.userClubId = world.mpManagers[mgrIdx].clubId;
      draft.activeTab = "home";
    }
  );

  switchActiveManager(mgrIdx);
  startOnlineAutoSync();

  const mgr = world.mpManagers[mgrIdx];
  return { ok: true, msg: `🌐 Conectado a sala ${roomRow.room_code} como ${mgr.name}` };
}

export async function pushOnlineWorldState() {
  const state = store.get();
  if (!state.onlineRoomCode || !isOnlineConfigured()) return { ok: false };

  syncCurrentManagerSnapshot();
  const updatedState = store.get();
  const nowIso = new Date().toISOString();

  try {
    await supabaseFetch(`wfm_rooms?room_code=eq.${encodeURIComponent(state.onlineRoomCode)}`, {
      method: "PATCH",
      body: JSON.stringify({
        season: updatedState.season || 1,
        round: (updatedState.competitions?.league_1?.currentRound || 0) + 1,
        state_json: buildSerializableWorld(updatedState),
        updated_at: nowIso
      })
    });
    lastRemoteUpdatedAt = nowIso;
    return { ok: true };
  } catch (err) {
    console.warn("Error subiendo estado online:", err);
    return { ok: false };
  }
}

export async function pullOnlineWorldState() {
  const state = store.get();
  if (!state.onlineRoomCode || state.liveMatch || !isOnlineConfigured()) return false;

  try {
    const rows = await supabaseFetch(`wfm_rooms?room_code=eq.${encodeURIComponent(state.onlineRoomCode)}&select=*`);
    const room = rows?.[0];
    if (!room || !room.updated_at || room.updated_at === lastRemoteUpdatedAt) return false;

    lastRemoteUpdatedAt = room.updated_at;
    const world = room.state_json;
    const myId = state.onlineMyManagerId;
    const mgrIdx = Math.max(0, (world.mpManagers || []).findIndex(m => m.id === myId));
    const myMgr = world.mpManagers?.[mgrIdx];

    store.update(
      [
        "season",
        "clubs",
        "players",
        "competitions",
        "mpManagers",
        "hallOfFame",
        "activeManagerIndex",
        "userClubId",
        "budget",
        "boardConfidence",
        "trainingPlan",
        "staff",
        "managerProfile",
        "careerStats",
        "trophies"
      ],
      draft => {
        draft.season = world.season || 1;
        draft.clubs = world.clubs;
        draft.players = world.players;
        draft.competitions = world.competitions;
        draft.mpManagers = world.mpManagers;
        draft.hallOfFame = world.hallOfFame || [];
        draft.activeManagerIndex = mgrIdx;
        if (myMgr) {
          draft.userClubId = myMgr.clubId;
          draft.budget = myMgr.budget;
          draft.boardConfidence = myMgr.boardConfidence ?? 85;
          draft.trainingPlan = myMgr.trainingPlan || "balanced";
          draft.staff = { ...(myMgr.staff || draft.staff) };
          draft.managerProfile = JSON.parse(JSON.stringify(myMgr.managerProfile || draft.managerProfile));
          draft.careerStats = { ...(myMgr.careerStats || draft.careerStats) };
          draft.trophies = [...(myMgr.trophies || [])];
        }
      }
    );
    return true;
  } catch {
    return false;
  }
}

export function startOnlineAutoSync() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    pullOnlineWorldState();
  }, 6000);
}

export function stopOnlineAutoSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}