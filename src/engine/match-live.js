import { store } from "../core/state.js";

let matchInterval = null;

export const FORMATIONS = {
  "4-3-3": [
    { pos: "POR", x: 0.05, y: 0.5 },
    { pos: "DEF", x: 0.22, y: 0.15 }, { pos: "DEF", x: 0.18, y: 0.38 }, { pos: "DEF", x: 0.18, y: 0.62 }, { pos: "DEF", x: 0.22, y: 0.85 },
    { pos: "MED", x: 0.38, y: 0.3 }, { pos: "MED", x: 0.34, y: 0.5 }, { pos: "MED", x: 0.38, y: 0.7 },
    { pos: "DEL", x: 0.52, y: 0.2 }, { pos: "DEL", x: 0.55, y: 0.5 }, { pos: "DEL", x: 0.52, y: 0.8 }
  ],
  "4-4-2": [
    { pos: "POR", x: 0.05, y: 0.5 },
    { pos: "DEF", x: 0.22, y: 0.15 }, { pos: "DEF", x: 0.18, y: 0.38 }, { pos: "DEF", x: 0.18, y: 0.62 }, { pos: "DEF", x: 0.22, y: 0.85 },
    { pos: "MED", x: 0.4, y: 0.15 }, { pos: "MED", x: 0.36, y: 0.38 }, { pos: "MED", x: 0.36, y: 0.62 }, { pos: "MED", x: 0.4, y: 0.85 },
    { pos: "DEL", x: 0.54, y: 0.38 }, { pos: "DEL", x: 0.54, y: 0.62 }
  ]
};

function initAgents(club, isHome) {
  const formKey = club?.formation || "4-3-3";
  const base = FORMATIONS[formKey] || FORMATIONS["4-3-3"];
  return base.map((slot, i) => {
    const startX = isHome ? slot.x : 1 - slot.x;
    return {
      id: i, posType: slot.pos,
      baseX: startX, baseY: slot.y,
      x: startX, y: slot.y,
      vx: 0, vy: 0,
      speed: 0.008 + Math.random() * 0.004,
      noiseOffset: Math.random() * 100 
    };
  });
}

export function startLiveMatch(homeId, awayId, onFinish) {
  const state = store.get();
  const homeClub = state.clubs[homeId];
  const awayClub = state.clubs[awayId];

  const liveData = {
    homeId, awayId,
    homeName: homeClub.name, awayName: awayClub.name,
    homeColors: homeClub.colors, awayColors: awayClub.colors,
    homeAgents: initAgents(homeClub, true),
    awayAgents: initAgents(awayClub, false),
    // Tácticas por defecto
    homeTactic: "Equilibrado", awayTactic: "Equilibrado",
    ball: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
    minute: 0, tick: 0, gh: 0, ga: 0,
    paused: false, finished: false,
    events: [`0' - ¡Rueda el balón!`]
  };

  store.update(["liveMatch"], draft => { draft.liveMatch = liveData; });
  if (matchInterval) clearInterval(matchInterval);

  matchInterval = setInterval(() => {
    const currentState = store.get();
    const m = currentState.liveMatch;
    if (!m || m.finished || m.paused || !m.ball) return;

    let { ball, homeAgents, awayAgents, tick, gh, ga, events, homeTactic, awayTactic } = m;
    const newEvents = [...events];
    
    const nextTick = (tick || 0) + 1;
    const currentMin = Math.floor(nextTick / 10);

    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= 0.93; ball.vy *= 0.93;

    if (ball.y < 0.03 || ball.y > 0.97) ball.vy *= -0.6;
    ball.x = Math.max(0.01, Math.min(0.99, ball.x));
    ball.y = Math.max(0.03, Math.min(0.97, ball.y));

    const updateTeam = (agents, isHome, tactic) => {
      let closestAgent = null;
      let minDist = Infinity;
      
      // Ajuste táctico: desplaza la base del equipo hacia adelante o atrás
      let tacticShift = 0;
      if (tactic === "Ofensivo") tacticShift = isHome ? 0.15 : -0.15;
      if (tactic === "Defensivo") tacticShift = isHome ? -0.15 : 0.15;

      agents.forEach(a => {
        if (a.posType !== "POR") {
          const d = Math.hypot(ball.x - a.x, ball.y - a.y);
          if (d < minDist) { minDist = d; closestAgent = a; }
        }
      });

      agents.forEach(a => {
        if (a === closestAgent) {
          const dist = Math.hypot(ball.x - a.x, ball.y - a.y);
          a.vx = ((ball.x - a.x) / (dist || 1)) * a.speed;
          a.vy = ((ball.y - a.y) / (dist || 1)) * a.speed;
        } else if (a.posType === "POR") {
          a.vy = (Math.max(0.35, Math.min(0.65, ball.y)) - a.y) * 0.1;
          a.vx = (a.baseX - a.x) * 0.1;
        } else {
          const shiftX = (ball.x - 0.5) * 0.35;
          const shiftY = (ball.y - 0.5) * 0.25;
          const noiseX = Math.sin(nextTick * 0.05 + a.noiseOffset) * 0.015;
          const noiseY = Math.cos(nextTick * 0.05 + a.noiseOffset) * 0.015;
          
          // Aplicamos el tacticShift a la posición base
          const targetX = (a.baseX + tacticShift) + shiftX + noiseX;
          const targetY = a.baseY + shiftY + noiseY;
          
          a.vx = (targetX - a.x) * 0.04;
          a.vy = (targetY - a.y) * 0.04;
        }

        a.x += a.vx; a.y += a.vy;

        const distToBall = Math.hypot(ball.x - a.x, ball.y - a.y);
        const ballSpeed = Math.hypot(ball.vx, ball.vy);
        
        if (distToBall < 0.03 && ballSpeed < 0.04) {
          const isAttackingZone = isHome ? (a.x > 0.7) : (a.x < 0.3);
          
          if (isAttackingZone) {
            const targetGoalX = isHome ? 1 : 0;
            const angle = Math.atan2(0.5 - a.y, targetGoalX - a.x);
            const power = 0.05 + Math.random() * 0.03;
            ball.vx = Math.cos(angle) * power; ball.vy = Math.sin(angle) * power;
            
            if (Math.random() < 0.12) { 
              if (isHome) { gh++; newEvents.unshift(`⚽ ${currentMin}' - ¡GOLAZO de ${m.homeName}!`); } 
              else { ga++; newEvents.unshift(`⚽ ${currentMin}' - ¡GOOOL de ${m.awayName}!`); }
              resetBall(ball, homeAgents, awayAgents);
            } else if (Math.random() < 0.05) {
              newEvents.unshift(`🧤 ${currentMin}' - ¡Uff! Cerca del palo.`);
            }
          } else {
            if (Math.random() < 0.6) {
              const teammates = agents.filter(t => t.id !== a.id && (isHome ? t.x > a.x : t.x < a.x));
              if (teammates.length > 0) {
                const target = teammates[Math.floor(Math.random() * teammates.length)];
                const angle = Math.atan2(target.y - a.y, target.x - a.x);
                const passPower = 0.03 + Math.random() * 0.02;
                ball.vx = Math.cos(angle) * passPower; ball.vy = Math.sin(angle) * passPower;
              } else {
                ball.vx = (isHome ? 1 : -1) * (0.03 + Math.random() * 0.02);
                ball.vy = (Math.random() - 0.5) * 0.04;
              }
            } else {
              const dirX = isHome ? 1 : -1;
              const angle = Math.atan2((Math.random() - 0.5) * 0.5, dirX);
              const dribblePower = 0.02;
              ball.vx = Math.cos(angle) * dribblePower; ball.vy = Math.sin(angle) * dribblePower;
            }
          }
        }
      });
    };

    updateTeam(homeAgents, true, homeTactic);
    updateTeam(awayAgents, false, awayTactic);

    const isFinished = currentMin >= 90;
    if (isFinished) {
      newEvents.unshift(`🏁 90' - Final del partido: ${m.homeName} ${gh} - ${ga} ${m.awayName}`);
      clearInterval(matchInterval);
    }

    store.update(["liveMatch"], draft => {
      draft.liveMatch = {
        ...m, minute: currentMin, tick: nextTick,
        gh, ga, ball, homeAgents, awayAgents,
        events: newEvents.slice(0, 6), finished: isFinished
      };
    });

    if (isFinished && onFinish) onFinish(gh, ga);
  }, 50); 
}

// NUEVA FUNCIÓN: Para cambiar táctica desde la UI
export function setTactic(isHome, tactic) {
  store.update(["liveMatch"], draft => {
    if (draft.liveMatch) {
      if (isHome) draft.liveMatch.homeTactic = tactic;
      else draft.liveMatch.awayTactic = tactic;
    }
  });
}

function resetBall(ball, homeAgents, awayAgents) {
  ball.x = 0.5; ball.y = 0.5; ball.vx = 0; ball.vy = 0;
  (homeAgents || []).forEach(a => { a.x = a.baseX; a.y = a.baseY; a.vx = 0; a.vy = 0; });
  (awayAgents || []).forEach(a => { a.x = a.baseX; a.y = a.baseY; a.vx = 0; a.vy = 0; });
}

export function togglePauseMatch() {
  store.update(["liveMatch"], draft => { if (draft.liveMatch) draft.liveMatch.paused = !draft.liveMatch.paused; });
}

// (Conserva tu función drawPitch exactamente igual al final del archivo)
export function drawPitch(canvas, liveMatch) {
  if (!canvas || !liveMatch) return;
  const bxVal = liveMatch.ball?.x ?? 0.5;
  const byVal = liveMatch.ball?.y ?? 0.5;
  const ctx = canvas.getContext("2d");
  const w = canvas.width; const h = canvas.height;

  ctx.fillStyle = "#166534"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#15803d";
  for (let i = 0; i < 12; i += 2) ctx.fillRect((w / 12) * i, 0, w / 12, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.beginPath(); ctx.moveTo(w / 2, 18); ctx.lineTo(w / 2, h - 18); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(18, h / 2 - 65, 50, 130); ctx.strokeRect(w - 68, h / 2 - 65, 50, 130);

  if (Array.isArray(liveMatch.homeAgents)) {
    liveMatch.homeAgents.forEach(a => {
      ctx.fillStyle = liveMatch.homeColors?.[0] || "#2563eb";
      ctx.beginPath(); ctx.arc(18 + a.x * (w - 36), 18 + a.y * (h - 36), 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = liveMatch.homeColors?.[1] || "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    });
  }

  if (Array.isArray(liveMatch.awayAgents)) {
    liveMatch.awayAgents.forEach(a => {
      ctx.fillStyle = liveMatch.awayColors?.[0] || "#dc2626";
      ctx.beginPath(); ctx.arc(18 + a.x * (w - 36), 18 + a.y * (h - 36), 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = liveMatch.awayColors?.[1] || "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    });
  }

  const bx = 18 + bxVal * (w - 36); const by = 18 + byVal * (h - 36);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(bx + 2, by + 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000000"; ctx.lineWidth = 1; ctx.stroke();
}