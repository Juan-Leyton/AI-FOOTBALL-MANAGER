// Renderizador 2.5D Broadcast realista para el partido en vivo

const ballTrail = [];
let lastGoalFlash = 0;
let lastScoreHash = "";

export function renderEnhancedPitch(canvas, match, clubs) {
  if (!canvas || !match) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const homeClub = clubs?.[match.homeId] || { colors: ["#2563eb", "#ffffff"], name: "Local" };
  const awayClub = clubs?.[match.awayId] || { colors: ["#ef4444", "#ffffff"], name: "Visitante" };

  // Detectar gol reciente para efecto de vibración de red y destello
  const scoreHash = `${match.gh}-${match.ga}`;
  if (lastScoreHash && scoreHash !== lastScoreHash) {
    lastGoalFlash = 28;
  }
  lastScoreHash = scoreHash;
  if (lastGoalFlash > 0) lastGoalFlash--;

  ctx.clearRect(0, 0, W, H);

  // 1. Césped realista con franjas de corte alternas e iluminación de focos
  const stripes = 14;
  const stripeW = W / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#166534" : "#15803d";
    ctx.fillRect(i * stripeW, 0, stripeW + 1, H);
  }

  // Viñeta de iluminación de estadio nocturno
  const lightGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.12, W * 0.5, H * 0.5, W * 0.65);
  lightGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  lightGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.05)");
  lightGrad.addColorStop(1, "rgba(2, 6, 23, 0.45)");
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Líneas reglamentarias del campo
  const padX = 28;
  const padY = 22;
  const fieldW = W - padX * 2;
  const fieldH = H - padY * 2;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 2;

  // Perímetro
  ctx.strokeRect(padX, padY, fieldW, fieldH);

  // Línea de medio campo y círculo central
  ctx.beginPath();
  ctx.moveTo(W / 2, padY);
  ctx.lineTo(W / 2, H - padY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 46, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Áreas grandes y chicas
  const penW = 86;
  const penH = 196;
  const sixW = 30;
  const sixH = 96;

  // Izquierda
  ctx.strokeRect(padX, (H - penH) / 2, penW, penH);
  ctx.strokeRect(padX, (H - sixH) / 2, sixW, sixH);
  ctx.beginPath();
  ctx.arc(padX + 62, H / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(padX + 62, H / 2, 36, -0.92, 0.92);
  ctx.stroke();

  // Derecha
  ctx.strokeRect(W - padX - penW, (H - penH) / 2, penW, penH);
  ctx.strokeRect(W - padX - sixW, (H - sixH) / 2, sixW, sixH);
  ctx.beginPath();
  ctx.arc(W - padX - 62, H / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - padX - 62, H / 2, 36, Math.PI - 0.92, Math.PI + 0.92);
  ctx.stroke();

  // 3. Porterías 2.5D con redes
  drawGoalNet(ctx, padX - 14, H / 2 - 34, 14, 68, true, lastGoalFlash > 0 && match.ball?.x < 0.2);
  drawGoalNet(ctx, W - padX, H / 2 - 34, 14, 68, false, lastGoalFlash > 0 && match.ball?.x > 0.8);

  // 4. Preparar entidades ordenadas por eje Y (profundidad 2.5D)
  const ball = match.ball || { x: 0.5, y: 0.5, z: 0, ownerId: null };
  const bx = padX + ball.x * fieldW;
  const by = padY + ball.y * fieldH;
  const bz = ball.z || 0;

  // Actualizar estela del balón
  ballTrail.push({ x: bx, y: by - bz * 18, alpha: 0.55 });
  if (ballTrail.length > 10) ballTrail.shift();

  const allAgents = [
    ...(match.homeAgents || []).map((a, idx) => ({
      ...a,
      idx,
      isHome: true,
      c1: idx === 0 ? "#facc15" : (homeClub.colors?.[0] || "#2563eb"),
      c2: idx === 0 ? "#0f172a" : (homeClub.colors?.[1] || "#ffffff")
    })),
    ...(match.awayAgents || []).map((a, idx) => ({
      ...a,
      idx,
      isHome: false,
      c1: idx === 0 ? "#10b981" : (awayClub.colors?.[0] || "#ef4444"),
      c2: idx === 0 ? "#0f172a" : (awayClub.colors?.[1] || "#ffffff")
    }))
  ].filter(a => !a.expelled);

  allAgents.sort((a, b) => a.y - b.y);

  // Dibujar indicador táctico bajo el poseedor del balón
  const owner = allAgents.find(a => a.playerId === ball.ownerId);
  if (owner) {
    const ox = padX + owner.x * fieldW;
    const oy = padY + owner.y * fieldH;
    const pulse = 13 + Math.sin(Date.now() / 120) * 3;
    ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ox, oy + 7, pulse, pulse * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. Dibujar cada futbolista en 2.5D con sombra, cuerpo, dorsal y nombre
  allAgents.forEach(agent => {
    const px = padX + agent.x * fieldW;
    const py = padY + agent.y * fieldH;
    const hasBall = agent.playerId === ball.ownerId;
    const sprintBob = agent.isMoving ? Math.sin(Date.now() / 70 + agent.idx) * 1.8 : 0;

    // Sombra proyectada en el césped
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(px, py + 8, 9.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo / Camiseta
    const r = hasBall ? 10.5 : 9.5;
    ctx.fillStyle = agent.c1;
    ctx.beginPath();
    ctx.arc(px, py - 2 + sprintBob, r, 0, Math.PI * 2);
    ctx.fill();

    // Borde / Detalle secundario
    ctx.lineWidth = hasBall ? 2.4 : 1.8;
    ctx.strokeStyle = hasBall ? "#fde047" : agent.c2;
    ctx.stroke();

    // Dorsal
    const num = agent.idx === 0 ? "1" : String(agent.idx + 1);
    const isLight = ["#ffffff", "#f8fafc", "#facc15", "#fde047"].includes((agent.c1 || "").toLowerCase());
    ctx.fillStyle = isLight ? "#090d16" : "#ffffff";
    ctx.font = "900 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(num, px, py - 1.5 + sprintBob);

    // Tarjeta amarilla visible sobre el jugador si está amonestado
    if (agent.yellowCard) {
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 7, py - 12, 4, 6);
    }

    // Etiqueta limpia con apellido
    const shortName = (agent.name || "").split(" ").pop();
    if (hasBall || agent.highlightTimer > 0) {
      ctx.font = "800 9.5px system-ui, sans-serif";
      const textW = ctx.measureText(shortName).width + 10;
      ctx.fillStyle = "rgba(6, 9, 19, 0.85)";
      roundRect(ctx, px - textW / 2, py - 24, textW, 13, 4);
      ctx.fill();

      ctx.fillStyle = hasBall ? "#fde047" : "#ffffff";
      ctx.fillText(shortName, px, py - 17.5);
    }
  });

  // 6. Dibujar estela del balón y balón con elevación 2.5D (z)
  ballTrail.forEach((pt, idx) => {
    const ratio = (idx + 1) / ballTrail.length;
    ctx.fillStyle = `rgba(255, 255, 255, ${ratio * 0.25})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5 * ratio, 0, Math.PI * 2);
    ctx.fill();
  });

  // Sombra del balón en el suelo (se separa cuando sube en el aire)
  const shadowScale = Math.max(0.45, 1 - bz * 0.4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.beginPath();
  ctx.ellipse(bx + bz * 5, by + 4, 5.5 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Balón elevado
  const visualBallY = by - bz * 22;
  const ballRadius = 4.8 + bz * 1.4;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(bx, visualBallY, ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Banner flotante de acción en vivo (ej. "¡CENTRO AL ÁREA!", "¡PARADÓN!", "¡CONTRAATAQUE!")
  if (match.actionBanner && match.actionBannerTimer > 0) {
    ctx.save();
    ctx.font = "900 12px system-ui, sans-serif";
    const bannerW = ctx.measureText(match.actionBanner).width + 24;
    ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
    roundRect(ctx, (W - bannerW) / 2, 10, bannerW, 24, 99);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(match.actionBanner, W / 2, 22);
    ctx.restore();
  }
}

function drawGoalNet(ctx, x, y, w, h, isLeft, isVibrating) {
  const shake = isVibrating ? (Math.random() - 0.5) * 4 : 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(x + shake, y, w, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 1;
  for (let gx = x; gx <= x + w; gx += 4) {
    ctx.beginPath();
    ctx.moveTo(gx + shake, y);
    ctx.lineTo(gx + shake, y + h);
    ctx.stroke();
  }
  for (let gy = y; gy <= y + h; gy += 6) {
    ctx.beginPath();
    ctx.moveTo(x + shake, gy);
    ctx.lineTo(x + w + shake, gy);
    ctx.stroke();
  }

  // Postes blancos gruesos
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.6;
  ctx.strokeRect(x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}