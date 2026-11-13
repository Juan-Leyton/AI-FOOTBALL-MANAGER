import { store } from "../core/state.js";
import { LEAGUES_CATALOG } from "../data/world-database.js";
import { renderClubBadge } from "./badges.js";

function renderJerseyMini(c1, c2) {
  const p = (c1 || "").toLowerCase();
  const numCol = (p === "#ffffff" || p === "#f8fafc" || p === "#facc15" || p === "#fde047") ? "#090d16" : "#ffffff";
  return `
    <div style="position:relative; width:32px; height:29px; flex-shrink:0;">
      <svg viewBox="0 0 64 58" width="32" height="29">
        <path d="M16 8 L3 18 L10 29 L18 23 L18 52 L46 52 L46 23 L54 29 L61 18 L48 8 L39 4 C36 9 28 9 25 4 Z"
              fill="${c2 || '#e2e8f0'}" stroke="#090d16" stroke-width="2"/>
        <path d="M18 7 L25 4 C28 9 36 9 39 4 L46 7 L46 52 L18 52 Z" fill="${c1 || '#2563eb'}"/>
        <text x="32" y="37" text-anchor="middle" fill="${numCol}" font-weight="900" font-size="18">10</text>
      </svg>
    </div>
  `;
}

export function renderWorldExpansionUI() {
  const state = store.get();
  if (state.userClubId) return;

  const container = document.getElementById("world-leagues-bar");
  const clubsGrid = document.getElementById("world-clubs-grid");
  if (!container || !clubsGrid) return;

  const activeLeagueId = state.previewLeagueId || "esp_1";
  const euroLeagues = LEAGUES_CATALOG.filter(l => l.region !== "CONMEBOL");
  const saLeagues = LEAGUES_CATALOG.filter(l => l.region === "CONMEBOL");

  container.innerHTML = `
    <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
      ${euroLeagues.map(l => `
        <button type="button" class="btn-world-league fm-btn ${activeLeagueId === l.id ? "fm-btn-primary" : "fm-btn-ghost"}" data-lid="${l.id}" style="padding:8px 14px; font-size:12.5px;">
          ${l.flag} ${l.name}
        </button>
      `).join("")}
    </div>
    ${saLeagues.length > 0 ? `
      <div style="font-size:11px; font-weight:800; color:#34d399; letter-spacing:0.06em; margin:8px 0 6px; text-transform:uppercase;">
        🌎 Ligas Sudamericanas
      </div>
      <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:8px;">
        ${saLeagues.map(l => `
          <button type="button" class="btn-world-league fm-btn ${activeLeagueId === l.id ? "fm-btn-primary" : "fm-btn-ghost"}" data-lid="${l.id}" style="padding:8px 14px; font-size:12.5px;">
            ${l.flag} ${l.name}
          </button>
        `).join("")}
      </div>
    ` : ""}
  `;

  const clubs = Object.values(state.clubs || {})
    .filter(c => c.leagueId === activeLeagueId)
    .sort((a, b) => b.ovr - a.ovr);

  clubsGrid.innerHTML = clubs.map(c => {
    const tier = c.ovr >= 83 ? { label: "Favorito al Título", color: "#fde047" }
      : c.ovr >= 79 ? { label: "Aspirante Continental", color: "#38bdf8" }
      : { label: "Proyecto / Reto", color: "#34d399" };

    return `
      <button type="button" class="fm-club-card-pick btn-select-club" data-id="${c.id}" style="background: linear-gradient(150deg, ${c.colors[0]}26, rgba(15, 23, 42, 0.94) 65%); border-top: 2px solid ${c.colors[0]};">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div style="display:flex; align-items:center; gap:10px; text-align:left;">
            ${renderClubBadge(c, 38)}
            ${renderJerseyMini(c.colors[0], c.colors[1])}
            <div>
              <b style="display:block; font-size:15px;">${c.name}</b>
              <span style="font-size:11px; font-weight:700; color:${tier.color};">${tier.label}</span>
            </div>
          </div>
          <span style="padding:3px 8px; border-radius:7px; background:rgba(56,189,248,0.2); color:#7dd3fc; font-weight:800; font-size:12px;">${c.ovr}</span>
        </div>
        <div style="width:100%; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted);">
          <span>Presupuesto Inicial</span>
          <b style="color:#34d399;">${(c.budget / 1e6).toFixed(0)} M€</b>
        </div>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".btn-world-league").forEach(btn => {
    btn.addEventListener("click", () => {
      const lid = btn.dataset.lid;
      store.update(["previewLeagueId"], draft => {
        draft.previewLeagueId = lid;
      });
    });
  });
}