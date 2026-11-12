let activeBanner = null;
let lastTrackedEvent = "";

function isLightColor(hex) {
  if (!hex || typeof hex !== "string") return false;
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

function detectEventBanner(m) {
  if (!m?.events?.length) return;
  const latest = m.events[0];
  if (!latest || latest === lastTrackedEvent) return;
  lastTrackedEvent = latest;

  if (latest.includes("⚽") || latest.toUpperCase().includes("GOL")) {
    activeBanner = {
      text: latest,
      bg: "rgba(16, 185, 129, 0.94)",
      border: "#a7f3d0",
      expiresAt: Date.now() + 2600
    };
  } else if (latest.includes("🟥")) {
    activeBanner = {
      text: latest,
      bg: "rgba(220, 38, 38, 0.94)",
      border: "#fecaca",
      expiresAt: Date.now() + 2600
    };
  }
}

export function renderEnhancedPitch(canvas, m, clubs = {}) {
  if (!canvas || !m) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const homeClub = clubs[m.homeId] || { colors: ["#2563eb", "#ffffff"] };
  const awayClub = clubs[m.awayId] || { colors: ["#dc2626", "#ffffff"] };

  detectEventBanner(m);

  // 1. Césped en franjas verticales con iluminación tipo estadio
  const stripes = 12;
  const stripeW = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#14532d" : "#166534";
    ctx.fillRect(i * stripeW, 0, stripeW + 1, h);
  }

  const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62);
  grad.addColorStop(0, "rgba(255,255,255,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Líneas reglamentarias del campo
  const pad = 18;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
  ctx.lineWidth = 2;

  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  // Línea de medio campo y círculo central
  ctx.beginPath();
  ctx.moveTo(w / 2, pad);
  ctx.lineTo(w / 2, h - pad);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 46, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Áreas grandes y chicas
  const boxW = 92;
  const boxH = 190;
  const smallW = 34;
  const smallH = 92;

  ctx.strokeRect(pad, (h - boxH) / 2, boxW, boxH);
  ctx.strokeRect(w - pad - boxW, (h - boxH) / 2, boxW, boxH);
  ctx.strokeRect(pad, (h - smallH) / 2, smallW, smallH);
  ctx.strokeRect(w - pad - smallW, (h - smallH) / 2, smallW, smallH);

  // Porterías
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(pad - 6, h / 2 - 26, 6, 52);
  ctx.fillRect(w - pad, h / 2 - 26, 6, 52);

  // 3. Coordenadas del balón
  const bx = (m.ball?.x ?? 0.5) * w;
  const by = (m.ball?.y ?? 0.5) * h;

  // 4. Dibujar futbolistas con dorsales, aura del balón y barra de fatiga
  const drawTeam = (agents, club, isHome) => {
    const primary = club.colors?.[0] || (isHome ? "#2563eb" : "#dc2626");
    const secondary = club.colors?.[1] || "#ffffff";
    const textCol = isLightColor(primary) ? "#090d16" : "#ffffff";

    (agents || []).forEach((agent, idx) => {
      if (agent.expelled) return;

      const px = (agent.x ?? 0.5) * w;
      const py = (agent.y ?? 0.5) * h;
      const distBall = Math.hypot(px - bx, py - by);
      const hasBall = distBall < 18;
      const isGK = idx === 0 || agent.posType === "POR";
      const kitFill = isGK ? (isHome ? "#facc15" : "#10b981") : primary;
      const kitStroke = isGK ? "#090d16" : secondary;
      const numFill = isGK ? "#090d16" : textCol;
      const dorsal = agent.number || (idx + 1);

      // Halo luminoso si conduce el balón
      if (hasBall) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 19, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(250, 204, 21, 0.28)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#fde047";
        ctx.stroke();
        ctx.restore();
      }

      // Sombra bajo el jugador
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.ellipse(px, py + 11, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ficha circular estilo camiseta
      ctx.beginPath();
      ctx.arc(px, py, 12.5, 0, Math.PI * 2);
      ctx.fillStyle = kitFill;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = kitStroke;
      ctx.stroke();

      // Dorsal centrado
      ctx.fillStyle = numFill;
      ctx.font = "900 10.5px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(dorsal), px, py + 0.5);

      // Etiqueta de apellido
      const shortName = (agent.name || "").split(" ").pop();
      if (shortName) {
        ctx.font = "700 9.5px system-ui, sans-serif";
        ctx.fillStyle = "rgba(6, 9, 19, 0.78)";
        const tw = ctx.measureText(shortName).width + 8;
        ctx.fillRect(px - tw / 2, py + 14, tw, 12);
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(shortName, px, py + 20);
      }

      // Barra de fatiga si stamina < 55%
      const stam = agent.stamina ?? 100;
      if (stam < 55) {
        const barW = 24;
        const pct = Math.max(0.08, stam / 100);
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(px - barW / 2, py - 19, barW, 4);
        ctx.fillStyle = stam < 38 ? "#ef4444" : "#f59e0b";
        ctx.fillRect(px - barW / 2, py - 19, barW * pct, 4);
      }

      // Indicador de tarjeta amarilla
      if ((agent.yellowCards || 0) > 0) {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(px + 9, py - 13, 5, 7);
      }
    });
  };

  drawTeam(m.homeAgents, homeClub, true);
  drawTeam(m.awayAgents, awayClub, false);

  // 5. Balón con sombra y brillo
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 5, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#090d16";
  ctx.stroke();

  // 6. Banner televisivo animado de Gol o Tarjeta Roja
  if (activeBanner && Date.now() < activeBanner.expiresAt) {
    ctx.save();
    const bw = Math.min(w - 60, 520);
    const bh = 36;
    const rx = (w - bw) / 2;
    const ry = 26;

    ctx.fillStyle = activeBanner.bg;
    ctx.beginPath();
    ctx.roundRect(rx, ry, bw, bh, 10);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = activeBanner.border;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(activeBanner.text, w / 2, ry + bh / 2);
    ctx.restore();
  }
}