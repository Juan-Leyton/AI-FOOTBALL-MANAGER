import { store } from "../core/state.js";
import { NATIONALITIES_CATALOG } from "../data/world-database.js";

let selectedNationalityFilter = "ALL";
let selectedIconsOnly = false;
let boundGlobalDelegation = false;

function enhancePlayerBadgesInDom(state) {
  const players = state.players || {};
  document.querySelectorAll(".btn-inspect-player").forEach(el => {
    if (el.dataset.natDecorated === "1") return;
    const pid = el.dataset.pid;
    const p = players[pid];
    if (!p) return;

    el.dataset.natDecorated = "1";
    const flag = p.flag || "🌍";
    const flagSpan = document.createElement("span");
    flagSpan.textContent = `${flag} `;
    flagSpan.title = p.nationality || "Internacional";
    flagSpan.style.cssText = "text-decoration:none; display:inline-block; margin-right:2px;";
    el.prepend(flagSpan);

    if (p.isWorldIcon && !el.parentElement?.querySelector(".wfm-world-icon-tag")) {
      const tag = document.createElement("span");
      tag.className = "wfm-world-icon-tag";
      tag.textContent = "👑 ÍCONO";
      tag.style.cssText =
        "background:rgba(234,179,8,0.22); color:#facc15; border:1px solid rgba(234,179,8,0.45); font-size:10px; padding:1px 6px; border-radius:4px; font-weight:900; margin-left:4px;";
      el.insertAdjacentElement("afterend", tag);
    }
  });
}

function enhanceClubSelectionHero() {
  const heroBadge = document.querySelector(".fm-hero-header > div");
  if (heroBadge && heroBadge.textContent.includes("4 LIGAS EUROPEAS")) {
    heroBadge.textContent = "TEMPORADA 2026 • 10 LIGAS MUNDIALES (EUROPA Y SUDAMÉRICA) • 120 CLUBES";
  }

  // Añadir separador visual Sudamérica si existen las ligas nuevas
  const brBtn = document.querySelector('.btn-preview-league[data-lid="bra_1"]');
  if (brBtn && !document.getElementById("wfm-southamerica-divider")) {
    const div = document.createElement("div");
    div.id = "wfm-southamerica-divider";
    div.style.cssText =
      "width:100%; font-size:11px; font-weight:800; color:#34d399; letter-spacing:0.06em; text-transform:uppercase; margin-top:6px;";
    div.textContent = "🌎 Ligas Sudamericanas";
    brBtn.parentElement?.insertBefore(div, brBtn);
  }
}

function enhanceMarketFiltersAndResults(state) {
  if (state.activeTab !== "transfers") return;

  const searchInput = document.getElementById("market-search-input");
  const filterGrid = searchInput?.parentElement?.parentElement;

  if (filterGrid && !document.getElementById("market-nat-select")) {
    const natBox = document.createElement("div");
    const natOptions = Object.values(NATIONALITIES_CATALOG)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        n =>
          `<option value="${n.code}" ${selectedNationalityFilter === n.code ? "selected" : ""}>${n.flag} ${n.name}</option>`
      )
      .join("");

    natBox.innerHTML = `
      <label style="display:block; font-size:10.5px; font-weight:700; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">🌍 Nacionalidad / Leyendas</label>
      <select id="market-nat-select" style="width:100%; background:#0f172a; color:#fff; border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; font-size:12.5px;">
        <option value="ALL" ${selectedNationalityFilter === "ALL" && !selectedIconsOnly ? "selected" : ""}>Todas las nacionalidades</option>
        <option value="ICONS" ${selectedIconsOnly ? "selected" : ""}>👑 Solo Leyendas Históricas (20)</option>
        ${natOptions}
      </select>
    `;
    filterGrid.appendChild(natBox);
  }

  // Filtrar filas de la tabla del mercado si hay filtro de nacionalidad o leyendas activo
  if (selectedNationalityFilter !== "ALL" || selectedIconsOnly) {
    const tbody = document.querySelector("#tab-content table.fm-table tbody");
    if (tbody) {
      let visibleCount = 0;
      tbody.querySelectorAll("tr").forEach(row => {
        const inspectBtn = row.querySelector(".btn-inspect-player");
        if (!inspectBtn) return;
        const p = state.players?.[inspectBtn.dataset.pid];
        if (!p) return;

        let match = true;
        if (selectedIconsOnly) {
          match = Boolean(p.isWorldIcon || p.isCustomLegend);
        } else if (selectedNationalityFilter !== "ALL") {
          match = p.natCode === selectedNationalityFilter;
        }

        row.style.display = match ? "" : "none";
        if (match) visibleCount++;
      });

      if (visibleCount === 0 && !tbody.querySelector(".wfm-empty-nat-row")) {
        const emptyTr = document.createElement("tr");
        emptyTr.className = "wfm-empty-nat-row";
        emptyTr.innerHTML = `<td colspan="7" style="text-align:center; padding:18px; color:var(--text-muted);">Prueba seleccionando <b>"Todas"</b> o <b>"Libres (OM)"</b> arriba para ver todos los jugadores de esa nacionalidad.</td>`;
        tbody.appendChild(emptyTr);
      }
    }
  }
}

function bindWorldExpansionListeners() {
  if (boundGlobalDelegation) return;
  boundGlobalDelegation = true;

  document.addEventListener("change", e => {
    if (e.target.id === "market-nat-select") {
      const val = e.target.value;
      if (val === "ICONS") {
        selectedIconsOnly = true;
        selectedNationalityFilter = "ALL";
        // Activar automáticamente filtro "FREE" para que aparezcan todas las leyendas mundiales
        store.update(["marketLeagueFilter"], draft => {
          draft.marketLeagueFilter = "FREE";
        });
      } else {
        selectedIconsOnly = false;
        selectedNationalityFilter = val;
        renderWorldExpansionUI();
      }
    }
  });

  document.addEventListener("click", e => {
    if (e.target.id === "btn-clear-market-filters") {
      selectedNationalityFilter = "ALL";
      selectedIconsOnly = false;
    }
  });
}

export function renderWorldExpansionUI() {
  bindWorldExpansionListeners();
  const state = store.get();
  if (!state) return;

  if (!state.userClubId) {
    enhanceClubSelectionHero();
    return;
  }

  enhancePlayerBadgesInDom(state);
  enhanceMarketFiltersAndResults(state);
}