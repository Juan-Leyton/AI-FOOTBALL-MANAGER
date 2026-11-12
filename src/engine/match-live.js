import { store } from "../core/state.js";

let matchInterval = null;

export const FORMATIONS = {
  "4-3-3": [
    { pos: "POR", x: 0.04, y: 0.50 },
    { pos: "DEF", x: 0.22, y: 0.14 }, { pos: "DEF", x: 0.19, y: 0.38 }, { pos: "DEF", x: 0.19, y: 0.62 }, { pos: "DEF", x: 0.22, y: 0.86 },
    { pos: "MED", x: 0.40, y: 0.26 }, { pos: "MED", x: 0.35, y: 0.50 }, { pos: "MED", x: 0.40, y: 0.74 },
    { pos: "DEL", x: 0.58, y: 0.18 }, { pos: "DEL", x: 0.62, y: 0.50 }, { pos: "DEL", x: 0.58, y: 0.82 }
  ],
  "4-4-2": [
    { pos: "POR", x: 0.04, y: 0.50 },
    { pos: "DEF", x: 0.22, y: 0.14 }, { pos: "DEF", x: 0.19, y: 0.38 }, { pos: "DEF", x: 0.19, y: 0.62 }, { pos: "DEF", x: 0.22, y: 0.86 },
    { pos: "MED", x: 0.42, y: 0.14 }, { pos: "MED", x: 0.38, y: 0.38 }, { pos: "MED", x: 0.38, y: 0.62 }, { pos: "MED", x: 0.42, y: 0.86 },
    { pos: "DEL", x: 0.60, y: 0.36 }, { pos: "DEL", x: 0.60, y: 0.64 }
  ],
  "3-5-2": [
    { pos: "POR", x: 0.04, y: 0.50 },
    { pos: "DEF", x: 0.20, y: 0.22 }, { pos: "DEF", x: 0.18, y: 0.50 }, { pos: "DEF", x: 0.20, y: 0.78 },
    { pos: "MED", x: 0.40, y: 0.12 }, { pos: "MED", x: 0.36, y: 0.34 }, { pos: "MED", x: 0.33, y: 0.50 }, { pos: "MED", x: 0.36, y: 0.66 }, { pos: "MED", x: 0.40, y: 0.88 },
    { pos: "DEL", x: 0.60, y: 0.36 }, { pos: "DEL", x: 0.60, y: 0.64 }
  ]
};

export function assignPlayersToSlots(starters, formationKey) {
  const slots = FORMATIONS[formationKey] || FORMATIONS["4-3-3"];
  const remaining = [...starters];

  return slots.map(slot => {
    let idx = remaining.findIndex(p => p.pos === slot.pos);
    if (idx === -1) idx = 0;
    const player = remaining.splice(idx, 1)[0] || null;
    const outOfPosition = player ? player.pos !== slot.pos : false;
    return { slot, player, outOfPosition };
  });
}

function createAgentFromSlot({ slot, player, outOfPosition }, i, isHome) {
  const startX = isHome ? slot.x : 1 - slot.x;
  const rawOvr = player?.ovr || 78;
  const morale = player?.morale ?? 85;
  const moraleBonus = morale >= 85 ? 2 : morale < 55 ? -3 : 0;
  const posPenalty = outOfPosition ? -12 : 0;
  const effectiveOvr = Math.max(55, rawOvr + moraleBonus + posPenalty);

  const stamina = player?.stamina ?? 100;
  const skillFactor = 0.88 + ((effectiveOvr - 70) * 0.011);

  return {
    id: i,
    team: isHome ? "home" : "away",
    playerId: player?.id || null,
    name: player?.name || `Jugador ${i + 1}`,
    ovr: effectiveOvr,
    outOfPosition,
    stamina,
    posType: slot.pos,
    baseX: startX,
    baseY: slot.y,
    x: startX,
    y: slot.y,
    vx: 0,
    vy: 0,
    speed: (0.0068 + Math.random() * 0.0014) * skillFactor,
    decisionTimer: 0,
    noiseOffset: Math.random() * 100
  };
}

function initAgents(club, playersMap, isHome) {
  const formKey = club?.formation || "4-3-3";
  const clubPlayers = Object.values(playersMap || {}).filter(p => p.clubId === club.id);
  const starters = clubPlayers.filter(p => p.starter).slice(0, 11);
  const assigned = assignPlayersToSlots(starters, formKey);
  return assigned.map((entry, i) => createAgentFromSlot(entry, i, isHome));
}

function getInitialTacticLabel(club) {
  const m = Number(club?.tactics?.mentality ?? 50);
  if (m >= 65) return "Ofensivo";
  if (m <= 38) return "Defensivo";
  return "Equilibrado";
}

export function startLiveMatch(homeId, awayId, onFinish) {
  const state = store.get();
  const homeClub = state.clubs[homeId];
  const awayClub = state.clubs[awayId];

  const homeAgents = initAgents(homeClub, state.players, true);
  const awayAgents = initAgents(awayClub, state.players, false);
  const kickoffPlayer = homeAgents[9] || homeAgents[6];

  const liveData = {
    homeId,
    awayId,
    homeName: homeClub.name,
    awayName: awayClub.name,
    homeColors: homeClub.colors,
    awayColors: awayClub.colors,
    homeSliders: { ...(homeClub.tactics || { mentality: 55, tempo: 55, press: 55 }) },
    awaySliders: { ...(awayClub.tactics || { mentality: 55, tempo: 55, press: 55 }) },
    homeAgents,
    awayAgents,
    homeTactic: getInitialTacticLabel(homeClub),
    awayTactic: getInitialTacticLabel(awayClub),
    subsUsed: 0,
    maxSubs: 5,
    goalScorers: [],
    goalBanner: null,
    stats: { homePoss: 1, awayPoss: 1, homeShots: 0, awayShots: 0 },
    ball: {
      x: 0.5,
      y: 0.5,
      vx: 0,
      vy: 0,
      ownerTeam: "home",
      ownerId: kickoffPlayer.id,
      isShot: false,
      shooter: null,
      stealCooldown: 10
    },
    minute: 0,
    tick: 0,
    gh: 0,
    ga: 0,
    paused: false,
    finished: false,
    events: [`0' - ¡Saque inicial! ${homeClub.name} vs ${awayClub.name}`]
  };

  store.update(["liveMatch"], draft => { draft.liveMatch = liveData; });
  if (matchInterval) clearInterval(matchInterval);

  matchInterval = setInterval(() => {
    const currentState = store.get();
    const m = currentState.liveMatch;
    if (!m || m.finished || m.paused || !m.ball) return;

    if (m.goalBanner && m.goalBanner.timer > 0) {
      store.update(["liveMatch"], draft => {
        if (draft.liveMatch?.goalBanner) {
          draft.liveMatch.goalBanner.timer -= 1;
          if (draft.liveMatch.goalBanner.timer <= 0) {
            draft.liveMatch.goalBanner = null;
          }
        }
      });
      return;
    }

    // Clonar agentes y balón para mutarlos de forma segura sin pisar cambios de UI (táctica/pausa/sustituciones)
    const ball = { ...m.ball };
    const homeAgents = m.homeAgents.map(a => ({ ...a }));
    const awayAgents = m.awayAgents.map(a => ({ ...a }));
    let { tick, gh, ga, homeTactic, awayTactic } = m;
    const addedEvents = [];
    const newScorers = [...(m.goalScorers || [])];
    const newStats = { ...(m.stats || { homePoss: 1, awayPoss: 1, homeShots: 0, awayShots: 0 }) };
    let newGoalBanner = null;
    let aiChangedHomeTactic = null;
    let aiChangedAwayTactic = null;

    const nextTick = (tick || 0) + 1;
    const currentMin = Math.floor(nextTick / 10);

    if (ball.stealCooldown > 0) ball.stealCooldown -= 1;

    if (ball.ownerTeam === "home") newStats.homePoss += 1;
    else if (ball.ownerTeam === "away") newStats.awayPoss += 1;

    // IA RIVAL DINÁMICA: Solo cambia la táctica del equipo controlado por la IA
    if (nextTick % 120 === 0 && currentMin >= 55) {
      const userIsHome = m.homeId === currentState.userClubId;
      if (userIsHome) {
        if (ga < gh && awayTactic !== "Ofensivo") {
          awayTactic = "Ofensivo";
          aiChangedAwayTactic = "Ofensivo";
          addedEvents.push(`📋 ${currentMin}' - ${m.awayName} adelanta líneas y pasa a modo Ofensivo`);
        } else if (ga > gh && currentMin >= 72 && awayTactic !== "Defensivo") {
          awayTactic = "Defensivo";
          aiChangedAwayTactic = "Defensivo";
          addedEvents.push(`📋 ${currentMin}' - ${m.awayName} se encierra atrás en modo Defensivo`);
        }
      } else {
        if (gh < ga && homeTactic !== "Ofensivo") {
          homeTactic = "Ofensivo";
          aiChangedHomeTactic = "Ofensivo";
          addedEvents.push(`📋 ${currentMin}' - ${m.homeName} adelanta líneas y pasa a modo Ofensivo`);
        } else if (gh > ga && currentMin >= 72 && homeTactic !== "Defensivo") {
          homeTactic = "Defensivo";
          aiChangedHomeTactic = "Defensivo";
          addedEvents.push(`📋 ${currentMin}' - ${m.homeName} se encierra atrás en modo Defensivo`);
        }
      }
    }

    const getTacticProfile = (tacticLabel, sliders) => {
      const sMentality = Number(sliders?.mentality ?? 50);
      const sTempo = Number(sliders?.tempo ?? 50);
      const sPress = Number(sliders?.press ?? 50);

      const sliderShift = ((sMentality - 50) / 50) * 0.08;
      const tempoFactor = 0.78 + (sTempo / 100) * 0.45;
      const pressFactor = 0.65 + (sPress / 100) * 0.75;

      if (tacticLabel === "Ofensivo") {
        return {
          blockShift: 0.24 + sliderShift,
          pressRange: 0.34 * pressFactor,
          passSpeed: 0.031 * tempoFactor,
          shootRange: 0.34,
          shootAggression: 0.62,
          dribbleRatio: 0.46,
          decisionDelay: Math.max(3, Math.round(9 / tempoFactor)),
          defLineCap: 0.46
        };
      }
      if (tacticLabel === "Defensivo") {
        return {
          blockShift: -0.21 + sliderShift,
          pressRange: 0.10 * pressFactor,
          passSpeed: 0.022 * tempoFactor,
          shootRange: 0.21,
          shootAggression: 0.24,
          dribbleRatio: 0.20,
          decisionDelay: Math.max(5, Math.round(13 / tempoFactor)),
          defLineCap: 0.22
        };
      }
      return {
        blockShift: 0.02 + sliderShift,
        pressRange: 0.20 * pressFactor,
        passSpeed: 0.026 * tempoFactor,
        shootRange: 0.27,
        shootAggression: 0.42,
        dribbleRatio: 0.34,
        decisionDelay: Math.max(4, Math.round(11 / tempoFactor)),
        defLineCap: 0.34
      };
    };

    const homeProfile = getTacticProfile(homeTactic, m.homeSliders);
    const awayProfile = getTacticProfile(awayTactic, m.awaySliders);

    let carrier = null;
    if (ball.ownerTeam && ball.ownerId !== null) {
      const pool = ball.ownerTeam === "home" ? homeAgents : awayAgents;
      carrier = pool.find(a => a.id === ball.ownerId) || null;
    }

    if (carrier) {
      const dir = carrier.team === "home" ? 1 : -1;
      ball.x = carrier.x + dir * 0.012;
      ball.y = carrier.y;
      ball.vx = 0;
      ball.vy = 0;
      ball.isShot = false;
    } else {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= ball.isShot ? 0.985 : 0.955;
      ball.vy *= ball.isShot ? 0.985 : 0.955;

      if (ball.y < 0.04 || ball.y > 0.96) {
        ball.vy *= -0.65;
        ball.y = Math.max(0.04, Math.min(0.96, ball.y));
      }

      const inGoalMouth = ball.y >= 0.38 && ball.y <= 0.62;

      if (ball.x >= 0.985) {
        if (inGoalMouth && ball.isShot) {
          gh++;
          const scorer = ball.shooter;
          const fullName = scorer?.name || "Delantero";
          const sName = fullName.split(" ").pop();
          addedEvents.push(`⚽ ${currentMin}' - ¡GOOOL de ${sName}! (${m.homeName} ${gh}-${ga} ${m.awayName})`);
          if (scorer) {
            newScorers.push({ playerId: scorer.playerId, name: fullName, clubId: m.homeId, minute: currentMin });
          }
          newGoalBanner = {
            scorerName: fullName,
            clubName: m.homeName,
            colors: m.homeColors,
            minute: currentMin,
            scoreText: `${m.homeName} ${gh} - ${ga} ${m.awayName}`,
            timer: 36,
            maxTimer: 36,
            goalSide: "right"
          };
          kickoffReset(ball, homeAgents, awayAgents, "away");
        } else {
          const awayGk = awayAgents[0];
          ball.x = awayGk.x; ball.y = awayGk.y;
          ball.ownerTeam = "away"; ball.ownerId = awayGk.id;
          ball.isShot = false; ball.stealCooldown = 12;
        }
      } else if (ball.x <= 0.015) {
        if (inGoalMouth && ball.isShot) {
          ga++;
          const scorer = ball.shooter;
          const fullName = scorer?.name || "Delantero";
          const sName = fullName.split(" ").pop();
          addedEvents.push(`⚽ ${currentMin}' - ¡GOOOL de ${sName}! (${m.homeName} ${gh}-${ga} ${m.awayName})`);
          if (scorer) {
            newScorers.push({ playerId: scorer.playerId, name: fullName, clubId: m.awayId, minute: currentMin });
          }
          newGoalBanner = {
            scorerName: fullName,
            clubName: m.awayName,
            colors: m.awayColors,
            minute: currentMin,
            scoreText: `${m.homeName} ${gh} - ${ga} ${m.awayName}`,
            timer: 36,
            maxTimer: 36,
            goalSide: "left"
          };
          kickoffReset(ball, homeAgents, awayAgents, "home");
        } else {
          const homeGk = homeAgents[0];
          ball.x = homeGk.x; ball.y = homeGk.y;
          ball.ownerTeam = "home"; ball.ownerId = homeGk.id;
          ball.isShot = false; ball.stealCooldown = 12;
        }
      }
    }

    const stepTeam = (agents, isHome, profile) => {
      const teamKey = isHome ? "home" : "away";
      const enemyAgents = isHome ? awayAgents : homeAgents;
      const shiftX = isHome ? profile.blockShift : -profile.blockShift;
      const teamHasBall = ball.ownerTeam === teamKey;

      let chaser = null;
      let bestDist = Infinity;
      agents.forEach(a => {
        if (a.posType !== "POR") {
          const d = Math.hypot(ball.x - a.x, ball.y - a.y);
          if (d < bestDist) { bestDist = d; chaser = a; }
        }
      });

      agents.forEach(a => {
        if (nextTick % 25 === 0) {
          const drain = profile.blockShift > 0.12 ? 0.76 : profile.blockShift < -0.12 ? 0.42 : 0.58;
          a.stamina = Math.max(25, (a.stamina ?? 100) - drain);
        }

        const fatigueMult = 0.78 + ((a.stamina ?? 100) / 100) * 0.22;
        const speed = a.speed * fatigueMult;

        if (a.posType === "POR") {
          const homeGoalX = isHome ? 0.042 : 0.958;
          const targetY = Math.max(0.39, Math.min(0.61, ball.y));
          a.vx = (homeGoalX - a.x) * 0.16;
          a.vy = (targetY - a.y) * (ball.isShot ? 0.24 : 0.14);
          a.x += a.vx;
          a.y += a.vy;

          if (!carrier && Math.hypot(ball.x - a.x, ball.y - a.y) < 0.032) {
            const saveChance = 0.52 + ((a.ovr - 75) * 0.015);
            if (!ball.isShot || Math.random() < saveChance) {
              if (ball.isShot && Math.random() < 0.45) {
                addedEvents.push(`🧤 ${currentMin}' - ¡Gran parada de ${a.name.split(" ").pop()}!`);
              }
              ball.ownerTeam = teamKey;
              ball.ownerId = a.id;
              ball.isShot = false;
              ball.stealCooldown = 14;
              a.decisionTimer = profile.decisionDelay;
            }
          }
          return;
        }

        if (carrier && carrier.id === a.id && carrier.team === teamKey) {
          const goalX = isHome ? 0.985 : 0.015;
          const distGoal = Math.abs(goalX - a.x);
          const dirX = isHome ? 1 : -1;

          const defenderHold = (a.posType === "DEF" && profile.blockShift < -0.08 && (isHome ? a.x > 0.36 : a.x < 0.64));

          const centerPull = (0.5 - a.y) * 0.35;
          a.vx = defenderHold ? 0 : dirX * speed * 0.95;
          a.vy = centerPull * speed;
          a.x = Math.max(0.05, Math.min(0.95, a.x + a.vx));
          a.y = Math.max(0.07, Math.min(0.93, a.y + a.vy));

          a.decisionTimer = (a.decisionTimer || 0) - 1;
          if (a.decisionTimer > 0 && !defenderHold) return;

          const nearestEnemyDist = enemyAgents.reduce((min, e) => Math.min(min, Math.hypot(e.x - a.x, e.y - a.y)), 99);
          const underPressure = nearestEnemyDist < 0.085;

          if (distGoal <= profile.shootRange && Math.abs(a.y - 0.5) < 0.30) {
            if (Math.random() < profile.shootAggression || distGoal < 0.17) {
              const targetY = 0.5 + (Math.random() - 0.5) * 0.21;
              const angle = Math.atan2(targetY - a.y, goalX - a.x);
              const shotSpeed = 0.044 + ((a.ovr - 70) * 0.0006);

              ball.ownerTeam = null;
              ball.ownerId = null;
              ball.isShot = true;
              ball.shooter = a;
              ball.vx = Math.cos(angle) * shotSpeed;
              ball.vy = Math.sin(angle) * shotSpeed;
              ball.stealCooldown = 6;

              if (isHome) newStats.homeShots += 1;
              else newStats.awayShots += 1;
              return;
            }
          }

          if (defenderHold || underPressure || Math.random() > profile.dribbleRatio) {
            const maxPassDist = profile.blockShift < -0.08 ? 0.62 : 0.42;
            const forwardOptions = agents.filter(t =>
              t.id !== a.id &&
              t.posType !== "POR" &&
              (isHome ? t.x > a.x + 0.03 : t.x < a.x - 0.03) &&
              Math.hypot(t.x - a.x, t.y - a.y) < maxPassDist
            );
            const safeOptions = agents.filter(t =>
              t.id !== a.id &&
              Math.hypot(t.x - a.x, t.y - a.y) < 0.35
            );

            const candidates = forwardOptions.length > 0 ? forwardOptions : safeOptions;
            if (candidates.length > 0) {
              const target = candidates[Math.floor(Math.random() * candidates.length)];
              const leadX = target.x + dirX * 0.025;
              const angle = Math.atan2(target.y - a.y, leadX - a.x);

              ball.ownerTeam = null;
              ball.ownerId = null;
              ball.isShot = false;
              ball.vx = Math.cos(angle) * profile.passSpeed;
              ball.vy = Math.sin(angle) * profile.passSpeed;
              ball.stealCooldown = 5;
              return;
            }
          }

          a.decisionTimer = profile.decisionDelay;
          return;
        }

        const distBall = Math.hypot(ball.x - a.x, ball.y - a.y);

        if (!carrier && a === chaser) {
          a.vx = ((ball.x - a.x) / (distBall || 1)) * speed * 1.15;
          a.vy = ((ball.y - a.y) / (distBall || 1)) * speed * 1.15;
          a.x += a.vx;
          a.y += a.vy;

          if (Math.hypot(ball.x - a.x, ball.y - a.y) < 0.026 && ball.stealCooldown === 0) {
            ball.ownerTeam = teamKey;
            ball.ownerId = a.id;
            ball.isShot = false;
            a.decisionTimer = profile.decisionDelay;
          }
          return;
        }

        if (carrier && !teamHasBall && a === chaser && distBall < profile.pressRange) {
          a.vx = ((carrier.x - a.x) / (distBall || 1)) * speed * 1.14;
          a.vy = ((carrier.y - a.y) / (distBall || 1)) * speed * 1.14;
          a.x += a.vx;
          a.y += a.vy;

          if (Math.hypot(carrier.x - a.x, carrier.y - a.y) < 0.024 && ball.stealCooldown === 0) {
            const tackleProb = 0.22 + ((a.ovr - carrier.ovr) * 0.012);
            if (Math.random() < Math.max(0.08, Math.min(0.45, tackleProb))) {
              ball.ownerTeam = teamKey;
              ball.ownerId = a.id;
              ball.stealCooldown = 12;
              a.decisionTimer = profile.decisionDelay;
            } else {
              ball.stealCooldown = 8;
            }
          }
          return;
        }

        const ballShiftX = (ball.x - 0.5) * 0.12;
        const ballShiftY = (ball.y - 0.5) * 0.15;
        const supportAdvance = (teamHasBall && (a.posType === "DEL" || a.posType === "MED"))
          ? (isHome ? 0.06 : -0.06)
          : 0;
        const microMoveX = Math.sin(nextTick * 0.04 + a.noiseOffset) * 0.012;
        const microMoveY = Math.cos(nextTick * 0.04 + a.noiseOffset) * 0.012;

        let rawTargetX = a.baseX + shiftX + ballShiftX + supportAdvance + microMoveX;

        if (a.posType === "DEF") {
          if (isHome) rawTargetX = Math.min(profile.defLineCap, rawTargetX);
          else rawTargetX = Math.max(1 - profile.defLineCap, rawTargetX);
        }

        const targetX = Math.max(0.08, Math.min(0.92, rawTargetX));
        const targetY = Math.max(0.08, Math.min(0.92, a.baseY + ballShiftY + microMoveY));

        a.vx = (targetX - a.x) * 0.12;
        a.vy = (targetY - a.y) * 0.12;
        a.x += a.vx;
        a.y += a.vy;
      });
    };

    stepTeam(homeAgents, true, homeProfile);
    stepTeam(awayAgents, false, awayProfile);

    const isFinished = currentMin >= 90;
    if (isFinished) {
      addedEvents.push(`🏁 90' - Final del encuentro: ${m.homeName} ${gh} - ${ga} ${m.awayName}`);
      clearInterval(matchInterval);
    }

    // Actualización incremental sobre draft.liveMatch: NUNCA sobrescribe la táctica ni la pausa del usuario
    store.update(["liveMatch"], draft => {
      const lm = draft.liveMatch;
      if (!lm) return;

      lm.minute = currentMin;
      lm.tick = nextTick;
      lm.gh = gh;
      lm.ga = ga;
      if (aiChangedHomeTactic) lm.homeTactic = aiChangedHomeTactic;
      if (aiChangedAwayTactic) lm.awayTactic = aiChangedAwayTactic;
      if (newGoalBanner) lm.goalBanner = newGoalBanner;
      lm.stats = newStats;
      lm.ball = ball;
      lm.homeAgents = homeAgents;
      lm.awayAgents = awayAgents;
      lm.goalScorers = newScorers;
      if (addedEvents.length > 0) {
        lm.events = [...addedEvents.reverse(), ...lm.events].slice(0, 7);
      }
      lm.finished = isFinished;
    });

    if (isFinished && onFinish) onFinish(gh, ga);
  }, 50);
}

function kickoffReset(ball, homeAgents, awayAgents, kickoffTeam) {
  (homeAgents || []).forEach(a => { a.x = a.baseX; a.y = a.baseY; a.vx = 0; a.vy = 0; });
  (awayAgents || []).forEach(a => { a.x = a.baseX; a.y = a.baseY; a.vx = 0; a.vy = 0; });

  const takers = kickoffTeam === "home" ? homeAgents : awayAgents;
  const taker = takers[9] || takers[6] || takers[1];
  taker.x = 0.5;
  taker.y = 0.5;

  ball.x = 0.5;
  ball.y = 0.5;
  ball.vx = 0;
  ball.vy = 0;
  ball.ownerTeam = kickoffTeam;
  ball.ownerId = taker.id;
  ball.isShot = false;
  ball.shooter = null;
  ball.stealCooldown = 14;
}

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

  const outOfPos = inPlayer.pos !== outAgent.posType;
  const effOvr = Math.max(55, inPlayer.ovr + (outOfPos ? -12 : 0));

  const newAgent = {
    ...outAgent,
    playerId: inPlayer.id,
    name: inPlayer.name,
    ovr: effOvr,
    outOfPosition: outOfPos,
    stamina: inPlayer.stamina ?? 100,
    speed: (0.0068 + Math.random() * 0.0014) * (0.88 + ((effOvr - 70) * 0.011))
  };

  agents[outAgentIndex] = newAgent;

  store.update(["liveMatch"], draft => {
    if (!draft.liveMatch) return;
    if (isUserHome) draft.liveMatch.homeAgents = agents;
    else draft.liveMatch.awayAgents = agents;
    draft.liveMatch.subsUsed = (draft.liveMatch.subsUsed || 0) + 1;
    draft.liveMatch.events.unshift(
      `🔄 ${draft.liveMatch.minute}' - Cambio: Entra ${inPlayer.name.split(" ").pop()} por ${outAgent.name.split(" ").pop()}${outOfPos ? " (⚠️ Fuera de puesto)" : ""}`
    );
  });

  return { ok: true };
}

export function setTactic(isHome, tactic) {
  store.update(["liveMatch"], draft => {
    if (draft.liveMatch) {
      const prev = isHome ? draft.liveMatch.homeTactic : draft.liveMatch.awayTactic;
      if (prev !== tactic) {
        if (isHome) draft.liveMatch.homeTactic = tactic;
        else draft.liveMatch.awayTactic = tactic;
        draft.liveMatch.events.unshift(`📋 ${draft.liveMatch.minute}' - Orden táctica: ${tactic}`);
      }
    }
  });
}

export function togglePauseMatch() {
  store.update(["liveMatch"], draft => { if (draft.liveMatch) draft.liveMatch.paused = !draft.liveMatch.paused; });
}

export function drawPitch(canvas, liveMatch) {
  if (!canvas || !liveMatch) return;
  const bxVal = liveMatch.ball?.x ?? 0.5;
  const byVal = liveMatch.ball?.y ?? 0.5;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const padX = 28;
  const padY = 20;
  const fieldW = w - padX * 2;
  const fieldH = h - padY * 2;

  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#166534";
  for (let i = 0; i < 12; i += 2) {
    ctx.fillRect(padX + (fieldW / 12) * i, padY, fieldW / 12, fieldH);
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(padX, padY, fieldW, fieldH);

  ctx.beginPath();
  ctx.moveTo(w / 2, padY);
  ctx.lineTo(w / 2, h - padY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeRect(padX, h / 2 - 75, 58, 150);
  ctx.strokeRect(w - padX - 58, h / 2 - 75, 58, 150);
  ctx.strokeRect(padX, h / 2 - 38, 22, 76);
  ctx.strokeRect(w - padX - 22, h / 2 - 38, 22, 76);

  const goalH = 68;
  const goalDepth = 16;
  const goalTop = h / 2 - goalH / 2;

  const drawGoalNet = (gx, gw) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(gx, goalTop, gw, goalH);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gx, goalTop, gw, goalH);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let y = goalTop + 8; y < goalTop + goalH; y += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gw, y);
      ctx.stroke();
    }
  };

  drawGoalNet(padX - goalDepth, goalDepth);
  drawGoalNet(w - padX, goalDepth);

  const drawTeamAgents = (agents, colors, isHome) => {
    if (!Array.isArray(agents)) return;
    agents.forEach(a => {
      const px = padX + a.x * fieldW;
      const py = padY + a.y * fieldH;
      const isGK = a.posType === "POR";

      const fill = isGK ? (isHome ? "#facc15" : "#22d3ee") : (colors?.[0] || "#2563eb");
      const stroke = isGK ? "#090d16" : (colors?.[1] || "#ffffff");

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px, py, isGK ? 8.5 : 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      if (a.name) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(a.name.split(" ").pop(), px, py + 16);
      }
    });
  };

  drawTeamAgents(liveMatch.homeAgents, liveMatch.homeColors, true);
  drawTeamAgents(liveMatch.awayAgents, liveMatch.awayColors, false);

  const bx = padX + bxVal * fieldW;
  const by = padY + byVal * fieldH;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(bx + 2, by + 3, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = liveMatch.ball?.isShot ? "#fde047" : "#ffffff";
  ctx.beginPath();
  ctx.arc(bx, by, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (liveMatch.goalBanner && liveMatch.goalBanner.timer > 0) {
    const gb = liveMatch.goalBanner;
    const progress = 1 - (gb.timer / gb.maxTimer);

    const gx = gb.goalSide === "right" ? w - padX : padX;
    const gy = h / 2;
    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${1 - progress})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(gx, gy, 15 + progress * 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(9, 13, 22, 0.55)";
    ctx.fillRect(0, 0, w, h);

    const scale = progress < 0.18 ? (progress / 0.18) * 1.06 : progress < 0.28 ? 1.06 - ((progress - 0.18) / 0.1) * 0.06 : 1;
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);

    const cardW = 390;
    const cardH = 148;
    const c1 = gb.colors?.[0] || "#2563eb";
    const c2 = gb.colors?.[1] || "#facc15";

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
    ctx.fill();

    ctx.strokeStyle = c2;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, 14, cardH, [14, 0, 0, 14]);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.font = "900 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚽ ¡GOOOL!", 6, -24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`${gb.scorerName}  •  Min ${gb.minute}'`, 6, 12);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(gb.scoreText, 6, 42);

    ctx.restore();
  }
}