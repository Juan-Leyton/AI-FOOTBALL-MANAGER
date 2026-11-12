import { store } from "../core/state.js";
import { assignPlayersToSlots } from "../engine/match-live.js";
import {
  PLAYER_ROLES,
  TOUCHLINE_SHOUTS,
  getDefaultRoleForPos,
  getEffectiveSetPieces,
  setSlotRole,
  setSetPieceTaker,
  triggerTouchlineShout
} from "../engine/tactics-roles.js";
import { showToast } from "./toast.js";

export function renderTacticsExtrasUI() {
  const state = store.get();
  if (!state || !state.userClubId) return;

  // 1. Inyectar Roles Individuales y Balón Parado en Pizarra Táctica
  if (state.activeTab === "tactics" && !state.liveMatch) {
    const targetHost = document.getElementById("tab-content") || document.getElementById("view-root");
    if (targetHost && !document.getElementById("wfm-tactics-extras-panel")) {
      const club = state.clubs[state.userClubId];
      const formKey = club?.formation || "4-3-3";
      const clubPlayers = Object.values(state.players || {}).filter(p => p.clubId === club.id);
      const starters = clubPlayers.filter(p => p.starter).slice(0, 11);
      const assigned = assignPlayersToSlots(starters, formKey);
      const slotRoles = club?.slotRoles || {};
      const sp = getEffectiveSetPieces(state, club.id);

      const wrapper = document.createElement("section");
      wrapper.id = "wfm-tactics-extras-panel";
      wrapper.style.cssText = "margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;";

      const rolesRows = assigned.map((entry, idx) => {
        const pos = entry.slot.pos;
        const pName = entry.player?.name || `Slot ${idx + 1}`;
        const currentRole = slotRoles[idx] || getDefaultRoleForPos(pos);
        const options = (PLAYER_ROLES[pos] || PLAYER_ROLES.MED).map(r =>
          `<option value="${r.id}" ${r.id === currentRole ? "selected" : ""}>${r.name} (${r.desc})</option>`
        ).join("");

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.16);border-radius:8px;">
            <div style="min-width:120px;">
              <span style="font-size:11px;font-weight:700;color:#38bdf8;margin-right:5px;">${pos}</span>
              <span style="font-size:12px;font-weight:600;color:#f1f5f9;">${pName.split(" ").pop()}</span>
            </div>
            <select data-role-slot="${idx}" style="flex:1;max-width:230px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:5px 7px;font-size:11px;">
              ${options}
            </select>
          </div>
        `;
      }).join("");

      const makeTakerOptions = (selectedId) => starters.map(p =>
        `<option value="${p.id}" ${p.id === selectedId ? "selected" : ""}>${p.name} (${p.pos} • OVR ${p.ovr})</option>`
      ).join("");

      wrapper.innerHTML = `
        <div class="fm-card" style="margin:0;">
          <h3 style="margin:0 0 6px;font-size:15px;">🎯 Roles Individuales del XI</h3>
          <p style="margin:0 0 12px;font-size:12px;color:var(--text-muted);">Ajusta el comportamiento y desmarque de cada titular en el campo 2D.</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${rolesRows}
          </div>
        </div>

        <div class="fm-card" style="margin:0;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <h3 style="margin:0 0 6px;font-size:15px;">⚽ Lanzadores a Balón Parado</h3>
            <p style="margin:0 0 14px;font-size:12px;color:var(--text-muted);">Los especialistas designados obtienen mayor precisión y potencia en penales y jugadas clave.</p>

            <div style="display:flex;flex-direction:column;gap:12px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">🎯 Lanzador de Penales</label>
                <select data-setpiece="penalty" style="width:100%;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:8px;font-size:12px;">
                  ${makeTakerOptions(sp.penalty)}
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">🚀 Tiros Libres Directos</label>
                <select data-setpiece="freekick" style="width:100%;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:8px;font-size:12px;">
                  ${makeTakerOptions(sp.freekick)}
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">🚩 Saques de Esquina (Córners)</label>
                <select data-setpiece="corner" style="width:100%;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:8px;font-size:12px;">
                  ${makeTakerOptions(sp.corner)}
                </select>
              </div>
            </div>
          </div>
          <div style="margin-top:14px;padding:10px;border-radius:8px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);font-size:11px;color:#7dd3fc;">
            💡 Tip: Usa un <strong>Lateral Carrilero</strong> o <strong>Organizador Adelantado</strong> si buscas volcar el ataque en el 2D.
          </div>
        </div>
      `;

      targetHost.appendChild(wrapper);

      wrapper.querySelectorAll("[data-role-slot]").forEach(sel => {
        sel.addEventListener("change", e => {
          const slotIdx = Number(e.target.getAttribute("data-role-slot"));
          setSlotRole(slotIdx, e.target.value);
          showToast("Rol táctico actualizado.", "info");
        });
      });

      wrapper.querySelectorAll("[data-setpiece]").forEach(sel => {
        sel.addEventListener("change", e => {
          const type = e.target.getAttribute("data-setpiece");
          setSetPieceTaker(type, e.target.value);
          showToast("Lanzador asignado.", "info");
        });
      });
    }
  }

  // 2. Inyectar Gritos desde la Banda en Vivo durante el partido
  const lm = state.liveMatch;
  if (lm && !lm.finished) {
    const canvas = document.getElementById("pitch-canvas");
    const hostContainer = canvas?.parentElement || document.getElementById("view-root");
    if (hostContainer) {
      let bar = document.getElementById("wfm-live-shouts-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "wfm-live-shouts-bar";
        bar.style.cssText = "margin-top:10px;padding:10px 12px;background:rgba(15,23,42,0.92);border:1px solid rgba(251,191,36,0.3);border-radius:10px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;text-align:left;";

        const btns = TOUCHLINE_SHOUTS.map(s => `
          <button type="button" data-shout-id="${s.id}" title="${s.desc}" class="fm-btn fm-btn-ghost" style="padding:5px 10px;font-size:11.5px;font-weight:700;">
            ${s.label}
          </button>
        `).join("");

        bar.innerHTML = `
          <div id="wfm-shout-status"></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${btns}</div>
        `;

        hostContainer.appendChild(bar);

        bar.querySelectorAll("[data-shout-id]").forEach(btn => {
          btn.addEventListener("click", () => {
            const res = triggerTouchlineShout(btn.getAttribute("data-shout-id"));
            showToast(res.msg, res.ok ? "success" : "warning");
          });
        });
      }

      const statusEl = document.getElementById("wfm-shout-status");
      if (statusEl) {
        statusEl.innerHTML = lm.activeShout
          ? `<span style="font-size:11.5px;color:#fbbf24;font-weight:800;">🔥 Activo: ${lm.activeShout.label} (hasta ${lm.activeShout.expiresAt}')</span>`
          : `<span style="font-size:11.5px;color:#94a3b8;font-weight:700;">🗣️ Gritos desde la banda (10 min):</span>`;
      }
    }
  }
}