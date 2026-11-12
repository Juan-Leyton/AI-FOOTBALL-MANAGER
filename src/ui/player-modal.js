import { getPlayerAttributes } from "../engine/academy.js";
import { calculateMarketValue } from "../engine/transfers.js";
import { getPlayerStatusBadge } from "../engine/medical.js";
import { getFreeAgentSignBonus, DEVELOPMENT_FOCUSES } from "../engine/player-development.js";
import { renderClubBadge } from "./badges.js";

function renderStatRow(label, val, color = "#38bdf8") {
  const pct = Math.max(10, Math.min(99, Math.round(val)));
  return `
    <div style="margin-bottom: 9px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:4px;">
        <span style="color:var(--text-muted);">${label}</span>
        <span style="color:${color}; font-weight:900;">${pct}</span>
      </div>
      <div style="height:7px; background:rgba(15,23,42,0.95); border-radius:99px; overflow:hidden; border:1px solid rgba(255,255,255,0.08);">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:99px;"></div>
      </div>
    </div>
  `;
}

export function renderPlayerProfileModal(state, playerId) {
  if (!playerId) return "";
  const p = state.players?.[playerId];
  if (!p) return "";

  const isFreeAgent = p.clubId === "free_agent";
  const club = isFreeAgent
    ? { name: "Agente Libre", colors: ["#10b981", "#0f172a"], flag: "🆓" }
    : (state.clubs?.[p.clubId] || { name: "Sin Club", colors: ["#334155", "#94a3b8"], flag: "⚽" });

  const isOwn = p.clubId === state.userClubId;
  const baseAttrs = getPlayerAttributes(p);
  const boosts = p.customBoosts || {};
  const attrs = {
    RIT: Math.min(99, baseAttrs.RIT + (boosts.RIT || 0)),
    TIR: Math.min(99, baseAttrs.TIR + (boosts.TIR || 0)),
    PAS: Math.min(99, baseAttrs.PAS + (boosts.PAS || 0)),
    DEF: Math.min(99, baseAttrs.DEF + (boosts.DEF || 0))
  };

  const scoutLvl = state.staff?.scout || 1;
  const marketVal = isFreeAgent ? getFreeAgentSignBonus(p) : calculateMarketValue(p, scoutLvl);
  const lowVal = Math.round(marketVal * 0.82);
  const loanVal = Math.max(400000, Math.round(marketVal * 0.25));
  const sellVal = Math.round(marketVal * 0.85);
  const canBuy = !isOwn && (state.budget || 0) >= marketVal;
  const canLow = !isOwn && !isFreeAgent && (state.budget || 0) >= lowVal;
  const canLoan = !isOwn && !isFreeAgent && !p.isLoaned && (state.budget || 0) >= loanVal;
  const statusBadge = getPlayerStatusBadge(p);

  const ovrColor = p.ovr >= 85 ? "#fde047" : p.ovr >= 78 ? "#7dd3fc" : "#e2e8f0";
  const roleLabel = p.age <= 21 ? "Promesa Sub-21" : p.age <= 28 ? "Plenitud Futbolística" : "Jugador Experimentado";

  return `
    <div id="player-modal-backdrop" style="position:fixed; inset:0; background:rgba(3,7,18,0.84); backdrop-filter:blur(6px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto;">
      <div style="width:100%; max-width:610px; background:linear-gradient(165deg, ${club.colors[0]}30, #0b1120 42%, #060913 100%); border:1px solid rgba(255,255,255,0.16); border-top:3px solid ${club.colors[0]}; border-radius:18px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,0.85); color:#fff; position:relative; max-height:92vh; overflow-y:auto;">
        <button id="btn-close-player-modal" style="position:absolute; top:14px; right:14px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:32px; height:32px; border-radius:99px; font-weight:900; cursor:pointer;">✕</button>

        <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
          <div style="filter:drop-shadow(0 6px 12px rgba(0,0,0,0.6));">
            ${renderClubBadge(club, 54)}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:7px; flex-wrap:wrap;">
              <span class="fm-badge-pos">${p.pos}</span>
              ${p.secondaryPos ? `<span style="font-size:10px; color:#94a3b8; border:1px solid rgba(255,255,255,0.15); padding:1px 6px; border-radius:4px;">Alt: ${p.secondaryPos}</span>` : ""}
              <span style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;">${club.flag || ""} ${club.name}</span>
              ${p.isYouth ? `<span style="background:rgba(59,130,246,0.25); color:#60a5fa; font-size:10px; padding:2px 7px; border-radius:5px; font-weight:800;">CANTERA</span>` : ""}
              ${p.isLoaned ? `<span style="background:rgba(168,85,247,0.25); color:#d8b4fe; font-size:10px; padding:2px 7px; border-radius:5px; font-weight:800;">CEDIDO</span>` : ""}
            </div>
            <h2 style="font-size:21px; font-weight:900; margin:4px 0 2px; letter-spacing:-0.01em;">${p.name}</h2>
            <div style="font-size:12px; color:var(--text-muted);">${p.age} años • ${roleLabel} ${p.potential ? `• POT <b style="color:#34d399;">${p.potential}</b>` : ""}</div>
          </div>
          <div style="text-align:center; background:rgba(6,9,19,0.85); border:1px solid rgba(255,255,255,0.14); padding:10px 14px; border-radius:12px;">
            <div style="font-size:10px; font-weight:800; color:var(--text-muted); letter-spacing:0.06em;">MEDIA</div>
            <div style="font-size:26px; font-weight:900; color:${ovrColor}; line-height:1.1;">${p.ovr}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:12px; padding:10px; text-align:center; margin-bottom:14px;">
          <div>
            <small style="display:block; font-size:10px; color:var(--text-muted);">GOLES T.</small>
            <b style="font-size:16px; color:#34d399;">${p.goals || 0}</b>
          </div>
          <div>
            <small style="display:block; font-size:10px; color:var(--text-muted);">FÍSICO</small>
            <b style="font-size:16px; color:${(p.stamina ?? 95) > 65 ? '#38bdf8' : '#f59e0b'};">${Math.round(p.stamina ?? 95)}%</b>
          </div>
          <div>
            <small style="display:block; font-size:10px; color:var(--text-muted);">MORAL</small>
            <b style="font-size:16px; color:#e2e8f0;">${Math.round(p.morale ?? 85)}%</b>
          </div>
          <div>
            <small style="display:block; font-size:10px; color:var(--text-muted);">AMARILLAS</small>
            <b style="font-size:16px; color:#facc15;">${p.yellowCardsSeason || 0}/5</b>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
          <div style="background:rgba(6,9,19,0.65); padding:12px; border-radius:12px; border:1px solid var(--panel-border);">
            <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Atributos Técnicos</div>
            ${renderStatRow("Ritmo y Velocidad (RIT)", attrs.RIT, "#38bdf8")}
            ${renderStatRow("Disparo y Definición (TIR)", attrs.TIR, "#34d399")}
            ${renderStatRow("Visión y Pase (PAS)", attrs.PAS, "#a78bfa")}
            ${renderStatRow("Marcaje y Defensa (DEF)", attrs.DEF, "#f59e0b")}
          </div>

          <div style="background:rgba(6,9,19,0.65); padding:12px; border-radius:12px; border:1px solid var(--panel-border); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Situación Contractual</div>
              <div style="font-size:13px; margin-bottom:8px;">
                ${isFreeAgent ? "Prima de Fichaje Libre:" : "Valor de Mercado:"}<br>
                <b style="font-size:17px; color:#34d399;">${(marketVal / 1e6).toFixed(2)} M€</b>
              </div>
              <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:8px;">
                Contrato: <b style="color:#fff;">${isFreeAgent ? "Sin club (Traspaso 0 M€)" : p.isLoaned ? "Cesión 1 temporada" : `${p.contractYears ?? 2} años`}</b>
              </div>
              <div>${statusBadge}</div>
            </div>
          </div>
        </div>

        ${isOwn ? `
          <div style="background:rgba(6,9,19,0.65); padding:12px; border-radius:12px; border:1px solid var(--panel-border); margin-bottom:14px;">
            <div style="font-size:11px; font-weight:800; color:#60a5fa; text-transform:uppercase; margin-bottom:10px;">🏋️ Plan de Desarrollo Individual y Rol FC IQ</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <small style="display:block; color:var(--text-muted); font-size:11px; margin-bottom:5px;">Reconversión de Posición (0.85 M€)</small>
                ${p.pos === "POR" ? `<span style="font-size:11.5px; color:var(--text-muted);">Los porteros mantienen su rol fijo.</span>` : `
                  <div style="display:flex; gap:6px;">
                    ${["DEF", "MED", "DEL"].map(targetPos => `
                      <button class="btn-modal-retrain fm-btn ${p.pos === targetPos ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-pid="${p.id}" data-pos="${targetPos}" ${p.pos === targetPos ? 'disabled' : ''} style="padding:5px 10px; font-size:11.5px;">
                        ${targetPos}
                      </button>
                    `).join("")}
                  </div>
                `}
              </div>
              <div>
                <small style="display:block; color:var(--text-muted); font-size:11px; margin-bottom:5px;">Enfoque Técnico (+4 attrs • 0.50 M€)</small>
                <div style="display:flex; flex-wrap:wrap; gap:5px;">
                  ${Object.values(DEVELOPMENT_FOCUSES).map(f => `
                    <button class="btn-modal-focus fm-btn ${p.devFocus === f.key ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-pid="${p.id}" data-focus="${f.key}" style="padding:4px 8px; font-size:10.5px;">
                      ${f.name}
                    </button>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>
        ` : ""}

        <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; padding-top:12px; border-top:1px solid var(--panel-border);">
          ${isOwn ? `
            ${!p.isLoaned && (p.contractYears ?? 2) < 4 ? `
              <button class="btn-modal-renew fm-btn fm-btn-primary" data-pid="${p.id}">✍️ Renovar Contrato</button>
            ` : ""}
            ${!p.isLoaned ? `
              <button class="btn-modal-sell fm-btn fm-btn-ghost" data-pid="${p.id}">💰 Vender (${(sellVal / 1e6).toFixed(2)} M€)</button>
            ` : ""}
          ` : isFreeAgent ? `
            <button class="btn-modal-free-agent fm-btn ${canBuy ? "fm-btn-primary" : ""}" data-pid="${p.id}" ${!canBuy ? "disabled" : ""} style="${!canBuy ? "background:#334155; opacity:0.45; cursor:not-allowed;" : ""}">
              🆓 Fichar Libre (${(marketVal / 1e6).toFixed(2)} M€ prima)
            </button>
          ` : `
            <button class="btn-modal-loan fm-btn fm-btn-ghost" data-pid="${p.id}" ${!canLoan ? "disabled" : ""} style="border-color:rgba(168,85,247,0.5); color:#d8b4fe; ${!canLoan ? "opacity:0.45; cursor:not-allowed;" : ""}">
              📋 Pedir Cesión (${(loanVal / 1e6).toFixed(2)} M€)
            </button>
            <button class="btn-modal-lowball fm-btn fm-btn-ghost" data-pid="${p.id}" ${!canLow ? "disabled" : ""} style="border-color:rgba(245,158,11,0.5); color:#fde047; ${!canLow ? "opacity:0.45; cursor:not-allowed;" : ""}">
              🤝 Oferta Baja (${(lowVal / 1e6).toFixed(2)} M€)
            </button>
            <button class="btn-modal-buy fm-btn ${canBuy ? "fm-btn-primary" : ""}" data-pid="${p.id}" ${!canBuy ? "disabled" : ""} style="${!canBuy ? "background:#334155; opacity:0.45; cursor:not-allowed;" : ""}">
              Fichar Directo (${(marketVal / 1e6).toFixed(2)} M€)
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}