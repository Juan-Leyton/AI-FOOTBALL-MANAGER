import { store } from "../core/state.js";
import { playWhistle, playKick, playGoalCheer } from "./audio.js";

let matchInterval = null;
const MAX_GOALS_PER_TEAM = 5;
const ballTrail = [];

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
  const skillFactor = 0.90 + ((effectiveOvr - 75) * 0.010);

  return {
    id: i,
    team: isHome ? "home" : "away",
    playerId: player?.id || null,
    name: player?.name || `Jugador ${i + 1}`,
    ovr: effectiveOvr,
    outOfPosition,
    stamina,
    yellowCards: 0,
    expelled: false,
    posType: slot.pos,
    baseX: startX,
    baseY: slot.y,
    x: startX,
    y: slot.y,
    vx: 0,
    vy: 0,
    speed: (0.0056 + Math.random() * 0.0010) * skillFactor,
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

function isInsidePenaltyBox(x, y, defenderIsHome) {
  const inY = y >= 0.27 && y <= 0.73;
  if (!inY) return false;
  return defenderIsHome ? x <= 0.16 : x >= 0.84;
}

export function startLiveMatch(homeId, awayId, onFinish, isKnockout = false) {
  const state = store.get();
  const homeClub = state.clubs[homeId];
  const awayClub = state.clubs[awayId];

  const homeAgents = initAgents(homeClub, state.players, true);
  const awayAgents = initAgents(awayClub, state.players, false);
  const kickoffPlayer = homeAgents[9] || homeAgents[6];
  ballTrail.length = 0;

  const liveData = {
    homeId,
    awayId,
    isKnockout,
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
    shootout: null,
    stats: { homePoss: 1, awayPoss: 1, homeShots: 0, awayShots: 0, homeFouls: 0, awayFouls: 0 },
    ball: {
      x: 0.5,
      y: 0.5,
      vx: 0,
      vy: 0,
      ownerTeam: "home",
      ownerId: kickoffPlayer.id,
      isShot: false,
      isPenalty: false,
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
  playWhistle(false);
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

    if (m.shootout) {
      stepPenaltyShootout(m, onFinish);
      return;
    }

    const ball = { ...m.ball };
    const homeAgents = m.homeAgents.map(a => ({ ...a }));
    const awayAgents = m.awayAgents.map(a => ({ ...a }));
    let { tick, gh, ga, homeTactic, awayTactic } = m;
    const addedEvents = [];
    const newScorers = [...(m.goalScorers || [])];
    const newStats = { ...(m.stats || { homePoss: 1, awayPoss: 1, homeShots: 0, awayShots: 0, homeFouls: 0, awayFouls: 0 }) };
    let newGoalBanner = null;
    let aiChangedHomeTactic = null;
    let aiChangedAwayTactic = null;

    const nextTick = (tick || 0) + 1;
    const currentMin = Math.floor(nextTick / 10);

    if (ball.stealCooldown > 0) ball.stealCooldown -= 1;

    if (ball.ownerTeam === "home") newStats.homePoss += 1;
    else if (ball.ownerTeam === "away") newStats.awayPoss += 1;

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

      const sliderShift = ((sMentality - 50) / 50) * 0.07;
      const tempoFactor = 0.85 + (sTempo / 100) * 0.35;
      const pressFactor = 0.70 + (sPress / 100) * 0.65;

      if (tacticLabel === "Ofensivo") {
        return {
          blockShift: 0.22 + sliderShift,
          pressRange: 0.32 * pressFactor,
          passSpeed: 0.025 * tempoFactor,
          shootRange: 0.28,
          shootAggression: 0.42,
          dribbleRatio: 0.44,
          decisionDelay: Math.max(6, Math.round(12 / tempoFactor)),
          defLineCap: 0.45,
          foulRisk: 0.16
        };
      }
      if (tacticLabel === "Defensivo") {
        return {
          blockShift: -0.20 + sliderShift,
          pressRange: 0.11 * pressFactor,
          passSpeed: 0.019 * tempoFactor,
          shootRange: 0.20,
          shootAggression: 0.18,
          dribbleRatio: 0.20,
          decisionDelay: Math.max(8, Math.round(15 / tempoFactor)),
          defLineCap: 0.22,
          foulRisk: 0.11
        };
      }
      return {
        blockShift: 0.02 + sliderShift,
        pressRange: 0.20 * pressFactor,
        passSpeed: 0.022 * tempoFactor,
        shootRange: 0.24,
        shootAggression: 0.28,
        dribbleRatio: 0.33,
        decisionDelay: Math.max(7, Math.round(13 / tempoFactor)),
        defLineCap: 0.34,
        foulRisk: 0.13
      };
    };

    const homeProfile = getTacticProfile(homeTactic, m.homeSliders);
    const awayProfile = getTacticProfile(awayTactic, m.awaySliders);

    let carrier = null;
    if (ball.ownerTeam && ball.ownerId !== null) {
      const pool = ball.ownerTeam === "home" ? homeAgents : awayAgents;
      carrier = pool.find(a => a.id === ball.ownerId && !a.expelled) || null;
    }

    if (carrier) {
      const dir = carrier.team === "home" ? 1 : -1;
      ball.x = carrier.x + dir * 0.011;
      ball.y = carrier.y;
      ball.vx = 0;
      ball.vy = 0;
      ball.isShot = false;
      ball.isPenalty = false;
    } else {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= ball.isShot ? 0.985 : 0.960;
      ball.vy *= ball.isShot ? 0.985 : 0.960;

      if (ball.y < 0.04 || ball.y > 0.96) {
        ball.vy *= -0.65;
        ball.y = Math.max(0.04, Math.min(0.96, ball.y));
      }

      const inGoalMouth = ball.y >= 0.40 && ball.y <= 0.60;

      if (ball.x >= 0.985) {
        if (inGoalMouth && ball.isShot && (gh < MAX_GOALS_PER_TEAM || ball.isPenalty)) {
          gh++;
          playGoalCheer();
          const scorer = ball.shooter;
          const fullName = scorer?.name || "Delantero";
          const sName = fullName.split(" ").pop();
          addedEvents.push(`⚽ ${currentMin}' - ¡GOOOL${ball.isPenalty ? " DE PENAL" : ""} de ${sName}! (${m.homeName} ${gh}-${ga} ${m.awayName})`);
          if (scorer) {
            newScorers.push({ playerId: scorer.playerId, name: fullName, clubId: m.homeId, minute: currentMin });
          }
          newGoalBanner = {
            scorerName: `${fullName}${ball.isPenalty ? " (Penal)" : ""}`,
            clubName: m.homeName,
            colors: m.homeColors,
            minute: currentMin,
            scoreText: `${m.homeName} ${gh} - ${ga} ${m.awayName}`,
            timer: 30,
            maxTimer: 30,
            goalSide: "right"
          };
          ball.isPenalty = false;
          kickoffReset(ball, homeAgents, awayAgents, "away");
        } else {
          if (ball.isShot && Math.random() < 0.35) {
            addedEvents.push(`💨 ${currentMin}' - Remate desviado de ${ball.shooter?.name.split(" ").pop() || "atacante"}`);
          }
          const awayGk = awayAgents[0];
          ball.x = awayGk.x; ball.y = awayGk.y;
          ball.ownerTeam = "away"; ball.ownerId = awayGk.id;
          ball.isShot = false; ball.isPenalty = false; ball.stealCooldown = 20;
          awayGk.decisionTimer = 14;
        }
      } else if (ball.x <= 0.015) {
        if (inGoalMouth && ball.isShot && (ga < MAX_GOALS_PER_TEAM || ball.isPenalty)) {
          ga++;
          playGoalCheer();
          const scorer = ball.shooter;
          const fullName = scorer?.name || "Delantero";
          const sName = fullName.split(" ").pop();
          addedEvents.push(`⚽ ${currentMin}' - ¡GOOOL${ball.isPenalty ? " DE PENAL" : ""} de ${sName}! (${m.homeName} ${gh}-${ga} ${m.awayName})`);
          if (scorer) {
            newScorers.push({ playerId: scorer.playerId, name: fullName, clubId: m.awayId, minute: currentMin });
          }
          newGoalBanner = {
            scorerName: `${fullName}${ball.isPenalty ? " (Penal)" : ""}`,
            clubName: m.awayName,
            colors: m.awayColors,
            minute: currentMin,
            scoreText: `${m.homeName} ${gh} - ${ga} ${m.awayName}`,
            timer: 30,
            maxTimer: 30,
            goalSide: "left"
          };
          ball.isPenalty = false;
          kickoffReset(ball, homeAgents, awayAgents, "home");
        } else {
          if (ball.isShot && Math.random() < 0.35) {
            addedEvents.push(`💨 ${currentMin}' - Remate desviado de ${ball.shooter?.name.split(" ").pop() || "atacante"}`);
          }
          const homeGk = homeAgents[0];
          ball.x = homeGk.x; ball.y = homeGk.y;
          ball.ownerTeam = "home"; ball.ownerId = homeGk.id;
          ball.isShot = false; ball.isPenalty = false; ball.stealCooldown = 20;
          homeGk.decisionTimer = 14;
        }
      }
    }

    const triggerPenaltyKick = (attackingIsHome) => {
      const attackers = (attackingIsHome ? homeAgents : awayAgents).filter(a => !a.expelled && a.posType !== "POR");
      const taker = [...attackers].sort((a, b) => b.ovr - a.ovr)[0] || attackers[0];
      if (!taker) return;

      const spotX = attackingIsHome ? 0.88 : 0.12;
      const goalX = attackingIsHome ? 0.985 : 0.015;
      taker.x = spotX;
      taker.y = 0.50;

      const targetY = 0.50 + (Math.random() - 0.5) * 0.17;
      const angle = Math.atan2(targetY - 0.50, goalX - spotX);
      const shotSpeed = 0.042;

      playKick();
      ball.ownerTeam = null;
      ball.ownerId = null;
      ball.x = spotX;
      ball.y = 0.50;
      ball.isShot = true;
      ball.isPenalty = true;
      ball.shooter = taker;
      ball.vx = Math.cos(angle) * shotSpeed;
      ball.vy = Math.sin(angle) * shotSpeed;
      ball.stealCooldown = 10;

      if (attackingIsHome) newStats.homeShots += 1;
      else newStats.awayShots += 1;
    };

    const stepTeam = (agents, isHome, profile) => {
      const teamKey = isHome ? "home" : "away";
      const enemyAgents = isHome ? awayAgents : homeAgents;
      const shiftX = isHome ? profile.blockShift : -profile.blockShift;
      const teamHasBall = ball.ownerTeam === teamKey;
      const carrierIsGK = carrier?.posType === "POR";

      let chaser = null;
      let bestDist = Infinity;
      agents.forEach(a => {
        if (!a.expelled && a.posType !== "POR") {
          const d = Math.hypot(ball.x - a.x, ball.y - a.y);
          if (d < bestDist) { bestDist = d; chaser = a; }
        }
      });

      agents.forEach(a => {
        if (a.expelled) return;

        if (nextTick % 26 === 0) {
          const drain = profile.blockShift > 0.12 ? 0.74 : profile.blockShift < -0.12 ? 0.42 : 0.56;
          a.stamina = Math.max(25, (a.stamina ?? 100) - drain);
        }

        const fatigueMult = 0.80 + ((a.stamina ?? 100) / 100) * 0.20;
        const speed = a.speed * fatigueMult;

        if (a.posType === "POR") {
          const homeGoalX = isHome ? 0.042 : 0.958;
          const targetY = Math.max(0.40, Math.min(0.60, ball.y));
          a.vx = (homeGoalX - a.x) * 0.16;
          a.vy = (targetY - a.y) * (ball.isShot ? 0.26 : 0.14);
          a.x += a.vx;
          a.y += a.vy;

          if (carrier && carrier.id === a.id && carrier.team === teamKey) {
            a.decisionTimer = (a.decisionTimer || 0) - 1;
            if (a.decisionTimer <= 0) {
              const midfieldTargets = agents.filter(t => !t.expelled && t.id !== a.id && (t.posType === "MED" || t.posType === "DEL"));
              const pool = midfieldTargets.length > 0 ? midfieldTargets : agents.filter(t => !t.expelled && t.id !== a.id);
              const target = pool[Math.floor(Math.random() * pool.length)];

              if (target) {
                const kickX = isHome ? Math.max(0.38, target.x) : Math.min(0.62, target.x);
                const angle = Math.atan2(target.y - a.y, kickX - a.x);
                ball.ownerTeam = null;
                ball.ownerId = null;
                ball.isShot = false;
                ball.vx = Math.cos(angle) * 0.032;
                ball.vy = Math.sin(angle) * 0.032;
                ball.stealCooldown = 8;
              }
            }
            return;
          }

          if (!carrier && Math.hypot(ball.x - a.x, ball.y - a.y) < 0.038) {
            const rivalGoals = isHome ? ga : gh;
            const baseSave = ball.isPenalty ? 0.24 : (0.72 + ((a.ovr - 75) * 0.011));
            const saveChance = (!ball.isPenalty && rivalGoals >= MAX_GOALS_PER_TEAM) ? 1.0 : baseSave;
            if (!ball.isShot || Math.random() < Math.min(0.90, saveChance)) {
              if (ball.isShot && Math.random() < (ball.isPenalty ? 0.95 : 0.40)) {
                addedEvents.push(`🧤 ${currentMin}' - ${ball.isPenalty ? "¡ATAJÓ EL PENAL " : "¡Gran parada de "}${a.name.split(" ").pop()}!`);
              }
              ball.ownerTeam = teamKey;
              ball.ownerId = a.id;
              ball.isShot = false;
              ball.isPenalty = false;
              ball.stealCooldown = 25;
              a.decisionTimer = 14;
            }
          }
          return;
        }

        if (carrier && carrier.id === a.id && carrier.team === teamKey) {
          const goalX = isHome ? 0.985 : 0.015;
          const distGoal = Math.abs(goalX - a.x);
          const dirX = isHome ? 1 : -1;

          const defenderHold = (a.posType === "DEF" && profile.blockShift < -0.08 && (isHome ? a.x > 0.36 : a.x < 0.64));

          const centerPull = (0.5 - a.y) * 0.32;
          a.vx = defenderHold ? 0 : dirX * speed * 0.94;
          a.vy = centerPull * speed;
          a.x = Math.max(0.05, Math.min(0.95, a.x + a.vx));
          a.y = Math.max(0.07, Math.min(0.93, a.y + a.vy));

          a.decisionTimer = (a.decisionTimer || 0) - 1;
          if (a.decisionTimer > 0 && !defenderHold) return;

          const nearestEnemyDist = enemyAgents.reduce((min, e) => e.expelled ? min : Math.min(min, Math.hypot(e.x - a.x, e.y - a.y)), 99);
          const underPressure = nearestEnemyDist < 0.085;

          if (distGoal <= profile.shootRange && Math.abs(a.y - 0.5) < 0.27) {
            if (Math.random() < profile.shootAggression || distGoal < 0.15) {
              const accuracySpread = Math.max(0.16, 0.30 - ((a.ovr - 70) * 0.005));
              const targetY = 0.5 + (Math.random() - 0.5) * accuracySpread;
              const angle = Math.atan2(targetY - a.y, goalX - a.x);
              const shotSpeed = 0.037 + ((a.ovr - 70) * 0.0005);

              playKick();
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
            const maxPassDist = profile.blockShift < -0.08 ? 0.58 : 0.40;
            const forwardOptions = agents.filter(t =>
              !t.expelled &&
              t.id !== a.id &&
              t.posType !== "POR" &&
              (isHome ? t.x > a.x + 0.02 : t.x < a.x - 0.02) &&
              Math.hypot(t.x - a.x, t.y - a.y) < maxPassDist
            );
            const safeOptions = agents.filter(t =>
              !t.expelled &&
              t.id !== a.id &&
              t.posType !== "POR" &&
              Math.hypot(t.x - a.x, t.y - a.y) < 0.34
            );

            const candidates = forwardOptions.length > 0 ? forwardOptions : safeOptions;
            if (candidates.length > 0) {
              const target = candidates[Math.floor(Math.random() * candidates.length)];
              const leadX = target.x + dirX * 0.022;
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
          a.vx = ((ball.x - a.x) / (distBall || 1)) * speed * 1.14;
          a.vy = ((ball.y - a.y) / (distBall || 1)) * speed * 1.14;
          a.x += a.vx;
          a.y += a.vy;

          if (Math.hypot(ball.x - a.x, ball.y - a.y) < 0.025 && ball.stealCooldown === 0) {
            ball.ownerTeam = teamKey;
            ball.ownerId = a.id;
            ball.isShot = false;
            a.decisionTimer = profile.decisionDelay;
          }
          return;
        }

        if (carrier && !carrierIsGK && !teamHasBall && a === chaser && distBall < profile.pressRange) {
          a.vx = ((carrier.x - a.x) / (distBall || 1)) * speed * 1.12;
          a.vy = ((carrier.y - a.y) / (distBall || 1)) * speed * 1.12;
          a.x += a.vx;
          a.y += a.vy;

          if (Math.hypot(carrier.x - a.x, carrier.y - a.y) < 0.024 && ball.stealCooldown === 0) {
            const foulRoll = Math.random();
            if (foulRoll < profile.foulRisk) {
              playWhistle(false);
              if (isHome) newStats.homeFouls += 1;
              else newStats.awayFouls += 1;

              const shortName = a.name.split(" ").pop();
              const inBox = isInsidePenaltyBox(carrier.x, carrier.y, isHome);

              const cardRoll = Math.random();
              if (cardRoll < 0.04) {
                a.expelled = true;
                addedEvents.push(`🟥 ${currentMin}' - ¡ROJA DIRECTA para ${shortName}!`);
              } else if (cardRoll < 0.34) {
                a.yellowCards = (a.yellowCards || 0) + 1;
                if (a.yellowCards >= 2) {
                  a.expelled = true;
                  addedEvents.push(`🟨🟥 ${currentMin}' - ¡Segunda amarilla y EXPULSIÓN para ${shortName}!`);
                } else {
                  addedEvents.push(`🟨 ${currentMin}' - Tarjeta amarilla para ${shortName}`);
                }
              }

              if (inBox) {
                addedEvents.push(`🚨 ${currentMin}' - ¡PENAL cometido por ${shortName}!`);
                triggerPenaltyKick(!isHome);
              } else {
                carrier.decisionTimer = 10;
                ball.stealCooldown = 18;
              }
              return;
            }

            const tackleProb = 0.24 + ((a.ovr - carrier.ovr) * 0.012);
            if (Math.random() < Math.max(0.10, Math.min(0.46, tackleProb))) {
              ball.ownerTeam = teamKey;
              ball.ownerId = a.id;
              ball.stealCooldown = 13;
              a.decisionTimer = profile.decisionDelay;
            } else {
              ball.stealCooldown = 8;
            }
          }
          return;
        }

        const ballShiftX = (ball.x - 0.5) * 0.12;
        const ballShiftY = (ball.y - 0.5) * 0.14;
        const supportAdvance = (teamHasBall && (a.posType === "DEL" || a.posType === "MED"))
          ? (isHome ? 0.055 : -0.055)
          : 0;
        const microMoveX = Math.sin(nextTick * 0.035 + a.noiseOffset) * 0.011;
        const microMoveY = Math.cos(nextTick * 0.035 + a.noiseOffset) * 0.011;

        let rawTargetX = a.baseX + shiftX + ballShiftX + supportAdvance + microMoveX;

        if (a.posType === "DEF") {
          if (isHome) rawTargetX = Math.min(profile.defLineCap, rawTargetX);
          else rawTargetX = Math.max(1 - profile.defLineCap, rawTargetX);
        }

        if (carrierIsGK && !teamHasBall) {
          if (isHome) rawTargetX = Math.min(0.76, rawTargetX);
          else rawTargetX = Math.max(0.24, rawTargetX);
        }

        const targetX = Math.max(0.08, Math.min(0.92, rawTargetX));
        const targetY = Math.max(0.08, Math.min(0.92, a.baseY + ballShiftY + microMoveY));

        a.vx = (targetX - a.x) * 0.105;
        a.vy = (targetY - a.y) * 0.105;
        a.x += a.vx;
        a.y += a.vy;
      });
    };

    stepTeam(homeAgents, true, homeProfile);
    stepTeam(awayAgents, false, awayProfile);

    const isTimeUp = currentMin >= 90;
    let isFinished = false;
    let startedShootout = null;

    if (isTimeUp) {
      if (m.isKnockout && gh === ga) {
        playWhistle(false);
        startedShootout = {
          turn: "home",
          kicksTaken: 0,
          homeScore: 0,
          awayScore: 0,
          history: [],
          waitTicks: 10
        };
        addedEvents.push(`🎯 90' - ¡Empate en Copa! Nos vamos a la TANDA DE PENALES`);
      } else {
        isFinished = true;
        playWhistle(true);
        addedEvents.push(`🏁 90' - Final del encuentro: ${m.homeName} ${gh} - ${ga} ${m.awayName}`);
        clearInterval(matchInterval);
      }
    }

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
      if (startedShootout) lm.shootout = startedShootout;
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
  }, 60);
}

function stepPenaltyShootout(m, onFinish) {
  const so = { ...m.shootout, history: [...m.shootout.history] };
  if (so.waitTicks > 0) {
    so.waitTicks -= 1;
    store.update(["liveMatch"], draft => { if (draft.liveMatch) draft.liveMatch.shootout = so; });
    return;
  }

  const isHomeTurn = so.turn === "home";
  const shooters = (isHomeTurn ? m.homeAgents : m.awayAgents).filter(a => !a.expelled);
  const gk = (isHomeTurn ? m.awayAgents[0] : m.homeAgents[0]);
  const shooterIdx = Math.floor(so.kicksTaken / 2) % shooters.length;
  const shooter = shooters[shooterIdx] || shooters[0];

  playKick();
  const prob = Math.max(0.55, Math.min(0.88, 0.75 + ((shooter?.ovr || 78) - (gk?.ovr || 78)) * 0.008));
  const scored = Math.random() < prob;

  if (scored) {
    playGoalCheer();
    if (isHomeTurn) so.homeScore += 1;
    else so.awayScore += 1;
  }

  const sName = shooter?.name?.split(" ").pop() || "Lanzador";
  const evText = scored
    ? `⚽ Penal (${isHomeTurn ? m.homeName : m.awayName}): ¡Gol de ${sName}! (${so.homeScore}-${so.awayScore})`
    : `❌ Penal (${isHomeTurn ? m.homeName : m.awayName}): ¡Falló ${sName}! (${so.homeScore}-${so.awayScore})`;

  so.history.push({ team: so.turn, scored });
  so.kicksTaken += 1;
  so.turn = isHomeTurn ? "away" : "home";
  so.waitTicks = 14;

  const homeKicks = Math.ceil(so.kicksTaken / 2);
  const awayKicks = Math.floor(so.kicksTaken / 2);
  let winner = null;

  if (homeKicks <= 5 && awayKicks <= 5) {
    const homeRem = 5 - homeKicks;
    const awayRem = 5 - awayKicks;
    if (so.homeScore > so.awayScore + awayRem) winner = "home";
    else if (so.awayScore > so.homeScore + homeRem) winner = "away";
  } else if (homeKicks === awayKicks && so.homeScore !== so.awayScore) {
    winner = so.homeScore > so.awayScore ? "home" : "away";
  }

  if (winner) {
    const finalGh = winner === "home" ? m.gh + 1 : m.gh;
    const finalGa = winner === "away" ? m.ga + 1 : m.ga;
    const winName = winner === "home" ? m.homeName : m.awayName;
    playWhistle(true);
    clearInterval(matchInterval);

    store.update(["liveMatch"], draft => {
      const lm = draft.liveMatch;
      if (!lm) return;
      lm.shootout = so;
      lm.gh = finalGh;
      lm.ga = finalGa;
      lm.finished = true;
      lm.events = [`🏆 ¡${winName} gana la tanda de penales (${so.homeScore}-${so.awayScore})!`, evText, ...lm.events].slice(0, 7);
    });
    if (onFinish) onFinish(finalGh, finalGa);
  } else {
    store.update(["liveMatch"], draft => {
      const lm = draft.liveMatch;
      if (!lm) return;
      lm.shootout = so;
      lm.events = [evText, ...lm.events].slice(0, 7);
    });
  }
}

function kickoffReset(ball, homeAgents, awayAgents, kickoffTeam) {
  ballTrail.length = 0;
  (homeAgents || []).forEach(a => { if (!a.expelled) { a.x = a.baseX; a.y = a.baseY; a.vx = 0; a.vy = 0; } });
  (awayAgents || []).forEach(a => { if (!a.expelled) { a.x = a.baseX; a.y = a.baseY; a.vx = 0; a.vy = 0; } });

  const takers = (kickoffTeam === "home" ? homeAgents : awayAgents).filter(a => !a.expelled);
  const taker = takers.find(a => a.posType === "DEL") || takers[1] || takers[0];
  taker.x = 0.5;
  taker.y = 0.5;
  taker.decisionTimer = 12;

  ball.x = 0.5;
  ball.y = 0.5;
  ball.vx = 0;
  ball.vy = 0;
  ball.ownerTeam = kickoffTeam;
  ball.ownerId = taker.id;
  ball.isShot = false;
  ball.isPenalty = false;
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
  if (outAgent.expelled) return { ok: false, msg: "No puedes sustituir a un jugador expulsado con tarjeta roja." };

  const outOfPos = inPlayer.pos !== outAgent.posType;
  const effOvr = Math.max(55, inPlayer.ovr + (outOfPos ? -12 : 0));

  const newAgent = {
    ...outAgent,
    playerId: inPlayer.id,
    name: inPlayer.name,
    ovr: effOvr,
    outOfPosition: outOfPos,
    stamina: inPlayer.stamina ?? 100,
    yellowCards: 0,
    expelled: false,
    speed: (0.0056 + Math.random() * 0.0010) * (0.90 + ((effOvr - 75) * 0.010))
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

  if (liveMatch.minute === 0 && liveMatch.tick <= 2) ballTrail.length = 0;
  ballTrail.push({ x: bxVal, y: byVal, isShot: Boolean(liveMatch.ball?.isShot) });
  if (ballTrail.length > 7) ballTrail.shift();

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const padX = 32;
  const padY = 22;
  const fieldW = w - padX * 2;
  const fieldH = h - padY * 2;

  ctx.fillStyle = "#08120c";
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#134e2a" : "#165b31";
    ctx.fillRect(padX + (fieldW / 14) * i, padY, fieldW / 14 + 0.5, fieldH);
  }

  const floodlight = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.58);
  floodlight.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  floodlight.addColorStop(0.65, "rgba(0, 0, 0, 0.02)");
  floodlight.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = floodlight;
  ctx.fillRect(padX, padY, fieldW, fieldH);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 2;
  ctx.strokeRect(padX, padY, fieldW, fieldH);

  ctx.beginPath();
  ctx.moveTo(w / 2, padY);
  ctx.lineTo(w / 2, h - padY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 44, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeRect(padX, h / 2 - 76, 60, 152);
  ctx.strokeRect(w - padX - 60, h / 2 - 76, 60, 152);
  ctx.strokeRect(padX, h / 2 - 38, 22, 76);
  ctx.strokeRect(w - padX - 22, h / 2 - 38, 22, 76);

  ctx.beginPath();
  ctx.arc(padX + 42, h / 2, 2.5, 0, Math.PI * 2);
  ctx.arc(w - padX - 42, h / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  const goalH = 68;
  const goalDepth = 18;
  const goalTop = h / 2 - goalH / 2;

  const drawGoalNet = (gx, gw) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(gx, goalTop, gw, goalH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1;
    for (let y = goalTop + 6; y < goalTop + goalH; y += 6) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gw, y);
      ctx.stroke();
    }
    for (let x = gx + 6; x < gx + gw; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, goalTop);
      ctx.lineTo(x, goalTop + goalH);
      ctx.stroke();
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gx, goalTop, gw, goalH);
  };

  drawGoalNet(padX - goalDepth, goalDepth);
  drawGoalNet(w - padX, goalDepth);

  const drawTeamAgents = (agents, colors, isHome) => {
    if (!Array.isArray(agents)) return;
    const teamKey = isHome ? "home" : "away";

    agents.forEach((a, idx) => {
      if (a.expelled) return;
      const px = padX + a.x * fieldW;
      const py = padY + a.y * fieldH;
      const isGK = a.posType === "POR";
      const hasBall = liveMatch.ball?.ownerTeam === teamKey && liveMatch.ball?.ownerId === a.id;
      const radius = isGK ? 9.5 : 8.5;

      if (hasBall) {
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, radius + 4.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.beginPath();
      ctx.ellipse(px + 1.5, py + radius - 1, radius * 0.95, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const fill = isGK ? (isHome ? "#facc15" : "#22d3ee") : (colors?.[0] || "#2563eb");
      const stroke = isGK ? "#090d16" : (colors?.[1] || "#ffffff");

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      const jerseyNum = idx === 0 ? "1" : String(idx + 1);
      ctx.fillStyle = isGK ? "#090d16" : "#ffffff";
      ctx.font = "800 8.5px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(jerseyNum, px, py + 0.5);

      if ((a.yellowCards || 0) > 0) {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(px + 6, py - 12, 5, 7);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(px + 6, py - 12, 5, 7);
      }

      const stam = a.stamina ?? 100;
      if (stam < 75) {
        const barW = 16;
        const pct = Math.max(0.1, stam / 100);
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(px - barW / 2, py + radius + 2, barW, 2.5);
        ctx.fillStyle = stam > 48 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(px - barW / 2, py + radius + 2, barW * pct, 2.5);
      }

      if (a.name) {
        const lastName = a.name.split(" ").pop();
        ctx.font = "700 9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillText(lastName, px + 0.8, py + radius + 12.8);
        ctx.fillStyle = hasBall ? "#fde047" : "rgba(255, 255, 255, 0.92)";
        ctx.fillText(lastName, px, py + radius + 12);
      }
    });
  };

  drawTeamAgents(liveMatch.homeAgents, liveMatch.homeColors, true);
  drawTeamAgents(liveMatch.awayAgents, liveMatch.awayColors, false);

  if (ballTrail.length > 1) {
    for (let i = 0; i < ballTrail.length - 1; i++) {
      const pt = ballTrail[i];
      const alpha = ((i + 1) / ballTrail.length) * (pt.isShot ? 0.45 : 0.22);
      const tx = padX + pt.x * fieldW;
      const ty = padY + pt.y * fieldH;
      ctx.fillStyle = pt.isShot ? `rgba(253, 224, 71, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 2 + (i * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const bx = padX + bxVal * fieldW;
  const by = padY + byVal * fieldH;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.arc(bx + 2, by + 3.5, 4.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = liveMatch.ball?.isShot ? "#fde047" : "#ffffff";
  ctx.beginPath();
  ctx.arc(bx, by, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#090d16";
  ctx.lineWidth = 1.3;
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

    ctx.fillStyle = "rgba(9, 13, 22, 0.58)";
    ctx.fillRect(0, 0, w, h);

    const scale = progress < 0.18 ? (progress / 0.18) * 1.06 : progress < 0.28 ? 1.06 - ((progress - 0.18) / 0.1) * 0.06 : 1;
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);

    const cardW = 400;
    const cardH = 152;
    const c1 = gb.colors?.[0] || "#2563eb";
    const c2 = gb.colors?.[1] || "#facc15";

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    ctx.fill();

    ctx.strokeStyle = c2;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, 16, cardH, [16, 0, 0, 16]);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.font = "900 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚽ ¡GOOOL!", 8, -24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`${gb.scorerName}  •  Min ${gb.minute}'`, 8, 12);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(gb.scoreText, 8, 44);

    ctx.restore();
  }
}