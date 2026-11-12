import { store } from "../core/state.js";
import {
  getNextUserEvent,
  completeRoundWithUserResult,
  initCompetitions,
  getClubLeagueObj
} from "../engine/competitions.js";
import {
  startLiveMatch,
  togglePauseMatch,
  setTactic,
  makeLiveSubstitution,
  FORMATIONS,
  assignPlayersToSlots
} from "../engine/match-live.js";
import {
  calculateMarketValue,
  buyPlayer,
  sellPlayer,
  maybeGenerateIncomingOffer,
  respondToTransferOffer
} from "../engine/transfers.js";
import { makeLowballOffer, loanPlayer } from "../engine/market-advanced.js";
import { runEndOfSeasonTransition } from "../engine/season-transition.js";
import { autoPickBestXI } from "../engine/squad-manager.js";
import { simulateQuickMatch } from "../engine/quick-sim.js";
import {
  SCOUTING_REGIONS,
  scoutYouthRegion,
  signProspectToAcademy,
  promoteAcademyPlayerToFirstTeam,
  releaseAcademyPlayer
} from "../engine/youth-scouting.js";
import {
  ensureFreeAgentsPool,
  getFreeAgentSignBonus,
  signFreeAgent,
  retrainPlayerPosition,
  applyIndividualFocus
} from "../engine/player-development.js";
import {
  MANAGER_PERKS,
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
import { STAFF_CATALOG, getStaffUpgradeCost, upgradeStaff } from "../engine/staff.js";
import { TRAINING_PLANS, setTrainingPlan } from "../engine/training.js";
import { getPlayerAttributes, promoteYouthProspect } from "../engine/academy.js";
import { toggleMute, isAudioMuted } from "../engine/audio.js";
import { getClubStadium, calculateMatchAttendance } from "../engine/stadium.js";
import {
  isPlayerUnavailable,
  getPlayerStatusBadge,
  applyPostMatchMedicalAndCards,
  advanceMedicalRecovery
} from "../engine/medical.js";
import { LEAGUES_CATALOG, buildWorldDatabase } from "../data/world-database.js";
import { renderEnhancedPitch } from "./pitch-renderer.js";
import { renderPlayerProfileModal } from "./player-modal.js";
import { showToast } from "./toast.js";
import { renderClubBadge } from "./badges.js";
import { renderTacticsExtrasUI } from "./tactics-extras.js";
import { renderWorldExpansionUI } from "./world-expansion-ui.js";
import { checkAndTriggerLiveGoalBanner, playAnimatedQuickSim } from "./match-cinematics.js";

let lastLiveLayoutKey = "";
let selectedPreviewLeague = "esp_1";
let selectedStandingsView = "league_1";
let inspectedPlayerId = null;

// Estado temporal del lobby multijugador en portada
let setupMode = "solo"; // "solo" | "mp" | "join_online"
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
    Object.keys(s.clubs).length >= 20 &&
    Object.values(s.clubs).some(c => c && c.leagueId);

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
      }
      draft.activeCompId = "league_1";
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

function renderOvrBadge(ovr) {
  let bg = "rgba(148, 163, 184, 0.18)";
  let color = "#e2e8f0";
  let border = "rgba(148, 163, 184, 0.35)";

  if (ovr >= 85) {
    bg = "linear-gradient(135deg, rgba(250, 204, 21, 0.28), rgba(245, 158, 11, 0.14))";
    color = "#fde047";
    border = "rgba(250, 204, 21, 0.55)";
  } else if (ovr >= 78) {
    bg = "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(59, 130, 246, 0.12))";
    color = "#7dd3fc";
    border = "rgba(56, 189, 248, 0.45)";
  }

  return `<span style="display:inline-flex; align-items:center; justify-content:center; min-width:32px; padding:3px 7px; border-radius:7px; background:${bg}; color:${color}; border:1px solid ${border}; font-weight:800; font-size:12px;">${ovr}</span>`;
}

function renderJerseySvg(primaryColor, secondaryColor, number, isOutOfPos = false, size = 42) {
  const height = Math.round(size * (58 / 64));
  const strokeCol = isOutOfPos ? "#fde047" : (secondaryColor || "#ffffff");
  const pLow = (primaryColor || "").toLowerCase();
  const numCol = (pLow === "#ffffff" || pLow === "#f8fafc" || pLow === "#facc15" || pLow === "#fde047" || pLow === "#fde100")
    ? "#090d16"
    : "#ffffff";

  return `
    <div style="position:relative; width:${size}px; height:${height}px; margin:0 auto; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.68)); flex-shrink:0;">
      <svg viewBox="0 0 64 58" width="${size}" height="${height}" style="display:block; overflow:visible;">
        <path d="M16 8 L3 18 L10 29 L18 23 L18 52 L46 52 L46 23 L54 29 L61 18 L48 8 L39 4 C36 9 28 9 25 4 Z"
              fill="${secondaryColor || '#e2e8f0'}" stroke="#090d16" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 7 L25 4 C28 9 36 9 39 4 L46 7 L46 52 L18 52 Z"
              fill="${primaryColor || '#2563eb'}"/>
        <rect x="29" y="8" width="6" height="43" fill="${secondaryColor || '#ffffff'}" opacity="0.24"/>
        <path d="M16 8 L3 18 L10 29 L18 23 L18 52 L46 52 L46 23 L54 29 L61 18 L48 8 L39 4 C36 9 28 9 25 4 Z"
              fill="none" stroke="${strokeCol}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M25 4 C28 10 36 10 39 4" fill="none" stroke="${strokeCol}" stroke-width="2.2"/>
        <text x="32" y="37" text-anchor="middle" fill="${numCol}" font-family="system-ui, sans-serif" font-weight="900" font-size="18" stroke="#090d16" stroke-width="0.9" paint-order="stroke">
          ${number}
        </text>
      </svg>
    </div>
  `;
}

function renderMiniBar(value, color) {
  const pct = Math.max(5, Math.min(100, Math.round(value)));
  return `
    <div style="display: flex; align-items:center; gap:7px;">
      <div style="flex: 1; min-width:46px; height:6px; background:rgba(15,23,42,0.9); border-radius:99px; overflow:hidden; border:1px solid rgba(255,255,255,0.06);">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:99px; transition:width 0.25s ease;"></div>
      </div>
      <span style="font-size:11px; font-weight:700; color:${color}; min-width:30px;">${pct}%</span>
    </div>
  `;
}

function render() {
  const state = store.get();
  const root = document.getElementById("view-root");
  if (!root) return;

  if (!state.userClubId) {
    lastLiveLayoutKey = "";
    root.innerHTML = renderClubSelection(state);
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
    const canvas = document.getElementById("pitch-canvas");
    renderEnhancedPitch(canvas, state.liveMatch, state.clubs);
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
                ${isOnline ? "🌐" : "👤"} ${activeMgr.name.toUpperCase()}
              </div>
            ` : ""}
            <div style="margin: 0 auto 8px; display: flex; justify-content:center; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.65));">
              ${renderClubBadge(userClub, 56)}
            </div>
            <h2 style="font-size: 16px; font-weight: 900; letter-spacing: -0.01em; margin-bottom: 2px;">${userClub.name}</h2>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
              ${userClub.flag || ""} ${userClub.leagueName || "Primera División"} • T${state.season || 1} J${Math.min(22, leagueRound)}/22
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
                    <button class="btn-switch-manager" data-midx="${i}" ${isOnline ? "disabled" : ""} style="display:flex; justify-content:space-between; align-items:center; width:100%; background:${isCurrent ? "rgba(59,130,246,0.22)" : "rgba(15,23,42,0.85)"}; border:1px solid ${isCurrent ? "#3b82f6" : "rgba(255,255,255,0.07)"}; color:#fff; padding:5px 8px; border-radius:8px; font-size:11px; cursor:${isOnline ? "default" : "pointer"}; text-align:left;">
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
                  Pasar Turno → ${nextMgr?.name || ""}
                </button>
              ` : ""}
            </div>
          ` : ""}

          <nav class="fm-sidebar-nav">
            ${renderTabBtn("home", "🏠 Centro del Club", activeTab, userClub.colors[0], mp.skillPoints || 0)}
            ${renderTabBtn("squad", "👕 Plantilla", activeTab, userClub.colors[0])}
            ${renderTabBtn("tactics", "📋 Pizarra Táctica", activeTab, userClub.colors[0])}
            ${renderTabBtn("staff", "🏗️ Academia y Staff", activeTab, userClub.colors[0])}
            ${renderTabBtn("transfers", "💼 Mercado Global", activeTab, userClub.colors[0])}
            ${renderTabBtn("inbox", "📩 Bandeja IA", activeTab, userClub.colors[0], unreadCount)}
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
            🔄 Nueva Partida
          </button>
        </div>
      </aside>

      <main class="fm-workspace">
        <header class="fm-topbar">
          <div class="fm-kpi-group">
            ${isMp && activeMgr ? `
              <div class="fm-kpi-pill" style="border-color:rgba(59,130,246,0.45);">
                <span>${isOnline ? "🌐" : "👤"}</span>
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
            WORLD FOOTBALL MANAGER <span style="color: #3b82f6;">2026</span>
          </div>
        </header>

        <div id="tab-content">
          ${activeTab === "home" ? renderHomeTab(state) : ""}
          ${activeTab === "squad" ? renderSquadTab(state) : ""}
          ${activeTab === "tactics" ? renderTacticsTab(state) : ""}
          ${activeTab === "staff" ? renderStaffTab(state) : ""}
          ${activeTab === "transfers" ? renderTransfersTab(state) : ""}
          ${activeTab === "inbox" ? renderInboxTab(state) : ""}
          ${activeTab === "table" ? renderCompetitionsTab(state) : ""}
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
      if (typeof cursorPos === "number") {
        newInput.setSelectionRange(cursorPos, cursorPos);
      }
    }
  }
}

function updateLiveMatchDynamicParts(state) {
  const m = state.liveMatch;
  if (!m) return;

  checkAndTriggerLiveGoalBanner(m, state.clubs);

  const isUserHome = m.homeId === state.userClubId;

  const scoreEl = document.getElementById("live-score-text");
  if (scoreEl) {
    scoreEl.textContent = m.shootout
      ? `${m.gh} - ${m.ga} (Pen: ${m.shootout.homeScore}-${m.shootout.awayScore})`
      : `${m.gh} - ${m.ga}`;
  }

  const minEl = document.getElementById("live-minute-badge");
  if (minEl) {
    minEl.textContent = m.shootout
      ? "TANDA DE PENALES"
      : m.paused ? `PAUSADO (${m.minute}')` : `MIN ${m.minute}'`;
  }

  const totalPoss = (m.stats?.homePoss || 1) + (m.stats?.awayPoss || 1);
  const homePossPct = Math.round(((m.stats?.homePoss || 1) / totalPoss) * 100);
  const awayPossPct = 100 - homePossPct;

  const possBarHome = document.getElementById("live-poss-bar-home");
  if (possBarHome) possBarHome.style.width = `${homePossPct}%`;

  const homeStatsEl = document.getElementById("live-home-stats");
  if (homeStatsEl) {
    homeStatsEl.innerHTML = `<b style="color:#fff;">${homePossPct}%</b> Pos • <b style="color:#fff;">${m.stats?.homeShots || 0}</b> Tiros • <b style="color:#fff;">${m.stats?.homeFouls || 0}</b> Faltas`;
  }

  const awayStatsEl = document.getElementById("live-away-stats");
  if (awayStatsEl) {
    awayStatsEl.innerHTML = `Faltas <b style="color:#fff;">${m.stats?.awayFouls || 0}</b> • Tiros <b style="color:#fff;">${m.stats?.awayShots || 0}</b> • Pos <b style="color:#fff;">${awayPossPct}%</b>`;
  }

  const rivalTacticEl = document.getElementById("live-rival-tactic");
  if (rivalTacticEl) {
    rivalTacticEl.textContent = isUserHome ? m.awayTactic : m.homeTactic;
  }

  const logEl = document.getElementById("live-events-log");
  if (logEl) {
    logEl.innerHTML = m.events.map(ev => `<div>${ev}</div>`).join("");
  }
}

function renderTabBtn(id, label, activeTab, color, badgeCount = 0) {
  const isActive = id === activeTab;
  return `
    <button class="nav-tab ${isActive ? 'active' : ''}" data-tab="${id}" style="${isActive ? `background: linear-gradient(135deg, ${color}, #1e293b);` : ''}">
      <span>${label}</span>
      ${badgeCount > 0 ? `<span style="background:#ef4444; color:#fff; padding:1px 7px; border-radius:99px; font-size:11px; font-weight:800;">${badgeCount}</span>` : ""}
    </button>
  `;
}

function renderHomeTab(state) {
  const nextEvent = getNextUserEvent(state);
  const userPlayers = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
  const startersCount = userPlayers.filter(p => p.starter && !isPlayerUnavailable(p)).length;
  const unavailableCount = userPlayers.filter(p => isPlayerUnavailable(p)).length;
  const fin = state.lastFinanceReport;
  const trophies = state.trophies || [];
  const cs = state.careerStats || { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 };
  const season = state.season || 1;
  const objectives = (state.seasonObjectives || []).filter(o => o.season === season);
  const mp = state.managerProfile || { level: 1, xp: 0, nextLevelXp: 1000, skillPoints: 0, perks: {} };
  const userLeague = getClubLeagueObj(state.competitions, state.userClubId);
  const isOnline = Boolean(state.onlineRoomCode);

  let matchTitle = "Fin de Temporada";
  let matchCard = `<p><b>¡Temporada Finalizada!</b> Has completado los 22 partidos de Liga.</p>`;

  if (nextEvent?.waitingForOthers) {
    const pendingMgrs = (state.mpManagers || []).filter(m => {
      const mLg = getClubLeagueObj(state.competitions, m.clubId);
      return !mLg?.playedThisRound?.[m.clubId];
    });
    matchTitle = nextEvent.compName;
    matchCard = `
      <div style="background:rgba(59,130,246,0.14); border:1px solid rgba(59,130,246,0.4); border-radius:12px; padding:16px; text-align:center;">
        <div style="font-size:22px; margin-bottom:6px;">⏳</div>
        <b style="display:block; font-size:15px; margin-bottom:6px;">Ya disputaste tu partido de esta jornada</b>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
          Esperando a que jueguen su turno: <b style="color:#fff;">${pendingMgrs.map(m => `${m.name} (${state.clubs[m.clubId]?.name})`).join(", ")}</b>
        </p>
        ${isOnline ? `
          <button id="btn-home-check-sync" class="fm-btn fm-btn-primary">
            🔄 Comprobar si ya jugaron
          </button>
        ` : pendingMgrs[0] ? `
          <button class="btn-switch-manager fm-btn fm-btn-primary" data-midx="${state.mpManagers.findIndex(x => x.id === pendingMgrs[0].id)}">
            Pasar Turno a ${pendingMgrs[0].name}
          </button>
        ` : ""}
      </div>
    `;
  } else if (nextEvent && nextEvent.match) {
    const [hId, aId] = nextEvent.match;
    const home = state.clubs[hId];
    const away = state.clubs[aId];
    const isCup = nextEvent.compId === "cup_1";
    const isCont = nextEvent.compId === "cont_1";
    const isUserHome = hId === state.userClubId;

    const humanManagers = state.mpManagers || [];
    const homeMgr = humanManagers.find(m => m.clubId === hId);
    const awayMgr = humanManagers.find(m => m.clubId === aId);
    const isPvpDuel = Boolean(homeMgr && awayMgr);

    const attInfo = calculateMatchAttendance(
      home,
      isUserHome ? (state.boardConfidence || 80) : 82,
      nextEvent.compId,
      isUserHome ? (state.staff?.stadium || 1) : 1
    );

    matchTitle = nextEvent.compName;
    matchCard = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${isPvpDuel ? `<span style="display:inline-block; background: linear-gradient(90deg, #ef4444, #f97316); color:#fff; font-weight:900; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">⚔️ DUELO PvP: ${homeMgr.name} vs ${awayMgr.name}</span>` : ""}
          ${isCont ? `<span style="display:inline-block; background: linear-gradient(90deg, #2563eb, #3b82f6); color:#fff; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🌍 COPA CONTINENTAL ÉLITE</span>` : ""}
          ${isCup ? `<span style="display:inline-block; background: linear-gradient(90deg, #d97706, #f59e0b); color:#000; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🏆 ELIMINATORIA DE COPA</span>` : ""}
        </div>
        <span style="font-size:11.5px; color:var(--text-muted); font-weight:700;">
          🏟️ ${attInfo.stadiumName} • <b style="color:#e2e8f0;">${attInfo.attendance.toLocaleString()}</b> esp. (${attInfo.fillPct}%)
        </span>
      </div>
      <div class="fm-match-box" style="display: flex; align-items: center; justify-content: space-around; gap: 12px;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          ${renderClubBadge(home, 44)}
          <b style="font-size: 14px;">${home.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">${homeMgr ? `👤 ${homeMgr.name}` : `${home.flag || ""}`} • OVR ${home.ovr}</span>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 13px; font-weight: 900; color: var(--text-muted); letter-spacing: 0.14em;">VS</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          ${renderClubBadge(away, 44)}
          <b style="font-size: 14px;">${away.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">${awayMgr ? `👤 ${awayMgr.name}` : `${away.flag || ""}`} • OVR ${away.ovr}</span>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:8px; margin-top:10px;">
        <button id="btn-play-match" data-comp="${nextEvent.compId}" class="fm-btn fm-btn-play" style="margin-top:0;">
          ⚽ Jugar en Vivo
        </button>
        <button id="btn-quick-sim" class="fm-btn fm-btn-ghost" style="border-color:rgba(56,189,248,0.45); color:#7dd3fc; font-weight:800;">
          ⚡ Simulación Rápida
        </button>
      </div>
    `;
  }

  return `
    <div class="fm-grid-2">
      <div class="fm-card">
        <h3>${matchTitle}</h3>
        ${matchCard}
        ${fin ? `
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--panel-border); font-size: 12px;">
            <div style="color: var(--text-muted); margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Balance Última Jornada</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: rgba(6,9,19,0.65); padding: 9px 11px; border-radius: 10px;">
              <div>Taquilla<br><b style="color: var(--success); font-size: 13px;">+${(fin.ticketRevenue / 1e6).toFixed(2)}M</b></div>
              <div>Salarios<br><b style="color: var(--danger); font-size: 13px;">-${(fin.weeklyWages / 1e6).toFixed(2)}M</b></div>
              <div>Neto<br><b style="color: ${fin.netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size: 13px;">${fin.netBalance >= 0 ? '+' : ''}${(fin.netBalance / 1e6).toFixed(2)}M</b></div>
            </div>
          </div>
        ` : ""}
      </div>

      <div class="fm-card">
        <h3>Historial de Mánager y Enfermería</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: rgba(6, 9, 19, 0.78); padding: 12px; border-radius: 12px; border: 1px solid var(--panel-border); text-align: center; margin-bottom: 14px;">
          <div><small style="color: var(--text-muted); display:block; font-size:10.5px;">PJ</small><b style="font-size:19px;">${cs.played}</b></div>
          <div><small style="color: var(--text-muted); display:block; font-size:10.5px;">GANADOS</small><b style="color: var(--success); font-size:19px;">${cs.wins}</b></div>
          <div><small style="color: var(--text-muted); display:block; font-size:10.5px;">EMPATADOS</small><b style="font-size:19px;">${cs.draws}</b></div>
          <div><small style="color: var(--text-muted); display:block; font-size:10.5px;">PERDIDOS</small><b style="color: var(--danger); font-size:19px;">${cs.losses}</b></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:6px;">
          <span>Titulares Disponibles:</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <b style="color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">${startersCount} / 11 ${startersCount === 11 ? '✓' : '⚠️'}</b>
            ${startersCount !== 11 ? `<button class="btn-auto-best-xi fm-btn fm-btn-primary" style="padding:3px 8px; font-size:11px;">⚡ Mejor XI</button>` : ""}
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:8px;">
          <span>Enfermería / Sancionados:</span>
          <b style="color: ${unavailableCount > 0 ? '#f59e0b' : 'var(--text-muted)'};">${unavailableCount} ${unavailableCount === 1 ? 'baja' : 'bajas'}</b>
        </div>

        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--panel-border);">
          <small style="color: var(--text-muted); display: block; margin-bottom: 8px; font-weight: 700; text-transform: uppercase;">Vitrina de Trofeos (${trophies.length})</small>
          ${trophies.length === 0 ? `<small style="color: #64748b;">Aún no has conquistado títulos oficiales.</small>` : `
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${trophies.map(t => `<span style="background: linear-gradient(135deg, rgba(245,158,11,0.24), rgba(217,119,6,0.12)); border: 1px solid rgba(251,191,36,0.35); color: #fde047; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800;">🏆 ${t.title} (T${t.season})</span>`).join("")}
            </div>
          `}
        </div>
      </div>
    </div>

    <div class="fm-grid-2">
      <div class="fm-card">
        <h3>🎯 Objetivos de Directiva (Temporada ${season})</h3>
        <div style="display:grid; gap:10px;">
          ${objectives.map(obj => {
            const progText = obj.type === "league_rank"
              ? `Meta: Top ${obj.target}`
              : `${Math.min(obj.target, obj.current || 0)} / ${obj.target}`;
            return `
              <div style="background:rgba(6,9,19,0.75); border:1px solid ${obj.completed ? 'rgba(16,185,129,0.45)' : 'var(--panel-border)'}; border-radius:11px; padding:11px 13px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>
                  <div style="font-size:13px; font-weight:800; color:${obj.completed ? '#34d399' : '#f8fafc'};">
                    ${obj.completed ? '✅' : '📌'} ${obj.title}
                  </div>
                  <small style="color:var(--text-muted);">Recompensa: <b style="color:#34d399;">+${(obj.rewardCash / 1e6).toFixed(1)}M€</b> • <b style="color:#60a5fa;">+${obj.rewardXp} XP</b></small>
                </div>
                <span style="font-size:11.5px; font-weight:800; padding:4px 9px; border-radius:7px; background:${obj.completed ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,0.9)'}; color:${obj.completed ? '#34d399' : '#cbd5e1'}; white-space:nowrap;">
                  ${obj.completed ? 'Cumplido' : progText}
                </span>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="fm-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0;">🎖️ Perks de Mánager (Nivel ${mp.level})</h3>
          <span style="background:${(mp.skillPoints || 0) > 0 ? 'rgba(250,204,21,0.22)' : 'rgba(30,41,59,0.85)'}; color:${(mp.skillPoints || 0) > 0 ? '#fde047' : 'var(--text-muted)'}; border:1px solid ${(mp.skillPoints || 0) > 0 ? 'rgba(250,204,21,0.5)' : 'var(--panel-border)'}; padding:3px 10px; border-radius:99px; font-size:11.5px; font-weight:800;">
            ${mp.skillPoints || 0} Puntos disp.
          </span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:9px;">
          ${Object.values(MANAGER_PERKS).map(pk => {
            const cur = mp.perks?.[pk.key] || 0;
            const canUnlock = (mp.skillPoints || 0) > 0 && cur < pk.maxLevel;
            return `
              <div style="background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:10px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; gap:7px;">
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:800;">
                    <span>${pk.name}</span>
                    <span style="color:#60a5fa;">${cur}/${pk.maxLevel}</span>
                  </div>
                  <small style="color:var(--text-muted); font-size:11px; line-height:1.35; display:block; margin-top:3px;">${pk.desc}</small>
                </div>
                <button class="btn-unlock-perk fm-btn ${canUnlock ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-perk="${pk.key}" ${!canUnlock ? 'disabled' : ''} style="padding:5px 8px; font-size:11px; ${!canUnlock ? 'opacity:0.48; cursor:not-allowed;' : ''}">
                  ${cur >= pk.maxLevel ? '✓ Al Máximo' : '+ Mejorar (1 pt)'}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>

    ${renderLeagueTableCard(state, userLeague?.id || "league_1")}
  `;
}

function renderSquadTab(state) {
  const squad = Object.values(state.players || {})
    .filter(p => p.clubId === state.userClubId)
    .sort((a, b) => (b.starter === a.starter ? b.ovr - a.ovr : b.starter ? 1 : -1));
  const startersCount = squad.filter(p => p.starter && !isPlayerUnavailable(p)).length;

  return `
    <div class="fm-card">
      <div style="display: flex; flex-wrap:wrap; justify-content: space-between; align-items: center; gap:10px; margin-bottom: 14px;">
        <div>
          <h3 style="margin: 0;">Plantilla y Contratos (${squad.length} jugadores)</h3>
          <small style="color:var(--text-muted);">Haz clic en un jugador para entrenarlo, cambiar su posición o renovar</small>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-auto-best-xi fm-btn fm-btn-primary" style="padding: 6px 12px; font-size: 12px;">
            ⚡ Mejor XI Disponible
          </button>
          <span style="padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; background: ${startersCount === 11 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}; border: 1px solid ${startersCount === 11 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}; color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">
            Titulares: ${startersCount} / 11 ${startersCount === 11 ? '✓' : '⚠️'}
          </span>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="fm-table">
          <thead>
            <tr>
              <th>Rol / Estado</th>
              <th>Jugador y Atributos</th>
              <th>Pos</th>
              <th>OVR</th>
              <th>Moral</th>
              <th>Físico</th>
              <th>Contrato</th>
              <th>Gestión</th>
            </tr>
          </thead>
          <tbody>
            ${squad.map(p => {
              const baseAttrs = getPlayerAttributes(p);
              const boosts = p.customBoosts || {};
              const attrs = {
                RIT: Math.min(99, baseAttrs.RIT + (boosts.RIT || 0)),
                TIR: Math.min(99, baseAttrs.TIR + (boosts.TIR || 0)),
                PAS: Math.min(99, baseAttrs.PAS + (boosts.PAS || 0)),
                DEF: Math.min(99, baseAttrs.DEF + (boosts.DEF || 0))
              };
              const unavail = isPlayerUnavailable(p);
              const statusBadge = getPlayerStatusBadge(p);
              const stamColor = p.stamina > 70 ? '#10b981' : p.stamina > 45 ? '#f59e0b' : '#ef4444';
              const morale = p.morale ?? 85;
              const moraleColor = morale >= 80 ? '#10b981' : morale < 55 ? '#ef4444' : '#38bdf8';
              const years = p.contractYears ?? 2;
              const contractColor = years <= 1 ? 'var(--danger)' : 'var(--text-muted)';
              const sellVal = Math.round(calculateMarketValue(p, 1) * 0.85);

              return `
                <tr class="${p.starter && !unavail ? 'highlight-row' : ''}" style="${unavail ? 'opacity:0.78;' : ''}">
                  <td>
                    ${unavail ? statusBadge : `
                      <button class="btn-toggle-starter fm-btn" data-pid="${p.id}" style="padding: 5px 10px; font-size: 11px; background: ${p.starter ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(51,65,85,0.85)'};">
                        ${p.starter ? '★ Titular' : 'Suplente'}
                      </button>
                    `}
                  </td>
                  <td>
                    <span class="btn-inspect-player" data-pid="${p.id}" style="cursor:pointer; font-weight:800; text-decoration:underline; text-decoration-color:rgba(96,165,250,0.5);">${p.name}</span>
                    ${p.isCustomLegend ? `<span style="background:rgba(250,204,21,0.22); color:#fde047; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">★ LEYENDA</span>` : p.isRegen ? `<span style="background:rgba(16,185,129,0.22); color:#34d399; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">REGEN</span>` : p.isYouth ? `<span style="background:rgba(59,130,246,0.25); color:#60a5fa; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">CANTERA</span>` : ""}
                    ${p.isLoaned ? `<span style="background:rgba(168,85,247,0.25); color:#d8b4fe; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">CEDIDO</span>` : ""}
                    <small style="color: var(--text-muted);">(${p.age}a)</small>
                    ${(p.yellowCardsSeason || 0) > 0 ? `<span style="margin-left:4px; font-size:10px; color:#facc15; font-weight:700;">🟨 ${p.yellowCardsSeason}/5</span>` : ""}
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display:flex; gap:8px;">
                      <span>RIT <b style="color:#e2e8f0;">${attrs.RIT}</b></span>
                      <span>TIR <b style="color:#e2e8f0;">${attrs.TIR}</b></span>
                      <span>PAS <b style="color:#e2e8f0;">${attrs.PAS}</b></span>
                      <span>DEF <b style="color:#e2e8f0;">${attrs.DEF}</b></span>
                    </div>
                  </td>
                  <td><span class="fm-badge-pos">${p.pos}</span></td>
                  <td>${renderOvrBadge(p.ovr)}</td>
                  <td style="min-width:95px;">${renderMiniBar(morale, moraleColor)}</td>
                  <td style="min-width:95px;">${renderMiniBar(p.stamina, stamColor)}</td>
                  <td style="color: ${contractColor}; font-weight: 700; white-space:nowrap;">${p.isLoaned ? "Cesión 1a" : `${years} ${years === 1 ? "año ⚠️" : "años"}`}</td>
                  <td style="display: flex; gap: 6px; white-space:nowrap;">
                    ${!p.isLoaned && years < 4 ? `
                      <button class="btn-renew-contract fm-btn fm-btn-primary" data-pid="${p.id}" style="padding: 5px 9px; font-size: 11px;">
                        ✍️ Renovar
                      </button>
                    ` : ""}
                    ${!p.isLoaned ? `
                      <button class="btn-sell-player fm-btn fm-btn-ghost" data-pid="${p.id}" style="padding: 5px 9px; font-size: 11px;">
                        Vender (${(sellVal / 1e6).toFixed(1)}M)
                      </button>
                    ` : `<span style="font-size:11px; color:var(--text-muted);">En préstamo</span>`}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderStaffTab(state) {
  const staff = state.staff || { fitness: 1, scout: 1, youth: 1, stadium: 1 };
  const activePlan = state.trainingPlan || "balanced";
  const youthPromotedThisSeason = (state.lastYouthSeason || 0) >= (state.season || 1);
  const userClub = state.clubs[state.userClubId];
  const stadium = getClubStadium(userClub, staff.stadium || 1);
  const youthReports = state.youthReports || [];
  const youthAcademy = state.youthAcademy || [];

  return `
    <div class="fm-card">
      <div style="display: flex; flex-wrap:wrap; justify-content: space-between; align-items: center; gap:8px; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0;">🔭 Red de Ojeadores Juveniles y Academia Sub-18 (${youthAcademy.length}/8)</h3>
          <small style="color:var(--text-muted);">Envía ojeadores a países clave, ficha promesas con alto Potencial (POT) y súbelas al primer equipo</small>
        </div>
        <span style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); padding:4px 10px; border-radius:8px; font-size:12px; color:#60a5fa; font-weight:800;">Academia Nvl ${staff.youth || 1}</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:8px; margin-bottom:16px;">
        ${SCOUTING_REGIONS.map(reg => `
          <button class="btn-scout-region fm-btn fm-btn-ghost" data-region="${reg.id}" style="text-align:left; padding:10px 12px; display:flex; flex-direction:column; gap:3px; border-color:${state.lastScoutRegion === reg.id ? '#3b82f6' : 'var(--panel-border)'};">
            <div style="display:flex; justify-content:space-between; width:100%; font-weight:800; font-size:13px;">
              <span>${reg.flag} ${reg.name}</span>
              <span style="color:#34d399;">${(reg.cost / 1e6).toFixed(2)}M</span>
            </div>
            <small style="color:var(--text-muted); font-size:11px;">${reg.specialty}</small>
          </button>
        `).join("")}
      </div>

      ${youthReports.length > 0 ? `
        <div style="background:rgba(6,9,19,0.72); border:1px solid rgba(59,130,246,0.35); border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="font-size:11.5px; font-weight:800; color:#60a5fa; text-transform:uppercase; margin-bottom:10px;">📋 Informe Actual de Ojeadores (Fichar para Academia)</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
            ${youthReports.map(rep => `
              <div style="background:rgba(15,23,42,0.9); border:1px solid var(--panel-border); border-radius:10px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b>${rep.countryFlag} ${rep.name}</b>
                    <span class="fm-badge-pos">${rep.pos}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                    ${rep.age} años • OVR <b style="color:#fff;">${rep.ovr}</b> • POT <b style="color:#fde047;">${rep.potMin}-${rep.potMax}</b>
                  </div>
                </div>
                <button class="btn-sign-academy fm-btn fm-btn-primary" data-repid="${rep.id}" style="width:100%; padding:6px 10px; font-size:11.5px;">
                  ✍️ Fichar Beca (${(rep.signFee / 1e6).toFixed(2)} M€)
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      ${youthAcademy.length > 0 ? `
        <div style="background:rgba(6,9,19,0.72); border:1px solid rgba(16,185,129,0.35); border-radius:12px; padding:12px; margin-bottom:12px;">
          <div style="font-size:11.5px; font-weight:800; color:#34d399; text-transform:uppercase; margin-bottom:10px;">🎓 Plantilla Juvenil Sub-18 en Formación</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
            ${youthAcademy.map(ac => `
              <div style="background:rgba(15,23,42,0.9); border:1px solid var(--panel-border); border-radius:10px; padding:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <b>${ac.countryFlag} ${ac.name}</b>
                  <span class="fm-badge-pos">${ac.pos}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin:5px 0 9px;">
                  ${ac.age} años • OVR <b style="color:#fff;">${ac.ovr}</b> • POT <b style="color:#34d399;">${ac.potMin}-${ac.potMax}</b>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn-promote-academy-player fm-btn fm-btn-primary" data-acid="${ac.id}" style="flex:1; padding:5px 8px; font-size:11px;">
                    ⬆️ Subir al 1er Equipo
                  </button>
                  <button class="btn-release-academy-player fm-btn fm-btn-ghost" data-acid="${ac.id}" style="padding:5px 8px; font-size:11px; color:#fca5a5;">
                    ✕
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div style="padding-top:10px; border-top:1px solid var(--panel-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12px; color:var(--text-muted);">Promoción directa rápida de cantera local (1 por temporada):</span>
        <button id="btn-promote-youth" class="fm-btn fm-btn-ghost" ${youthPromotedThisSeason ? 'disabled style="opacity:0.45; cursor:not-allowed;"' : ''} style="font-size:12px; padding:6px 12px;">
          ${youthPromotedThisSeason ? '✓ Promoción directa usada esta temporada' : '🌟 Promoción Directa Rápida (1.50 M€)'}
        </button>
      </div>
    </div>

    <div class="fm-card">
      <h3>Plan de Entrenamiento Semanal</h3>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 14px;">Selecciona el enfoque de trabajo de esta semana para moldear el desarrollo y físico de tu plantilla:</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px;">
        ${Object.values(TRAINING_PLANS).map(plan => {
          const isSelected = activePlan === plan.key;
          return `
            <button class="btn-training-plan" data-plan="${plan.key}" style="text-align: left; background: ${isSelected ? 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(30,41,59,0.85))' : 'rgba(6,9,19,0.75)'}; border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--panel-border)'}; border-radius: 12px; padding: 14px; color: #fff; cursor: pointer; transition: all 0.15s ease;">
              <div style="font-weight: 800; margin-bottom: 6px; color: ${isSelected ? '#60a5fa' : '#fff'};">
                ${isSelected ? '✓ ' : ''}${plan.name}
              </div>
              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${plan.desc}</div>
            </button>
          `;
        }).join("")}
      </div>
    </div>

    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:8px; margin-bottom: 16px;">
        <h3 style="margin: 0;">Cuerpo Técnico e Infraestructura (${stadium.name}: ${stadium.capacity.toLocaleString()} localidades)</h3>
        <span>Presupuesto: <b style="color: var(--success);">${((state.budget || 0) / 1e6).toFixed(2)} M€</b></span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        ${Object.values(STAFF_CATALOG).map(item => {
          const lvl = staff[item.key] || 1;
          const cost = getStaffUpgradeCost(item.key, lvl);
          const canAfford = cost && (state.budget || 0) >= cost;
          return `
            <div style="background: rgba(6,9,19,0.75); border: 1px solid var(--panel-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <b>${item.name}</b>
                  <span style="background: rgba(59,130,246,0.2); color: #60a5fa; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                    Nvl ${lvl}/${item.maxLevel}
                  </span>
                </div>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${item.desc}</p>
              </div>
              ${cost ? `
                <button class="btn-upgrade-staff fm-btn ${canAfford ? 'fm-btn-primary' : ''}" data-key="${item.key}" ${!canAfford ? 'disabled' : ''} style="width: 100%; ${!canAfford ? 'background:#334155; opacity:0.5; cursor:not-allowed;' : ''}">
                  Mejorar (${(cost / 1e6).toFixed(2)} M€)
                </button>
              ` : `<button class="fm-btn" disabled style="width: 100%; background: rgba(16,185,129,0.2); color: var(--success);">✓ Nivel Máximo</button>`}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderTacticsTab(state) {
  const club = state.clubs[state.userClubId];
  const t = club.tactics || { mentality: 55, tempo: 55, press: 55 };
  const formation = club.formation || "4-3-3";
  const kitMode = club.kitMode || "home";
  const starters = Object.values(state.players || {})
    .filter(p => p.clubId === state.userClubId && p.starter && !isPlayerUnavailable(p))
    .slice(0, 11);
  const assigned = assignPlayersToSlots(starters, formation);
  const outOfPosCount = assigned.filter(a => a.outOfPosition).length;
  const shiftPreview = ((t.mentality - 50) / 50) * 16;

  const primaryKit = kitMode === "away" ? (club.colors[1] || "#f8fafc") : (club.colors[0] || "#2563eb");
  const secondaryKit = kitMode === "away" ? (club.colors[0] || "#1e293b") : (club.colors[1] || "#ffffff");
  const gkPrimary = kitMode === "away" ? "#10b981" : "#facc15";
  const gkSecondary = "#0f172a";

  return `
    <div class="fm-grid-2">
      <div class="fm-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          <h3 style="margin: 0;">Pizarra Táctica (${formation})</h3>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn-auto-best-xi fm-btn fm-btn-primary" style="padding:4px 10px; font-size:11px;">⚡ Mejor XI</button>
            ${outOfPosCount > 0
              ? `<span style="color: #fbbf24; font-size: 12px; font-weight: 700;">⚠️ ${outOfPosCount} fuera de puesto</span>`
              : `<span style="color: var(--success); font-size: 12px; font-weight: 700;">✓ Roles cubiertos</span>`}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
          <div style="display: flex; gap: 6px;">
            ${Object.keys(FORMATIONS).map(f => `
              <button class="btn-formation fm-btn ${f === formation ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-form="${f}" style="padding: 6px 12px; font-size: 12px;">
                ${f}
              </button>
            `).join("")}
          </div>

          <div style="display: flex; gap: 6px; background: rgba(6,9,19,0.75); padding: 4px; border-radius: 10px; border: 1px solid var(--panel-border);">
            <button class="btn-kit-mode fm-btn ${kitMode === 'home' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-kit="home" style="padding: 4px 10px; font-size: 11px;">
              👕 1ª Equipación
            </button>
            <button class="btn-kit-mode fm-btn ${kitMode === 'away' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-kit="away" style="padding: 4px 10px; font-size: 11px;">
              👕 2ª Equipación
            </button>
          </div>
        </div>

        <div style="position: relative; width: 100%; height: 365px; background: repeating-linear-gradient(90deg, #134e2a 0px, #134e2a 38px, #165b31 38px, #165b31 76px); border: 2px solid rgba(255,255,255,0.55); border-radius: 14px; overflow: hidden; box-shadow: inset 0 0 42px rgba(0,0,0,0.55);">
          <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.45);"></div>
          <div style="position: absolute; left: 50%; top: 50%; width: 78px; height: 78px; transform: translate(-50%, -50%); border: 2px solid rgba(255,255,255,0.45); border-radius: 50%;"></div>
          <div style="position: absolute; left: 0; top: 24%; width: 13%; height: 52%; border: 2px solid rgba(255,255,255,0.4); border-left: none;"></div>
          <div style="position: absolute; right: 0; top: 24%; width: 13%; height: 52%; border: 2px solid rgba(255,255,255,0.4); border-right: none;"></div>

          ${assigned.map(({ slot, player, outOfPosition }, idx) => {
            const isGK = idx === 0;
            const px = isGK ? slot.x * 140 : Math.max(13, Math.min(91, slot.x * 140 + shiftPreview));
            const label = player ? player.name.split(" ").pop() : slot.pos;
            const ovr = player ? (outOfPosition ? Math.max(55, player.ovr - 12) : player.ovr) : "--";
            const jerseyNum = isGK ? 1 : idx + 1;
            const c1 = isGK ? gkPrimary : primaryKit;
            const c2 = isGK ? gkSecondary : secondaryKit;

            return `
              <div class="tactic-node" data-base-x="${slot.x * 140}" data-is-gk="${isGK ? '1' : '0'}" style="position: absolute; left: ${px}%; top: ${slot.y * 100}%; transform: translate(-50%, -50%); text-align: center; transition: left 0.12s ease; z-index: ${isGK ? 2 : 3};">
                ${renderJerseySvg(c1, c2, jerseyNum, outOfPosition, 42)}
                <div style="display:inline-flex; align-items:center; gap:4px; background: rgba(6,9,19,0.92); border: 1px solid ${outOfPosition ? '#facc15' : 'rgba(255,255,255,0.16)'}; color: ${outOfPosition ? '#fde047' : '#fff'}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 5px; margin-top: 2px; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.6);">
                  <span style="color:#38bdf8;">${ovr}</span>
                  <span>${label}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="fm-card">
        <h3>Instrucciones del Equipo</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 18px;">
          Define la altura del bloque, el ritmo de pase y la presión en campo rival.
        </p>

        <div style="display: grid; gap: 22px;">
          <div>
            <label style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Mentalidad (Defensiva ↔ Ofensiva)</span>
              <span id="val-mentality" style="color: var(--primary); font-weight: 800;">${t.mentality}%</span>
            </label>
            <input type="range" class="tactic-slider" data-key="mentality" min="10" max="95" value="${t.mentality}" style="width: 100%;">
          </div>

          <div>
            <label style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Ritmo de Circulación (Lento ↔ Vertiginoso)</span>
              <span id="val-tempo" style="color: var(--primary); font-weight: 800;">${t.tempo}%</span>
            </label>
            <input type="range" class="tactic-slider" data-key="tempo" min="10" max="95" value="${t.tempo}" style="width: 100%;">
          </div>

          <div>
            <label style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Intensidad de Presión (Bloque Bajo ↔ Presión Alta)</span>
              <span id="val-press" style="color: var(--primary); font-weight: 800;">${t.press}%</span>
            </label>
            <input type="range" class="tactic-slider" data-key="press" min="10" max="95" value="${t.press}" style="width: 100%;">
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTransfersTab(state) {
  const scoutLvl = state.staff?.scout || 1;
  const posFilter = state.marketPosFilter || "ALL";
  const leagueFilter = state.marketLeagueFilter || "ALL";
  const ageFilter = state.marketAgeFilter || "ALL";
  const minOvrFilter = Number(state.marketMinOvr || 0);
  const searchQuery = (state.marketSearchQuery || "").trim();
  const queryLower = searchQuery.toLowerCase();

  const allExternal = Object.values(state.players || {}).filter(p => p.clubId !== state.userClubId);
  const filtered = allExternal.filter(p => {
    if (posFilter !== "ALL" && p.pos !== posFilter) return false;
    if (leagueFilter === "FREE") {
      if (p.clubId !== "free_agent") return false;
    } else if (leagueFilter !== "ALL") {
      if (state.clubs[p.clubId]?.leagueId !== leagueFilter) return false;
    }
    if (ageFilter === "U21" && p.age > 21) return false;
    if (ageFilter === "PRIME" && (p.age < 22 || p.age > 28)) return false;
    if (ageFilter === "VET" && p.age < 29) return false;
    if (minOvrFilter > 0 && p.ovr < minOvrFilter) return false;
    if (queryLower) {
      const cName = p.clubId === "free_agent" ? "agente libre" : (state.clubs[p.clubId]?.name || "").toLowerCase();
      if (!p.name.toLowerCase().includes(queryLower) && !cName.includes(queryLower)) return false;
    }
    return true;
  });

  const marketPlayers = filtered.sort((a, b) => b.ovr - a.ovr).slice(0, 35);
  const humanManagers = state.mpManagers || [];

  return `
    <div class="fm-card">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px;">
        <div>
          <h3 style="margin: 0;">Mercado Mundial y Agentes Libres (${filtered.length} resultados)</h3>
          <small style="color: var(--text-muted);">Descuento Ojeador Nvl ${scoutLvl}: <b>-${(scoutLvl - 1) * 6}%</b> • Haz clic en un jugador para abrir su ficha</small>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button class="btn-filter-league fm-btn ${leagueFilter === 'ALL' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="ALL" style="padding: 5px 9px; font-size: 11px;">Todas</button>
          <button class="btn-filter-league fm-btn ${leagueFilter === 'FREE' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="FREE" style="padding: 5px 9px; font-size: 11px; border-color:rgba(16,185,129,0.5); color:#34d399;">🆓 Libres (0M)</button>
          ${LEAGUES_CATALOG.map(l => `
            <button class="btn-filter-league fm-btn ${leagueFilter === l.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="${l.id}" style="padding: 5px 9px; font-size: 11px;">
              ${l.flag} ${l.country}
            </button>
          `).join("")}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; margin-bottom: 14px; background: rgba(6,9,19,0.68); padding: 12px; border-radius: 12px; border: 1px solid var(--panel-border);">
        <div>
          <label style="display:block; font-size:10.5px; font-weight:700; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">🔍 Buscar Jugador o Club</label>
          <input id="market-search-input" type="text" value="${searchQuery.replace(/"/g, "&quot;")}" placeholder="Ej: Leyton, Gutierrez, Rave, Galvis..." style="width:100%; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; font-size:12.5px;">
        </div>
        <div>
          <label style="display:block; font-size:10.5px; font-weight:700; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">🎂 Rango de Edad</label>
          <select id="market-age-select" style="width:100%; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; font-size:12.5px;">
            <option value="ALL" ${ageFilter === "ALL" ? "selected" : ""}>Todas las edades</option>
            <option value="U21" ${ageFilter === "U21" ? "selected" : ""}>Sub-21 (Promesas ≤ 21a)</option>
            <option value="PRIME" ${ageFilter === "PRIME" ? "selected" : ""}>Plenitud (22 - 28 años)</option>
            <option value="VET" ${ageFilter === "VET" ? "selected" : ""}>Veteranos (29+ años)</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:10.5px; font-weight:700; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">⭐ Media Mínima (OVR)</label>
          <select id="market-ovr-select" style="width:100%; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; font-size:12.5px;">
            <option value="0" ${minOvrFilter === 0 ? "selected" : ""}>Cualquier OVR</option>
            <option value="75" ${minOvrFilter === 75 ? "selected" : ""}>OVR 75+ (Titular Liga)</option>
            <option value="80" ${minOvrFilter === 80 ? "selected" : ""}>OVR 80+ (Estrella Continental)</option>
            <option value="84" ${minOvrFilter === 84 ? "selected" : ""}>OVR 84+ (Clase Mundial)</option>
          </select>
        </div>
      </div>

      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 14px;">
        <div style="display: flex; gap: 6px;">
          ${["ALL", "POR", "DEF", "MED", "DEL"].map(pos => `
            <button class="btn-filter-pos fm-btn ${posFilter === pos ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-pos="${pos}" style="padding: 5px 10px; font-size: 12px;">
              ${pos === "ALL" ? "Todas las Posiciones" : pos}
            </button>
          `).join("")}
        </div>
        ${(posFilter !== "ALL" || leagueFilter !== "ALL" || ageFilter !== "ALL" || minOvrFilter > 0 || searchQuery) ? `
          <button id="btn-clear-market-filters" class="fm-btn fm-btn-ghost" style="padding: 5px 10px; font-size: 11.5px; color: #fca5a5;">
            ✕ Limpiar Filtros
          </button>
        ` : ""}
      </div>

      <div style="overflow-x:auto;">
        <table class="fm-table">
          <thead>
            <tr>
              <th>Jugador y Atributos</th>
              <th>Club / Situación</th>
              <th>Pos</th>
              <th>Edad</th>
              <th>OVR</th>
              <th>Coste</th>
              <th>Negociación</th>
            </tr>
          </thead>
          <tbody>
            ${marketPlayers.length === 0 ? `
              <tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No hay futbolistas que coincidan con esos filtros.</td></tr>
            ` : marketPlayers.map(p => {
              const baseAttrs = getPlayerAttributes(p);
              const boosts = p.customBoosts || {};
              const attrs = {
                RIT: Math.min(99, baseAttrs.RIT + (boosts.RIT || 0)),
                TIR: Math.min(99, baseAttrs.TIR + (boosts.TIR || 0)),
                PAS: Math.min(99, baseAttrs.PAS + (boosts.PAS || 0)),
                DEF: Math.min(99, baseAttrs.DEF + (boosts.DEF || 0))
              };
              const isFree = p.clubId === "free_agent";
              const val = isFree ? getFreeAgentSignBonus(p) : calculateMarketValue(p, scoutLvl);
              const lowVal = Math.round(val * 0.82);
              const loanVal = Math.max(400000, Math.round(val * 0.25));
              const canBuy = (state.budget || 0) >= val;
              const canLow = !isFree && (state.budget || 0) >= lowVal;
              const canLoan = !isFree && (state.budget || 0) >= loanVal && !p.isLoaned;
              const c = state.clubs[p.clubId];
              const friendOwner = humanManagers.find(m => m.clubId === p.clubId);

              return `
                <tr>
                  <td>
                    <span class="btn-inspect-player" data-pid="${p.id}" style="cursor:pointer; font-weight:800; text-decoration:underline; text-decoration-color:rgba(96,165,250,0.5);">${p.name}</span>
                    ${p.isCustomLegend ? `<span style="background:rgba(250,204,21,0.22); color:#fde047; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">★ LEYENDA</span>` : p.isRegen ? `<span style="background:rgba(16,185,129,0.22); color:#34d399; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">REGEN</span>` : ""}
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display:flex; gap:8px;">
                      <span>RIT <b style="color:#e2e8f0;">${attrs.RIT}</b></span>
                      <span>TIR <b style="color:#e2e8f0;">${attrs.TIR}</b></span>
                      <span>PAS <b style="color:#e2e8f0;">${attrs.PAS}</b></span>
                      <span>DEF <b style="color:#e2e8f0;">${attrs.DEF}</b></span>
                    </div>
                  </td>
                  <td style="color: var(--text-muted);">
                    ${isFree
                      ? `<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">🆓 Agente Libre</span>`
                      : `${renderClubBadge(c, 20)} <b>${c?.name || "-"}</b> ${friendOwner ? `<span style="background:rgba(249,115,22,0.22); color:#fdba74; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">👤 ${friendOwner.name}</span>` : `<small>(${c?.flag || ""})</small>`}`}
                  </td>
                  <td><span class="fm-badge-pos">${p.pos}</span></td>
                  <td>${p.age}a</td>
                  <td>${renderOvrBadge(p.ovr)}</td>
                  <td><b>${(val / 1e6).toFixed(2)} M€</b> ${isFree ? `<small style="color:#34d399; display:block; font-size:10px;">Prima firma</small>` : ""}</td>
                  <td>
                    ${isFree ? `
                      <button class="btn-sign-free-agent fm-btn ${canBuy ? 'fm-btn-primary' : ''}" data-pid="${p.id}" ${!canBuy ? 'disabled' : ''} style="padding: 5px 11px; font-size: 11px; ${!canBuy ? 'background:#334155; opacity:0.45; cursor:not-allowed;' : ''}">
                        🆓 Fichar Libre
                      </button>
                    ` : `
                      <div style="display:flex; flex-wrap:wrap; gap:5px;">
                        <button class="btn-buy-player fm-btn ${canBuy ? 'fm-btn-primary' : ''}" data-pid="${p.id}" ${!canBuy ? 'disabled' : ''} title="Compra inmediata" style="padding: 5px 9px; font-size: 11px; ${!canBuy ? 'background:#334155; opacity:0.45; cursor:not-allowed;' : ''}">
                          Fichar
                        </button>
                        <button class="btn-lowball-player fm-btn fm-btn-ghost" data-pid="${p.id}" ${!canLow ? 'disabled' : ''} title="Oferta a la baja (-18%)" style="padding: 5px 8px; font-size: 11px; border-color: rgba(245,158,11,0.45); color: #fde047; ${!canLow ? 'opacity:0.4; cursor:not-allowed;' : ''}">
                          🤝 ${(lowVal / 1e6).toFixed(1)}M
                        </button>
                        <button class="btn-loan-player fm-btn fm-btn-ghost" data-pid="${p.id}" ${!canLoan ? 'disabled' : ''} title="Cesión 1 temporada (25%)" style="padding: 5px 8px; font-size: 11px; border-color: rgba(168,85,247,0.45); color: #d8b4fe; ${!canLoan ? 'opacity:0.4; cursor:not-allowed;' : ''}">
                          📄 Ceder (${(loanVal / 1e6).toFixed(1)}M)
                        </button>
                      </div>
                    `}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInboxTab(state) {
  const messages = state.inbox || [];
  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0;">Centro de Comunicaciones y Eventos IA</h3>
        <button id="btn-gen-event" class="fm-btn fm-btn-ai">✨ Simular Evento IA</button>
      </div>

      ${messages.length === 0 ? `<p style="color: var(--text-muted);">No hay mensajes nuevos. Juega un partido o genera un evento.</p>` : ""}

      <div style="display: grid; gap: 14px;">
        ${messages.map(m => `
          <div class="fm-event-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <b>${m.title}</b>
              <small style="color: var(--text-muted);">${m.date}</small>
            </div>
            <p style="margin-bottom: 12px; color: #cbd5e1; line-height: 1.55;">${m.body}</p>
            ${m.choices && m.choices.length > 0 && !m.resolved ? `
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${m.choices.map((c, idx) => `
                  <button class="btn-event-choice fm-btn fm-btn-primary" data-evid="${m.id}" data-type="${m.type || 'narrative'}" data-idx="${idx}" style="font-size: 13px;">
                    ${c.label}
                  </button>
                `).join("")}
              </div>
            ` : m.chosenLabel ? `<small style="color: var(--success); font-weight: 600;">✓ Decisión tomada: ${m.chosenLabel}</small>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCompetitionsTab(state) {
  const otherLeagues = Object.values(state.competitions?.otherLeagues || {});
  const hallOfFame = state.hallOfFame || [];
  const mpManagers = state.mpManagers || [];

  return `
    ${mpManagers.length > 1 ? `
      <div class="fm-card">
        <h3>👥 Clasificación de Mánagers Amigos</h3>
        <div style="overflow-x:auto;">
          <table class="fm-table">
            <thead>
              <tr>
                <th>Mánager</th>
                <th>Club</th>
                <th>Liga</th>
                <th>Pos.</th>
                <th>Pts</th>
                <th>Nivel</th>
                <th>Presupuesto</th>
              </tr>
            </thead>
            <tbody>
              ${mpManagers.map(m => {
                const c = state.clubs[m.clubId];
                const lg = getClubLeagueObj(state.competitions, m.clubId);
                const sorted = Object.entries(lg?.standings || {}).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga));
                const rank = sorted.findIndex(([cid]) => cid === m.clubId) + 1;
                const pts = lg?.standings?.[m.clubId]?.pts || 0;
                const isCur = m.clubId === state.userClubId;
                return `
                  <tr class="${isCur ? 'highlight-row' : ''}">
                    <td><b>👤 ${m.name}</b></td>
                    <td>${renderClubBadge(c, 20)} <b>${c?.name || "-"}</b></td>
                    <td style="color:var(--text-muted);">${lg?.name || "-"}</td>
                    <td><b style="color:#38bdf8;">#${rank || "-"}</b></td>
                    <td><b>${pts}</b></td>
                    <td>Nvl ${m.managerProfile?.level || 1}</td>
                    <td style="color:#34d399; font-weight:700;">${((isCur ? state.budget : m.budget) / 1e6).toFixed(1)} M€</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    ` : ""}

    ${renderCupCard(state, "cont_1", "🌍")}
    ${renderCupCard(state, "cont_2", "🌎")}

    ${state.competitions?.intercontinental ? `
      <div class="fm-card" style="background: linear-gradient(135deg, rgba(234,179,8,0.18), rgba(15,23,42,0.95)); border: 1px solid rgba(250,204,21,0.45);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <h3 style="margin:0; color:#fde047;">🌐 Copa Intercontinental FIFA (Campeón Europa vs Campeón América)</h3>
          <span style="font-size:13px; font-weight:900; color:#34d399;">
            Campeón Mundial: ${state.clubs[state.competitions.intercontinental.winnerId]?.name || "-"}
          </span>
        </div>
        <div style="margin-top:10px; font-size:15px; font-weight:800; text-align:center; padding:10px; background:rgba(6,9,19,0.7); border-radius:10px;">
          ${state.clubs[state.competitions.intercontinental.homeId]?.flag || ""} ${state.clubs[state.competitions.intercontinental.homeId]?.name || ""}
          <span style="color:#fde047; margin:0 12px;">${state.competitions.intercontinental.gh} - ${state.competitions.intercontinental.ga}</span>
          ${state.clubs[state.competitions.intercontinental.awayId]?.name || ""} ${state.clubs[state.competitions.intercontinental.awayId]?.flag || ""}
        </div>
      </div>
    ` : ""}

    ${renderCupCard(state, "cup_1", "🏆")}

    <div style="display: flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
      <button class="btn-select-standings fm-btn ${selectedStandingsView === 'league_1' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-lid="league_1" style="font-size:12px;">
        ⭐ ${state.competitions?.league_1?.name || "Mi Liga"}
      </button>
      ${otherLeagues.map(ol => `
        <button class="btn-select-standings fm-btn ${selectedStandingsView === ol.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-lid="${ol.id}" style="font-size:12px;">
          ${ol.name}
        </button>
      `).join("")}
    </div>

    <div class="fm-grid-2">
      <div>${renderLeagueTableCard(state, selectedStandingsView)}</div>
      <div>${renderTopScorersCard(state)}</div>
    </div>

    ${hallOfFame.length > 0 ? `
      <div class="fm-card">
        <h3>🏛️ Salón de la Fama - Historial de Temporadas</h3>
        <div style="overflow-x:auto;">
          <table class="fm-table">
            <thead>
              <tr>
                <th>Temporada</th>
                <th>Club</th>
                <th>Posición Liga</th>
                <th>Puntos</th>
                <th>Goleador del Equipo</th>
              </tr>
            </thead>
            <tbody>
              ${hallOfFame.map(h => `
                <tr>
                  <td><b>T${h.season}</b></td>
                  <td><b>${h.clubName}</b></td>
                  <td><span style="color:${h.leaguePos === 1 ? '#fde047' : '#38bdf8'}; font-weight:800;">#${h.leaguePos}</span></td>
                  <td><b>${h.points} pts</b></td>
                  <td>${h.topScorerName} (${h.topScorerGoals} goles)</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    ` : ""}
  `;
}

function renderTopScorersCard(state) {
  const topScorers = Object.values(state.players || {})
    .filter(p => (p.goals || 0) > 0)
    .sort((a, b) => b.goals - a.goals || b.ovr - a.ovr)
    .slice(0, 12);

  return `
    <div class="fm-card">
      <h3>👟 Bota de Oro / Goleadores Globales</h3>
      ${topScorers.length === 0 ? `<p style="color: var(--text-muted); font-size: 14px;">Aún no se han marcado goles en esta temporada.</p>` : `
        <table class="fm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Club</th>
              <th>Goles</th>
            </tr>
          </thead>
          <tbody>
            ${topScorers.map((p, i) => {
              const c = state.clubs[p.clubId];
              return `
                <tr class="${p.clubId === state.userClubId ? 'highlight-row' : ''}">
                  <td><b>${i + 1}</b></td>
                  <td><span class="btn-inspect-player" data-pid="${p.id}" style="cursor:pointer; font-weight:800; text-decoration:underline; text-decoration-color:rgba(96,165,250,0.5);">${p.name}</span></td>
                  <td style="color: var(--text-muted);">${c?.flag || ""} ${c?.name || "-"}</td>
                  <td><b style="color: var(--success); font-size: 14px;">${p.goals}</b></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function renderCupCard(state, compKey, icon) {
  const cup = state.competitions?.[compKey];
  if (!cup) return "";
  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="margin: 0;">${icon} ${cup.name}</h3>
        <span style="font-size: 13px; color: #f59e0b; font-weight: 800;">
          ${cup.championId ? `🏆 Campeón: ${state.clubs[cup.championId]?.name}` : cup.stageNames[cup.currentStage]}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        ${cup.rounds.map((matches, sIdx) => `
          <div style="background: rgba(6, 9, 19, 0.75); padding: 12px; border-radius: 10px; border: 1px solid var(--panel-border);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; font-weight: 800; text-transform: uppercase;">${cup.stageNames[sIdx]}</div>
            ${matches.map(([hId, aId]) => `
              <div style="font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="${hId === state.userClubId ? 'color: var(--success); font-weight: 700;' : ''}">${state.clubs[hId]?.flag || ""} ${state.clubs[hId]?.name || hId}</span>
                <span style="color: var(--text-muted);"> vs </span>
                <span style="${aId === state.userClubId ? 'color: var(--success); font-weight: 700;' : ''}">${state.clubs[aId]?.flag || ""} ${state.clubs[aId]?.name || aId}</span>
              </div>
            `).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLeagueTableCard(state, leagueKey = "league_1") {
  const comp = leagueKey === "league_1"
    ? state.competitions?.league_1
    : state.competitions?.otherLeagues?.[leagueKey] || state.competitions?.league_1;

  if (!comp || !comp.standings) return "";

  const humanMap = {};
  (state.mpManagers || []).forEach(m => { humanMap[m.clubId] = m.name; });

  const sorted = Object.entries(comp.standings)
    .map(([clubId, s]) => ({ clubId, club: state.clubs[clubId], name: state.clubs[clubId]?.name || clubId, ...s }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

  return `
    <div class="fm-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3 style="margin:0;">Clasificación - ${comp.name}</h3>
        <span style="font-size:11px; color:#60a5fa; font-weight:700;">Top 2 → Copa Continental</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="fm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>DG</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((t, i) => `
              <tr class="${t.clubId === state.userClubId ? 'highlight-row' : ''}">
                <td style="${i < 2 ? 'color: #34d399; font-weight: 900;' : i < 4 ? 'color: #60a5fa; font-weight: 800;' : ''}">${i + 1}</td>
                <td>
                  ${renderClubBadge(t.club, 20)} <b>${t.name}</b>
                  ${humanMap[t.clubId] ? `<span style="background:rgba(59,130,246,0.22); color:#93c5fd; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">👤 ${humanMap[t.clubId]}</span>` : ""}
                </td>
                <td>${t.pj}</td>
                <td>${t.w}</td>
                <td>${t.d}</td>
                <td>${t.l}</td>
                <td>${t.gf - t.ga}</td>
                <td><b style="font-size:14px;">${t.pts}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderLiveMatchView(state) {
  const m = state.liveMatch;
  const isUserHome = m.homeId === state.userClubId;
  const activeTactic = isUserHome ? (m.homeTactic || "Equilibrado") : (m.awayTactic || "Equilibrado");
  const userAgents = isUserHome ? m.homeAgents : m.awayAgents;
  const onPitchIds = new Set(userAgents.map(a => a.playerId));
  const benchPlayers = Object.values(state.players || {}).filter(
    p => p.clubId === state.userClubId && !onPitchIds.has(p.id) && !isPlayerUnavailable(p)
  );
  const homeClub = state.clubs[m.homeId];
  const awayClub = state.clubs[m.awayId];
  const attInfo = calculateMatchAttendance(
    homeClub,
    isUserHome ? (state.boardConfidence || 80) : 82,
    state.activeCompId || "league_1",
    isUserHome ? (state.staff?.stadium || 1) : 1
  );

  const totalPoss = (m.stats?.homePoss || 1) + (m.stats?.awayPoss || 1);
  const homePossPct = Math.round(((m.stats?.homePoss || 1) / totalPoss) * 100);
  const awayPossPct = 100 - homePossPct;

  return `
    <div class="fm-container" style="max-width: 900px;">
      <div class="fm-card">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--text-muted); margin-bottom:8px; padding:0 4px;">
          <span>🏟️ <b style="color:#e2e8f0;">${attInfo.stadiumName}</b></span>
          <span>Asistencia: <b style="color:#34d399;">${attInfo.attendance.toLocaleString()}</b> / ${attInfo.capacity.toLocaleString()} (${attInfo.fillPct}%)</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, ${homeClub.colors[0]}33, #060911 30%, #060911 70%, ${awayClub.colors[0]}33); padding: 14px 22px; border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.14);">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800;">
            ${renderClubBadge(homeClub, 36)}
            ${renderJerseySvg(homeClub.colors[0], homeClub.colors[1], "", false, 28)}
            <span>${m.homeName}</span>
          </div>
          <div style="text-align: center;">
            <div id="live-score-text" style="font-size: 32px; font-weight: 900; letter-spacing: 2px; line-height: 1.1;">
              ${m.shootout ? `${m.gh} - ${m.ga} (Pen: ${m.shootout.homeScore}-${m.shootout.awayScore})` : `${m.gh} - ${m.ga}`}
            </div>
            <span id="live-minute-badge" style="display:inline-block; margin-top:4px; background: ${m.shootout ? '#3b82f6' : m.paused ? '#f59e0b' : '#ef4444'}; color: ${m.paused ? '#000' : '#fff'}; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em;">
              ${m.shootout ? "TANDA DE PENALES" : m.paused ? `PAUSADO (${m.minute}')` : `MIN ${m.minute}'`}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800;">
            <span>${m.awayName}</span>
            ${renderJerseySvg(awayClub.colors[0], awayClub.colors[1], "", false, 28)}
            ${renderClubBadge(awayClub, 36)}
          </div>
        </div>

        <div style="margin-bottom: 12px; padding: 0 4px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:5px;">
            <span id="live-home-stats"><b style="color:#fff;">${homePossPct}%</b> Pos • <b style="color:#fff;">${m.stats?.homeShots || 0}</b> Tiros • <b style="color:#fff;">${m.stats?.homeFouls || 0}</b> Faltas</span>
            <span>Tu Táctica: <b style="color:#60a5fa;">${activeTactic}</b> | Rival: <b id="live-rival-tactic" style="color:#f59e0b;">${isUserHome ? m.awayTactic : m.homeTactic}</b></span>
            <span id="live-away-stats">Faltas <b style="color:#fff;">${m.stats?.awayFouls || 0}</b> • Tiros <b style="color:#fff;">${m.stats?.awayShots || 0}</b> • Pos <b style="color:#fff;">${awayPossPct}%</b></span>
          </div>
          <div style="width:100%; height:6px; background:${awayClub.colors[0]}; border-radius:99px; overflow:hidden; display:flex;">
            <div id="live-poss-bar-home" style="width:${homePossPct}%; height:100%; background:${homeClub.colors[0]}; transition:width 0.25s ease;"></div>
          </div>
        </div>

        ${!m.finished ? `
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; background: rgba(6,9,19,0.75); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--panel-border);">
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 11px; font-weight:700; color: var(--text-muted); text-transform:uppercase; margin-right: 4px;">Táctica:</span>
              <button type="button" class="btn-live-mentality fm-btn ${activeTactic === 'Defensivo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Defensivo" style="padding: 5px 10px; font-size: 12px;">🛡️ Defensivo</button>
              <button type="button" class="btn-live-mentality fm-btn ${activeTactic === 'Equilibrado' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Equilibrado" style="padding: 5px 10px; font-size: 12px;">⚖️ Equilibrado</button>
              <button type="button" class="btn-live-mentality fm-btn ${activeTactic === 'Ofensivo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Ofensivo" style="padding: 5px 10px; font-size: 12px;">⚔️ Ofensivo</button>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" id="btn-toggle-audio" class="fm-btn fm-btn-ghost" style="padding: 5px 10px; font-size: 12px;">
                ${isAudioMuted() ? "🔇" : "🔊"}
              </button>
              <button type="button" id="btn-pause-match" class="fm-btn fm-btn-ghost" style="padding: 5px 12px; font-size: 12px;">
                ${m.paused ? "▶️ Reanudar" : "⏸️ Pausar / Cambios"}
              </button>
            </div>
          </div>

          ${m.paused ? `
            <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid #3b82f6; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
              <div style="font-size: 13px; font-weight: 800; margin-bottom: 8px; color: #60a5fa;">
                🔄 Realizar Sustitución (${m.subsUsed || 0}/${m.maxSubs || 5} cambios usados)
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                <select id="sub-out-select" style="background: #1e293b; color: #fff; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--panel-border);">
                  ${userAgents.map((a, idx) => `<option value="${idx}" ${a.expelled ? 'disabled' : ''}>${a.expelled ? '🟥 EXPULSADO: ' : 'Sale: '}${a.name} (${a.posType} • ${Math.round(a.stamina ?? 100)}% Físico)</option>`).join("")}
                </select>
                <select id="sub-in-select" style="background: #1e293b; color: #fff; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--panel-border);">
                  ${benchPlayers.map(p => `<option value="${p.id}">Entra: ${p.name} (${p.pos} • OVR ${p.ovr})</option>`).join("")}
                </select>
                <button type="button" id="btn-confirm-sub" class="fm-btn fm-btn-primary" style="padding: 7px 14px; font-size: 12px;">Confirmar Cambio</button>
              </div>
            </div>
          ` : ""}
        ` : ""}

        <div style="text-align: center; margin-bottom: 14px;">
          <canvas id="pitch-canvas" width="760" height="400" style="width: 100%; max-width: 760px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.14); box-shadow: 0 12px 30px rgba(0,0,0,0.6);"></canvas>
        </div>

        <div id="live-events-log" class="fm-live-log">
          ${m.events.map(ev => `<div>${ev}</div>`).join("")}
        </div>

        ${m.finished ? `
          <button type="button" id="btn-finish-match" class="fm-btn fm-btn-primary" style="width: 100%; margin-top: 16px; padding: 14px; font-size: 15px;">
            Continuar y Actualizar Competición
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderClubSelection(state) {
  const allClubsSorted = Object.values(state.clubs || {}).sort((a, b) => (a.leagueName || "").localeCompare(b.leagueName || "") || b.ovr - a.ovr);
  if (allClubsSorted.length >= 6) {
    const used = new Set();
    mpDraftSlots.forEach((slot, idx) => {
      if (!slot.clubId || !state.clubs[slot.clubId] || used.has(slot.clubId)) {
        const fallback = allClubsSorted.find(c => !used.has(c.id)) || allClubsSorted[idx];
        slot.clubId = fallback.id;
        used.add(slot.clubId);
      }
    });
  }

  let clubs = Object.values(state.clubs || {}).filter(c => (c.leagueId || "esp_1") === selectedPreviewLeague);
  if (clubs.length === 0 && allClubsSorted.length > 0) {
    selectedPreviewLeague = allClubsSorted[0].leagueId || "esp_1";
    clubs = allClubsSorted.filter(c => (c.leagueId || "esp_1") === selectedPreviewLeague);
  }

  return `
    <div class="fm-container" style="max-width: 980px; margin-top: 16px;">
      <div class="fm-hero-header">
        <div style="display:inline-block; background:rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.45); color:#60a5fa; font-size: 11px; font-weight:800; padding:4px 12px; border-radius:99px; letter-spacing:0.08em; margin-bottom: 10px;">
          TEMPORADA 2026 • 10 LIGAS MUNDIALES (EUROPA Y SUDAMÉRICA) • 120 CLUBES
        </div>
        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 8px;">
          WORLD FOOTBALL MANAGER <span style="color: #3b82f6;">2026</span>
        </h1>
        <p style="color: var(--text-muted); max-width: 620px; margin: 0 auto 18px; font-size: 14px;">
          Dirige en solitario, arma una sala compartida con tus amigos o conéctate por código desde cualquier computadora o celular.
        </p>

        <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
          <button class="btn-setup-mode fm-btn ${setupMode === 'solo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-mode="solo" style="padding: 9px 16px; font-size: 13px;">
            👤 Carrera Individual
          </button>
          <button class="btn-setup-mode fm-btn ${setupMode === 'mp' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-mode="mp" style="padding: 9px 16px; font-size: 13px; border-color:rgba(59,130,246,0.5);">
            👥 Crear Sala Amigos (2-6)
          </button>
          <button class="btn-setup-mode fm-btn ${setupMode === 'join_online' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-mode="join_online" style="padding: 9px 16px; font-size: 13px; border-color:rgba(16,185,129,0.5); color:${setupMode === 'join_online' ? '#fff' : '#34d399'};">
            🌐 Unirse a Sala Online
          </button>
        </div>

        ${setupMode === "solo" ? `
          <div style="display: flex; justify-content:center; flex-wrap:wrap; gap:8px;">
            ${LEAGUES_CATALOG.map(l => `
              <button class="btn-preview-league fm-btn ${selectedPreviewLeague === l.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-lid="${l.id}" style="padding: 8px 16px; font-size: 13px;">
                ${l.flag} ${l.name}
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>

      ${setupMode === "join_online" ? `
        <div class="fm-card" style="max-width: 560px; margin:0 auto;">
          <h3 style="margin-bottom: 6px;">🌐 Unirse a una Sala Online por Código</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            Pide al anfitrión el código de 6 letras de la sala (ej. <b style="color:#fff;">WFM82K</b>) y elige tu perfil de mánager.
          </p>
          <div style="display:flex; gap:8px; margin-bottom:16px;">
            <input id="input-join-room-code" type="text" maxlength="8" value="${joinRoomCodeInput.replace(/"/g, "&quot;")}" placeholder="CÓDIGO (EJ. WFM82K)" style="flex:1; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:10px; padding:10px 14px; font-size:15px; font-weight:900; letter-spacing:0.12em; text-transform:uppercase;">
            <button id="btn-search-online-room" class="fm-btn fm-btn-primary" style="padding:10px 18px; font-size:13px;">
              🔍 Buscar Sala
            </button>
          </div>

          ${fetchedOnlineRoom ? `
            <div style="background:rgba(6,9,19,0.8); border:1px solid rgba(16,185,129,0.45); border-radius:12px; padding:14px;">
              <div style="font-size:12px; color:#34d399; font-weight:800; margin-bottom:10px;">
                ✓ Sala ${fetchedOnlineRoom.room_code} encontrada (Temporada ${fetchedOnlineRoom.season} • Jornada ${fetchedOnlineRoom.round}) — Selecciona quién eres:
              </div>
              <div style="display:grid; gap:8px;">
                ${(fetchedOnlineRoom.state_json?.mpManagers || []).map(m => {
                  const c = fetchedOnlineRoom.state_json?.clubs?.[m.clubId];
                  return `
                    <button class="btn-join-as-manager fm-btn fm-btn-ghost" data-mgrid="${m.id}" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 12px; text-align:left; border-color:rgba(59,130,246,0.4);">
                      <span>👤 <b>${m.name}</b> • ${c?.name || m.clubId}</span>
                      <span style="color:#60a5fa; font-weight:800; font-size:12px;">Entrar →</span>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      ` : setupMode === "mp" ? `
        <div class="fm-card" style="max-width: 740px; margin:0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
            <div>
              <h3 style="margin:0;">👥 Configurar Sala de Amigos (${mpDraftSlots.length}/6 Mánagers)</h3>
              <small style="color:var(--text-muted);">Cada amigo elige su nombre y club. Una vez dentro podrás publicar la sala online para que entren desde sus dispositivos.</small>
            </div>
            ${mpDraftSlots.length < 6 ? `
              <button id="btn-mp-add-slot" class="fm-btn fm-btn-ghost" style="font-size:12px; padding:6px 12px; border-color:rgba(59,130,246,0.5); color:#93c5fd;">
                + Añadir Amigo
              </button>
            ` : ""}
          </div>

          <div style="display:grid; gap:10px; margin-bottom:16px;">
            ${mpDraftSlots.map((slot, idx) => `
              <div style="display:grid; grid-template-columns: 1fr 1.5fr auto; gap:10px; align-items:center; background:rgba(6,9,19,0.75); padding:10px 12px; border-radius:12px; border:1px solid var(--panel-border);">
                <input class="mp-slot-name" data-idx="${idx}" type="text" value="${slot.name.replace(/"/g, "&quot;")}" placeholder="Nombre Mánager ${idx + 1}" style="background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:8px 10px; font-size:13px; font-weight:700;">
                <select class="mp-slot-club" data-idx="${idx}" style="background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:8px 10px; font-size:13px;">
                  ${allClubsSorted.map(c => `
                    <option value="${c.id}" ${slot.clubId === c.id ? "selected" : ""}>
                      ${c.flag || ""} ${c.name} (OVR ${c.ovr} • ${c.leagueName})
                    </option>
                  `).join("")}
                </select>
                ${mpDraftSlots.length > 2 ? `
                  <button class="btn-mp-remove-slot fm-btn fm-btn-ghost" data-idx="${idx}" style="padding:7px 10px; color:#fca5a5;">✕</button>
                ` : `<span></span>`}
              </div>
            `).join("")}
          </div>

          <button id="btn-start-mp-career" class="fm-btn fm-btn-play">
            🚀 Iniciar Carrera Multijugador (${mpDraftSlots.length} Mánagers)
          </button>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(275px, 1fr)); gap: 14px;">
          ${clubs.map(c => {
            const stadium = getClubStadium(c, 1);
            const tier = c.ovr >= 83 ? { label: "Favorito al Título", color: "#fde047" }
              : c.ovr >= 79 ? { label: "Aspirante Continental", color: "#38bdf8" }
              : { label: "Proyecto / Reto", color: "#34d399" };

            return `
              <button class="fm-club-card-pick btn-select-club" data-id="${c.id}" style="background: linear-gradient(150deg, ${c.colors[0]}26, rgba(15, 23, 42, 0.94) 65%); border-top: 2px solid ${c.colors[0]};">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    ${renderClubBadge(c, 38)}
                    ${renderJerseySvg(c.colors[0], c.colors[1], "10", false, 32)}
                    <div>
                      <b style="display:block; font-size:15px;">${c.name}</b>
                      <span style="font-size:11px; font-weight:700; color:${tier.color};">${tier.label}</span>
                    </div>
                  </div>
                  ${renderOvrBadge(c.ovr)}
                </div>
                <div style="width:100%; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); display:grid; gap:4px; font-size:12px; color:var(--text-muted);">
                  <div style="display:flex; justify-content:space-between;">
                    <span>Presupuesto Inicial</span>
                    <b style="color:#34d399;">${(c.budget / 1e6).toFixed(0)} M€</b>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:11.5px;">
                    <span>🏟️ ${stadium.name}</span>
                    <b style="color:#e2e8f0;">${stadium.capacity.toLocaleString()}</b>
                  </div>
                </div>
              </button>
            `;
          }).join("")}
        </div>
      `}
    </div>
  `;
}

function handleSeasonEndHooks(seasonNum) {
  syncCurrentManagerSnapshot();
  processSeasonRetirementsAndRegens();
  runEndOfSeasonTransition();
  grantManagerXp(500, `Temporada ${seasonNum} completada`);
  ensureCareerHooksState();
  syncCurrentManagerSnapshot();
  syncOnlineIfActive();
  showToast(`🎉 ¡Temporada ${seasonNum} Finalizada! Revisa Bandeja IA (Gala y Regens) y Salón de la Fama.`, "success", 5800);
}

function runQuickSimulationFlow() {
  const stBefore = store.get();
  const nextEv = getNextUserEvent(stBefore);

  const res = simulateQuickMatch();
  if (!res.ok) {
    showToast(res.msg, "warning");
    if (res.needsLineup) {
      store.update(["activeTab"], draft => { draft.activeTab = "squad"; });
    }
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
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    stopOnlineAutoSync();
    localStorage.clear();
    location.reload();
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
    showToast(updated ? "🔄 Sala sincronizada con los últimos movimientos." : "✓ Tu sala ya está al día.", "info");
  });

  document.getElementById("btn-home-check-sync")?.addEventListener("click", async () => {
    const updated = await pullOnlineWorldState();
    showToast(updated ? "🔄 ¡Estado actualizado!" : "⏳ Tus amigos aún no terminan su partido.", "info");
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

  document.getElementById("btn-gen-event")?.addEventListener("click", () => {
    triggerPostMatchEvent();
  });

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
        if (res.needsCounter) {
          if (confirm(`${res.msg}\n\n¿Deseas aceptar la contraoferta y ficharlo ahora?`)) {
            const retry = buyPlayer(pid, true);
            if (retry.ok && (targetPlayer?.age || 25) <= 21) {
              evaluateObjectivesProgress({ signedU21: true });
            }
            syncCurrentManagerSnapshot();
            syncOnlineIfActive();
            showToast(retry.msg, retry.ok ? "success" : "error");
          }
        } else {
          showToast(res.msg, "warning");
        }
      } else {
        if ((targetPlayer?.age || 25) <= 21) {
          evaluateObjectivesProgress({ signedU21: true });
        }
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
      if (res.ok && (targetPlayer?.age || 25) <= 21) {
        evaluateObjectivesProgress({ signedU21: true });
      }
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
      if (res.ok && (targetPlayer?.age || 25) <= 21) {
        evaluateObjectivesProgress({ signedU21: true });
      }
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
      if (res.ok && (targetPlayer?.age || 25) <= 21) {
        evaluateObjectivesProgress({ signedU21: true });
      }
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
  // Eventos del Lobby Multijugador en Portada
  const modeBtn = e.target.closest(".btn-setup-mode");
  if (modeBtn) {
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
      showToast(`✓ Sala ${res.room.room_code} cargada.`, "success");
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
      return;
    }
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

  const previewLeagueBtn = e.target.closest(".btn-preview-league");
  if (previewLeagueBtn) {
    selectedPreviewLeague = previewLeagueBtn.dataset.lid;
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
});

document.addEventListener("input", e => {
  if (e.target.id === "input-join-room-code") {
    joinRoomCodeInput = e.target.value;
  }
  if (e.target.classList.contains("mp-slot-name")) {
    const idx = Number(e.target.dataset.idx);
    if (mpDraftSlots[idx]) mpDraftSlots[idx].name = e.target.value;
  }
});

document.addEventListener("change", e => {
  if (e.target.classList.contains("mp-slot-club")) {
    const idx = Number(e.target.dataset.idx);
    if (mpDraftSlots[idx]) mpDraftSlots[idx].clubId = e.target.value;
  }
});