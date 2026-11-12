import { store } from "../core/state.js";
import { playGoalSound, playWhistleSound } from "./audio.js";
import { isPlayerUnavailable } from "./medical.js";

export const FORMATIONS = {
  "4-3-3": [
    { pos: "POR", x: 0.045, y: 0.50 },
    { pos: "DEF", x: 0.22, y: 0.12 },
    { pos: "DEF", x: 0.18, y: 0.37 },
    { pos: "DEF", x: 0.18, y: 0.63 },
    { pos: "DEF", x: 0.22, y: 0.88 },
    { pos: "MED", x: 0.37, y: 0.24 },
    { pos: "MED", x: 0.34, y: 0.50 },
    { pos: "MED", x: 0.37, y: 0.76 },
    { pos: "DEL", x: 0.54, y: 0.14 },
    { pos: "DEL", x: 0.56, y: 0.50 },
    { pos: "DEL", x: 0.54, y: 0.86 }
  ],
  "4-4-2": [
    { pos: "POR", x: 0.045, y: 0.50 },
    { pos: "DEF", x: 0.22, y: 0.12 },
    { pos: "DEF", x: 0.18, y: 0.37 },
    { pos: "DEF", x: 0.18, y: 0.63 },
    { pos: "DEF", x: 0.22, y: 0.88 },
    { pos: "MED", x: 0.39, y: 0.14 },
    { pos: "MED", x: 0.36, y: 0.38 },
    { pos: "MED", x: 0.36, y: 0.62 },
    { pos: "MED", x: 0.39, y: 0.86 },
    { pos: "DEL", x: 0.55, y: 0.36 },
    { pos: "DEL", x: 0.55, y: 0.64 }
  ],
  "3-5-2": [
    { pos: "POR", x: 0.045, y: 0.50 },
    { pos: "DEF", x: 0.18, y: 0.24 },
    { pos: "DEF", x: 0.17, y: 0.50 },
    { pos: "DEF", x: 0.18, y: 0.76 },
    { pos: "MED", x: 0.36, y: 0.11 },
    { pos: "MED", x: 0.33, y: 0.32 },
    { pos: "MED", x: 0.35, y: 0.50 },
    { pos: "MED", x: 0.33, y: 0.68 },
    { pos: "MED", x: 0.36, y: 0.89 },
    { pos: "DEL", x: 0.55, y: 0.36 },
    { pos: "DEL", x: 0.55, y: 0.64 }
  ],
  "4-2-3-1": [
    { pos: "POR", x: 0.045, y: 0.50 },
    { pos: "DEF", x: 0.22, y: 0.12 },
    { pos: "DEF", x: 0.18, y: 0.37 },
    { pos: "DEF", x: 0.18, y: 0.63 },
    { pos: "DEF", x: 0.22, y: 0.88 },
    { pos: "MED", x: 0.31, y: 0.36 },
    { pos: "MED", x: 0.31, y: 0.64 },
    { pos: "MED", x: 0.46, y: 0.16 },
    { pos: "MED", x: 0.47, y: 0.50 },
    { pos: "MED", x: 0.46, y: 0.84 },
    { pos: "DEL", x: 0.57, y: 0.50 }
  ]
};

let matchInterval = null;

export function assignPlayersToSlots(players, formationKey = "4-3-3") {
  const slots = FORMATIONS[formationKey] || FORMATIONS["4-3-3"];
  const available = [...players];
  return slots.map(slot => {
    let idx = available.findIndex(p => p.pos === slot.pos);
    let outOfPosition = false;
    if (idx === -1 && available.length > 0) {
      idx = 0;
      outOfPosition = true;
    }
    const player = idx !== -1 ? available.splice(idx, 1)[0] : null;
    return { slot, player, outOfPosition };
  });
}

function buildTeamAgents(state, clubId, isHome) {
  const club = state.clubs[clubId];
  const form = club?.formation || "4-3-3";
  let starters = Object.values(state.players || {}).filter(
    p => p.clubId === clubId && p.starter && !isPlayerUnavailable(p)
  );

  if (starters.length < 11) {
    const extras = Object.values(state.players || {})
      .filter(p => p.clubId === clubId && !p.starter && !isPlayerUnavailable(p))
      .sort((a, b) => b.ovr - a.ovr);
    starters = [...starters, ...extras.slice(0, 11 - starters.length)];
  }

  const assigned = assignPlayersToSlots(starters.slice(0, 11), form);
  const sidePrefix = isHome ? "H" : "A";

  return assigned.map(({ slot, player, outOfPosition }, idx) => {
    const homeX = isHome ? slot.x : 1 - slot.x;
    const homeY = isHome ? slot.y : 1 - slot.y;
    const isWide = slot.y <= 0.22 || slot.y >= 0.78;
    return {
      agentId: `${sidePrefix}_${idx}`,
      playerId: player?.id || `${sidePrefix}_bot_${idx}`,
      name: player?.name || `Jugador ${idx + 1}`,
      posType: idx === 0 ? "POR" : slot.pos,
      isWide,
      ovr: player ? (outOfPosition ? Math.max(60, player.ovr - 8) : player.ovr) : 75,
      stamina: player?.stamina ?? 95,
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      driftY: (Math.random() - 0.5) * 0.14,
      sprintBoost: 0,
      isMoving: false,
      expelled: false,
      yellowCard: false,
      highlightTimer: 0
    };
  });
}

export function startLiveMatch(homeId, awayId, onFinishCallback = null, isKnockout = false) {
  if (matchInterval) clearInterval(matchInterval);

  const state = store.get();
  const homeClub = state.clubs[homeId];
  const awayClub = state.clubs[awayId];

  const homeAgents = buildTeamAgents(state, homeId, true);
  const awayAgents = buildTeamAgents(state, awayId, false);
  const kickoffAgent = homeAgents[6] || homeAgents[5] || homeAgents[1];

  playWhistleSound();

  store.update(["liveMatch"], draft => {
    draft.liveMatch = {
      homeId,
      awayId,
      homeName: homeClub?.name || "Local",
      awayName: awayClub?.name || "Visitante",
      gh: 0,
      ga: 0,
      minute: 1,
      tickCount: 0,
      paused: false,
      finished: false,
      isKnockout,
      subsUsed: 0,
      maxSubs: 5,
      homeTactic: "Equilibrado",
      awayTactic: "Equilibrado",
      counterAttackTimer: 0,
      actionBanner: "¡ARRANCA EL PARTIDO!",
      actionBannerTimer: 85,
      recentPassers: [],
      stats: {
        homePoss: 50,
        awayPoss: 50,
        homeShots: 0,
        awayShots: 0,
        homeFouls: 0,
        awayFouls: 0
      },
      ball: {
        x: 0.5,
        y: 0.5,
        z: 0,
        ownerAgentId: kickoffAgent?.agentId || null,
        ownerId: kickoffAgent?.playerId || null,
        ownerIsHome: true,
        holdTicks: 0,
        inFlight: false,
        flightTargetX: 0.5,
        flightTargetY: 0.5,
        flightReceiverAgentId: null,
        isShot: false,
        cooldown: 10
      },
      homeAgents,
      awayAgents,
      events: [`⏱️ 1' ¡Rueda el balón en el estadio! ${homeClub?.name} vs ${awayClub?.name}.`]
    };
  });

  // Mantenemos 35ms (~30 FPS) para fluidez total, pero reducimos las velocidades por frame
  matchInterval = setInterval(() => {
    stepLiveMatchSimulation(onFinishCallback);
  }, 35);
}

export function togglePauseMatch() {
  store.update(["liveMatch"], draft => {
    if (draft.liveMatch && !draft.liveMatch.finished) {
      draft.liveMatch.paused = !draft.liveMatch.paused;
    }
  });
}

export function setTactic(isHome, tactic) {
  store.update(["liveMatch"], draft => {
    if (!draft.liveMatch) return;
    if (isHome) draft.liveMatch.homeTactic = tactic;
    else draft.liveMatch.awayTactic = tactic;
    draft.liveMatch.actionBanner = `📋 Cambio táctico: ${tactic}`;
    draft.liveMatch.actionBannerTimer = 65;
  });
}

export function makeLiveSubstitution(outIdx, inPlayerId) {
  const state = store.get();
  const m = state.liveMatch;
  if (!m) return { ok: false, msg: "No hay partido activo." };
  if ((m.subsUsed || 0) >= (m.maxSubs || 5)) {
    return { ok: false, msg: "Ya agotaste tus 5 cambios." };
  }

  const inPlayer = state.players?.[inPlayerId];
  if (!inPlayer) return { ok: false, msg: "Jugador suplente no válido." };

  const isUserHome = m.homeId === state.userClubId;

  store.update(["liveMatch"], draft => {
    const lm = draft.liveMatch;
    const list = isUserHome ? lm.homeAgents : lm.awayAgents;
    const oldAgent = list[outIdx];
    if (!oldAgent || oldAgent.expelled) return;

    list[outIdx] = {
      ...oldAgent,
      playerId: inPlayer.id,
      name: inPlayer.name,
      ovr: inPlayer.ovr,
      stamina: inPlayer.stamina ?? 100,
      yellowCard: false,
      highlightTimer: 100
    };
    lm.subsUsed = (lm.subsUsed || 0) + 1;
    lm.actionBanner = `🔄 Entra ${inPlayer.name}`;
    lm.actionBannerTimer = 75;
    lm.events.unshift(`🔄 ${lm.minute}' Cambio: Entra ${inPlayer.name} por ${oldAgent.name}.`);
  });

  return { ok: true, msg: `🔄 ${inPlayer.name} ingresó al terreno de juego.` };
}

function stepLiveMatchSimulation(onFinishCallback) {
  const state = store.get();
  const m = state.liveMatch;
  if (!m || m.paused || m.finished) return;

  store.update(["liveMatch", "players"], draft => {
    const lm = draft.liveMatch;
    if (!lm || lm.paused || lm.finished) return;

    lm.tickCount = (lm.tickCount || 0) + 1;
    if (lm.actionBannerTimer > 0) lm.actionBannerTimer -= 1;
    if (lm.counterAttackTimer > 0) lm.counterAttackTimer -= 1;

    // Variar desmarques cada ~2.2 segundos
    if (lm.tickCount % 64 === 0) {
      [...lm.homeAgents, ...lm.awayAgents].forEach(a => {
        a.driftY = (Math.random() - 0.5) * 0.22;
      });
    }

    // 32 ticks * 35ms = ~1.12s por minuto de juego (~95s partido completo, ritmo pausado y legible)
    if (lm.tickCount % 32 === 0) {
      lm.minute += 1;

      if (lm.minute === 60 || lm.minute === 75) {
        const userIsHome = lm.homeId === draft.userClubId;
        if (userIsHome) {
          lm.awayTactic = lm.gh > lm.ga ? "Ofensivo" : lm.ga > lm.gh ? "Defensivo" : "Equilibrado";
        } else {
          lm.homeTactic = lm.ga > lm.gh ? "Ofensivo" : lm.gh > lm.ga ? "Defensivo" : "Equilibrado";
        }
      }
    }

    if (lm.minute > 90 && !lm.shootout) {
      if (lm.isKnockout && lm.gh === lm.ga) {
        resolvePenaltyShootout(lm);
        return;
      }
      lm.finished = true;
      lm.minute = 90;
      lm.actionBanner = "⏱️ ¡FINAL DEL PARTIDO!";
      lm.actionBannerTimer = 180;
      lm.events.unshift(`⏱️ 90' ¡Final del encuentro! ${lm.homeName} ${lm.gh} - ${lm.ga} ${lm.awayName}.`);
      playWhistleSound();
      if (matchInterval) clearInterval(matchInterval);
      if (onFinishCallback) onFinishCallback();
      return;
    }

    const ball = lm.ball;
    if (ball.cooldown > 0) ball.cooldown -= 1;

    const allHome = lm.homeAgents.filter(a => !a.expelled);
    const allAway = lm.awayAgents.filter(a => !a.expelled);
    const allPlayers = [
      ...allHome.map(a => ({ agent: a, isHome: true })),
      ...allAway.map(a => ({ agent: a, isHome: false }))
    ];

    // 1. Balón viajando suave y legible (pase al espacio o disparo)
    if (ball.inFlight) {
      const dx = ball.flightTargetX - ball.x;
      const dy = ball.flightTargetY - ball.y;
      const dist = Math.hypot(dx, dy);
      const speed = ball.isShot ? 0.0165 : 0.0115;

      if (dist <= speed) {
        ball.x = ball.flightTargetX;
        ball.y = ball.flightTargetY;
        ball.z = 0;
        ball.inFlight = false;

        if (ball.isShot) {
          handleShotArrival(lm, draft, ball);
        } else {
          const receiver = allPlayers.find(p => p.agent.agentId === ball.flightReceiverAgentId);
          if (receiver) {
            ball.ownerAgentId = receiver.agent.agentId;
            ball.ownerId = receiver.agent.playerId;
            ball.ownerIsHome = receiver.isHome;
            ball.holdTicks = 0;
            receiver.agent.highlightTimer = 38;
            receiver.agent.sprintBoost = 22;
            ball.cooldown = 8;
          }
        }
      } else {
        ball.x += (dx / dist) * speed;
        ball.y += (dy / dist) * speed;
        if (ball.isHighPass || ball.isShot) {
          ball.z = Math.max(0, Math.sin((1 - Math.min(1, dist / 0.45)) * Math.PI) * (ball.isHighPass ? 0.85 : 0.35));
        } else {
          ball.z = 0;
        }
      }
    } else {
      // 2. Jugador con posesión del balón
      const ownerEntry = allPlayers.find(p => p.agent.agentId === ball.ownerAgentId);

      if (!ownerEntry) {
        let best = null;
        let bestD = 999;
        allPlayers.forEach(p => {
          if (p.agent.posType === "POR") return;
          const d = Math.hypot(p.agent.x - ball.x, p.agent.y - ball.y);
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        });
        if (best) {
          ball.ownerAgentId = best.agent.agentId;
          ball.ownerId = best.agent.playerId;
          ball.ownerIsHome = best.isHome;
          ball.holdTicks = 0;
        }
      } else {
        const carrier = ownerEntry.agent;
        const isHome = ownerEntry.isHome;
        const attackDir = isHome ? 1 : -1;
        const goalX = isHome ? 0.96 : 0.04;
        const distToGoal = Math.hypot(goalX - carrier.x, 0.5 - carrier.y);

        ball.holdTicks = (ball.holdTicks || 0) + 1;
        if (isHome) lm.stats.homePoss += 1;
        else lm.stats.awayPoss += 1;

        // Portero saca tras pausa breve (12 ticks) para que se vea el saque
        if (carrier.posType === "POR") {
          if (ball.holdTicks >= 12) {
            const targets = (isHome ? allHome : allAway).filter(m => m.posType === "DEF" || m.posType === "MED");
            const target = targets[Math.floor(Math.random() * targets.length)];
            if (target) {
              executePass(lm, carrier, target, isHome, target.posType === "MED");
            }
          }
          updateTeamMovement(allHome, true, lm.homeTactic, ball, lm.counterAttackTimer > 0);
          updateTeamMovement(allAway, false, lm.awayTactic, ball, lm.counterAttackTimer > 0);
          separateOverlappingPlayers([...allHome, ...allAway]);
          return;
        }

        // Conducción fluida a ritmo pausado
        const maxAttackX = isHome ? 0.87 : 0.13;
        const canAdvance = isHome ? carrier.x < maxAttackX : carrier.x > maxAttackX;
        const isCounter = lm.counterAttackTimer > 0;
        const dribbleSpeed = (isCounter ? 0.0044 : 0.0033) + (carrier.ovr / 100) * 0.0014;

        if (canAdvance) {
          carrier.x = clamp(carrier.x + attackDir * dribbleSpeed, 0.10, 0.90);
        }

        const inFinalThird = Math.abs(goalX - carrier.x) < 0.35;
        const targetRunY = inFinalThird
          ? clamp(0.5 + (carrier.y - 0.5) * 0.45 + Math.sin(lm.tickCount * 0.08) * 0.06, 0.18, 0.82)
          : clamp(carrier.homeY + (carrier.driftY || 0), 0.08, 0.92);

        carrier.y = clamp(carrier.y + (targetRunY - carrier.y) * 0.04, 0.08, 0.92);
        carrier.isMoving = true;

        ball.x = carrier.x + attackDir * 0.011;
        ball.y = carrier.y;
        ball.z = 0;

        // Presión rival y contraataques
        const defenders = (isHome ? allAway : allHome).filter(d => d.posType !== "POR");
        const nearestDef = defenders
          .map(d => ({ d, dist: Math.hypot(d.x - carrier.x, d.y - carrier.y) }))
          .sort((a, b) => a.dist - b.dist)[0];

        if (nearestDef && nearestDef.dist < 0.032 && ball.cooldown <= 0) {
          const tackleSuccess = (nearestDef.d.ovr + Math.random() * 25) > (carrier.ovr + Math.random() * 33);
          if (tackleSuccess) {
            if (Math.random() < 0.12) {
              if (isHome) lm.stats.awayFouls += 1;
              else lm.stats.homeFouls += 1;
              lm.actionBanner = `⚠️ Falta sobre ${carrier.name}`;
              lm.actionBannerTimer = 50;
              ball.cooldown = 16;
            } else {
              ball.ownerAgentId = nearestDef.d.agentId;
              ball.ownerId = nearestDef.d.playerId;
              ball.ownerIsHome = !isHome;
              ball.holdTicks = 0;
              nearestDef.d.highlightTimer = 50;
              lm.recentPassers = [nearestDef.d.agentId];
              lm.counterAttackTimer = 65;
              ball.cooldown = 12;
              lm.actionBanner = `⚡ ¡Contraataque de ${nearestDef.d.name}!`;
              lm.actionBannerTimer = 48;
              return;
            }
          } else {
            carrier.y = clamp(carrier.y + (carrier.y > 0.5 ? -0.035 : 0.035), 0.08, 0.92);
            ball.cooldown = 14;
          }
        }

        // GATILLO DE DISPARO CALIBRADO (~12-16 disparos por partido)
        const tactic = isHome ? lm.homeTactic : lm.awayTactic;
        const tacticShootBonus = tactic === "Ofensivo" ? 0.045 : tactic === "Defensivo" ? -0.015 : 0.01;
        const insideBox = distToGoal < 0.24 && Math.abs(carrier.y - 0.5) < 0.25;
        const edgeOfBox = distToGoal < 0.36 && Math.abs(carrier.y - 0.5) < 0.28 && carrier.posType !== "DEF";

        if (insideBox && (ball.holdTicks >= 10 || !canAdvance || Math.random() < 0.12 + tacticShootBonus)) {
          launchShot(lm, carrier, isHome, goalX);
          return;
        }
        if (edgeOfBox && ball.cooldown <= 0 && Math.random() < 0.055 + tacticShootBonus) {
          launchShot(lm, carrier, isHome, goalX);
          return;
        }

        // PASES VERTICALES AL ESPACIO (pausados y legibles)
        const mustPass = ball.holdTicks >= 24 || !canAdvance;
        if (mustPass || (ball.cooldown <= 0 && ball.holdTicks >= 8 && Math.random() < 0.14)) {
          const mates = (isHome ? allHome : allAway).filter(
            m => m.agentId !== carrier.agentId && m.posType !== "POR"
          );
          const recentSet = new Set(lm.recentPassers || []);

          const candidates = mates
            .map(m => {
              const progress = (m.x - carrier.x) * attackDir;
              const widthChange = Math.abs(m.y - carrier.y);
              const dist = Math.hypot(m.x - carrier.x, m.y - carrier.y);
              const freshnessBonus = recentSet.has(m.agentId) ? -0.45 : 0.30;
              const verticalBonus = progress > 0.06 ? progress * 2.4 : (progress > -0.05 ? 0.05 : -0.65);
              const wideBonus = m.isWide && widthChange > 0.14 ? 0.28 : 0;
              const strikerBonus = m.posType === "DEL" && progress > 0.04 ? 0.32 : 0;
              const cutbackBonus = !canAdvance && Math.abs(m.y - 0.5) < 0.25 ? 0.65 : 0;
              const score = verticalBonus + wideBonus + strikerBonus + freshnessBonus + cutbackBonus - Math.abs(dist - 0.23) * 0.4 + (Math.random() * 0.28);
              return { m, dist, progress, widthChange, score };
            })
            .filter(c => c.dist > 0.05 && c.dist < 0.58)
            .sort((a, b) => b.score - a.score);

          if (candidates.length > 0) {
            const chosen = candidates[0];
            const isCross = Math.abs(carrier.y - 0.5) > 0.23 && Math.abs(chosen.m.x - goalX) < 0.26;
            const isThroughBall = chosen.progress > 0.16 && chosen.m.posType === "DEL";
            executePass(lm, carrier, chosen.m, isHome, isCross || chosen.widthChange > 0.38, isThroughBall);

            if (isThroughBall) {
              lm.actionBanner = `⚡ ¡Pase filtrado de ${carrier.name} a ${chosen.m.name}!`;
              lm.actionBannerTimer = 52;
            } else if (isCross) {
              lm.actionBanner = `🎯 Centro al área de ${carrier.name}`;
              lm.actionBannerTimer = 50;
            }
          } else {
            launchShot(lm, carrier, isHome, goalX);
          }
        }
      }
    }

    // 3. Movimiento dinámico de desmarque + separación física
    updateTeamMovement(allHome, true, lm.homeTactic, ball, lm.counterAttackTimer > 0);
    updateTeamMovement(allAway, false, lm.awayTactic, ball, lm.counterAttackTimer > 0);
    separateOverlappingPlayers([...allHome, ...allAway]);
  });
}

function separateOverlappingPlayers(agents) {
  const minDist = 0.040;
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      if (a.posType === "POR" || b.posType === "POR") continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        const angle = dist > 0.0001 ? Math.atan2(dy, dx) : (i + j) * 0.7;
        const push = (minDist - dist) * 0.28;
        a.x = clamp(a.x - Math.cos(angle) * push, 0.10, 0.90);
        a.y = clamp(a.y - Math.sin(angle) * push, 0.07, 0.93);
        b.x = clamp(b.x + Math.cos(angle) * push, 0.10, 0.90);
        b.y = clamp(b.y + Math.sin(angle) * push, 0.07, 0.93);
      }
    }
  }
}

function executePass(lm, passer, receiver, isHome, isHighPass, isThroughBall = false) {
  const attackDir = isHome ? 1 : -1;
  const leadX = isThroughBall ? 0.075 : 0.04;
  const targetX = clamp(receiver.x + attackDir * leadX, 0.10, 0.89);
  const targetY = clamp(receiver.y + (0.5 - receiver.y) * (isThroughBall ? 0.18 : 0.05), 0.08, 0.92);

  receiver.runTargetX = targetX;
  receiver.runTargetY = targetY;
  receiver.sprintBoost = 34;

  lm.ball.inFlight = true;
  lm.ball.isShot = false;
  lm.ball.isHighPass = isHighPass;
  lm.ball.holdTicks = 0;
  lm.ball.flightTargetX = targetX;
  lm.ball.flightTargetY = targetY;
  lm.ball.flightReceiverAgentId = receiver.agentId;
  lm.ball.ownerAgentId = null;
  lm.ball.ownerId = null;

  const history = lm.recentPassers || [];
  history.push(passer.agentId);
  if (history.length > 5) history.shift();
  lm.recentPassers = history;
}

function updateTeamMovement(agents, isHome, tactic, ball, isCounter) {
  const attackDir = isHome ? 1 : -1;
  const tacticShift = tactic === "Ofensivo" ? 0.09 : tactic === "Defensivo" ? -0.07 : 0.02;
  const ballShiftX = (ball.x - 0.5) * 0.36;
  const ballShiftY = (ball.y - 0.5) * 0.22;

  let closestPresserId = null;
  if (ball.ownerIsHome !== isHome && ball.x > 0.11 && ball.x < 0.89) {
    let bestDist = 0.24;
    agents.forEach(a => {
      if (a.posType === "POR") return;
      const d = Math.hypot(a.x - ball.x, a.y - ball.y);
      if (d < bestDist) {
        bestDist = d;
        closestPresserId = a.agentId;
      }
    });
  }

  agents.forEach(a => {
    if (a.highlightTimer > 0) a.highlightTimer -= 1;
    if (a.sprintBoost > 0) a.sprintBoost -= 1;
    if (a.agentId === ball.ownerAgentId) return;

    if (a.posType === "POR") {
      const gkX = isHome ? 0.042 : 0.958;
      const gkY = clamp(0.5 + (ball.y - 0.5) * 0.26, 0.39, 0.61);
      moveAgentTowards(a, gkX, gkY, 0.0045);
      return;
    }

    if (ball.inFlight && ball.flightReceiverAgentId === a.agentId && a.runTargetX != null) {
      moveAgentTowards(a, a.runTargetX, a.runTargetY, 0.0062);
      return;
    }

    let targetX = a.homeX + ballShiftX + attackDir * tacticShift;
    let targetY = a.homeY + ballShiftY + (a.driftY || 0);

    if (a.agentId === closestPresserId) {
      targetX = ball.x;
      targetY = ball.y;
    } else if (ball.ownerIsHome === isHome) {
      const counterPush = isCounter ? 0.08 : 0;
      if (a.posType === "DEF" && a.isWide) {
        targetX += attackDir * (0.16 + counterPush);
        targetY = a.homeY < 0.5 ? 0.10 : 0.90;
      } else if (a.posType === "DEL") {
        targetX += attackDir * (0.11 + counterPush);
        targetY = clamp(a.homeY + (a.driftY || 0) * 1.4, 0.14, 0.86);
      } else if (a.posType === "MED") {
        targetX += attackDir * (0.08 + counterPush);
      }
    }

    targetX = clamp(targetX, 0.11, 0.89);
    targetY = clamp(targetY, 0.08, 0.92);
    const moveSpeed = a.sprintBoost > 0 ? 0.0054 : 0.0040;
    moveAgentTowards(a, targetX, targetY, moveSpeed);
  });
}

function moveAgentTowards(agent, tx, ty, speed) {
  const dx = tx - agent.x;
  const dy = ty - agent.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.0012) {
    agent.x += (dx / dist) * Math.min(speed, dist);
    agent.y += (dy / dist) * Math.min(speed, dist);
    agent.isMoving = true;
  } else {
    agent.isMoving = false;
  }
}

function launchShot(lm, shooter, isHome, goalX) {
  if (isHome) lm.stats.homeShots += 1;
  else lm.stats.awayShots += 1;

  const shotTargetY = 0.5 + (Math.random() - 0.5) * 0.24;
  lm.ball.inFlight = true;
  lm.ball.isShot = true;
  lm.ball.isHighPass = false;
  lm.ball.holdTicks = 0;
  lm.ball.flightTargetX = goalX;
  lm.ball.flightTargetY = shotTargetY;
  lm.ball.shooterId = shooter.playerId;
  lm.ball.shooterName = shooter.name;
  lm.ball.shooterOvr = shooter.ovr;
  lm.ball.shooterIsHome = isHome;
  lm.ball.ownerAgentId = null;
  lm.ball.ownerId = null;

  lm.actionBanner = `🔥 ¡DISPARO DE ${shooter.name.toUpperCase()}!`;
  lm.actionBannerTimer = 52;
}

function handleShotArrival(lm, draft, ball) {
  const isHome = ball.shooterIsHome;
  const defendingGK = (isHome ? lm.awayAgents : lm.homeAgents).find(a => a.posType === "POR")
    || (isHome ? lm.awayAgents[0] : lm.homeAgents[0]);
  const gkOvr = defendingGK?.ovr || 76;
  const shooterOvr = ball.shooterOvr || 78;

  const onTarget = Math.abs(ball.y - 0.5) <= 0.055;
  const ovrDiff = clamp(shooterOvr - gkOvr, -10, 12);
  const goalChance = 0.24 + ovrDiff * 0.008;

  if (onTarget && Math.random() < clamp(goalChance, 0.14, 0.36)) {
    if (isHome) lm.gh += 1;
    else lm.ga += 1;

    playGoalSound();
    lm.actionBanner = `⚽ ¡¡¡GOOOOL DE ${ball.shooterName.toUpperCase()}!!!`;
    lm.actionBannerTimer = 100;
    lm.events.unshift(`⚽ ${lm.minute}' ¡GOOOL de ${ball.shooterName}! (${lm.homeName} ${lm.gh} - ${lm.ga} ${lm.awayName})`);

    if (draft.players?.[ball.shooterId]) {
      draft.players[ball.shooterId].goals = (draft.players[ball.shooterId].goals || 0) + 1;
    }

    const kickoffTeam = isHome ? lm.awayAgents : lm.homeAgents;
    const starter = kickoffTeam[6] || kickoffTeam[5] || kickoffTeam[1];
    lm.homeAgents.forEach(a => { a.x = a.homeX; a.y = a.homeY; });
    lm.awayAgents.forEach(a => { a.x = a.homeX; a.y = a.homeY; });
    lm.recentPassers = [];
    ball.x = 0.5;
    ball.y = 0.5;
    ball.holdTicks = 0;
    ball.ownerAgentId = starter?.agentId || null;
    ball.ownerId = starter?.playerId || null;
    ball.ownerIsHome = !isHome;
    ball.cooldown = 18;
  } else if (onTarget) {
    if (Math.random() < 0.22) {
      const attackers = (isHome ? lm.homeAgents : lm.awayAgents).filter(a => a.posType === "DEL" || a.posType === "MED");
      const rebounder = attackers.sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y))[0];
      if (rebounder) {
        lm.actionBanner = `🧤 ¡Rebote suelto para ${rebounder.name}!`;
        lm.actionBannerTimer = 52;
        ball.ownerAgentId = rebounder.agentId;
        ball.ownerId = rebounder.playerId;
        ball.ownerIsHome = isHome;
        ball.holdTicks = 7;
        ball.x = rebounder.x;
        ball.y = rebounder.y;
        ball.cooldown = 5;
        return;
      }
    }

    lm.actionBanner = `🧤 ¡PARADÓN DE ${defendingGK?.name || "EL PORTERO"}!`;
    lm.actionBannerTimer = 65;
    lm.events.unshift(`🧤 ${lm.minute}' ¡Atajada clave de ${defendingGK?.name || "el arquero"} tras remate de ${ball.shooterName}!`);
    ball.ownerAgentId = defendingGK?.agentId || null;
    ball.ownerId = defendingGK?.playerId || null;
    ball.ownerIsHome = !isHome;
    ball.holdTicks = 0;
    ball.x = isHome ? 0.955 : 0.045;
    ball.y = 0.5;
    ball.cooldown = 14;
  } else {
    const hitPost = Math.abs(ball.y - 0.5) <= 0.066;
    lm.actionBanner = hitPost ? `🪵 ¡AL PALO! Se salva ${isHome ? lm.awayName : lm.homeName}` : `💨 ¡Disparo desviado fuera!`;
    lm.actionBannerTimer = 55;
    if (hitPost) {
      lm.events.unshift(`🪵 ${lm.minute}' ¡Remate al poste de ${ball.shooterName}!`);
    }
    ball.ownerAgentId = defendingGK?.agentId || null;
    ball.ownerId = defendingGK?.playerId || null;
    ball.ownerIsHome = !isHome;
    ball.holdTicks = 0;
    ball.x = isHome ? 0.955 : 0.045;
    ball.y = 0.5;
    ball.cooldown = 14;
  }
}

function resolvePenaltyShootout(lm) {
  let hScore = 0;
  let aScore = 0;
  for (let i = 0; i < 5; i++) {
    if (Math.random() < 0.78) hScore++;
    if (Math.random() < 0.78) aScore++;
  }
  while (hScore === aScore) {
    if (Math.random() < 0.75) hScore++;
    if (Math.random() < 0.75) aScore++;
  }
  lm.shootout = { homeScore: hScore, awayScore: aScore };
  if (hScore > aScore) lm.gh += 1;
  else lm.ga += 1;
  lm.finished = true;
  lm.minute = 90;
  lm.actionBanner = `🎯 PENALES: ${hScore} - ${aScore}`;
  lm.actionBannerTimer = 180;
  lm.events.unshift(`🎯 ¡Tanda de penales finalizada (${hScore}-${aScore})!`);
  playWhistleSound();
  if (matchInterval) clearInterval(matchInterval);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}