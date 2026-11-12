import { store } from "../core/state.js";
import { getNextUserEvent, completeRoundWithUserResult, initCompetitions } from "../engine/competitions.js";
import { startLiveMatch, drawPitch, togglePauseMatch, setTactic, makeLiveSubstitution, FORMATIONS, assignPlayersToSlots } from "../engine/match-live.js";
import { calculateMarketValue, buyPlayer, sellPlayer, maybeGenerateIncomingOffer, respondToTransferOffer } from "../engine/transfers.js";
import { triggerPostMatchEvent, resolveInboxChoice } from "../ai/director.js";
import { processRoundProgression, advanceSeason, renewPlayerContract, recordMatchInCareer } from "../engine/progression.js";
import { STAFF_CATALOG, getStaffUpgradeCost, upgradeStaff } from "../engine/staff.js";
import { TRAINING_PLANS, setTrainingPlan } from "../engine/training.js";
import { getPlayerAttributes, promoteYouthProspect } from "../engine/academy.js";
import { toggleMute, isAudioMuted } from "../engine/audio.js";
import { getClubStadium, calculateMatchAttendance } from "../engine/stadium.js";
import { isPlayerUnavailable, getPlayerStatusBadge, applyPostMatchMedicalAndCards, advanceMedicalRecovery } from "../engine/medical.js";
import { LEAGUES_CATALOG, buildWorldDatabase } from "../data/world-database.js";
import { renderClubBadge } from "./badges.js";

let lastLiveLayoutKey = "";
let selectedPreviewLeague = "esp_1";
let selectedStandingsView = "league_1";

export function initUI() {
  const root = document.getElementById("view-root");
  if (!root) return;

  const s = store.get();
  if (!s.clubs || Object.keys(s.clubs).length < 20) {
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

  store.subscribe(render);
  render();
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
        <text x="32" y="37" text-anchor="middle" fill="${numCol}" font-family="system-ui, sans-serif" font-weight="900" font-size="18" stroke="#090d16" stroke-width="0.6">${number}</text>
      </svg>
    </div>
  `;
}

function renderMiniBar(value, color) {
  const pct = Math.max(5, Math.min(100, Math.round(value)));
  return `
    <div style="display:flex; align-items:center; gap:7px;">
      <div style="flex:1; min-width:46px; height:6px; background:rgba(15,23,42,0.9); border-radius:99px; overflow:hidden; border:1px solid rgba(255,255,255,0.06);">
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
    return;
  }

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

    const canvas = document.getElementById("pitch-canvas");
    drawPitch(canvas, state.liveMatch);
    return;
  }

  lastLiveLayoutKey = "";
  const userClub = state.clubs[state.userClubId];
  const activeTab = state.activeTab || "home";
  const unreadCount = (state.inbox || []).filter(m => !m.resolved && m.choices?.length > 0).length;
  const leagueRound = (state.competitions?.league_1?.currentRound || 0) + 1;
  const nextEvent = getNextUserEvent(state);
  const boardConf = state.boardConfidence || 85;
  const confColor = boardConf >= 75 ? "#10b981" : boardConf >= 50 ? "#f59e0b" : "#ef4444";
  const userStadium = getClubStadium(userClub, state.staff?.stadium || 1);

  root.innerHTML = `
    <div class="fm-app-shell">
      <aside class="fm-sidebar">
        <div>
          <div class="fm-sidebar-club" style="--club-accent: ${userClub.colors[0]}; background: linear-gradient(165deg, ${userClub.colors[0]}38, rgba(9,13,22,0.96) 65%);">
            <div style="margin: 0 auto 10px; display:flex; justify-content:center; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.65));">
              ${renderClubBadge(userClub, 62)}
            </div>
            <h2 style="font-size: 17px; font-weight: 900; letter-spacing: -0.01em; margin-bottom: 2px;">${userClub.name}</h2>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
              ${userClub.flag || "⚽"} ${userClub.leagueName || "Primera División"} • J${Math.min(22, leagueRound)}/22
            </div>
            <div style="text-align:left; font-size:11px; color:var(--text-muted); margin-bottom:4px;">Confianza Directiva</div>
            ${renderMiniBar(boardConf, confColor)}
          </div>

          <nav class="fm-sidebar-nav">
            ${renderTabBtn("home", "🏟️ Centro del Club", activeTab, userClub.colors[0])}
            ${renderTabBtn("squad", "👕 Plantilla", activeTab, userClub.colors[0])}
            ${renderTabBtn("tactics", "📋 Pizarra Táctica", activeTab, userClub.colors[0])}
            ${renderTabBtn("staff", "🎓 Staff y Estadio", activeTab, userClub.colors[0])}
            ${renderTabBtn("transfers", "💼 Mercado Global", activeTab, userClub.colors[0])}
            ${renderTabBtn("inbox", "📩 Bandeja IA", activeTab, userClub.colors[0], unreadCount)}
            ${renderTabBtn("table", "🏆 Competiciones", activeTab, userClub.colors[0])}
          </nav>
        </div>

        <div style="display: grid; gap: 8px; padding-top: 14px; border-top: 1px solid var(--panel-border);">
          ${nextEvent ? `
            <button id="btn-sidebar-play" class="fm-btn fm-btn-play" style="padding: 12px 14px; font-size: 13.5px;">
              ⚽ Jugar Partido
            </button>
          ` : ""}
          <button id="btn-reset" class="fm-btn fm-btn-ghost" style="width: 100%; font-size: 12px;">
            Nueva Partida
          </button>
        </div>
      </aside>

      <main class="fm-workspace">
        <header class="fm-topbar">
          <div class="fm-kpi-group">
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
  `;

  bindEvents(state);
}

function updateLiveMatchDynamicParts(state) {
  const m = state.liveMatch;
  if (!m) return;
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

  let matchTitle = "Fin de Temporada";
  let matchCard = `<p><b>¡Temporada Finalizada!</b> Has completado los 22 partidos de Liga.</p>`;

  if (nextEvent) {
    const [hId, aId] = nextEvent.match;
    const home = state.clubs[hId];
    const away = state.clubs[aId];
    const isCup = nextEvent.compId === "cup_1";
    const isCont = nextEvent.compId === "cont_1";
    const isUserHome = hId === state.userClubId;
    const attInfo = calculateMatchAttendance(
      home,
      isUserHome ? (state.boardConfidence || 80) : 82,
      nextEvent.compId,
      isUserHome ? (state.staff?.stadium || 1) : 1
    );
    matchTitle = nextEvent.compName;

    matchCard = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        <div>
          ${isCont ? `<span style="display:inline-block; background:linear-gradient(90deg, #2563eb, #3b82f6); color:#fff; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🌍 COPA CONTINENTAL ÉLITE</span>` : ""}
          ${isCup ? `<span style="display:inline-block; background:linear-gradient(90deg, #d97706, #f59e0b); color:#000; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🏆 ELIMINATORIA DE COPA</span>` : ""}
        </div>
        <span style="font-size:11.5px; color:var(--text-muted); font-weight:700;">
          🏟️ ${attInfo.stadiumName} • <b style="color:#e2e8f0;">${attInfo.attendance.toLocaleString()}</b> esp. (${attInfo.fillPct}%)
        </span>
      </div>
      <div class="fm-match-box" style="display: flex; align-items: center; justify-content: space-around; gap: 12px;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          ${renderClubBadge(home, 44)}
          <b style="font-size: 14px;">${home.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">${home.flag || ""} OVR ${home.ovr}</span>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 13px; font-weight: 900; color: var(--text-muted); letter-spacing: 0.14em;">VS</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          ${renderClubBadge(away, 44)}
          <b style="font-size: 14px;">${away.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">${away.flag || ""} OVR ${away.ovr}</span>
        </div>
      </div>
      <button id="btn-play-match" data-comp="${nextEvent.compId}" class="fm-btn fm-btn-play">
        ⚽ Jugar Partido en Vivo
      </button>
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
          <b style="color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">${startersCount} / 11 jugadores ${startersCount === 11 ? '✓' : '⚠️'}</b>
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
    ${renderLeagueTableCard(state, "league_1")}
  `;
}

function renderSquadTab(state) {
  const squad = Object.values(state.players || {})
    .filter(p => p.clubId === state.userClubId)
    .sort((a, b) => (b.starter === a.starter ? b.ovr - a.ovr : b.starter ? 1 : -1));

  const startersCount = squad.filter(p => p.starter && !isPlayerUnavailable(p)).length;

  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="margin: 0;">Plantilla y Contratos (${squad.length} jugadores)</h3>
        <span style="padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; background: ${startersCount === 11 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}; border: 1px solid ${startersCount === 11 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}; color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">
          Titulares: ${startersCount} / 11 ${startersCount !== 11 ? '(Ajusta a 11 exactos)' : '✓'}
        </span>
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
              const attrs = getPlayerAttributes(p);
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
                    <b>${p.name}</b> ${p.isYouth ? `<span style="background:rgba(59,130,246,0.25); color:#60a5fa; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">CANTERA</span>` : ""} <small style="color: var(--text-muted);">(${p.age}a)</small>
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
                  <td style="color: ${contractColor}; font-weight: 700; white-space:nowrap;">${years} ${years === 1 ? 'año ⚠️' : 'años'}</td>
                  <td style="display: flex; gap: 6px; white-space:nowrap;">
                    ${years < 4 ? `
                      <button class="btn-renew-contract fm-btn fm-btn-primary" data-pid="${p.id}" style="padding: 5px 9px; font-size: 11px;">
                        ✍️ Renovar
                      </button>
                    ` : ""}
                    <button class="btn-sell-player fm-btn fm-btn-ghost" data-pid="${p.id}" style="padding: 5px 9px; font-size: 11px;">
                      Vender (${(sellVal / 1e6).toFixed(1)}M)
                    </button>
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

  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0;">🎓 Cantera y Promoción de Juveniles</h3>
        <span style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); padding:3px 10px; border-radius:8px; font-size: 12px; color: #60a5fa; font-weight: 800;">Academia Nvl ${staff.youth || 1}</span>
      </div>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 14px;">
        Otea y sube al primer equipo a la mejor promesa sub-18 de tu cantera esta temporada (Coste: 1.50 M€).
      </p>
      <button id="btn-promote-youth" class="fm-btn fm-btn-primary" ${youthPromotedThisSeason ? 'disabled style="background:#334155; opacity:0.5; cursor:not-allowed;"' : ''}>
        ${youthPromotedThisSeason ? '✓ Promesa de esta temporada ya promovida' : '🌟 Promover Juvenil al Primer Equipo (1.50 M€)'}
      </button>
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
        <h3 style="margin: 0;">Cuerpo Técnico e Infraestructura (🏟️ ${stadium.name}: ${stadium.capacity.toLocaleString()} localidades)</h3>
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
                    Nvl ${lvl} / ${item.maxLevel}
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
          ${outOfPosCount > 0 ? `<span style="color: #fbbf24; font-size: 12px; font-weight: 700;">⚠️ ${outOfPosCount} fuera de puesto</span>` : `<span style="color: var(--success); font-size: 12px; font-weight: 700;">✓ Roles cubiertos</span>`}
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
              🎽 2ª Equipación
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

  const marketPlayers = Object.values(state.players || {})
    .filter(p => {
      if (p.clubId === state.userClubId) return false;
      if (posFilter !== "ALL" && p.pos !== posFilter) return false;
      if (leagueFilter !== "ALL") {
        const clubLeague = state.clubs[p.clubId]?.leagueId;
        if (clubLeague !== leagueFilter) return false;
      }
      return true;
    })
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 30);

  return `
    <div class="fm-card">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px;">
        <h3 style="margin: 0;">Mercado Mundial — 4 Ligas (Descuento Ojeador: -${(scoutLvl - 1) * 6}%)</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button class="btn-filter-league fm-btn ${leagueFilter === 'ALL' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="ALL" style="padding: 5px 9px; font-size: 11px;">🌍 Todas</button>
          ${LEAGUES_CATALOG.map(l => `
            <button class="btn-filter-league fm-btn ${leagueFilter === l.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="${l.id}" style="padding: 5px 9px; font-size: 11px;">
              ${l.flag} ${l.country}
            </button>
          `).join("")}
        </div>
      </div>

      <div style="display: flex; gap: 6px; margin-bottom: 14px;">
        ${["ALL", "POR", "DEF", "MED", "DEL"].map(pos => `
          <button class="btn-filter-pos fm-btn ${posFilter === pos ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-pos="${pos}" style="padding: 5px 10px; font-size: 12px;">
            ${pos === "ALL" ? "Todas las Posiciones" : pos}
          </button>
        `).join("")}
      </div>

      <div style="overflow-x:auto;">
        <table class="fm-table">
          <thead>
            <tr>
              <th>Jugador y Atributos</th>
              <th>Club y Liga</th>
              <th>Pos</th>
              <th>Edad</th>
              <th>OVR</th>
              <th>Valor</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${marketPlayers.map(p => {
              const attrs = getPlayerAttributes(p);
              const val = calculateMarketValue(p, scoutLvl);
              const canAfford = state.budget >= val;
              const c = state.clubs[p.clubId];
              return `
                <tr>
                  <td>
                    <b>${p.name}</b>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display:flex; gap:8px;">
                      <span>RIT <b style="color:#e2e8f0;">${attrs.RIT}</b></span>
                      <span>TIR <b style="color:#e2e8f0;">${attrs.TIR}</b></span>
                      <span>PAS <b style="color:#e2e8f0;">${attrs.PAS}</b></span>
                      <span>DEF <b style="color:#e2e8f0;">${attrs.DEF}</b></span>
                    </div>
                  </td>
                  <td style="color: var(--text-muted);">${renderClubBadge(c, 20)} <b>${c?.name || "-"}</b> <small>(${c?.flag || ""})</small></td>
                  <td><span class="fm-badge-pos">${p.pos}</span></td>
                  <td>${p.age}</td>
                  <td>${renderOvrBadge(p.ovr)}</td>
                  <td><b>${(val / 1e6).toFixed(2)} M€</b></td>
                  <td>
                    <button class="btn-buy-player fm-btn ${canAfford ? 'fm-btn-primary' : ''}" data-pid="${p.id}" ${!canAfford ? 'disabled' : ''} style="padding: 6px 12px; font-size: 12px; ${!canAfford ? 'background: #334155; opacity: 0.5; cursor: not-allowed;' : ''}">
                      Fichar
                    </button>
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
            <p style="margin-bottom: 12px; color: #cbd5e1;">${m.body}</p>
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
  return `
    ${renderCupCard(state, "cont_1", "🌍")}
    ${renderCupCard(state, "cup_1", "🏆")}

    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
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
  `;
}

function renderTopScorersCard(state) {
  const topScorers = Object.values(state.players || {})
    .filter(p => (p.goals || 0) > 0)
    .sort((a, b) => b.goals - a.goals || b.ovr - a.ovr)
    .slice(0, 12);

  return `
    <div class="fm-card">
      <h3>⚽ Bota de Oro / Goleadores Globales</h3>
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
                  <td><b>${p.name}</b></td>
                  <td style="color: var(--text-muted);">${c?.flag || ""} ${c?.name || "-"}</td>
                  <td><b style="color: var(--success); font-size:14px;">${p.goals}</b></td>
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
          ${cup.championId ? `Campeón: ${state.clubs[cup.championId]?.name}` : cup.stageNames[cup.currentStage]}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        ${cup.rounds.map((matches, sIdx) => `
          <div style="background: rgba(6, 9, 19, 0.75); padding: 12px; border-radius: 10px; border: 1px solid var(--panel-border);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; font-weight: 800; text-transform: uppercase;">${cup.stageNames[sIdx]}</div>
            ${matches.map(([hId, aId]) => `
              <div style="font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="${hId === state.userClubId ? 'color: var(--success); font-weight:700;' : ''}">${state.clubs[hId]?.flag || ""} ${state.clubs[hId]?.name || hId}</span>
                <span style="color: var(--text-muted);"> vs </span>
                <span style="${aId === state.userClubId ? 'color: var(--success); font-weight:700;' : ''}">${state.clubs[aId]?.flag || ""} ${state.clubs[aId]?.name || aId}</span>
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

  const sorted = Object.entries(comp.standings)
    .map(([clubId, s]) => ({ clubId, club: state.clubs[clubId], name: state.clubs[clubId]?.name || clubId, ...s }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

  return `
    <div class="fm-card">
      <h3>Clasificación - ${comp.name}</h3>
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
                <td style="${i < 4 ? 'color: #60a5fa; font-weight: 800;' : ''}">${i + 1}</td>
                <td>${renderClubBadge(t.club, 20)} <b>${t.name}</b></td>
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
            <span id="live-minute-badge" style="display:inline-block; margin-top:4px; background: ${m.shootout ? '#3b82f6' : m.paused ? '#f59e0b' : '#ef4444'}; color:${m.paused ? '#000' : '#fff'}; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em;">
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
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 5px;">
            <span id="live-home-stats"><b style="color:#fff;">${homePossPct}%</b> Pos • <b style="color:#fff;">${m.stats?.homeShots || 0}</b> Tiros • <b style="color:#fff;">${m.stats?.homeFouls || 0}</b> Faltas</span>
            <span>Tu Táctica: <b style="color:#60a5fa;">${activeTactic}</b> | Rival: <b id="live-rival-tactic" style="color:#f59e0b;">${isUserHome ? m.awayTactic : m.homeTactic}</b></span>
            <span id="live-away-stats">Faltas <b style="color:#fff;">${m.stats?.awayFouls || 0}</b> • Tiros <b style="color:#fff;">${m.stats?.awayShots || 0}</b> • Pos <b style="color:#fff;">${awayPossPct}%</b></span>
          </div>
          <div style="width:100%; height:6px; background:${awayClub.colors[0]}; border-radius:99px; overflow:hidden; display:flex;">
            <div id="live-poss-bar-home" style="width:${homePossPct}%; height:100%; background:${homeClub.colors[0]}; transition: width 0.25s ease;"></div>
          </div>
        </div>

        ${!m.finished ? `
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; background: rgba(6,9,19,0.75); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--panel-border);">
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 11px; font-weight:700; color: var(--text-muted); text-transform:uppercase; margin-right: 4px;">Táctica:</span>
              <button type="button" class="btn-live-mentality fm-btn ${activeTactic === 'Defensivo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Defensivo" style="padding: 5px 10px; font-size: 12px;">🛡️ Defensivo</button>
              <button type="button" class="btn-live-mentality fm-btn ${activeTactic === 'Equilibrado' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Equilibrado" style="padding: 5px 10px; font-size: 12px;">⚖️ Equilibrado</button>
              <button type="button" class="btn-live-mentality fm-btn ${activeTactic === 'Ofensivo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Ofensivo" style="padding: 5px 10px; font-size: 12px;">🔥 Ofensivo</button>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" id="btn-toggle-audio" class="fm-btn fm-btn-ghost" style="padding: 5px 10px; font-size: 12px;">
                ${isAudioMuted() ? '🔇' : '🔊'}
              </button>
              <button type="button" id="btn-pause-match" class="fm-btn fm-btn-ghost" style="padding: 5px 12px; font-size: 12px;">
                ${m.paused ? '▶ Reanudar' : '⏸ Pausar / Cambios'}
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
                  ${userAgents.map((a, idx) => `<option value="${idx}" ${a.expelled ? 'disabled' : ''}>${a.expelled ? '🟥 EXPULSADO: ' : 'Sale: '}${a.name} (${a.posType} • Físico ${Math.round(a.stamina ?? 100)}%)</option>`).join("")}
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
  const clubs = Object.values(state.clubs || {}).filter(c => (c.leagueId || "esp_1") === selectedPreviewLeague);
  return `
    <div class="fm-container" style="max-width: 980px; margin-top: 16px;">
      <div class="fm-hero-header">
        <div style="display:inline-block; background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.45); color:#60a5fa; font-size:11px; font-weight:800; padding:4px 12px; border-radius:99px; letter-spacing:0.08em; margin-bottom:10px;">
          TEMPORADA 2026 • 4 LIGAS EUROPEAS • 48 CLUBES
        </div>
        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 8px;">
          ⚽ WORLD FOOTBALL MANAGER <span style="color: #3b82f6;">2026</span>
        </h1>
        <p style="color: var(--text-muted); max-width: 580px; margin: 0 auto 18px; font-size: 14px;">
          Elige tu liga y toma el mando de uno de los 48 clubes disponibles para conquistar tu campeonato doméstico, la Copa Nacional y la Copa Continental Élite.
        </p>

        <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:8px;">
          ${LEAGUES_CATALOG.map(l => `
            <button class="btn-preview-league fm-btn ${selectedPreviewLeague === l.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-lid="${l.id}" style="padding: 8px 16px; font-size: 13px;">
              ${l.flag} ${l.name}
            </button>
          `).join("")}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(275px, 1fr)); gap: 14px;">
        ${clubs.map(c => {
          const stadium = getClubStadium(c, 1);
          const tier = c.ovr >= 83 ? { label: "Favorito al Título", color: "#fde047" }
                     : c.ovr >= 79 ? { label: "Aspirante Europeo", color: "#38bdf8" }
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
    </div>
  `;
}

function bindEvents(state) {
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });

  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      store.update(["activeTab"], draft => { draft.activeTab = btn.dataset.tab; });
    });
  });

  const launchNextMatch = () => {
    const nextEvent = getNextUserEvent(state);
    if (nextEvent) {
      const userSquad = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
      const validStarters = userSquad.filter(p => p.starter && !isPlayerUnavailable(p)).length;
      if (validStarters !== 11) {
        alert(`Necesitas exactamente 11 titulares disponibles (tienes ${validStarters}). Ajusta tu plantilla antes de jugar.`);
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

  document.getElementById("btn-gen-event")?.addEventListener("click", () => {
    triggerPostMatchEvent();
  });

  document.getElementById("btn-promote-youth")?.addEventListener("click", () => {
    const res = promoteYouthProspect();
    if (!res.ok) alert(res.msg);
  });

  document.querySelectorAll(".btn-toggle-starter").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const p = store.get().players[pid];
      if (!p || isPlayerUnavailable(p)) return;
      store.update(["players"], draft => {
        draft.players[pid].starter = !draft.players[pid].starter;
      });
    });
  });

  document.querySelectorAll(".btn-renew-contract").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = renewPlayerContract(btn.dataset.pid);
      if (!res.ok) alert(res.msg);
    });
  });

  document.querySelectorAll(".btn-sell-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = sellPlayer(btn.dataset.pid);
      if (!res.ok) alert(res.msg);
    });
  });

  document.querySelectorAll(".btn-training-plan").forEach(btn => {
    btn.addEventListener("click", () => {
      setTrainingPlan(btn.dataset.plan);
    });
  });

  document.querySelectorAll(".btn-upgrade-staff").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = upgradeStaff(btn.dataset.key);
      if (!res.ok) alert(res.msg);
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
    });
  });

  document.querySelectorAll(".btn-kit-mode").forEach(btn => {
    btn.addEventListener("click", () => {
      const kit = btn.dataset.kit;
      store.update(["clubs"], draft => {
        draft.clubs[state.userClubId].kitMode = kit;
      });
    });
  });

  document.querySelectorAll(".btn-buy-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
      const res = buyPlayer(pid, false);
      if (!res.ok) {
        if (res.needsCounter) {
          if (confirm(`${res.msg}\n\n¿Deseas aceptar la contraoferta y ficharlo ahora?`)) {
            const retry = buyPlayer(pid, true);
            if (!retry.ok) alert(retry.msg);
          }
        } else {
          alert(res.msg);
        }
      }
    });
  });

  document.querySelectorAll(".btn-event-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      const evid = btn.dataset.evid;
      const idx = Number(btn.dataset.idx);
      if (btn.dataset.type === "transfer_offer") {
        respondToTransferOffer(evid, idx);
      } else {
        resolveInboxChoice(evid, idx);
      }
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
    });
  });
}

document.addEventListener("click", e => {
  const previewLeagueBtn = e.target.closest(".btn-preview-league");
  if (previewLeagueBtn) {
    selectedPreviewLeague = previewLeagueBtn.dataset.lid;
    render();
  }

  const selectBtn = e.target.closest(".btn-select-club");
  if (selectBtn) {
    const clubId = selectBtn.dataset.id;
    selectedStandingsView = "league_1";
    store.update(["userClubId", "budget", "competitions", "activeCompId"], draft => {
      draft.userClubId = clubId;
      draft.budget = draft.clubs[clubId]?.budget || 50000000;
      draft.competitions = initCompetitions(draft.clubs, clubId);
      draft.activeCompId = "league_1";
    });
  }

  const audioBtn = e.target.closest("#btn-toggle-audio");
  if (audioBtn) {
    const muted = toggleMute();
    audioBtn.textContent = muted ? "🔇" : "🔊";
  }

  const pauseBtn = e.target.closest("#btn-pause-match");
  if (pauseBtn) {
    togglePauseMatch();
  }

  const subBtn = e.target.closest("#btn-confirm-sub");
  if (subBtn) {
    const outIdx = Number(document.getElementById("sub-out-select")?.value);
    const inPid = document.getElementById("sub-in-select")?.value;
    const res = makeLiveSubstitution(outIdx, inPid);
    if (!res.ok) alert(res.msg);
  }

  const liveMentBtn = e.target.closest(".btn-live-mentality");
  if (liveMentBtn) {
    const tactic = liveMentBtn.dataset.tactic;
    const state = store.get();
    const isUserHome = state.liveMatch?.homeId === state.userClubId;
    setTactic(isUserHome, tactic);
  }

  const finishBtn = e.target.closest("#btn-finish-match");
  if (finishBtn) {
    const stateBefore = store.get();
    const m = stateBefore.liveMatch;
    if (m) {
      const compId = stateBefore.activeCompId || "league_1";
      const wasUserHome = m.homeId === stateBefore.userClubId;

      advanceMedicalRecovery();
      applyPostMatchMedicalAndCards(m);

      completeRoundWithUserResult(m.homeId, m.awayId, m.gh, m.ga, compId);
      recordMatchInCareer(m.gh, m.ga);
      processRoundProgression(wasUserHome);
      triggerPostMatchEvent();
      maybeGenerateIncomingOffer();

      const stateAfter = store.get();
      const league = stateAfter.competitions.league_1;
      if (league.currentRound >= league.schedule.length) {
        setTimeout(() => {
          alert(`¡Temporada ${stateAfter.season || 1} Finalizada! Avanzas a la siguiente temporada.`);
          advanceSeason();
        }, 300);
      }
    }
  }
});