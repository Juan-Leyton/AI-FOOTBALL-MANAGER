import { store } from "../core/state.js";
import { getNextUserEvent, completeRoundWithUserResult, initCompetitions } from "../engine/competitions.js";
import { startLiveMatch, drawPitch, togglePauseMatch, setTactic, makeLiveSubstitution, FORMATIONS } from "../engine/match-live.js";
import { calculateMarketValue, buyPlayer, sellPlayer } from "../engine/transfers.js";
import { triggerPostMatchEvent, resolveInboxChoice } from "../ai/director.js";
import { processRoundProgression, advanceSeason, renewPlayerContract } from "../engine/progression.js";
import { STAFF_CATALOG, getStaffUpgradeCost, upgradeStaff } from "../engine/staff.js";
import { renderClubBadge } from "./badges.js";

export function initUI() {
  const root = document.getElementById("view-root");
  if (!root) return;

  const s = store.get();
  if (s.clubs && (!s.competitions?.league_1?.schedule?.length)) {
    store.update(["competitions", "activeCompId"], draft => {
      draft.competitions = initCompetitions(draft.clubs);
      draft.activeCompId = "league_1";
    });
  }

  store.subscribe(render);
  render();
}

function render() {
  const state = store.get();
  const root = document.getElementById("view-root");
  if (!root) return;

  if (!state.userClubId) {
    root.innerHTML = renderClubSelection(state);
    return;
  }

  if (state.liveMatch) {
    root.innerHTML = renderLiveMatchView(state);
    const canvas = document.getElementById("pitch-canvas");
    drawPitch(canvas, state.liveMatch);
    return;
  }

  const userClub = state.clubs[state.userClubId];
  const activeTab = state.activeTab || "home";
  const unreadCount = (state.inbox || []).filter(m => !m.resolved && m.choices?.length > 0).length;
  const leagueRound = (state.competitions?.league_1?.currentRound || 0) + 1;

  root.innerHTML = `
    <div class="fm-container">
      <header class="fm-club-banner" style="background: linear-gradient(135deg, ${userClub.colors[0]}, #0f172a);">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${renderClubBadge(userClub, 48)}
          <div>
            <h2 style="font-size: 22px; margin-bottom: 4px;">${userClub.name}</h2>
            <small style="color: #cbd5e1;">Temporada ${state.season || 1} • Jornada ${Math.min(22, leagueRound)}/22 • Presupuesto: <b>${((state.budget || 0) / 1e6).toFixed(2)} M€</b></small>
          </div>
        </div>
        <button id="btn-reset" class="fm-btn fm-btn-ghost">Nueva Partida</button>
      </header>

      <nav class="fm-nav">
        ${renderTabBtn("home", "Inicio", activeTab, userClub.colors[0])}
        ${renderTabBtn("squad", "Plantilla", activeTab, userClub.colors[0])}
        ${renderTabBtn("tactics", "Tácticas", activeTab, userClub.colors[0])}
        ${renderTabBtn("staff", "Staff", activeTab, userClub.colors[0])}
        ${renderTabBtn("transfers", "Mercado Fichajes", activeTab, userClub.colors[0])}
        ${renderTabBtn("inbox", `Bandeja IA ${unreadCount > 0 ? `(${unreadCount})` : ""}`, activeTab, userClub.colors[0])}
        ${renderTabBtn("table", "Competiciones", activeTab, userClub.colors[0])}
      </nav>

      <div id="tab-content">
        ${activeTab === "home" ? renderHomeTab(state) : ""}
        ${activeTab === "squad" ? renderSquadTab(state) : ""}
        ${activeTab === "tactics" ? renderTacticsTab(state) : ""}
        ${activeTab === "staff" ? renderStaffTab(state) : ""}
        ${activeTab === "transfers" ? renderTransfersTab(state) : ""}
        ${activeTab === "inbox" ? renderInboxTab(state) : ""}
        ${activeTab === "table" ? renderCompetitionsTab(state) : ""}
      </div>
    </div>
  `;

  bindEvents(state);
}

function renderTabBtn(id, label, activeTab, color) {
  const isActive = id === activeTab;
  return `
    <button class="nav-tab ${isActive ? 'active' : ''}" data-tab="${id}" style="${isActive ? `background: ${color};` : ''}">
      ${label}
    </button>
  `;
}

function renderHomeTab(state) {
  const nextEvent = getNextUserEvent(state);
  const userPlayers = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
  const startersCount = userPlayers.filter(p => p.starter).length;
  const fin = state.lastFinanceReport;
  const trophies = state.trophies || [];

  let matchTitle = "Fin de Temporada";
  let matchCard = `<p><b>¡Temporada Finalizada!</b> Has completado los 22 partidos de Liga.</p>`;

  if (nextEvent) {
    const [hId, aId] = nextEvent.match;
    const home = state.clubs[hId];
    const away = state.clubs[aId];
    const isCup = nextEvent.compId === "cup_1";
    const isCont = nextEvent.compId === "cont_1";
    matchTitle = nextEvent.compName;

    matchCard = `
      ${isCont ? `<div style="display:inline-block; background:#3b82f6; color:#fff; font-weight:800; font-size:11px; padding:2px 8px; border-radius:4px; margin-bottom:10px;">🌍 COPA CONTINENTAL ÉLITE</div>` : ""}
      ${isCup ? `<div style="display:inline-block; background:#f59e0b; color:#000; font-weight:800; font-size:11px; padding:2px 8px; border-radius:4px; margin-bottom:10px;">🏆 ELIMINATORIA DE COPA</div>` : ""}
      <div class="fm-match-box" style="display: flex; align-items: center; justify-content: center; gap: 12px;">
        <span style="display: inline-flex; align-items: center; gap: 6px;">${renderClubBadge(home, 28)} <b>${home.name}</b></span>
        <span style="color: var(--text-muted);">vs</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;"><b>${away.name}</b> ${renderClubBadge(away, 28)}</span>
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
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--panel-border); font-size: 13px;">
            <div style="color: var(--text-muted); margin-bottom: 4px;">Balance Última Jornada:</div>
            <div style="display: flex; justify-content: space-between;">
              <span>Taquilla: <b style="color: var(--success);">+${(fin.ticketRevenue / 1e6).toFixed(2)}M</b></span>
              <span>Salarios: <b style="color: var(--danger);">-${(fin.weeklyWages / 1e6).toFixed(2)}M</b></span>
              <span>Neto: <b style="color: ${fin.netBalance >= 0 ? 'var(--success)' : 'var(--danger)'};">${fin.netBalance >= 0 ? '+' : ''}${(fin.netBalance / 1e6).toFixed(2)}M</b></span>
            </div>
          </div>
        ` : ""}
      </div>

      <div class="fm-card">
        <h3>Estado y Palmarés</h3>
        <p style="margin-bottom: 8px;">Presupuesto Fichajes: <b style="color: var(--success);">${((state.budget || 0) / 1e6).toFixed(2)} M€</b></p>
        <p style="margin-bottom: 8px;">Confianza Directiva: <b>${state.boardConfidence || 85}%</b></p>
        <p style="margin-bottom: 8px;">Alineación Titular: <b style="color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">${startersCount} / 11 jugadores</b></p>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--panel-border);">
          <small style="color: var(--text-muted); display: block; margin-bottom: 6px;">Sala de Trofeos (${trophies.length}):</small>
          ${trophies.length === 0 ? `<small style="color: #64748b;">Aún no has ganado trofeos oficiales.</small>` : `
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${trophies.map(t => `<span style="background: rgba(245,158,11,0.18); color: #fbbf24; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">🏆 ${t.title} (T${t.season})</span>`).join("")}
            </div>
          `}
        </div>
      </div>
    </div>
    ${renderLeagueTableCard(state)}
  `;
}

function renderSquadTab(state) {
  const squad = Object.values(state.players || {})
    .filter(p => p.clubId === state.userClubId)
    .sort((a, b) => (b.starter === a.starter ? b.ovr - a.ovr : b.starter ? 1 : -1));

  const startersCount = squad.filter(p => p.starter).length;

  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="margin: 0;">Plantilla y Contratos (${squad.length} jugadores)</h3>
        <span style="padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; background: ${startersCount === 11 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">
          Titulares: ${startersCount} / 11 ${startersCount !== 11 ? '(Ajusta a 11 exactos)' : '✓'}
        </span>
      </div>
      <table class="fm-table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Jugador</th>
            <th>Pos</th>
            <th>OVR</th>
            <th>Físico</th>
            <th>Contrato</th>
            <th>Gestión</th>
          </tr>
        </thead>
        <tbody>
          ${squad.map(p => {
            const stamColor = p.stamina > 70 ? 'var(--success)' : p.stamina > 45 ? '#f59e0b' : 'var(--danger)';
            const years = p.contractYears ?? 2;
            const contractColor = years <= 1 ? 'var(--danger)' : 'var(--text-muted)';
            const sellVal = Math.round(calculateMarketValue(p, 1) * 0.85);
            return `
              <tr class="${p.starter ? 'highlight-row' : ''}">
                <td>
                  <button class="btn-toggle-starter fm-btn" data-pid="${p.id}" style="padding: 4px 10px; font-size: 12px; background: ${p.starter ? 'var(--success)' : '#334155'};">
                    ${p.starter ? 'Titular' : 'Suplente'}
                  </button>
                </td>
                <td><b>${p.name}</b> <small style="color: var(--text-muted);">(${p.age}a)</small></td>
                <td><span class="fm-badge-pos">${p.pos}</span></td>
                <td><b>${p.ovr}</b></td>
                <td style="color: ${stamColor}; font-weight: 600;">${p.stamina}%</td>
                <td style="color: ${contractColor}; font-weight: 700;">${years} ${years === 1 ? 'año ⚠️' : 'años'}</td>
                <td style="display: flex; gap: 6px;">
                  ${years < 4 ? `
                    <button class="btn-renew-contract fm-btn fm-btn-primary" data-pid="${p.id}" style="padding: 4px 8px; font-size: 11px;">
                      ✍️ Renovar
                    </button>
                  ` : ""}
                  <button class="btn-sell-player fm-btn fm-btn-ghost" data-pid="${p.id}" style="padding: 4px 8px; font-size: 11px;">
                    Vender (${(sellVal / 1e6).toFixed(1)}M)
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStaffTab(state) {
  const staff = state.staff || { fitness: 1, scout: 1, youth: 1 };
  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0;">Cuerpo Técnico e Instalaciones</h3>
        <span>Presupuesto: <b style="color: var(--success);">${((state.budget || 0) / 1e6).toFixed(2)} M€</b></span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
        ${Object.values(STAFF_CATALOG).map(item => {
          const lvl = staff[item.key] || 1;
          const cost = getStaffUpgradeCost(item.key, lvl);
          const canAfford = cost && (state.budget || 0) >= cost;
          return `
            <div style="background: var(--bg-dark); border: 1px solid var(--panel-border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
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
  const t = club.tactics || { mentality: 50, tempo: 50, press: 50 };
  const formation = club.formation || "4-3-3";
  const starters = Object.values(state.players || {})
    .filter(p => p.clubId === state.userClubId && p.starter)
    .slice(0, 11);

  const coords = FORMATIONS[formation] || FORMATIONS["4-3-3"];

  return `
    <div class="fm-grid-2">
      <div class="fm-card">
        <h3>Pizarra Táctica (${formation})</h3>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          ${Object.keys(FORMATIONS).map(f => `
            <button class="btn-formation fm-btn ${f === formation ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-form="${f}">
              ${f}
            </button>
          `).join("")}
        </div>

        <div style="position: relative; width: 100%; height: 320px; background: linear-gradient(90deg, #1a6b1a 50%, #1e7a1e 50%); border: 2px solid rgba(255,255,255,0.4); border-radius: 10px; overflow: hidden;">
          <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.35);"></div>
          <div style="position: absolute; left: 50%; top: 50%; width: 70px; height: 70px; transform: translate(-50%, -50%); border: 2px solid rgba(255,255,255,0.35); border-radius: 50%;"></div>
          ${coords.map((slot, idx) => {
            const px = Array.isArray(slot) ? slot[0] : slot.x;
            const py = Array.isArray(slot) ? slot[1] : slot.y;
            const player = starters[idx];
            const label = player ? player.name.split(" ").pop() : (slot.pos || `Pos ${idx + 1}`);
            const ovr = player ? player.ovr : "--";
            return `
              <div style="position: absolute; left: ${Math.min(92, px * 170)}%; top: ${py * 100}%; transform: translate(-50%, -50%); text-align: center;">
                <div style="width: 30px; height: 30px; margin: 0 auto; border-radius: 50%; background: ${club.colors[0]}; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
                  ${ovr}
                </div>
                <div style="background: rgba(9,13,22,0.85); color: #fff; font-size: 10px; padding: 1px 5px; border-radius: 4px; margin-top: 2px; white-space: nowrap;">
                  ${label}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="fm-card">
        <h3>Instrucciones del Equipo</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 18px;">
          Define cómo se comporta tu bloque en el simulador en vivo.
        </p>
        <div style="display: grid; gap: 22px;">
          <div>
            <label style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Mentalidad (Defensiva ↔ Ofensiva)</span>
              <span style="color: var(--primary);">${t.mentality}%</span>
            </label>
            <input type="range" class="tactic-slider" data-key="mentality" min="10" max="95" value="${t.mentality}" style="width: 100%;">
          </div>
          <div>
            <label style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Ritmo de Circulación (Lento ↔ Vertiginoso)</span>
              <span style="color: var(--primary);">${t.tempo}%</span>
            </label>
            <input type="range" class="tactic-slider" data-key="tempo" min="10" max="95" value="${t.tempo}" style="width: 100%;">
          </div>
          <div>
            <label style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px;">
              <span>Intensidad de Presión (Bloque Bajo ↔ Presión Alta)</span>
              <span style="color: var(--primary);">${t.press}%</span>
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
  const marketPlayers = Object.values(state.players || {})
    .filter(p => p.clubId !== state.userClubId && (posFilter === "ALL" || p.pos === posFilter))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 25);

  return `
    <div class="fm-card">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px;">
        <h3 style="margin: 0;">Mercado Global (Descuento Ojeador: -${(scoutLvl - 1) * 6}%)</h3>
        <div style="display: flex; gap: 6px;">
          ${["ALL", "POR", "DEF", "MED", "DEL"].map(pos => `
            <button class="btn-filter-pos fm-btn ${posFilter === pos ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-pos="${pos}" style="padding: 5px 10px; font-size: 12px;">
              ${pos === "ALL" ? "Todos" : pos}
            </button>
          `).join("")}
        </div>
      </div>
      <table class="fm-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Club Actual</th>
            <th>Pos</th>
            <th>Edad</th>
            <th>OVR</th>
            <th>Valor</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${marketPlayers.map(p => {
            const val = calculateMarketValue(p, scoutLvl);
            const canAfford = state.budget >= val;
            const c = state.clubs[p.clubId];
            return `
              <tr>
                <td><b>${p.name}</b></td>
                <td style="color: var(--text-muted);">${renderClubBadge(c, 20)} ${c?.name || "-"}</td>
                <td><span class="fm-badge-pos">${p.pos}</span></td>
                <td>${p.age}</td>
                <td><b>${p.ovr}</b></td>
                <td>${(val / 1e6).toFixed(2)} M€</td>
                <td>
                  <button class="btn-buy-player fm-btn ${canAfford ? 'fm-btn-primary' : ''}" data-pid="${p.id}" ${!canAfford ? 'disabled' : ''} style="padding: 6px 12px; font-size: 13px; ${!canAfford ? 'background: #334155; opacity: 0.5; cursor: not-allowed;' : ''}">
                    Fichar
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
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
                  <button class="btn-event-choice fm-btn fm-btn-primary" data-evid="${m.id}" data-idx="${idx}" style="font-size: 13px;">
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
  return `
    ${renderCupCard(state, "cont_1", "🌍")}
    ${renderCupCard(state, "cup_1", "🏆")}
    <div class="fm-grid-2">
      <div>${renderLeagueTableCard(state)}</div>
      <div>${renderTopScorersCard(state)}</div>
    </div>
  `;
}

function renderTopScorersCard(state) {
  const topScorers = Object.values(state.players || {})
    .filter(p => (p.goals || 0) > 0)
    .sort((a, b) => b.goals - a.goals || b.ovr - a.ovr)
    .slice(0, 10);

  return `
    <div class="fm-card">
      <h3>⚽ Tabla de Goleadores (Pichichi)</h3>
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
            ${topScorers.map((p, i) => `
              <tr class="${p.clubId === state.userClubId ? 'highlight-row' : ''}">
                <td>${i + 1}</td>
                <td><b>${p.name}</b></td>
                <td style="color: var(--text-muted);">${state.clubs[p.clubId]?.name || "-"}</td>
                <td><b style="color: var(--success);">${p.goals}</b></td>
              </tr>
            `).join("")}
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
        <span style="font-size: 13px; color: #f59e0b; font-weight: 700;">
          ${cup.championId ? `Campeón: ${state.clubs[cup.championId]?.name}` : cup.stageNames[cup.currentStage]}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        ${cup.rounds.map((matches, sIdx) => `
          <div style="background: var(--bg-dark); padding: 12px; border-radius: 8px; border: 1px solid var(--panel-border);">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 700;">${cup.stageNames[sIdx]}</div>
            ${matches.map(([hId, aId]) => `
              <div style="font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <span style="${hId === state.userClubId ? 'color: var(--success); font-weight:700;' : ''}">${state.clubs[hId]?.name || hId}</span>
                <span style="color: var(--text-muted);"> vs </span>
                <span style="${aId === state.userClubId ? 'color: var(--success); font-weight:700;' : ''}">${state.clubs[aId]?.name || aId}</span>
              </div>
            `).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLeagueTableCard(state) {
  const comp = state.competitions?.league_1;
  if (!comp || !comp.standings) return "";

  const sorted = Object.entries(comp.standings)
    .map(([clubId, s]) => ({ clubId, club: state.clubs[clubId], name: state.clubs[clubId]?.name || clubId, ...s }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

  return `
    <div class="fm-card">
      <h3>Clasificación - ${comp.name} (Top 4 clasifica a Copa Continental)</h3>
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
              <td>${renderClubBadge(t.club, 20)} ${t.name}</td>
              <td>${t.pj}</td>
              <td>${t.w}</td>
              <td>${t.d}</td>
              <td>${t.l}</td>
              <td>${t.gf - t.ga}</td>
              <td><b>${t.pts}</b></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLiveMatchView(state) {
  const m = state.liveMatch;
  const isUserHome = m.homeId === state.userClubId;
  const activeTactic = isUserHome ? (m.homeTactic || "Equilibrado") : (m.awayTactic || "Equilibrado");
  const userAgents = isUserHome ? m.homeAgents : m.awayAgents;
  const onPitchIds = new Set(userAgents.map(a => a.playerId));
  const benchPlayers = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId && !onPitchIds.has(p.id));
  const homeClub = state.clubs[m.homeId];
  const awayClub = state.clubs[m.awayId];

  return `
    <div class="fm-container" style="max-width: 860px;">
      <div class="fm-card">
        <div style="display: flex; justify-content: space-between; align-items: center; background: #090d16; padding: 16px 24px; border-radius: 10px; margin-bottom: 14px; border: 1px solid var(--panel-border);">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: bold;">
            ${renderClubBadge(homeClub, 34)} ${m.homeName}
          </div>
          <div style="text-align: center;">
            <div style="font-size: 30px; font-weight: 800; letter-spacing: 2px;">${m.gh} - ${m.ga}</div>
            <span style="background: ${m.paused ? '#f59e0b' : 'var(--danger)'}; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: bold;">
              ${m.paused ? `PAUSADO (${m.minute}')` : `Min ${m.minute}'`}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: bold;">
            ${m.awayName} ${renderClubBadge(awayClub, 34)}
          </div>
        </div>

        ${!m.finished ? `
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; background: var(--bg-dark); padding: 10px; border-radius: 8px; border: 1px solid var(--panel-border);">
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 12px; color: var(--text-muted); margin-right: 4px;">Orden Táctica:</span>
              <button class="btn-live-mentality fm-btn ${activeTactic === 'Defensivo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Defensivo" style="padding: 5px 10px; font-size: 12px;">🛡️ Defensivo</button>
              <button class="btn-live-mentality fm-btn ${activeTactic === 'Equilibrado' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Equilibrado" style="padding: 5px 10px; font-size: 12px;">⚖️ Equilibrado</button>
              <button class="btn-live-mentality fm-btn ${activeTactic === 'Ofensivo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-tactic="Ofensivo" style="padding: 5px 10px; font-size: 12px;">🔥 Ofensivo</button>
            </div>
            <button id="btn-pause-match" class="fm-btn fm-btn-ghost" style="padding: 5px 12px; font-size: 12px;">
              ${m.paused ? '▶ Reanudar' : '⏸ Pausar / Cambios'}
            </button>
          </div>

          ${m.paused ? `
            <div style="background: #0f172a; border: 1px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
              <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #60a5fa;">
                🔄 Realizar Sustitución (${m.subsUsed || 0}/${m.maxSubs || 5} cambios usados)
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                <select id="sub-out-select" style="background: #1e293b; color: #fff; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--panel-border);">
                  ${userAgents.map((a, idx) => `<option value="${idx}">Sale: ${a.name} (${a.posType} • Físico ${Math.round(a.stamina ?? 100)}%)</option>`).join("")}
                </select>
                <select id="sub-in-select" style="background: #1e293b; color: #fff; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--panel-border);">
                  ${benchPlayers.map(p => `<option value="${p.id}">Entra: ${p.name} (${p.pos} • OVR ${p.ovr})</option>`).join("")}
                </select>
                <button id="btn-confirm-sub" class="fm-btn fm-btn-primary" style="padding: 6px 12px; font-size: 12px;">Confirmar Cambio</button>
              </div>
            </div>
          ` : ""}
        ` : ""}

        <div style="text-align: center; margin-bottom: 16px;">
          <canvas id="pitch-canvas" width="760" height="400" style="width: 100%; max-width: 760px; border-radius: 8px; border: 2px solid var(--panel-border);"></canvas>
        </div>

        <div class="fm-live-log">
          ${m.events.map(ev => `<div>${ev}</div>`).join("")}
        </div>

        ${m.finished ? `
          <button id="btn-finish-match" class="fm-btn fm-btn-primary" style="width: 100%; margin-top: 16px; padding: 14px; font-size: 16px;">
            Continuar y Actualizar Competición
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderClubSelection(state) {
  const clubs = Object.values(state.clubs || {}).filter(c => !c.id.startsWith("ext_"));
  return `
    <div class="fm-container" style="max-width: 680px; margin-top: 36px;">
      <div class="fm-card" style="text-align: center;">
        <h2 style="margin-bottom: 6px;">Elige tu Club (Primera División)</h2>
        <p style="color: var(--text-muted); margin-bottom: 20px;">Selecciona uno de los 12 equipos para iniciar tu carrera:</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
          ${clubs.map(c => `
            <button class="fm-club-option btn-select-club" data-id="${c.id}">
              <span style="display: inline-flex; align-items: center; gap: 8px;">${renderClubBadge(c, 26)} <b>${c.name}</b></span>
              <span style="color: var(--text-muted);">OVR: ${c.ovr} • ${(c.budget / 1e6).toFixed(0)} M€</span>
            </button>
          `).join("")}
        </div>
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

  document.getElementById("btn-play-match")?.addEventListener("click", () => {
    const nextEvent = getNextUserEvent(state);
    if (nextEvent) {
      store.update(["activeCompId"], draft => { draft.activeCompId = nextEvent.compId; });
      startLiveMatch(nextEvent.match[0], nextEvent.match[1]);
    }
  });

  document.getElementById("btn-gen-event")?.addEventListener("click", () => {
    triggerPostMatchEvent();
  });

  document.querySelectorAll(".btn-toggle-starter").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.pid;
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

  document.querySelectorAll(".btn-formation").forEach(btn => {
    btn.addEventListener("click", () => {
      const form = btn.dataset.form;
      store.update(["clubs"], draft => {
        draft.clubs[state.userClubId].formation = form;
      });
    });
  });

  document.querySelectorAll(".btn-buy-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = buyPlayer(btn.dataset.pid);
      if (!res.ok) alert(res.msg);
    });
  });

  document.querySelectorAll(".btn-event-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      resolveInboxChoice(btn.dataset.evid, Number(btn.dataset.idx));
    });
  });

  document.querySelectorAll(".tactic-slider").forEach(slider => {
    slider.addEventListener("change", () => {
      const key = slider.dataset.key;
      const val = Number(slider.value);
      store.update(["clubs"], draft => {
        draft.clubs[state.userClubId].tactics[key] = val;
      });
    });
  });
}

document.addEventListener("click", e => {
  const selectBtn = e.target.closest(".btn-select-club");
  if (selectBtn) {
    const clubId = selectBtn.dataset.id;
    store.update(["userClubId", "budget"], draft => {
      draft.userClubId = clubId;
      draft.budget = draft.clubs[clubId]?.budget || 50000000;
    });
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
      completeRoundWithUserResult(m.homeId, m.awayId, m.gh, m.ga, compId);
      processRoundProgression(wasUserHome);
      triggerPostMatchEvent();

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