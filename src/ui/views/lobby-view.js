import { LEAGUES_CATALOG } from "../../data/world-database.js";
import { getClubStadium } from "../../engine/stadium.js";
import { renderClubBadge } from "../badges.js";
import { renderJerseySvg, renderOvrBadge } from "../components/ui-helpers.js";

export function renderClubSelection(state, lobbyState) {
  const { setupMode, selectedPreviewLeague, mpDraftSlots, joinRoomCodeInput, fetchedOnlineRoom } = lobbyState;

  const allClubsSorted = Object.values(state.clubs || {}).sort(
    (a, b) => (a.leagueName || "").localeCompare(b.leagueName || "") || b.ovr - a.ovr
  );

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

  let activeLeague = selectedPreviewLeague || "esp_1";
  let clubs = Object.values(state.clubs || {})
    .filter(c => (c.leagueId || "esp_1") === activeLeague)
    .sort((a, b) => b.ovr - a.ovr);

  if (clubs.length === 0 && allClubsSorted.length > 0) {
    activeLeague = allClubsSorted[0].leagueId || "esp_1";
    clubs = allClubsSorted
      .filter(c => (c.leagueId || "esp_1") === activeLeague)
      .sort((a, b) => b.ovr - a.ovr);
  }

  const euroLeagues = LEAGUES_CATALOG.filter(l => l.region !== "CONMEBOL");
  const saLeagues = LEAGUES_CATALOG.filter(l => l.region === "CONMEBOL");

  return `
    <div class="fm-container" style="max-width: 980px; margin-top: 16px;">
      <div class="fm-hero-header">
        <div style="display:inline-block; background:rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.45); color:#60a5fa; font-size: 11px; font-weight:800; padding:4px 12px; border-radius:99px; letter-spacing:0.08em; margin-bottom: 10px;">
          TEMPORADA 2026 · 10 LIGAS MUNDIALES (EUROPA Y SUDAMÉRICA) · 120 CLUBES
        </div>
        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 8px;">
          WORLD SOCCER WEB MANAGER <span style="color: #3b82f6;">26</span>
        </h1>
        <p style="color: var(--text-muted); max-width: 620px; margin: 0 auto 18px; font-size: 14px;">
          Dirige en solitario, arma una sala compartida con tus amigos o conéctate por código desde cualquier computadora o celular.
        </p>

        <div style="display: flex; justify-content:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
          <button type="button" class="btn-setup-mode fm-btn ${setupMode === 'solo' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-mode="solo" style="padding: 9px 16px; font-size: 13px;">
            🏆 Carrera Individual
          </button>
          <button type="button" class="btn-setup-mode fm-btn ${setupMode === 'mp' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-mode="mp" style="padding: 9px 16px; font-size: 13px; border-color:rgba(59,130,246,0.5);">
            👥 Crear Sala Amigos (2-6)
          </button>
          <button type="button" class="btn-setup-mode fm-btn ${setupMode === 'join_online' ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-mode="join_online" style="padding: 9px 16px; font-size: 13px; border-color:rgba(16,185,129,0.5); color:${setupMode === 'join_online' ? '#fff' : '#34d399'};">
            🌐 Unirse a Sala Online
          </button>
        </div>

        ${setupMode === "solo" ? `
          <div style="display: flex; justify-content:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            ${euroLeagues.map(l => `
              <button type="button" class="btn-preview-league fm-btn ${activeLeague === l.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-lid="${l.id}" style="padding: 8px 15px; font-size: 13px;">
                ${l.flag} ${l.name}
              </button>
            `).join("")}
          </div>
          ${saLeagues.length > 0 ? `
            <div style="font-size:11px; font-weight:800; color:#34d399; letter-spacing:0.06em; margin:8px 0 6px; text-transform:uppercase;">
              Ligas Sudamericanas
            </div>
            <div style="display: flex; justify-content:center; flex-wrap:wrap; gap:8px;">
              ${saLeagues.map(l => `
                <button type="button" class="btn-preview-league fm-btn ${activeLeague === l.id ? 'fm-btn-primary' : 'fm-btn-ghost'}" data-lid="${l.id}" style="padding: 8px 15px; font-size: 13px;">
                  ${l.flag} ${l.name}
                </button>
              `).join("")}
            </div>
          ` : ""}
        ` : ""}
      </div>

      ${setupMode === "join_online" ? `
        <div class="fm-card" style="max-width: 560px; margin:0 auto;">
          <h3 style="margin-bottom: 6px;">🌐 Unirse a una Sala Online por Código</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            Pide al anfitrión el código de 6 letras de la sala (ej. <b style="color:#fff;">WFM82K</b>) y elige tu perfil de mánager.
          </p>
          <div style="display: flex; gap:8px; margin-bottom:16px;">
            <input id="input-join-room-code" type="text" maxlength="8" value="${joinRoomCodeInput.replace(/"/g, "&quot;")}" placeholder="CÓDIGO (EJ. WFM82K)" style="flex:1; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius: 10px; padding: 10px 14px; font-size: 15px; font-weight:900; letter-spacing:0.12em; text-transform:uppercase;">
            <button type="button" id="btn-search-online-room" class="fm-btn fm-btn-primary" style="padding:10px 18px; font-size:13px;">
              Buscar Sala
            </button>
          </div>

          ${fetchedOnlineRoom ? `
            <div style="background:rgba(6,9,19,0.8); border:1px solid rgba(16,185,129,0.45); border-radius: 12px; padding:14px;">
              <div style="font-size:12px; color:#34d399; font-weight:800; margin-bottom:10px;">
                ✓ Sala ${fetchedOnlineRoom.room_code} encontrada (Temporada ${fetchedOnlineRoom.season} · Jornada ${fetchedOnlineRoom.round}) · Selecciona quién eres:
              </div>
              <div style="display:grid; gap:8px;">
                ${(fetchedOnlineRoom.state_json?.mpManagers || []).map(m => {
                  const c = fetchedOnlineRoom.state_json?.clubs?.[m.clubId];
                  return `
                    <button type="button" class="btn-join-as-manager fm-btn fm-btn-ghost" data-mgrid="${m.id}" style="display:flex; justify-content:space-between; align-items:center; width:100%; padding: 10px 12px; text-align:left; border-color:rgba(59,130,246,0.4);">
                      <span>👤 <b>${m.name}</b> · ${c?.name || m.clubId}</span>
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
          <div style="display: flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom: 14px;">
            <div>
              <h3 style="margin:0;">👥 Configurar Sala de Amigos (${mpDraftSlots.length}/6 Mánagers)</h3>
              <small style="color:var(--text-muted);">Cada amigo elige su nombre y club. Una vez dentro podrás publicar la sala online para que entren desde sus dispositivos.</small>
            </div>
            ${mpDraftSlots.length < 6 ? `
              <button type="button" id="btn-mp-add-slot" class="fm-btn fm-btn-ghost" style="font-size: 12px; padding:6px 12px; border-color:rgba(59,130,246,0.5); color:#93c5fd;">
                + Añadir Amigo
              </button>
            ` : ""}
          </div>

          <div style="display:grid; gap:10px; margin-bottom:16px;">
            ${mpDraftSlots.map((slot, idx) => `
              <div style="display:grid; grid-template-columns: 1fr 1.5fr auto; gap:10px; align-items:center; background:rgba(6,9,19,0.75); padding: 10px 12px; border-radius:12px; border:1px solid var(--panel-border);">
                <input class="mp-slot-name" data-idx="${idx}" type="text" value="${slot.name.replace(/"/g, "&quot;")}" placeholder="Nombre Mánager ${idx + 1}" style="background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:8px 10px; font-size:13px; font-weight:700;">
                <select class="mp-slot-club" data-idx="${idx}" style="background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:8px 10px; font-size:13px;">
                  ${allClubsSorted.map(c => `
                    <option value="${c.id}" ${slot.clubId === c.id ? "selected" : ""}>
                      ${c.flag || ""} ${c.name} (OVR ${c.ovr} · ${c.leagueName})
                    </option>
                  `).join("")}
                </select>
                ${mpDraftSlots.length > 2 ? `
                  <button type="button" class="btn-mp-remove-slot fm-btn fm-btn-ghost" data-idx="${idx}" style="padding:7px 10px; color:#fca5a5;">×</button>
                ` : `<span></span>`}
              </div>
            `).join("")}
          </div>

          <button type="button" id="btn-start-mp-career" class="fm-btn fm-btn-play" style="width:100%;">
            Iniciar Carrera Multijugador (${mpDraftSlots.length} Mánagers)
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
              <button type="button" class="fm-club-card-pick btn-select-club" data-id="${c.id}"
                      style="background: linear-gradient(150deg, ${c.colors[0]}26, rgba(15, 23, 42, 0.94) 65%); border-top: 2px solid ${c.colors[0]};">
                <div style="display: flex; justify-content:space-between; align-items:center; width:100%;">
                  <div style="display: flex; align-items:center; gap:10px; text-align:left;">
                    ${renderClubBadge(c, 38)}
                    ${renderJerseySvg(c.colors[0], c.colors[1], "10", false, 32)}
                    <div>
                      <b style="display:block; font-size:15px;">${c.name}</b>
                      <span style="font-size:11px; font-weight:700; color:${tier.color};">${tier.label}</span>
                    </div>
                  </div>
                  ${renderOvrBadge(c.ovr)}
                </div>
                <div style="width: 100%; padding-top:8px; border-top: 1px solid rgba(255,255,255,0.08); display:grid; gap:4px; font-size:12px; color:var(--text-muted);">
                  <div style="display: flex; justify-content:space-between;">
                    <span>Presupuesto Inicial</span>
                    <b style="color:#34d399;">${(c.budget / 1e6).toFixed(0)} M€</b>
                  </div>
                  <div style="display: flex; justify-content:space-between; font-size:11.5px;">
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
