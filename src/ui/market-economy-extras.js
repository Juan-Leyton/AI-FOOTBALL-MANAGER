import { store } from "../core/state.js";
import { calculateMarketValue } from "../engine/transfers.js";
import {
  SPONSORS_CATALOG,
  getClubFinancialBreakdown,
  getReleaseClause,
  getTransferWindowStatus,
  selectClubSponsor,
  payReleaseClause,
  proposePlayerSwap
} from "../engine/economy-market.js";
import { showToast } from "./toast.js";

let swapTargetId = "";
let swapOfferedId = "";
let swapCashMillions = 5;

export function renderMarketEconomyExtrasUI() {
  const state = store.get();
  if (!state || !state.userClubId || state.liveMatch) return;

  const targetHost = document.getElementById("tab-content") || document.getElementById("view-root");
  if (!targetHost) return;

  // 1. CENTRO DEL CLUB: Desglose Económico Semanal y Patrocinadores
  if (state.activeTab === "home" && !document.getElementById("wfm-economy-panel")) {
    const fin = getClubFinancialBreakdown(state);
    if (!fin) return;

    const club = state.clubs[state.userClubId];
    const panel = document.createElement("section");
    panel.id = "wfm-economy-panel";
    panel.className = "fm-card";
    panel.style.marginTop = "16px";

    const netColor = fin.projectedWeeklyNet >= 0 ? "#34d399" : "#f87171";
    const netSign = fin.projectedWeeklyNet >= 0 ? "+" : "";

    panel.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;">💼 Salud Financiera y Patrocinio Principal</h3>
          <small style="color:var(--text-muted);">Equilibrio semanal estimado entre ingresos comerciales/taquilla y masa salarial</small>
        </div>
        <span style="padding:5px 11px;border-radius:8px;font-size:12px;font-weight:800;background:rgba(15,23,42,0.85);border:1px solid var(--panel-border);color:${netColor};">
          Flujo Semanal Est.: ${netSign}${(fin.projectedWeeklyNet / 1e6).toFixed(2)} M€
        </span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px;">
        <div style="background:rgba(6,9,19,0.72);padding:10px;border-radius:10px;border:1px solid var(--panel-border);">
          <small style="color:var(--text-muted);display:block;font-size:10.5px;">PATROCINADOR FIJO</small>
          <b style="color:#34d399;font-size:14px;">+${(fin.sponsor.weekly / 1e6).toFixed(2)} M€/sem</b>
        </div>
        <div style="background:rgba(6,9,19,0.72);padding:10px;border-radius:10px;border:1px solid var(--panel-border);">
          <small style="color:var(--text-muted);display:block;font-size:10.5px;">TAQUILLA MEDIA EST.</small>
          <b style="color:#38bdf8;font-size:14px;">+${(fin.estTicketAvg / 1e6).toFixed(2)} M€/sem</b>
        </div>
        <div style="background:rgba(6,9,19,0.72);padding:10px;border-radius:10px;border:1px solid var(--panel-border);">
          <small style="color:var(--text-muted);display:block;font-size:10.5px;">MASA SALARIAL (${fin.squadCount})</small>
          <b style="color:#f87171;font-size:14px;">-${(fin.totalWeeklyWages / 1e6).toFixed(2)} M€/sem</b>
        </div>
        <div style="background:rgba(6,9,19,0.72);padding:10px;border-radius:10px;border:1px solid var(--panel-border);">
          <small style="color:var(--text-muted);display:block;font-size:10.5px;">MANTENIMIENTO STAFF</small>
          <b style="color:#fbbf24;font-size:14px;">-${(fin.staffUpkeep / 1e6).toFixed(2)} M€/sem</b>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;">
        ${SPONSORS_CATALOG.map(sp => {
          const isCurrent = fin.sponsor.id === sp.id;
          const eligible = (club.ovr || 75) >= sp.minOvr;
          return `
            <div style="background:rgba(15,23,42,0.85);border:1px solid ${isCurrent ? '#10b981' : 'var(--panel-border)'};border-radius:10px;padding:10px;display:flex;flex-direction:column;justify-content:space-between;gap:8px;">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <b style="font-size:13px;">${sp.name}</b>
                  <span style="font-size:10.5px;color:#34d399;font-weight:800;">+${(sp.weekly / 1e6).toFixed(2)}M/sem</span>
                </div>
                <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:3px;">${sp.desc}</small>
                <small style="color:#93c5fd;font-size:10.5px;display:block;margin-top:2px;">Bonus victoria: +${(sp.winBonus / 1e6).toFixed(2)}M • Req: OVR ${sp.minOvr}+</small>
              </div>
              <button type="button" class="btn-select-sponsor fm-btn ${isCurrent ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-spid="${sp.id}" ${isCurrent || !eligible ? 'disabled' : ''} style="padding:5px 8px;font-size:11px;${!eligible ? 'opacity:0.45;cursor:not-allowed;' : ''}">
                ${isCurrent ? '✓ Contrato Activo' : eligible ? 'Firmar Patrocinio' : `Requiere OVR ${sp.minOvr}`}
              </button>
            </div>
          `;
        }).join("")}
      </div>
    `;

    targetHost.appendChild(panel);

    panel.querySelectorAll(".btn-select-sponsor").forEach(btn => {
      btn.addEventListener("click", () => {
        const res = selectClubSponsor(btn.dataset.spid);
        showToast(res.msg, res.ok ? "success" : "warning");
      });
    });
  }

  // 2. MERCADO GLOBAL: Deadline Day, Cláusulas de Rescisión y Trueques Jugador + Cash
  if (state.activeTab === "transfers" && !document.getElementById("wfm-realistic-market-panel")) {
    const winStatus = getTransferWindowStatus(state);
    const myPlayers = Object.values(state.players || {})
      .filter(p => p.clubId === state.userClubId && !p.isLoaned)
      .sort((a, b) => b.ovr - a.ovr);

    const externalTargets = Object.values(state.players || {})
      .filter(p => p.clubId !== state.userClubId && p.clubId !== "free_agent")
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, 60);

    if (!swapTargetId || !state.players[swapTargetId] || state.players[swapTargetId].clubId === state.userClubId) {
      swapTargetId = externalTargets[0]?.id || "";
    }
    if (!swapOfferedId || !state.players[swapOfferedId] || state.players[swapOfferedId].clubId !== state.userClubId) {
      swapOfferedId = myPlayers[myPlayers.length - 1]?.id || myPlayers[0]?.id || "";
    }

    const selectedTarget = state.players[swapTargetId];
    const clausePrice = selectedTarget ? getReleaseClause(selectedTarget) : 0;
    const estMarketPrice = selectedTarget ? calculateMarketValue(selectedTarget, state.staff?.scout || 1) : 0;

    const panel = document.createElement("section");
    panel.id = "wfm-realistic-market-panel";
    panel.className = "fm-card";
    panel.style.marginTop = "16px";
    panel.style.borderColor = winStatus.isDeadlineDay ? "rgba(239,68,68,0.55)" : "rgba(56,189,248,0.35)";

    panel.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px;">
        <div>
          <h3 style="margin:0;">🔄 Mesa de Negociación Avanzada (Trueques y Cláusulas)</h3>
          <small style="color:var(--text-muted);">Ofrece futbolistas de tu plantilla + dinero o ejecuta la cláusula de rescisión directa</small>
        </div>
        <span style="padding:5px 11px;border-radius:8px;font-size:11.5px;font-weight:800;background:${winStatus.isDeadlineDay ? 'rgba(239,68,68,0.22)' : 'rgba(16,185,129,0.16)'};color:${winStatus.isDeadlineDay ? '#fca5a5' : '#34d399'};border:1px solid ${winStatus.isDeadlineDay ? 'rgba(239,68,68,0.45)' : 'rgba(16,185,129,0.4)'};">
          ${winStatus.label}
        </span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;background:rgba(6,9,19,0.75);padding:14px;border-radius:12px;border:1px solid var(--panel-border);">
        <div>
          <label style="display:block;font-size:11px;font-weight:800;color:#38bdf8;margin-bottom:5px;text-transform:uppercase;">1. Jugador Objetivo (Top 60 Mercado)</label>
          <select id="wfm-swap-target" style="width:100%;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:8px;padding:8px;font-size:12px;margin-bottom:8px;">
            ${externalTargets.map(p => {
              const cName = state.clubs[p.clubId]?.name || "";
              return `<option value="${p.id}" ${p.id === swapTargetId ? "selected" : ""}>${p.name} (${p.pos} • OVR ${p.ovr} • ${cName})</option>`;
            }).join("")}
          </select>
          <div style="font-size:11.5px;color:var(--text-muted);display:flex;justify-content:space-between;">
            <span>Valor Mercado: <b style="color:#e2e8f0;">${(estMarketPrice / 1e6).toFixed(2)} M€</b></span>
            <span>Cláusula: <b style="color:#fbbf24;">${(clausePrice / 1e6).toFixed(2)} M€</b></span>
          </div>
          <button type="button" id="wfm-btn-pay-clause" class="fm-btn fm-btn-ghost" style="width:100%;margin-top:8px;padding:7px 10px;font-size:12px;border-color:rgba(251,191,36,0.5);color:#fde047;font-weight:800;">
            💣 Pagar Cláusula (${(clausePrice / 1e6).toFixed(2)} M€)
          </button>
        </div>

        <div>
          <label style="display:block;font-size:11px;font-weight:800;color:#34d399;margin-bottom:5px;text-transform:uppercase;">2. Tu Oferta (Jugador + Efectivo)</label>
          <select id="wfm-swap-offered" style="width:100%;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:8px;padding:8px;font-size:12px;margin-bottom:8px;">
            ${myPlayers.map(p => {
              const v = calculateMarketValue(p, 1);
              return `<option value="${p.id}" ${p.id === swapOfferedId ? "selected" : ""}>${p.name} (${p.pos} • OVR ${p.ovr} • Tasado ${(v / 1e6).toFixed(1)}M)</option>`;
            }).join("")}
          </select>

          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:11.5px;color:var(--text-muted);white-space:nowrap;">+ Efectivo (M€):</span>
            <input id="wfm-swap-cash" type="number" min="0" max="250" step="0.5" value="${swapCashMillions}" style="flex:1;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:8px;padding:6px 9px;font-size:12.5px;font-weight:800;">
          </div>

          <button type="button" id="wfm-btn-propose-swap" class="fm-btn fm-btn-primary" style="width:100%;padding:8px 12px;font-size:12.5px;font-weight:800;">
            🤝 Enviar Oferta de Intercambio
          </button>
        </div>
      </div>
    `;

    targetHost.appendChild(panel);

    document.getElementById("wfm-swap-target")?.addEventListener("change", e => {
      swapTargetId = e.target.value;
      panel.remove();
      renderMarketEconomyExtrasUI();
    });

    document.getElementById("wfm-swap-offered")?.addEventListener("change", e => {
      swapOfferedId = e.target.value;
    });

    document.getElementById("wfm-swap-cash")?.addEventListener("input", e => {
      swapCashMillions = Math.max(0, Number(e.target.value) || 0);
    });

    document.getElementById("wfm-btn-pay-clause")?.addEventListener("click", () => {
      const res = payReleaseClause(swapTargetId);
      showToast(res.msg, res.ok ? "success" : "warning", 4800);
    });

    document.getElementById("wfm-btn-propose-swap")?.addEventListener("click", () => {
      const cashRaw = Math.round(swapCashMillions * 1e6);
      const res = proposePlayerSwap(swapTargetId, swapOfferedId, cashRaw);
      showToast(res.msg, res.ok ? "success" : "warning", 5000);
    });
  }
}