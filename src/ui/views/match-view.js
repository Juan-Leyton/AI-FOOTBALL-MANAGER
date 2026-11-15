import { isPlayerUnavailable } from "../../engine/medical.js";
import { isAudioMuted } from "../../engine/audio.js";
import { calculateMatchAttendance } from "../../engine/stadium.js";
import { renderClubBadge } from "../badges.js";
import { checkAndTriggerLiveGoalBanner } from "../match-cinematics.js";
import { renderJerseySvg } from "../components/ui-helpers.js";

export function updateLiveMatchDynamicParts(state) {
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
    homeStatsEl.innerHTML = `<b style="color:#fff;">${homePossPct}%</b> Pos · <b style="color:#fff;">${m.stats?.homeShots || 0}</b> Tiros · <b style="color:#fff;">${m.stats?.homeFouls || 0}</b> Faltas`;
  }

  const awayStatsEl = document.getElementById("live-away-stats");
  if (awayStatsEl) {
    awayStatsEl.innerHTML = `Faltas <b style="color:#fff;">${m.stats?.awayFouls || 0}</b> · Tiros <b style="color:#fff;">${m.stats?.awayShots || 0}</b> · Pos <b style="color:#fff;">${awayPossPct}%</b>`;
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

export function renderLiveMatchView(state) {
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
        <div style="display: flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--text-muted); margin-bottom:8px; padding:0 4px;">
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
          <div style="display: flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:5px;">
            <span id="live-home-stats"><b style="color:#fff;">${homePossPct}%</b> Pos · <b style="color:#fff;">${m.stats?.homeShots || 0}</b> Tiros · <b style="color:#fff;">${m.stats?.homeFouls || 0}</b> Faltas</span>
            <span>Tu Táctica: <b style="color:#60a5fa;">${activeTactic}</b> · Rival: <b id="live-rival-tactic" style="color:#f59e0b;">${isUserHome ? m.awayTactic : m.homeTactic}</b></span>
            <span id="live-away-stats">Faltas <b style="color:#fff;">${m.stats?.awayFouls || 0}</b> · Tiros <b style="color:#fff;">${m.stats?.awayShots || 0}</b> · Pos <b style="color:#fff;">${awayPossPct}%</b></span>
          </div>
          <div style="width:100%; height:6px; background:${awayClub.colors[0]}; border-radius:99px; overflow:hidden; display: flex;">
            <div id="live-poss-bar-home" style="width:${homePossPct}%; height: 100%; background:${homeClub.colors[0]}; transition:width 0.25s ease;"></div>
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
                  ${userAgents.map((a, idx) => `<option value="${idx}" ${a.expelled ? 'disabled' : ''}>${a.expelled ? '🟥 EXPULSADO: ' : 'Sale: '}${a.name} (${a.posType} · ${Math.round(a.stamina ?? 100)}% Físico)</option>`).join("")}
                </select>
                <select id="sub-in-select" style="background: #1e293b; color: #fff; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--panel-border);">
                  ${benchPlayers.map(p => `<option value="${p.id}">Entra: ${p.name} (${p.pos} · OVR ${p.ovr})</option>`).join("")}
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
