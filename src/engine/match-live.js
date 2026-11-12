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
  ],
  "3-5-2": [
    { pos: "POR", x: 0.05, y: 0.5 },
    { pos: "DEF", x: 0.2, y: 0.22 }, { pos: "DEF", x: 0.18, y: 0.5 }, { pos: "DEF", x: 0.2, y: 0.78 },
    { pos: "MED", x: 0.38, y: 0.12 }, { pos: "MED", x: 0.35, y: 0.34 }, { pos: "MED", x: 0.32, y: 0.5 }, { pos: "MED", x: 0.35, y: 0.66 }, { pos: "MED", x: 0.38, y: 0.88 },
    { pos: "DEL", x: 0.54, y: 0.38 }, { pos: "DEL", x: 0.54, y: 0.62 }
  ]
};

function createAgentFromPlayer(player, slot, i, isHome) {
  const startX = isHome ? slot.x : 1 - slot.x;
  const ovr = player?.ovr || 78;
  const stamina = player?.stamina ?? 100;
  // Velocidad real escalada por OVR y estado físico
  const skillFactor = 0.85 + ((ovr - 70) * 0.012);
  const staminaFactor = 0.75 + (stamina / 100) * 0.25;

  return {
    id: i,
    playerId: player?.id || null,
    name: player?.name || `Jugador ${i + 1}`,
    ovr,
    stamina,
    posType: slot.pos,
    baseX: startX,
    baseY: slot.y,
    x: startX,
    y: slot.y,
    vx: 0,
    vy: 0,
    speed: (0.0078 + Math.random() * 0.0025) * skillFactor * staminaFactor,
    noiseOffset: Math.random() * 100
  };
}

function initAgents(club, playersMap, isHome) {
  const formKey = club?.formation || "4-3-3";
  const base = FORMATIONS[formKey] || FORMATIONS["4-3-3"];
  const clubPlayers = Object.values(playersMap || {}).filter(p => p.clubId === club.id);
  const starters = clubPlayers.filter(p => p.starter).slice(0, 11);

  return base.map((slot, i) => createAgentFromPlayer(starters[i], slot, i, isHome));
}

export function startLiveMatch(homeId, awayId, onFinish) {
  const state = store.get();
  const homeClub = state.clubs[homeId];
  const awayClub = state.clubs[awayId];

  const liveData = {
    homeId,
    awayId,
    homeName: homeClub.name,
    awayName: awayClub.name,
    homeColors: homeClub.colors,
    awayColors: awayClub.colors,
    homeAgents: initAgents(homeClub, state.players, true),
    awayAgents: initAgents(awayClub, state.players, false),
    homeTactic: "Equilibrado",
    awayTactic: "Equilibrado",
    subsUsed: 0,
    maxSubs: 5,
    goalScorers: [], // { playerId, name, clubId, minute }
    ball: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
    minute: 0,
    tick: 0,
    gh: 0,
    ga: 0,
    paused: false,
    finished: false,
    events: [`0' - ¡Comienza el encuentro entre ${homeClub.name} y ${awayClub.name}!`]
  };

  store.update(["liveMatch"], draft => { draft.liveMatch = liveData; });
  if (matchInterval) clearInterval(matchInterval);

  matchInterval = setInterval(() => {
    const currentState = store.get();
    const m = currentState.liveMatch;
    if (!m || m.finished || m.paused || !m.ball) return;

    let { ball, homeAgents, awayAgents, tick, gh, ga, events, homeTactic, awayTactic, goalScorers } = m;
    const newEvents = [...events];
    const newScorers = [...(goalScorers || [])];

    const nextTick = (tick || 0) + 1;
    const currentMin = Math.floor(nextTick / 10);

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 0.93;
    ball.vy *= 0.93;

    if (ball.y < 0.03 || ball.y > 0.97) ball.vy *= -0.6;
    ball.x = Math.max(0.01, Math.min(0.99, ball.x));
    ball.y = Math.max(0.03, Math.min(0.97, ball.y));

    const updateTeam = (agents, isHome, tactic) => {
      let closestAgent = null;
      let minDist = Infinity;

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
        // Desgaste progresivo durante los 90 minutos
        if (nextTick % 25 === 0) {
          a.stamina = Math.max(25, (a.stamina ?? 100) - 0.6);
        }
        const fatigueMultiplier = 0.72 + ((a.stamina ?? 100) / 100) * 0.28;
        const effectiveSpeed = a.speed * fatigueMultiplier;

        if (a === closestAgent) {
          const dist = Math.hypot(ball.x - a.x, ball.y - a.y);
          a.vx = ((ball.x - a.x) / (dist || 1)) * effectiveSpeed;
          a.vy = ((ball.y - a.y) / (dist || 1)) * effectiveSpeed;
        } else if (a.posType === "POR") {
          a.vy = (Math.max(0.35, Math.min(0.65, ball.y)) - a.y) * 0.1;
          a.vx = (a.baseX - a.x) * 0.1;
        } else {
          const shiftX = (ball.x - 0.5) * 0.35;
          const shiftY = (ball.y - 0.5) * 0.25;
          const noiseX = Math.sin(nextTick * 0.05 + a.noiseOffset) * 0.015;
          const noiseY = Math.cos(nextTick * 0.05 + a.noiseOffset) * 0.015;

          const targetX = (a.baseX + tacticShift) + shiftX + noiseX;
          const targetY = a.baseY + shiftY + noiseY;

          a.vx = (targetX - a.x) * 0.04;
          a.vy = (targetY - a.y) * 0.04;
        }

        a.x += a.vx;
        a.y += a.vy;

        const distToBall = Math.hypot(ball.x - a.x, ball.y - a.y);
        const ballSpeed = Math.hypot(ball.vx, ball.vy);

        if (distToBall < 0.03 && ballSpeed < 0.04) {
          const isAttackingZone = isHome ? (a.x > 0.7) : (a.x < 0.3);

          if (isAttackingZone) {
            const targetGoalX = isHome ? 1 : 0;
            const angle = Math.atan2(0.5 - a.y, targetGoalX - a.x);
            const power = 0.05 + Math.random() * 0.03;
            ball.vx = Math.cos(angle) * power;
            ball.vy = Math.sin(angle) * power;

            // Probabilidad de gol influida por el OVR del rematador y la táctica
            const ovrBonus = ((a.ovr || 78) - 75) * 0.004;
            const tacticBonus = tactic === "Ofensivo" ? 0.025 : tactic === "Defensivo" ? -0.02 : 0;
            const goalChance = Math.max(0.05, Math.min(0.24, 0.11 + ovrBonus + tacticBonus));

            if (Math.random() < goalChance) {
              const scorerLast = a.name.split(" ").pop();
              if (isHome) {
                gh++;
                newEvents.unshift(`⚽ ${currentMin}' - ¡GOL de ${scorerLast} (${m.homeName})!`);
                newScorers.push({ playerId: a.playerId, name: a.name, clubId: m.homeId, minute: currentMin });
              } else {
                ga++;
                newEvents.unshift(`⚽ ${currentMin}' - ¡GOL de ${scorerLast} (${m.awayName})!`);
                newScorers.push({ playerId: a.playerId, name: a.name, clubId: m.awayId, minute: currentMin });
              }
              resetBall(ball, homeAgents, awayAgents);
            } else if (Math.random() < 0.05) {
              newEvents.unshift(`🧤 ${currentMin}' - Remate de ${a.name.split(" ").pop()} desviado por el portero.`);
            }
          } else {
            if (Math.random() < 0.62) {
              const teammates = agents.filter(t => t.id !== a.id && (isHome ? t.x > a.x : t.x < a.x));
              if (teammates.length > 0) {
                const target = teammates[Math.floor(Math.random() * teammates.length)];
                const angle = Math.atan2(target.y - a.y, target.x - a.x);
                const passPower = 0.03 + Math.random() * 0.02;
                ball.vx = Math.cos(angle) * passPower;
                ball.vy = Math.sin(angle) * passPower;
              } else {
                ball.vx = (isHome ? 1 : -1) * (0.03 + Math.random() * 0.02);
                ball.vy = (Math.random() - 0.5) * 0.04;
              }
            } else {
              const dirX = isHome ? 1 : -1;
              const angle = Math.atan2((Math.random() - 0.5) * 0.5, dirX);
              ball.vx = Math.cos(angle) * 0.02;
              ball.vy = Math.sin(angle) * 0.02;
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
        ...m,
        minute: currentMin,
        tick: nextTick,
        gh,
        ga,
        ball,
        homeAgents,
        awayAgents,
        goalScorers: newScorers,
        events: newEvents.slice(0, 7),
        finished: isFinished
      };
    });

    if (isFinished && onFinish) onFinish(gh, ga);
  }, 50);
}

// Realizar sustitución en vivo en el equipo del usuario
export function makeLiveSubstitution(outAgentIndex, inPlayerId) {
  const state = store.get();
  const m = state.liveMatch;
  if (!m || m.finished) return { ok: false, msg: "El partido ya terminó." };
  if ((m.subsUsed || 0) >= (m.maxSubs || 5)) return { ok: false, msg: "Ya agotaste tus 5 cambios." };

  const isUserHome = m.homeId === state.userClubId;
  const agents = isUserHome ? [...m.homeAgents] : [...m.awayAgents];
  const outAgent = agents[outAgentIndex];
  const inPlayer = state.players[inPlayerId];

  if (!outAgent || !inPlayer) return { ok: false, msg: "Selección inválida." };

  const newAgent = {
    ...outAgent,
    playerId: inPlayer.id,
    name: inPlayer.name,
    ovr: inPlayer.ovr,
    stamina: inPlayer.stamina ?? 100,
    speed: (0.0078 + Math.random() * 0.0025) * (0.85 + ((inPlayer.ovr - 70) * 0.012))
  };

  agents[outAgentIndex] = newAgent;

  store.update(["liveMatch"], draft => {
    if (isUserHome) draft.liveMatch.homeAgents = agents;
    else draft.liveMatch.awayAgents = agents;
    draft.liveMatch.subsUsed = (draft.liveMatch.subsUsed || 0) + 1;
    draft.liveMatch.events.unshift(
      `🔄 ${draft.liveMatch.minute}' - Cambio: Entra ${inPlayer.name.split(" ").pop()} por ${outAgent.name.split(" ").pop()}`
    );
  });

  return { ok: true };
}

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

  const drawTeamAgents = (agents, colors) => {
    if (!Array.isArray(agents)) return;
    agents.forEach(a => {
      const px = 18 + a.x * (w - 36);
      const py = 18 + a.y * (h - 36);
      ctx.fillStyle = colors?.[0] || "#2563eb";
      ctx.beginPath(); ctx.arc(px, py, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = colors?.[1] || "#ffffff"; ctx.lineWidth = 2; ctx.stroke();

      // Apellido sutil bajo el jugador
      if (a.name) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(a.name.split(" ").pop(), px, py + 15);
      }
    });
  };

  drawTeamAgents(liveMatch.homeAgents, liveMatch.homeColors);
  drawTeamAgents(liveMatch.awayAgents, liveMatch.awayColors);

  const bx = 18 + bxVal * (w - 36); const by = 18 + byVal * (h - 36);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(bx + 2, by + 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000000"; ctx.lineWidth = 1; ctx.stroke();
}