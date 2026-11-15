export function renderOvrBadge(ovr) {
  let bg = "rgba(148, 163, 184, 0.18)";
  let color = "#e2e8f0";
  let border = "rgba(148, 163, 184, 0.35)";

  if (ovr >= 85) {
    bg = "linear-gradient(135deg, rgba(250, 204, 21, 0.28), rgba(245, 158, 11, 0.14))";
    color = "#fde047";
    border = "rgba(250, 204, 21, 0.55)";
  } else if (ovr >= 78) {
    bg = "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(59, 130, 246, 0.12))";
    color = "#7dd3fc";
    border = "rgba(56, 189, 248, 0.45)";
  }

  return `<span style="display:inline-flex; align-items:center; justify-content:center; min-width:32px; padding:3px 7px; border-radius:7px; background:${bg}; color:${color}; border:1px solid ${border}; font-weight: 800; font-size: 12px;">${ovr}</span>`;
}

export function renderJerseySvg(primaryColor, secondaryColor, number, isOutOfPos = false, size = 42) {
  const height = Math.round(size * (58 / 64));
  const strokeCol = isOutOfPos ? "#fde047" : (secondaryColor || "#ffffff");
  const pLow = (primaryColor || "").toLowerCase();
  const numCol = (pLow === "#ffffff" || pLow === "#f8fafc" || pLow === "#facc15" || pLow === "#fde047" || pLow === "#fde100")
    ? "#090d16"
    : "#ffffff";

  return `
    <div style="position:relative; width:${size}px; height:${height}px; margin:0 auto; filter: drop-shadow(0 5px 8px rgba(0,0,0,0.68)); flex-shrink:0;">
      <svg viewBox="0 0 64 58" width="${size}" height="${height}" style="display:block; overflow:visible;">
        <path d="M16 8 L3 18 L10 29 L18 23 L18 52 L46 52 L46 23 L54 29 L61 18 L48 8 L39 4 C36 9 28 9 25 4 Z"
              fill="${secondaryColor || '#e2e8f0'}" stroke="#090d16" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 7 L25 4 C28 9 36 9 39 4 L46 7 L46 52 L18 52 Z"
              fill="${primaryColor || '#2563eb'}"/>
        <rect x="29" y="8" width="6" height="43" fill="${secondaryColor || '#ffffff'}" opacity="0.24"/>
        <path d="M16 8 L3 18 L10 29 L18 23 L18 52 L46 52 L46 23 L54 29 L61 18 L48 8 L39 4 C36 9 28 9 25 4 Z"
              fill="none" stroke="${strokeCol}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M25 4 C28 10 36 10 39 4" fill="none" stroke="${strokeCol}" stroke-width="2.2"/>
        <text x="32" y="37" text-anchor="middle" fill="${numCol}" font-family="system-ui, sans-serif" font-weight="900" font-size="18" stroke="#090d16" stroke-width="0.9" paint-order="stroke">
          ${number}
        </text>
      </svg>
    </div>
  `;
}

export function renderMiniBar(value, color) {
  const pct = Math.max(5, Math.min(100, Math.round(value)));
  return `
    <div style="display: flex; align-items:center; gap:7px;">
      <div style="flex: 1; min-width:46px; height:6px; background:rgba(15,23,42,0.9); border-radius:99px; overflow:hidden; border:1px solid rgba(255,255,255,0.06);">
        <div style="width:${pct}%; height: 100%; background:${color}; border-radius:99px; transition:width 0.25s ease;"></div>
      </div>
      <span style="font-size:11px; font-weight:700; color:${color}; min-width: 30px;">${pct}%</span>
    </div>
  `;
}

export function renderTabBtn(id, label, activeTab, color, badgeCount = 0) {
  const isActive = id === activeTab;
  return `
    <button class="nav-tab ${isActive ? 'active' : ''}" data-tab="${id}" style="${isActive ? `background: linear-gradient(135deg, ${color}, #1e293b);` : ""}">
      <span>${label}</span>
      ${badgeCount > 0 ? `<span style="background:#ef4444; color:#fff; padding:1px 7px; border-radius:99px; font-size: 11px; font-weight:800;">${badgeCount}</span>` : ""}
    </button>
  `;
}
