/**
 * src/ui/views/manager-tabs.js - Pestañas operativas del mánager
 */

import { getNextUserEvent, getClubLeagueObj } from "../../engine/competitions.js";
import { FORMATIONS, assignPlayersToSlots } from "../../engine/match-live.js";
import { calculateMarketValue } from "../../engine/transfers.js";
import { SCOUTING_REGIONS } from "../../engine/youth-scouting.js";
import { getFreeAgentSignBonus } from "../../engine/player-development.js";
import { MANAGER_PERKS } from "../../engine/career-hooks.js";
import { STAFF_CATALOG, getStaffUpgradeCost } from "../../engine/staff.js";
import { TRAINING_PLANS } from "../../engine/training.js";
import { getPlayerAttributes } from "../../engine/academy.js";
import { getClubStadium, calculateMatchAttendance } from "../../engine/stadium.js";
import { isPlayerUnavailable, getPlayerStatusBadge } from "../../engine/medical.js";
import { LEAGUES_CATALOG } from "../../data/world-database.js";
import { renderClubBadge } from "../badges.js";
import { renderOvrBadge, renderJerseySvg, renderMiniBar } from "../components/ui-helpers.js";
import { renderLeagueTableCard } from "./competitions-view.js";

export function renderHomeTab(state) {
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
      <div style="background:rgba(59,130,246,0.14); border:1px solid rgba(59,130,246,0.4); border-radius:12px; padding: 16px; text-align:center;">
        <div style="font-size:22px; margin-bottom:6px;">⏳</div>
        <b style="display:block; font-size:15px; margin-bottom: 6px;">Ya disputaste tu partido de esta jornada</b>
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
      <div style="display: flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom: 10px;">
        <div style="display: flex; flex-wrap:wrap; gap:6px;">
          ${isPvpDuel ? `<span style="display:inline-block; background: linear-gradient(90deg, #ef4444, #f97316); color:#fff; font-weight:900; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🔥 DUELO PvP: ${homeMgr.name} vs ${awayMgr.name}</span>` : ""}
          ${isCont ? `<span style="display:inline-block; background: linear-gradient(90deg, #2563eb, #3b82f6); color:#fff; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🌍 COPA CONTINENTAL ÉLITE</span>` : ""}
          ${isCup ? `<span style="display:inline-block; background: linear-gradient(90deg, #d97706, #f59e0b); color:#000; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; letter-spacing:0.04em;">🏆 ELIMINATORIA DE COPA</span>` : ""}
        </div>
        <span style="font-size: 11.5px; color:var(--text-muted); font-weight:700;">
          🏟️ ${attInfo.stadiumName} · <b style="color:#e2e8f0;">${attInfo.attendance.toLocaleString()}</b> esp. (${attInfo.fillPct}%)
        </span>
      </div>
      <div class="fm-match-box" style="display: flex; align-items: center; justify-content: space-around; gap: 12px;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          ${renderClubBadge(home, 44)}
          <b style="font-size: 14px;">${home.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">${homeMgr ? `👤 ${homeMgr.name}` : `${home.flag || ""} OVR ${home.ovr}`}</span>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 13px; font-weight: 900; color: var(--text-muted); letter-spacing: 0.14em;">VS</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;">
          ${renderClubBadge(away, 44)}
          <b style="font-size: 14px;">${away.name}</b>
          <span style="font-size: 11px; color: var(--text-muted);">${awayMgr ? `👤 ${awayMgr.name}` : `${away.flag || ""} OVR ${away.ovr}`}</span>
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
        <div style="display: flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:6px;">
          <span>Titulares Disponibles:</span>
          <div style="display: flex; align-items:center; gap:8px;">
            <b style="color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">${startersCount} / 11 ${startersCount === 11 ? '' : '⚠️'}</b>
            ${startersCount !== 11 ? `<button class="btn-auto-best-xi fm-btn fm-btn-primary" style="padding:3px 8px; font-size: 11px;">⚡ Mejor XI</button>` : ""}
          </div>
        </div>
        <div style="display: flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:8px;">
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
              <div style="background:rgba(6,9,19,0.75); border:1px solid ${obj.completed ? 'rgba(16,185,129,0.45)' : 'var(--panel-border)'}; border-radius: 11px; padding:11px 13px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>
                  <div style="font-size: 13px; font-weight:800; color:${obj.completed ? '#34d399' : '#f8fafc'};">
                    ${obj.completed ? '✅ ' : ''}${obj.title}
                  </div>
                  <small style="color:var(--text-muted);">Recompensa: <b style="color:#34d399;">+${(obj.rewardCash / 1e6).toFixed(1)}M€</b> • <b style="color:#60a5fa;">+${obj.rewardXp} XP</b></small>
                </div>
                <span style="font-size: 11.5px; font-weight:800; padding:4px 9px; border-radius:7px; background:${obj.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.9)'}; color:${obj.completed ? '#34d399' : '#cbd5e1'}; white-space:nowrap;">
                  ${obj.completed ? 'Cumplido' : progText}
                </span>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="fm-card">
        <div style="display: flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0;">🎖️ Perks de Mánager (Nivel ${mp.level})</h3>
          <span style="background:${(mp.skillPoints || 0) > 0 ? 'rgba(250, 204, 21, 0.22)' : 'rgba(30, 41, 59, 0.85)'}; color:${(mp.skillPoints || 0) > 0 ? '#fde047' : 'var(--text-muted)'}; border:1px solid ${(mp.skillPoints || 0) > 0 ? 'rgba(250,204,21,0.5)' : 'var(--panel-border)'}; padding:3px 10px; border-radius:99px; font-size:11.5px; font-weight:800;">
            ${mp.skillPoints || 0} Puntos disp.
          </span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:9px;">
          ${Object.values(MANAGER_PERKS).map(pk => {
            const cur = mp.perks?.[pk.key] || 0;
            const canUnlock = (mp.skillPoints || 0) > 0 && cur < pk.maxLevel;
            return `
              <div style="background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:10px; padding: 10px; display: flex; flex-direction:column; justify-content:space-between; gap:7px;">
                <div>
                  <div style="display: flex; justify-content:space-between; font-size:12.5px; font-weight:800;">
                    <span>${pk.name}</span>
                    <span style="color:#60a5fa;">${cur}/${pk.maxLevel}</span>
                  </div>
                  <small style="color:var(--text-muted); font-size: 11px; line-height:1.35; display:block; margin-top:3px;">${pk.desc}</small>
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

export function renderSquadTab(state) {
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
        <div style="display: flex; align-items:center; gap:8px;">
          <button class="btn-auto-best-xi fm-btn fm-btn-primary" style="padding: 6px 12px; font-size: 12px;">
            ⚡ Mejor XI Disponible
          </button>
          <span style="padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; background: ${startersCount === 11 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}; border: 1px solid ${startersCount === 11 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}; color: ${startersCount === 11 ? 'var(--success)' : 'var(--danger)'};">
            Titulares: ${startersCount} / 11 ${startersCount === 11 ? '' : '⚠️'}
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
                    <span class="btn-inspect-player" data-pid="${p.id}" style="cursor: pointer; font-weight: 800; text-decoration: underline; text-decoration-color: rgba(96,165,250,0.5);">${p.name}</span>
                    ${p.isCustomLegend ? `<span style="background:rgba(250,204,21,0.22); color:#fde047; font-size: 10px; padding:1px 6px; border-radius:4px; font-weight:800;">★ LEYENDA</span>` : p.isRegen ? `<span style="background:rgba(16,185,129,0.22); color:#34d399; font-size: 10px; padding:1px 6px; border-radius:4px; font-weight:800;">REGEN</span>` : p.isYouth ? `<span style="background:rgba(59,130,246,0.25); color:#60a5fa; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:800;">CANTERA</span>` : ""}
                    ${p.isLoaned ? `<span style="background:rgba(168,85,247,0.25); color:#d8b4fe; font-size: 10px; padding:1px 6px; border-radius:4px; font-weight:800;">CEDIDO</span>` : ""}
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
                  <td style="color: ${contractColor}; font-weight: 700; white-space: nowrap;">
                    ${p.isLoaned ? "Cesión 1a" : `${years} ${years === 1 ? "año ⚠️" : "años"}`}
                  </td>
                  <td style="display: flex; gap: 6px; white-space:nowrap;">
                    ${!p.isLoaned && years < 4 ? `
                      <button class="btn-renew-contract fm-btn fm-btn-primary" data-pid="${p.id}" style="padding: 5px 9px; font-size: 11px;">
                        ✓ Renovar
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

export function renderStaffTab(state) {
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
        <span style="background:rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4); padding:4px 10px; border-radius:8px; font-size:12px; color:#60a5fa; font-weight:800;">
          Academia Nvl ${staff.youth || 1}
        </span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:8px; margin-bottom:16px;">
        ${SCOUTING_REGIONS.map(reg => `
          <button class="btn-scout-region fm-btn fm-btn-ghost" data-region="${reg.id}" style="text-align: left; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; border-color:${state.lastScoutRegion === reg.id ? '#3b82f6' : 'var(--panel-border)'};">
            <div style="display: flex; justify-content:space-between; width: 100%; font-weight:800; font-size:13px;">
              <span>${reg.flag} ${reg.name}</span>
              <span style="color:#34d399;">${(reg.cost / 1e6).toFixed(2)}M</span>
            </div>
            <small style="color:var(--text-muted); font-size:11px;">${reg.specialty}</small>
          </button>
        `).join("")}
      </div>

      ${youthReports.length > 0 ? `
        <div style="background:rgba(6,9,19,0.72); border:1px solid rgba(59,130,246,0.35); border-radius:12px; padding: 12px; margin-bottom:14px;">
          <div style="font-size: 11.5px; font-weight:800; color:#60a5fa; text-transform:uppercase; margin-bottom:10px;">📋 Informe Actual de Ojeadores (Fichar para Academia)</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
            ${youthReports.map(rep => `
              <div style="background:rgba(15,23,42,0.9); border:1px solid var(--panel-border); border-radius:10px; padding:10px; display: flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                  <div style="display: flex; justify-content:space-between; align-items:center;">
                    <b>${rep.countryFlag} ${rep.name}</b>
                    <span class="fm-badge-pos">${rep.pos}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                    ${rep.age} años · OVR <b style="color:#fff;">${rep.ovr}</b> • POT <b style="color:#fde047;">${rep.potMin}-${rep.potMax}</b>
                  </div>
                </div>
                <button class="btn-sign-academy fm-btn fm-btn-primary" data-repid="${rep.id}" style="width:100%; padding:6px 10px; font-size:11.5px;">
                  Fichar Beca (${(rep.signFee / 1e6).toFixed(2)} M€)
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      ${youthAcademy.length > 0 ? `
        <div style="background:rgba(6,9,19,0.72); border:1px solid rgba(16,185,129,0.35); border-radius:12px; padding: 12px; margin-bottom:12px;">
          <div style="font-size: 11.5px; font-weight:800; color:#34d399; text-transform:uppercase; margin-bottom: 10px;">🎓 Plantilla Juvenil Sub-18 en Formación</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
            ${youthAcademy.map(ac => `
              <div style="background:rgba(15,23,42,0.9); border:1px solid var(--panel-border); border-radius: 10px; padding:10px;">
                <div style="display: flex; justify-content:space-between; align-items:center;">
                  <b>${ac.countryFlag} ${ac.name}</b>
                  <span class="fm-badge-pos">${ac.pos}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin:5px 0 9px;">
                  ${ac.age} años · OVR <b style="color:#fff;">${ac.ovr}</b> · POT <b style="color:#34d399;">${ac.potMin}-${ac.potMax}</b>
                </div>
                <div style="display: flex; gap:6px;">
                  <button class="btn-promote-academy-player fm-btn fm-btn-primary" data-acid="${ac.id}" style="flex: 1; padding:5px 8px; font-size:11px;">
                    ↑ Subir al 1er Equipo
                  </button>
                  <button class="btn-release-academy-player fm-btn fm-btn-ghost" data-acid="${ac.id}" style="padding:5px 8px; font-size:11px; color:#fca5a5;">
                    ×
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div style="padding-top:10px; border-top: 1px solid var(--panel-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12px; color:var(--text-muted);">Promoción directa rápida de cantera local (1 por temporada):</span>
        <button id="btn-promote-youth" class="fm-btn fm-btn-ghost" ${youthPromotedThisSeason ? 'disabled style="opacity:0.45; cursor:not-allowed;"' : ""} style="font-size:12px; padding:6px 12px;">
          ${youthPromotedThisSeason ? '✓ Promoción directa usada esta temporada' : '⚡ Promoción Directa Rápida (1.50 M€)'}
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

export function renderTacticsTab(state) {
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
          <div style="display: flex; align-items:center; gap:8px;">
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
              1ª Equipación
            </button>
            <button class="btn-kit-mode fm-btn ${kitMode === 'away' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-kit="away" style="padding: 4px 10px; font-size: 11px;">
              2ª Equipación
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

export function renderTransfersTab(state) {
  const scoutLvl = state.staff?.scout || 1;
  const posFilter = state.marketPosFilter || "ALL";
  const leagueFilter = state.marketLeagueFilter || "ALL";
  const ageFilter = state.marketAgeFilter || "ALL";
  const minOvrFilter = Number(state.marketMinOvr || 0);
  const searchQuery = (state.marketSearchQuery || "").trim();
  const queryLower = searchQuery.toLowerCase();

  const allExternal = Object.values(state.players || {}).filter(
    p => p.clubId !== state.userClubId && p.clubId !== "legend_vault"
  );
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
          <small style="color: var(--text-muted);">Descuento Ojeador Nvl ${scoutLvl}: <b>-${(scoutLvl - 1) * 6}%</b> · Haz clic en un jugador para abrir su ficha</small>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button class="btn-filter-league fm-btn ${leagueFilter === 'ALL' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="ALL" style="padding: 5px 9px; font-size: 11px;">Todas</button>
          <button class="btn-filter-league fm-btn ${leagueFilter === 'FREE' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-league="FREE" style="padding: 5px 9px; font-size: 11px; border-color:rgba(16,185,129,0.5); color:#34d399;">🆓 Libres</button>
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
          <select id="market-age-select" style="width: 100%; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; font-size:12.5px;">
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
                    <span class="btn-inspect-player" data-pid="${p.id}" style="cursor: pointer; font-weight: 800; text-decoration: underline; text-decoration-color: rgba(96,165,250,0.5);">${p.name}</span>
                    ${p.isCustomLegend ? `<span style="background:rgba(250,204,21,0.22); color:#fde047; font-size: 10px; padding:1px 6px; border-radius: 4px; font-weight:800; margin-left:4px;">★ LEYENDA</span>` : p.isRegen ? `<span style="background:rgba(16,185,129,0.22); color:#34d399; font-size: 10px; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">REGEN</span>` : ""}
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; gap:8px;">
                      <span>RIT <b style="color:#e2e8f0;">${attrs.RIT}</b></span>
                      <span>TIR <b style="color:#e2e8f0;">${attrs.TIR}</b></span>
                      <span>PAS <b style="color:#e2e8f0;">${attrs.PAS}</b></span>
                      <span>DEF <b style="color:#e2e8f0;">${attrs.DEF}</b></span>
                    </div>
                  </td>
                  <td style="color: var(--text-muted);">
                    ${isFree
                      ? `<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">🆓 Agente Libre</span>`
                      : `${renderClubBadge(c, 20)} <b>${c?.name || "-"}</b> ${friendOwner ? `<span style="background:rgba(249,115,22,0.22); color:#fdba74; font-size: 10px; padding:1px 6px; border-radius:4px; font-weight:800;">👤 ${friendOwner.name}</span>` : `<small>(${c?.flag || ""})</small>`}`}
                  </td>
                  <td><span class="fm-badge-pos">${p.pos}</span></td>
                  <td>${p.age}a</td>
                  <td>${renderOvrBadge(p.ovr)}</td>
                  <td><b>${(val / 1e6).toFixed(2)} M€</b> ${isFree ? `<small style="color:#34d399; display:block; font-size: 10px;">Prima firma</small>` : ""}</td>
                  <td>
                    ${isFree ? `
                      <button class="btn-sign-free-agent fm-btn ${canBuy ? 'fm-btn-primary' : ''}" data-pid="${p.id}" ${!canBuy ? 'disabled' : ''} style="padding: 5px 11px; font-size: 11px; ${!canBuy ? 'background:#334155; opacity:0.45; cursor:not-allowed;' : ''}">
                        🆓 Fichar Libre
                      </button>
                    ` : `
                      <div style="display: flex; flex-wrap:wrap; gap:5px;">
                        <button class="btn-buy-player fm-btn ${canBuy ? 'fm-btn-primary' : ''}" data-pid="${p.id}" ${!canBuy ? 'disabled' : ''} title="Compra inmediata" style="padding: 5px 9px; font-size: 11px; ${!canBuy ? 'background:#334155; opacity:0.45; cursor:not-allowed;' : ''}">
                          Fichar
                        </button>
                        <button class="btn-lowball-player fm-btn fm-btn-ghost" data-pid="${p.id}" ${!canLow ? 'disabled' : ''} title="Oferta a la baja (-18%)" style="padding: 5px 8px; font-size: 11px; border-color: rgba(245, 158, 11, 0.45); color: #fde047; ${!canLow ? 'opacity:0.4; cursor:not-allowed;' : ''}">
                          ${(lowVal / 1e6).toFixed(1)}M
                        </button>
                        <button class="btn-loan-player fm-btn fm-btn-ghost" data-pid="${p.id}" ${!canLoan ? 'disabled' : ''} title="Cesión 1 temporada (25%)" style="padding: 5px 8px; font-size: 11px; border-color: rgba(168,85,247,0.45); color: #d8b4fe; ${!canLoan ? 'opacity:0.4; cursor:not-allowed;' : ''}">
                          Ceder (${(loanVal / 1e6).toFixed(1)}M)
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

export function renderInboxTab(state) {
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