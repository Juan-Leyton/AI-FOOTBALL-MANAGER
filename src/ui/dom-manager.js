import { store } from "../core/state.js";
import {
  getNextUserEvent,
  initCompetitions,
  completeRoundWithUserResult,
  getClubLeagueObj
} from "../engine/competitions.js";
import {
  startLiveMatch,
  togglePauseMatch,
  setTactic,
  makeLiveSubstitution
} from "../engine/match-live.js";
import {
  buyPlayer,
  sellPlayer,
  maybeGenerateIncomingOffer,
  respondToTransferOffer
} from "../engine/transfers.js";
import {
  makeLowballOffer,
  loanPlayer,
  submitInteractiveOffer,
  resolveNegotiationCounter
} from "../engine/market-advanced.js";
import { runEndOfSeasonTransition } from "../engine/season-transition.js";
import { autoPickBestXI } from "../engine/squad-manager.js";
import { simulateQuickMatch } from "../engine/quick-sim.js";
import {
  scoutYouthRegion,
  signProspectToAcademy,
  promoteAcademyPlayerToFirstTeam,
  releaseAcademyPlayer
} from "../engine/youth-scouting.js";
import {
  ensureFreeAgentsPool,
  signFreeAgent,
  retrainPlayerPosition,
  applyIndividualFocus
} from "../engine/player-development.js";
import {
  ensureCareerHooksState,
  grantManagerXp,
  unlockManagerPerk,
  evaluateObjectivesProgress
} from "../engine/career-hooks.js";
import { processSeasonRetirementsAndRegens } from "../engine/world-longevity.js";
import {
  startMultiplayerCareer,
  switchActiveManager,
  syncCurrentManagerSnapshot
} from "../engine/multiplayer-local.js";
import {
  createOnlineRoom,
  fetchOnlineRoom,
  joinOnlineRoomAsManager,
  pushOnlineWorldState,
  pullOnlineWorldState,
  startOnlineAutoSync,
  stopOnlineAutoSync
} from "../engine/multiplayer-online.js";
import { injectCustomLegends } from "../data/custom-legends.js";
import { triggerPostMatchEvent, resolveInboxChoice } from "../ai/director.js";
import {
  processRoundProgression,
  renewPlayerContract,
  recordMatchInCareer
} from "../engine/progression.js";
import { upgradeStaff } from "../engine/staff.js";
import { setTrainingPlan } from "../engine/training.js";
import { promoteYouthProspect } from "../engine/academy.js";
import { toggleMute } from "../engine/audio.js";
import { getClubStadium } from "../engine/stadium.js";
import {
  isPlayerUnavailable,
  applyPostMatchMedicalAndCards,
  advanceMedicalRecovery
} from "../engine/medical.js";
import { buildWorldDatabase } from "../data/world-database.js";
import { renderEnhancedPitch } from "./pitch-renderer.js";
import { renderPlayerProfileModal } from "./player-modal.js";
import { showToast } from "./toast.js";
import { renderClubBadge } from "./badges.js";
import { renderTacticsExtrasUI } from "./tactics-extras.js";
import { renderWorldExpansionUI } from "./world-expansion-ui.js";
import { playAnimatedQuickSim } from "./match-cinematics.js";

// Vistas y componentes modulares
import { renderMiniBar, renderTabBtn } from "./components/ui-helpers.js";
import { renderClubSelection } from "./views/lobby-view.js";
import { renderLiveMatchView, updateLiveMatchDynamicParts } from "./views/match-view.js";
import { renderCompetitionsTab } from "./views/competitions-view.js";
import {
  renderHomeTab,
  renderSquadTab,
  renderStaffTab,
  renderTacticsTab,
  renderTransfersTab,
  renderInboxTab
} from "./views/manager-tabs.js";

let lastLiveLayoutKey = "";
let selectedPreviewLeague = "esp_1";
let selectedStandingsView = "league_1";
let inspectedPlayerId = null;

let setupMode = "solo";
let mpDraftSlots = [
  { name: "Mánager 1", clubId: "" },
  { name: "Mánager 2", clubId: "" }
];
let joinRoomCodeInput = "";
let fetchedOnlineRoom = null;

export function initUI() {
  const root = document.getElementById("view-root");
  if (!root) return;

  const s = store.get();
  const hasValidClubs =
    s.clubs &&
    Object.keys(s.clubs).length >= 100 &&
    Object.values(s.clubs).some(c => c && c.leagueId === "col_1");

  if (!hasValidClubs) {
    const world = buildWorldDatabase();
    store.update(["clubs", "players", "liveMatch", "competitions", "activeCompId"], draft => {
      draft.clubs = world.clubs;
      draft.players = world.players;
      draft.liveMatch = null;
      draft.competitions = initCompetitions(world.clubs, draft.userClubId);
      draft.activeCompId = "league_1";
    });
  } else if (s.liveMatch || !s.competitions?.league_1?.schedule?.length) {
    store.update(["liveMatch", "competitions", "activeCompId"], draft => {
      draft.liveMatch = null;
      if (!draft.competitions?.league_1?.schedule?.length) {
        draft.competitions = initCompetitions(draft.clubs, draft.userClubId);
        draft.activeCompId = "league_1";
      }
    });
  }

  ensureFreeAgentsPool();
  injectCustomLegends();
  ensureCareerHooksState();
  if (store.get().onlineRoomCode) {
    startOnlineAutoSync();
  }
  store.subscribe(render);
  render();
}

function syncOnlineIfActive() {
  if (store.get().onlineRoomCode) {
    pushOnlineWorldState();
  }
}

function render() {
  const state = store.get();
  const root = document.getElementById("view-root");
  if (!root) return;

  if (!state.userClubId) {
    lastLiveLayoutKey = "";
    root.innerHTML = renderClubSelection(state, {
      setupMode,
      selectedPreviewLeague,
      mpDraftSlots,
      joinRoomCodeInput,
      fetchedOnlineRoom
    });
    renderWorldExpansionUI();
    return;
  }

  ensureCareerHooksState();

  if (state.liveMatch) {
    const m = state.liveMatch;
    const isUserHome = m.homeId === state.userClubId;
    const activeTactic = isUserHome ? (m.homeTactic || "Equilibrado") : (m.awayTactic || "Equilibrado");
    const layoutKey = `${m.homeId}_${m.awayId}_${m.paused}_${m.finished}_${activeTactic}_${m.subsUsed || 0}_${Boolean(m.shootout)}`;

    if (layoutKey !== lastLiveLayoutKey || !document.getElementById("pitch-canvas")) {
      lastLiveLayoutKey = layoutKey;
      root.innerHTML = renderLiveMatchView(state);
    } else {
      updateLiveMatchDynamicParts(state);
    }
    renderTacticsExtrasUI();
    renderEnhancedPitch(document.getElementById("pitch-canvas"), state.liveMatch, state.clubs);
    return;
  }

  lastLiveLayoutKey = "";
  const activeEl = document.activeElement;
  const wasSearching = activeEl && activeEl.id === "market-search-input";
  const cursorPos = wasSearching ? activeEl.selectionStart : null;

  const userClub = state.clubs[state.userClubId];
  const activeTab = state.activeTab || "home";
  const unreadCount = (state.inbox || []).filter(m => !m.resolved && m.choices?.length > 0).length;
  const userLeague = getClubLeagueObj(state.competitions, state.userClubId);
  const leagueRound = (userLeague?.currentRound || 0) + 1;
  const nextEvent = getNextUserEvent(state);
  const boardConf = state.boardConfidence || 85;
  const confColor = boardConf >= 75 ? "#10b981" : boardConf >= 50 ? "#f59e0b" : "#ef4444";
  const userStadium = getClubStadium(userClub, state.staff?.stadium || 1);
  const mp = state.managerProfile || { level: 1, xp: 0, nextLevelXp: 1000, skillPoints: 0 };

  const isMp = Boolean(state.isMultiplayer && state.mpManagers?.length > 1);
  const activeMgrIdx = state.activeManagerIndex || 0;
  const activeMgr = isMp ? state.mpManagers[activeMgrIdx] : null;
  const nextMgrIdx = isMp ? (activeMgrIdx + 1) % state.mpManagers.length : 0;
  const nextMgr = isMp ? state.mpManagers[nextMgrIdx] : null;
  const isOnline = Boolean(state.onlineRoomCode);

  root.innerHTML = `
    <div class="fm-app-shell">
      <aside class="fm-sidebar">
        <div>
          <div class="fm-sidebar-club" style="--club-accent: ${userClub.colors[0]}; background: linear-gradient(165deg, ${userClub.colors[0]}38, rgba(9,13,22,0.96) 65%);">
            ${isMp && activeMgr ? `
              <div style="background:rgba(59,130,246,0.22); border:1px solid rgba(59,130,246,0.45); color:#93c5fd; font-size:10.5px; font-weight:800; padding:3px 8px; border-radius:99px; margin-bottom:8px;">
                ${isOnline ? "🌐" : "🎮"} ${activeMgr.name.toUpperCase()}
              </div>
            ` : ""}
            <div style="margin: 0 auto 8px; display: flex; justify-content:center; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.65));">
              ${renderClubBadge(userClub, 56)}
            </div>
            <h2 style="font-size: 16px; font-weight: 900; letter-spacing: -0.01em; margin-bottom: 2px;">${userClub.name}</h2>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
              ${userClub.flag || ""} ${userClub.leagueName || "Primera División"} • T${state.season || 1} • J${Math.min(22, leagueRound)}/22
            </div>
            <div style="text-align:left; font-size:11px; color:var(--text-muted); margin-bottom:4px;">Confianza Directiva</div>
            ${renderMiniBar(boardConf, confColor)}
          </div>

          ${isMp ? `
            <div style="background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:12px; padding:8px; margin-bottom:10px;">
              ${isOnline ? `
                <div style="background:rgba(16,185,129,0.16); border:1px solid rgba(16,185,129,0.4); border-radius:8px; padding:6px 8px; margin-bottom:7px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:9.5px; color:#6ee7b7; font-weight:800; text-transform:uppercase;">Sala Online Activa</div>
                    <b style="font-size:13px; letter-spacing:0.08em; color:#fff;">${state.onlineRoomCode}</b>
                  </div>
                  <div style="display:flex; gap:4px;">
                    <button id="btn-copy-room-code" class="fm-btn fm-btn-ghost" title="Copiar código" style="padding:4px 7px; font-size:11px;">📋</button>
                    <button id="btn-manual-sync-online" class="fm-btn fm-btn-ghost" title="Sincronizar ahora" style="padding:4px 7px; font-size:11px;">🔄</button>
                  </div>
                </div>
              ` : `
                <button id="btn-publish-online-room" class="fm-btn fm-btn-ghost" style="width:100%; padding:6px 8px; font-size:11px; margin-bottom:7px; border-color:rgba(16,185,129,0.5); color:#34d399; font-weight:800;">
                  🌐 Publicar Sala Online
                </button>
              `}

              <div style="font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; padding:0 4px;">
                Mánagers (${state.mpManagers.length})
              </div>
              <div style="display:grid; gap:4px; margin-bottom:${isOnline ? "2px" : "7px"};">
                ${state.mpManagers.map((m, i) => {
                  const mClub = state.clubs[m.clubId];
                  const mLg = getClubLeagueObj(state.competitions, m.clubId);
                  const doneRound = Boolean(mLg?.playedThisRound?.[m.clubId]);
                  const isCurrent = i === activeMgrIdx;
                  return `
                    <button class="btn-switch-manager" data-midx="${i}" ${isOnline ? "disabled" : ""} style="display:flex; justify-content:space-between; align-items:center; background:${isCurrent ? "rgba(59,130,246,0.22)" : "rgba(15,23,42,0.85)"}; border:1px solid ${isCurrent ? "#3b82f6" : "rgba(255,255,255,0.07)"}; color:#fff; padding:5px 8px; border-radius:8px; font-size:11.5px; cursor:${isOnline ? "default" : "pointer"}; text-align:left;">
                      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <b>${m.name}</b> <small style="color:var(--text-muted);">(${mClub?.name?.split(" ")[0] || ""})</small>
                      </span>
                      <span style="font-weight:800; color:${doneRound ? "#34d399" : "#fbbf24"};">${doneRound ? "✓" : "⏳"}</span>
                    </button>
                  `;
                }).join("")}
              </div>
              ${!isOnline ? `
                <button id="btn-next-manager-turn" class="fm-btn fm-btn-primary" style="width:100%; padding:6px 8px; font-size:11px;">
                  🔄 Pasar Turno → ${nextMgr?.name || ""}
                </button>
              ` : ""}
            </div>
          ` : ""}

          <nav class="fm-sidebar-nav">
            ${renderTabBtn("home", "🏟️ Centro del Club", activeTab, userClub.colors[0], mp.skillPoints || 0)}
            ${renderTabBtn("squad", "👥 Plantilla", activeTab, userClub.colors[0])}
            ${renderTabBtn("tactics", "📋 Pizarra Táctica", activeTab, userClub.colors[0])}
            ${renderTabBtn("staff", "🏗️ Academia y Staff", activeTab, userClub.colors[0])}
            ${renderTabBtn("transfers", "💼 Mercado Global", activeTab, userClub.colors[0])}
            ${renderTabBtn("inbox", "📩 Despacho y Prensa", activeTab, userClub.colors[0], unreadCount)}
            ${renderTabBtn("table", "🏆 Competiciones", activeTab, userClub.colors[0])}
          </nav>
        </div>

        <div style="display: grid; gap: 7px; padding-top: 10px; border-top: 1px solid var(--panel-border);">
          ${nextEvent && !nextEvent.waitingForOthers ? `
            <button id="btn-sidebar-play" class="fm-btn fm-btn-play" style="padding: 10px 12px; font-size: 12.5px;">
              ⚽ Jugar en Vivo
            </button>
            <button id="btn-sidebar-quicksim" class="fm-btn fm-btn-ghost" style="padding: 8px 10px; font-size: 11.5px; border-color: rgba(56,189,248,0.4); color: #7dd3fc;">
              ⚡ Simular Partido
            </button>
          ` : ""}
          <button id="btn-reset" class="fm-btn fm-btn-ghost" style="width: 100%; font-size: 11.5px; padding: 7px 10px;">
            Nueva Partida
          </button>
        </div>
      </aside>

      <main class="fm-workspace">
        <header class="fm-topbar">
          <div class="fm-kpi-group">
            ${isMp && activeMgr ? `
              <div class="fm-kpi-pill" style="border-color:rgba(59,130,246,0.45);">
                <span>${isOnline ? "🌐" : "🎮"}</span>
                <div>
                  <small>${isOnline ? `SALA ${state.onlineRoomCode}` : "MÁNAGER ACTIVO"}</small><br>
                  <b style="color: #93c5fd;">${activeMgr.name}</b>
                </div>
              </div>
            ` : ""}
            <div class="fm-kpi-pill">
              <span>💰</span>
              <div>
                <small>PRESUPUESTO</small><br>
                <b style="color: #34d399;">${((state.budget || 0) / 1e6).toFixed(2)} M€</b>
              </div>
            </div>
            <div class="fm-kpi-pill">
              <span>⭐</span>
              <div>
                <small>MEDIA CLUB</small><br>
                <b>OVR ${userClub.ovr}</b>
              </div>
            </div>
            <div class="fm-kpi-pill">
              <span>🎖️</span>
              <div>
                <small>NIVEL ${mp.level}</small><br>
                <b style="color: #60a5fa;">${mp.xp}/${mp.nextLevelXp} XP</b>
              </div>
            </div>
            <div class="fm-kpi-pill">
              <span>🏟️</span>
              <div>
                <small>${userStadium.name.toUpperCase()}</small><br>
                <b>${userStadium.capacity.toLocaleString()} esp.</b>
              </div>
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 700;">
            WORLD SOCCER WEB MANAGER <span style="color: #3b82f6;">26</span>
          </div>
        </header>

        <div id="tab-content">
          ${activeTab === "home" ? renderHomeTab(state) : ""}
          ${activeTab === "squad" ? renderSquadTab(state) : ""}
          ${activeTab === "tactics" ? renderTacticsTab(state) : ""}
          ${activeTab === "staff" ? renderStaffTab(state) : ""}
          ${activeTab === "transfers" ? renderTransfersTab(state) : ""}
          ${activeTab === "inbox" ? renderInboxTab(state) : ""}
          ${activeTab === "table" ? renderCompetitionsTab(state, selectedStandingsView) : ""}
        </div>
      </main>
    </div>
    ${inspectedPlayerId ? renderPlayerProfileModal(state, inspectedPlayerId) : ""}
  `;

  renderTacticsExtrasUI();
  renderWorldExpansionUI();
  bindEvents(state);

  if (wasSearching) {
    const newInput = document.getElementById("market-search-input");
    if (newInput) {
      newInput.focus();
      if (typeof cursorPos === "number") newInput.setSelectionRange(cursorPos, cursorPos);
    }
  }
}

function handleSeasonEndHooks(seasonNum) {
  syncCurrentManagerSnapshot();
  processSeasonRetirementsAndRegens();
  runEndOfSeasonTransition();
  grantManagerXp(500, `Temporada ${seasonNum} completada`);
  ensureCareerHooksState();
  syncCurrentManagerSnapshot();
  syncOnlineIfActive();
  showToast(`🏆 ¡Temporada ${seasonNum} Finalizada! Revisa Despacho y Prensa (Gala y Regens) y Salón de la Fama.`, "success", 5800);
}

function runQuickSimulationFlow() {
  const stBefore = store.get();
  const nextEv = getNextUserEvent(stBefore);
  const res = simulateQuickMatch();
  if (!res.ok) {
    showToast(res.msg, "warning");
    if (res.needsLineup) store.update(["activeTab"], draft => { draft.activeTab = "squad"; });
    return;
  }
  const stAfter = store.get();
  const won = res.outcome === "success";
  grantManagerXp(won ? 180 : res.outcome === "info" ? 90 : 40, "Partido jugado");
  evaluateObjectivesProgress({ wonMatch: won });
  syncCurrentManagerSnapshot();
  syncOnlineIfActive();

  const scoreMatch = res.msg.match(/(\d+)\s*-\s*(\d+)/);
  const gh = scoreMatch ? Number(scoreMatch[1]) : (won ? 2 : 1);
  const ga = scoreMatch ? Number(scoreMatch[2]) : (won ? 1 : 2);
  const homeClub = nextEv?.match ? stAfter.clubs[nextEv.match[0]] : stAfter.clubs[stAfter.userClubId];
  const awayClub = nextEv?.match ? stAfter.clubs[nextEv.match[1]] : { name: "Rival", ovr: 76 };

  playAnimatedQuickSim(homeClub, awayClub, gh, ga, () => {
    showToast(res.msg, res.outcome || "info", 4500);
    if (res.seasonFinished) {
      const seasonNum = store.get().season || 1;
      setTimeout(() => handleSeasonEndHooks(seasonNum), 350);
    }
  });
}

function bindEvents(state) {
  document.getElementById("btn-reset")?.addEventListener("click", async () => {
    stopOnlineAutoSync();
    await store.reset();
  });

  document.getElementById("btn-publish-online-room")?.addEventListener("click", async () => {
    showToast("🌐 Creando sala online en la nube...", "info", 2000);
    const res = await createOnlineRoom();
    showToast(res.msg, res.ok ? "success" : "warning", 6000);
  });

  document.getElementById("btn-copy-room-code")?.addEventListener("click", () => {
    const code = store.get().onlineRoomCode;
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast(`📋 Código ${code} copiado al portapapeles.`, "success");
    }
  });

  document.getElementById("btn-manual-sync-online")?.addEventListener("click", async () => {
    const updated = await pullOnlineWorldState();
    showToast(updated ? "✅ Sala sincronizada con los últimos movimientos." : "✔️ Tu sala ya está al día.", "info");
  });

  document.getElementById("btn-home-check-sync")?.addEventListener("click", async () => {
    const updated = await pullOnlineWorldState();
    showToast(updated ? "✅ ¡Estado actualizado!" : "⏳ Tus amigos aún no terminan su partido.", "info");
  });

  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      store.update(["activeTab"], draft => { draft.activeTab = btn.dataset.tab; });
    });
  });

  document.querySelectorAll(".btn-switch-manager").forEach(btn => {
    btn.addEventListener("click", () => {
      if (store.get().onlineRoomCode) return;
      const res = switchActiveManager(Number(btn.dataset.midx));
      if (res.ok) showToast(res.msg, "info");
    });
  });

  document.getElementById("btn-next-manager-turn")?.addEventListener("click", () => {
    const st = store.get();
    if (st.onlineRoomCode) return;
    const nextIdx = ((st.activeManagerIndex || 0) + 1) % (st.mpManagers?.length || 1);
    const res = switchActiveManager(nextIdx);
    if (res.ok) showToast(res.msg, "info");
  });

  const launchNextMatch = () => {
    const nextEvent = getNextUserEvent(state);
    if (nextEvent && !nextEvent.waitingForOthers && nextEvent.match) {
      const userSquad = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
      const validStarters = userSquad.filter(p => p.starter && !isPlayerUnavailable(p)).length;
      if (validStarters !== 11) {
        showToast(`Necesitas 11 titulares disponibles (tienes ${validStarters}). Usa "Mejor XI" o ajusta tu plantilla.`, "warning");
        store.update(["activeTab"], draft => { draft.activeTab = "squad"; });
        return;
      }
      const isKnockout = nextEvent.compId === "cup_1" || nextEvent.compId === "cont_1";
      store.update(["activeCompId"], draft => { draft.activeCompId = nextEvent.compId; });
      startLiveMatch(nextEvent.match[0], nextEvent.match[1], null, isKnockout);
    }
  };

  document.getElementById("btn-play-match")?.addEventListener("click", launchNextMatch);
  document.getElementById("btn-sidebar-play")?.addEventListener("click", launchNextMatch);
  document.getElementById("btn-quick-sim")?.addEventListener("click", runQuickSimulationFlow);
  document.getElementById("btn-sidebar-quicksim")?.addEventListener("click", runQuickSimulationFlow);

  document.querySelectorAll(".btn-auto-best-xi").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = autoPickBestXI();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-unlock-perk").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = unlockManagerPerk(btn.dataset.perk);
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.getElementById("btn-gen-event")?.addEventListener("click", () => triggerPostMatchEvent());

  document.getElementById("btn-promote-youth")?.addEventListener("click", () => {
    const res = promoteYouthProspect();
    if (res.ok) {
      grantManagerXp(120, "Canterano ascendido");
      evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
    }
    showToast(res.msg, res.ok ? "success" : "warning");
  });

  document.querySelectorAll(".btn-scout-region").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = scoutYouthRegion(btn.dataset.region);
      syncCurrentManagerSnapshot();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-sign-academy").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = signProspectToAcademy(btn.dataset.repid);
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-promote-academy-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = promoteAcademyPlayerToFirstTeam(btn.dataset.acid);
      if (res.ok) {
        grantManagerXp(140, "Promesa juvenil ascendida");
        evaluateObjectivesProgress({ signedU21: true });
        syncCurrentManagerSnapshot();
        syncOnlineIfActive();
      }
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-release-academy-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = releaseAcademyPlayer(btn.dataset.acid);
      showToast(res.msg, "info");
    });
  });

  document.querySelectorAll(".btn-toggle-starter").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const p = store.get().players[pid];
      if (!p || isPlayerUnavailable(p)) return;
      store.update(["players"], draft => {
        draft.players[pid].starter = !draft.players[pid].starter;
      });
      syncOnlineIfActive();
    });
  });

  document.querySelectorAll(".btn-renew-contract").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = renewPlayerContract(btn.dataset.pid);
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-sell-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = sellPlayer(btn.dataset.pid);
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-training-plan").forEach(btn => {
    btn.addEventListener("click", () => {
      setTrainingPlan(btn.dataset.plan);
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast("Plan de entrenamiento semanal actualizado.", "info");
    });
  });

  document.querySelectorAll(".btn-upgrade-staff").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = upgradeStaff(btn.dataset.key);
      if (res.ok) {
        grantManagerXp(100, "Mejora de club");
        syncCurrentManagerSnapshot();
        syncOnlineIfActive();
      }
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-filter-pos").forEach(btn => {
    btn.addEventListener("click", () => {
      store.update(["marketPosFilter"], draft => { draft.marketPosFilter = btn.dataset.pos; });
    });
  });

  document.querySelectorAll(".btn-filter-league").forEach(btn => {
    btn.addEventListener("click", () => {
      store.update(["marketLeagueFilter"], draft => { draft.marketLeagueFilter = btn.dataset.league; });
    });
  });

  document.getElementById("market-search-input")?.addEventListener("input", e => {
    const val = e.target.value;
    store.update(["marketSearchQuery"], draft => { draft.marketSearchQuery = val; });
  });

  document.getElementById("market-age-select")?.addEventListener("change", e => {
    const val = e.target.value;
    store.update(["marketAgeFilter"], draft => { draft.marketAgeFilter = val; });
  });

  document.getElementById("market-ovr-select")?.addEventListener("change", e => {
    const val = Number(e.target.value);
    store.update(["marketMinOvr"], draft => { draft.marketMinOvr = val; });
  });

  document.getElementById("btn-clear-market-filters")?.addEventListener("click", () => {
    store.update(["marketPosFilter", "marketLeagueFilter", "marketAgeFilter", "marketMinOvr", "marketSearchQuery"], draft => {
      draft.marketPosFilter = "ALL";
      draft.marketLeagueFilter = "ALL";
      draft.marketAgeFilter = "ALL";
      draft.marketMinOvr = 0;
      draft.marketSearchQuery = "";
    });
  });

  document.querySelectorAll(".btn-select-standings").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedStandingsView = btn.dataset.lid;
      render();
    });
  });

  document.querySelectorAll(".btn-formation").forEach(btn => {
    btn.addEventListener("click", () => {
      const form = btn.dataset.form;
      store.update(["clubs"], draft => {
        draft.clubs[state.userClubId].formation = form;
      });
      syncOnlineIfActive();
    });
  });

  document.querySelectorAll(".btn-kit-mode").forEach(btn => {
    btn.addEventListener("click", () => {
      const kit = btn.dataset.kit;
      store.update(["clubs"], draft => {
        draft.clubs[state.userClubId].kitMode = kit;
      });
      syncOnlineIfActive();
    });
  });

  document.querySelectorAll(".btn-buy-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const targetPlayer = store.get().players?.[pid];
      const res = buyPlayer(pid, false);
      if (!res.ok) {
        if (res.needsCounter && confirm(`${res.msg}\n\n¿Deseas aceptar la contraoferta y ficharlo ahora?`)) {
          const retry = buyPlayer(pid, true);
          if (retry.ok && (targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
          syncCurrentManagerSnapshot();
          syncOnlineIfActive();
          showToast(retry.msg, retry.ok ? "success" : "error");
        } else if (!res.needsCounter) {
          showToast(res.msg, "warning");
        }
      } else {
        if ((targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
        syncCurrentManagerSnapshot();
        syncOnlineIfActive();
        showToast(res.msg, "success");
      }
    });
  });

  document.querySelectorAll(".btn-sign-free-agent").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const targetPlayer = store.get().players?.[pid];
      const res = signFreeAgent(pid);
      if (res.ok && (targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-lowball-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const targetPlayer = store.get().players?.[pid];
      const res = makeLowballOffer(pid);
      if (res.ok && (targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-loan-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const targetPlayer = store.get().players?.[pid];
      const res = loanPlayer(pid);
      if (res.ok && (targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      showToast(res.msg, res.ok ? "success" : "warning");
    });
  });

  document.querySelectorAll(".btn-event-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      const evId = btn.dataset.evid;
      const idx = Number(btn.dataset.idx);
      if (btn.dataset.type === "transfer_offer") {
        respondToTransferOffer(evId, idx);
      } else if (btn.dataset.type === "negotiation_counter") {
        const res = resolveNegotiationCounter(evId, idx);
        if (res?.msg) showToast(res.msg, res.ok ? "success" : "warning");
      } else {
        resolveInboxChoice(evId, idx);
      }
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
    });
  });

  document.querySelectorAll(".tactic-slider").forEach(slider => {
    slider.addEventListener("input", () => {
      const key = slider.dataset.key;
      const val = Number(slider.value);
      const labelEl = document.getElementById(`val-${key}`);
      if (labelEl) labelEl.textContent = `${val}%`;

      if (key === "mentality") {
        const shift = ((val - 50) / 50) * 16;
        document.querySelectorAll(".tactic-node").forEach(node => {
          if (node.dataset.isGk === "1") return;
          const base = Number(node.dataset.baseX);
          node.style.left = `${Math.max(12, Math.min(92, base + shift))}%`;
        });
      }
    });

    slider.addEventListener("change", () => {
      const key = slider.dataset.key;
      const val = Number(slider.value);
      store.update(["clubs"], draft => {
        if (!draft.clubs[state.userClubId].tactics) {
          draft.clubs[state.userClubId].tactics = { mentality: 55, tempo: 55, press: 55 };
        }
        draft.clubs[state.userClubId].tactics[key] = val;
      });
      syncOnlineIfActive();
    });
  });
}

document.addEventListener("click", async e => {
  const previewLeagueBtn = e.target.closest(".btn-preview-league");
  if (previewLeagueBtn) {
    e.preventDefault();
    e.stopImmediatePropagation();
    selectedPreviewLeague = previewLeagueBtn.dataset.lid;
    render();
    return;
  }

  const modeBtn = e.target.closest(".btn-setup-mode");
  if (modeBtn) {
    e.preventDefault();
    e.stopImmediatePropagation();
    setupMode = modeBtn.dataset.mode;
    render();
    return;
  }

  if (e.target.id === "btn-search-online-room") {
    const res = await fetchOnlineRoom(joinRoomCodeInput);
    if (!res.ok) {
      fetchedOnlineRoom = null;
      showToast(res.msg, "warning");
    } else {
      fetchedOnlineRoom = res.room;
      showToast(`🌐 Sala ${res.room.room_code} cargada.`, "success");
    }
    render();
    return;
  }

  const joinMgrBtn = e.target.closest(".btn-join-as-manager");
  if (joinMgrBtn && fetchedOnlineRoom) {
    const res = joinOnlineRoomAsManager(fetchedOnlineRoom, joinMgrBtn.dataset.mgrid);
    if (res.ok) {
      selectedStandingsView = "league_1";
      showToast(res.msg, "success", 5000);
    } else {
      showToast(res.msg, "warning");
    }
    return;
  }

  if (e.target.id === "btn-mp-add-slot") {
    if (mpDraftSlots.length < 6) {
      mpDraftSlots.push({ name: `Mánager ${mpDraftSlots.length + 1}`, clubId: "" });
      render();
    }
    return;
  }

  const removeSlotBtn = e.target.closest(".btn-mp-remove-slot");
  if (removeSlotBtn) {
    const idx = Number(removeSlotBtn.dataset.idx);
    if (mpDraftSlots.length > 2) {
      mpDraftSlots.splice(idx, 1);
      render();
    }
    return;
  }

  if (e.target.id === "btn-start-mp-career") {
    const res = startMultiplayerCareer(mpDraftSlots);
    if (!res.ok) {
      showToast(res.msg, "warning");
    } else {
      selectedStandingsView = "league_1";
      showToast(res.msg, "success");
    }
    return;
  }

  const inspectEl = e.target.closest(".btn-inspect-player");
  if (inspectEl) {
    inspectedPlayerId = inspectEl.dataset.pid;
    render();
    return;
  }

  if (e.target.id === "btn-close-player-modal" || e.target.id === "player-modal-backdrop") {
    inspectedPlayerId = null;
    render();
    return;
  }

  const submitNegBtn = e.target.closest("#btn-submit-negotiation");
  if (submitNegBtn) {
    const pid = submitNegBtn.dataset.pid;
    const targetPlayer = store.get().players?.[pid];
    const offerVal = Number(document.getElementById("neg-offer-slider")?.value || 0);
    const res = submitInteractiveOffer(pid, offerVal, 4);
    showToast(res.msg, res.ok ? "success" : "warning", 5000);
    if (res.ok) {
      if (!res.isCounter && (targetPlayer?.age || 25) <= 21) {
        evaluateObjectivesProgress({ signedU21: true });
      }
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      inspectedPlayerId = null;
      render();
    }
    return;
  }

  const modalRetrainBtn = e.target.closest(".btn-modal-retrain");
  if (modalRetrainBtn) {
    const res = retrainPlayerPosition(modalRetrainBtn.dataset.pid, modalRetrainBtn.dataset.pos);
    syncOnlineIfActive();
    showToast(res.msg, res.ok ? "success" : "warning");
    render();
    return;
  }

  const modalFocusBtn = e.target.closest(".btn-modal-focus");
  if (modalFocusBtn) {
    const res = applyIndividualFocus(modalFocusBtn.dataset.pid, modalFocusBtn.dataset.focus);
    syncOnlineIfActive();
    showToast(res.msg, res.ok ? "success" : "warning");
    render();
    return;
  }

  const modalFreeBtn = e.target.closest(".btn-modal-free-agent");
  if (modalFreeBtn) {
    const pid = modalFreeBtn.dataset.pid;
    const targetPlayer = store.get().players?.[pid];
    const res = signFreeAgent(pid);
    showToast(res.msg, res.ok ? "success" : "warning");
    if (res.ok) {
      if ((targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      inspectedPlayerId = null;
    }
    render();
    return;
  }

  const modalBuyBtn = e.target.closest(".btn-modal-buy");
  if (modalBuyBtn) {
    const pid = modalBuyBtn.dataset.pid;
    const targetPlayer = store.get().players?.[pid];
    const res = buyPlayer(pid, false);
    if (!res.ok) {
      if (res.needsCounter && confirm(`${res.msg}\n\n¿Deseas aceptar la contraoferta y ficharlo ahora?`)) {
        const retry = buyPlayer(pid, true);
        showToast(retry.msg, retry.ok ? "success" : "error");
        if (retry.ok) {
          if ((targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
          syncCurrentManagerSnapshot();
          syncOnlineIfActive();
          inspectedPlayerId = null;
        }
      } else if (!res.needsCounter) {
        showToast(res.msg, "warning");
      }
    } else {
      showToast(res.msg, "success");
      if ((targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      inspectedPlayerId = null;
    }
    render();
    return;
  }

  const modalLowBtn = e.target.closest(".btn-modal-lowball");
  if (modalLowBtn) {
    const pid = modalLowBtn.dataset.pid;
    const targetPlayer = store.get().players?.[pid];
    const res = makeLowballOffer(pid);
    showToast(res.msg, res.ok ? "success" : "warning");
    if (res.ok) {
      if ((targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      inspectedPlayerId = null;
    }
    render();
    return;
  }

  const modalLoanBtn = e.target.closest(".btn-modal-loan");
  if (modalLoanBtn) {
    const pid = modalLoanBtn.dataset.pid;
    const targetPlayer = store.get().players?.[pid];
    const res = loanPlayer(pid);
    showToast(res.msg, res.ok ? "success" : "warning");
    if (res.ok) {
      if ((targetPlayer?.age || 25) <= 21) evaluateObjectivesProgress({ signedU21: true });
      syncCurrentManagerSnapshot();
      syncOnlineIfActive();
      inspectedPlayerId = null;
    }
    render();
    return;
  }

  const modalRenewBtn = e.target.closest(".btn-modal-renew");
  if (modalRenewBtn) {
    const res = renewPlayerContract(modalRenewBtn.dataset.pid);
    syncCurrentManagerSnapshot();
    syncOnlineIfActive();
    showToast(res.msg, res.ok ? "success" : "warning");
    render();
    return;
  }

  const modalSellBtn = e.target.closest(".btn-modal-sell");
  if (modalSellBtn) {
    const res = sellPlayer(modalSellBtn.dataset.pid);
    syncCurrentManagerSnapshot();
    syncOnlineIfActive();
    showToast(res.msg, res.ok ? "success" : "warning");
    if (res.ok) inspectedPlayerId = null;
    render();
    return;
  }

  const selectBtn = e.target.closest(".btn-select-club");
  if (selectBtn) {
    const clubId = selectBtn.dataset.id;
    selectedStandingsView = "league_1";
    store.update(["isMultiplayer", "mpManagers", "onlineRoomCode", "userClubId", "budget", "competitions", "activeCompId"], draft => {
      draft.isMultiplayer = false;
      draft.mpManagers = [];
      draft.onlineRoomCode = null;
      draft.userClubId = clubId;
      draft.budget = draft.clubs[clubId]?.budget || 50000000;
      draft.competitions = initCompetitions(draft.clubs, clubId);
      draft.activeCompId = "league_1";
    });
    ensureFreeAgentsPool();
    injectCustomLegends();
    ensureCareerHooksState();
    return;
  }

  const audioBtn = e.target.closest("#btn-toggle-audio");
  if (audioBtn) {
    const muted = toggleMute();
    audioBtn.textContent = muted ? "🔇" : "🔊";
    return;
  }

  const pauseBtn = e.target.closest("#btn-pause-match");
  if (pauseBtn) {
    togglePauseMatch();
    return;
  }

  const subBtn = e.target.closest("#btn-confirm-sub");
  if (subBtn) {
    const outIdx = Number(document.getElementById("sub-out-select")?.value);
    const inPid = document.getElementById("sub-in-select")?.value;
    const res = makeLiveSubstitution(outIdx, inPid);
    showToast(res.msg, res.ok ? "success" : "warning");
    return;
  }

  const liveMentBtn = e.target.closest(".btn-live-mentality");
  if (liveMentBtn) {
    const tactic = liveMentBtn.dataset.tactic;
    const state = store.get();
    const isUserHome = state.liveMatch?.homeId === state.userClubId;
    setTactic(isUserHome, tactic);
    return;
  }

  const finishBtn = e.target.closest("#btn-finish-match");
  if (finishBtn) {
    const stateBefore = store.get();
    const m = stateBefore.liveMatch;
    if (m) {
      const compId = stateBefore.activeCompId || "league_1";
      const wasUserHome = m.homeId === stateBefore.userClubId;
      const userGoals = wasUserHome ? m.gh : m.ga;
      const rivalGoals = wasUserHome ? m.ga : m.gh;
      const won = userGoals > rivalGoals;

      try {
        advanceMedicalRecovery();
        applyPostMatchMedicalAndCards(m);
        completeRoundWithUserResult(m.homeId, m.awayId, m.gh, m.ga, compId);
        recordMatchInCareer(m.gh, m.ga);
        processRoundProgression(wasUserHome);
        triggerPostMatchEvent();
        maybeGenerateIncomingOffer();
        grantManagerXp(won ? 240 : userGoals === rivalGoals ? 110 : 50, "Partido en vivo");
        evaluateObjectivesProgress({ wonMatch: won });
        syncCurrentManagerSnapshot();
        syncOnlineIfActive();
      } catch (err) {
        console.error("Error procesando post-partido:", err);
      }

      store.update(["liveMatch", "activeTab"], draft => {
        draft.liveMatch = null;
        draft.activeTab = "home";
      });

      const stateAfter = store.get();
      const league = stateAfter.competitions?.league_1;
      if (league && league.currentRound >= league.schedule.length) {
        setTimeout(() => handleSeasonEndHooks(stateAfter.season || 1), 300);
      }
    }
  }
}, true);

document.addEventListener("input", e => {
  if (e.target.id === "input-join-room-code") joinRoomCodeInput = e.target.value;
  if (e.target.classList.contains("mp-slot-name")) {
    const idx = Number(e.target.dataset.idx);
    if (mpDraftSlots[idx]) mpDraftSlots[idx].name = e.target.value;
  }
  if (e.target.id === "neg-offer-slider") {
    const disp = document.getElementById("neg-offer-display");
    if (disp) disp.textContent = `${(Number(e.target.value) / 1e6).toFixed(2)} M€`;
  }
});

document.addEventListener("change", e => {
  if (e.target.classList.contains("mp-slot-club")) {
    const idx = Number(e.target.dataset.idx);
    if (mpDraftSlots[idx]) mpDraftSlots[idx].clubId = e.target.value;
  }
});