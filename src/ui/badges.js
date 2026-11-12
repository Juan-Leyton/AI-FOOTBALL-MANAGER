export function renderClubBadge(club, size = 32) {
  if (!club) return "";
  const c1 = club.colors?.[0] || "#2563eb";
  const c2 = club.colors?.[1] || "#ffffff";
  const initials = (club.name || "FC")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" style="vertical-align: middle; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
      <path d="M32 4 L56 14 V32 C56 47 45 56 32 60 C19 56 8 47 8 32 V14 Z" fill="${c1}" stroke="${c2}" stroke-width="3.5"/>
      <path d="M32 8 L52 17 V32 C52 44 43 52 32 55.5 Z" fill="rgba(255,255,255,0.08)"/>
      <text x="32" y="38" text-anchor="middle" fill="${c2}" font-family="system-ui, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5">
        ${initials}
      </text>
    </svg>
  `;
}