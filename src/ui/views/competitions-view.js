import { getClubLeagueObj } from "../../engine/competitions.js";
import { renderClubBadge } from "../badges.js";

export function renderLeagueTableCard(state, leagueKey = "league_1") {
  const comp = leagueKey === "league_1"
    ? state.competitions?.league_1
    : state.competitions?.otherLeagues?.[leagueKey] || state.competitions?.league_1;
  if (!comp || !comp.standings) return "";

  const humanMap = {};
  (state.mpManagers || []).forEach(m => { humanMap[m.clubId] = m.name; });

  const sorted = Object.entries(comp.standings)
    .map(([clubId, s]) => ({ clubId, club: state.clubs[clubId], name: state.clubs[clubId]?.name || clubId, ...s }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));

  const isTier2 = (comp.tier ?? 1) === 2;
  const totalTeams = sorted.length;

  return `
    <div class="fm-card">
      <div style="display: flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        <h3 style="margin:0;">Clasificación - ${comp.name}</h3>
        <span style="font-size: 11px; color:#60a5fa; font-weight:700;">
          ${isTier2 ? "1º-2º Ascenso Directo · 3º-6º Playoff" : "1º-2º Élite · 3º-4º Challenge · Últ. 3 Descenso"}
        </span>
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
            ${sorted.map((t, i) => {
              let rankStyle = "";
              if (isTier2) {
                if (i < 2) rankStyle = "color: #34d399; font-weight: 900;";
                else if (i < 6) rankStyle = "color: #fbbf24; font-weight: 800;";
              } else {
                if (i < 2) rankStyle = "color: #34d399; font-weight: 900;";
                else if (i < 4) rankStyle = "color: #60a5fa; font-weight: 800;";
                else if (comp.childLeagueId && i >= totalTeams - 3) rankStyle = "color: #f87171; font-weight: 800;";
              }
              return `
                <tr class="${t.clubId === state.userClubId ? 'highlight-row' : ''}">
                  <td style="${rankStyle}">${i + 1}</td>
                  <td>
                    ${renderClubBadge(t.club, 20)} <b>${t.name}</b>
                    ${humanMap[t.clubId] ? `<span style="background:rgba(59,130,246,0.22); color:#93c5fd; font-size: 10px; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">👤 ${humanMap[t.clubId]}</span>` : ""}
                  </td>
                  <td>${t.pj}</td>
                  <td>${t.w}</td>
                  <td>${t.d}</td>
                  <td>${t.l}</td>
                  <td>${t.gf - t.ga}</td>
                  <td><b style="font-size:14px;">${t.pts}</b></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderTopScorersCard(state) {
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
                  <td><span class="btn-inspect-player" data-pid="${p.id}" style="cursor: pointer; font-weight: 800; text-decoration: underline; text-decoration-color: rgba(96,165,250,0.5);">${p.name}</span></td>
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

export function renderCupCard(state, compKey, icon) {
  const cup = state.competitions?.[compKey];
  if (!cup) return "";

  const statusLabel = cup.championId
    ? `🏆 Campeón: ${state.clubs[cup.championId]?.name}`
    : cup.phase === "groups"
    ? `Fase de Grupos · Fecha ${Math.min(6, (cup.groupRound || 0) + 1)}/6`
    : cup.stageNames?.[cup.currentStage] || "En curso";

  return `
    <div class="fm-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap:wrap; gap:8px;">
        <h3 style="margin: 0;">${icon} ${cup.name}</h3>
        <span style="font-size: 13px; color: #f59e0b; font-weight: 800;">${statusLabel}</span>
      </div>

      ${cup.groups?.length ? `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-bottom: ${cup.rounds?.length ? '14px' : '0'};">
          ${cup.groups.map(grp => {
            const gSorted = Object.entries(grp.standings || {})
              .map(([cid, st]) => ({ cid, ...st }))
              .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
            return `
              <div style="background: rgba(6, 9, 19, 0.78); padding: 10px; border-radius: 10px; border: 1px solid var(--panel-border);">
                <div style="font-size: 11px; color: #60a5fa; margin-bottom: 6px; font-weight: 800; text-transform: uppercase;">${grp.name}</div>
                ${gSorted.map((row, idx) => `
                  <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); ${row.cid === state.userClubId ? 'color:var(--success); font-weight:800;' : ''}">
                    <span><b style="color:${idx < 2 ? '#34d399' : '#94a3b8'};">${idx + 1}.</b> ${state.clubs[row.cid]?.flag || ""} ${state.clubs[row.cid]?.name || row.cid}</span>
                    <span><b>${row.pts}</b> pts <span style="color:var(--text-muted);">(${row.pj}j)</span></span>
                  </div>
                `).join("")}
              </div>
            `;
          }).join("")}
        </div>
      ` : ""}

      ${cup.rounds?.length ? `
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
      ` : ""}
    </div>
  `;
}

export function renderCompetitionsTab(state, selectedStandingsView = "league_1") {
  const otherLeagues = Object.values(state.competitions?.otherLeagues || {});
  const hallOfFame = state.hallOfFame || [];
  const mpManagers = state.mpManagers || [];
  const coeffs = Object.values(state.competitions?.leagueCoefficients || {}).sort((a, b) => b.pts - a.pts);

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
    ${renderCupCard(state, "cont_challenge", "🛡️")}
    ${renderCupCard(state, "cont_2", "🌎")}

    ${state.competitions?.clubWorldCup ? `
      <div class="fm-card" style="background: linear-gradient(135deg, rgba(234,179,8,0.18), rgba(15,23,42,0.95)); border: 1px solid rgba(250,204,21,0.45);">
        <div style="display: flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <h3 style="margin:0; color:#fde047;">🏆 Mundial de Clubes FIFA (Final Four)</h3>
          <span style="font-size:13px; font-weight:900; color:#34d399;">
            Campeón Mundial: ${state.clubs[state.competitions.clubWorldCup.winnerId]?.name || "-"}
          </span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-bottom:8px;">
          ${(state.competitions.clubWorldCup.semis || []).map((s, idx) => `
            <div style="font-size:12px; padding:8px; background:rgba(6,9,19,0.7); border-radius:8px;">
              <div style="color:#94a3b8; font-weight:800; margin-bottom:4px;">SEMIFINAL ${idx + 1}</div>
              <b>${state.clubs[s.homeId]?.name || s.homeId}</b> <span style="color:#fde047;">${s.gh} - ${s.ga}</span> <b>${state.clubs[s.awayId]?.name || s.awayId}</b>
            </div>
          `).join("")}
        </div>
        <div style="font-size: 15px; font-weight:800; text-align:center; padding:10px; background:rgba(6,9,19,0.85); border-radius:10px; border:1px solid rgba(250,204,21,0.3);">
          GRAN FINAL: ${state.clubs[state.competitions.clubWorldCup.final.homeId]?.flag || ""} ${state.clubs[state.competitions.clubWorldCup.final.homeId]?.name || ""}
          <span style="color:#fde047; margin:0 12px;">${state.competitions.clubWorldCup.final.gh} - ${state.competitions.clubWorldCup.final.ga}</span>
          ${state.clubs[state.competitions.clubWorldCup.final.awayId]?.name || ""} ${state.clubs[state.competitions.clubWorldCup.final.awayId]?.flag || ""}
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

    ${coeffs.length > 0 ? `
      <div class="fm-card">
        <h3>📊 Coeficiente Mundial de Ligas (Prestigio Internacional)</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px;">
          ${coeffs.map((c, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(6,9,19,0.7); border-radius:8px; border:1px solid var(--panel-border); font-size:12px;">
              <span><b style="color:#38bdf8;">#${idx + 1}</b> ${c.name}</span>
              <b style="color:#34d399;">${c.pts} pts</b>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

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
                  <td><span style="color:${h.leaguePos === 1 ? '#fde047' : '#38bdf8'}; font-weight: 800;">#${h.leaguePos}</span></td>
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