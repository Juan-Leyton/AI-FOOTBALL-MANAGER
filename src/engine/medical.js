import { store } from "../core/state.js";

const INJURY_TYPES = [
  "Sobrecarga muscular",
  "Rotura fibrilar leve",
  "Esguince de tobillo",
  "Contusión articular",
  "Distensión en isquiotibiales"
];

export function isPlayerUnavailable(player) {
  if (!player) return false;
  return (player.injuredMatches || 0) > 0 || (player.suspendedMatches || 0) > 0;
}

export function getPlayerStatusBadge(player) {
  if ((player.injuredMatches || 0) > 0) {
    return `<span style="background:rgba(239,68,68,0.22); border:1px solid rgba(239,68,68,0.45); color:#fca5a5; font-size:10px; padding:2px 6px; border-radius:5px; font-weight:800;">🏥 Lesión (${player.injuredMatches}j)</span>`;
  }
  if ((player.suspendedMatches || 0) > 0) {
    return `<span style="background:rgba(245,158,11,0.22); border:1px solid rgba(245,158,11,0.45); color:#fde047; font-size:10px; padding:2px 6px; border-radius:5px; font-weight:800;">🟥 Sanción (${player.suspendedMatches}j)</span>`;
  }
  return "";
}

export function applyPostMatchMedicalAndCards(liveMatch) {
  if (!liveMatch) return [];
  const state = store.get();
  const userClubId = state.userClubId;
  const fitnessLvl = state.staff?.fitness || 1;
  const isUserHome = liveMatch.homeId === userClubId;
  const userAgents = isUserHome ? liveMatch.homeAgents : liveMatch.awayAgents;
  const reports = [];

  store.update(["players", "inbox"], draft => {
    (userAgents || []).forEach(agent => {
      if (!agent.playerId || !draft.players[agent.playerId]) return;
      const p = draft.players[agent.playerId];

      // 1. Sincronizar desgaste físico del partido
      if (typeof agent.stamina === "number") {
        p.stamina = Math.max(20, Math.round(agent.stamina));
      }

      // 2. Tarjeta roja -> 1 partido de sanción
      if (agent.expelled) {
        p.suspendedMatches = (p.suspendedMatches || 0) + 1;
        p.starter = false;
        reports.push(`🟥 ${p.name} ha sido sancionado con 1 partido tras su expulsión.`);
      }

      // 3. Acumulación de amarillas (5 amarillas = 1 partido)
      if ((agent.yellowCards || 0) > 0 && !agent.expelled) {
        p.yellowCardsSeason = (p.yellowCardsSeason || 0) + agent.yellowCards;
        if (p.yellowCardsSeason >= 5) {
          p.yellowCardsSeason = 0;
          p.suspendedMatches = (p.suspendedMatches || 0) + 1;
          p.starter = false;
          reports.push(`🟨 ${p.name} cumple ciclo de 5 amarillas y se pierde el próximo partido.`);
        }
      }

      // 4. Riesgo de lesión si terminó muy fatigado (< 48% stamina)
      if ((p.stamina || 100) < 48 && (p.injuredMatches || 0) === 0) {
        const baseRisk = ((48 - p.stamina) / 48) * 0.28;
        const mitigatedRisk = baseRisk * Math.max(0.35, 1 - (fitnessLvl - 1) * 0.14);
        if (Math.random() < mitigatedRisk) {
          const gamesOut = Math.max(1, Math.min(3, Math.ceil(Math.random() * 3) - (fitnessLvl >= 4 ? 1 : 0)));
          const injName = INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];
          p.injuredMatches = gamesOut;
          p.starter = false;
          reports.push(`🏥 ${p.name} sufrió ${injName.toLowerCase()} (${gamesOut} ${gamesOut === 1 ? "jornada" : "jornadas"} de baja).`);
        }
      }
    });

    // Asegurar que el equipo siempre tenga hasta 11 titulares disponibles si hay suplentes sanos
    const clubPlayers = Object.values(draft.players).filter(pl => pl.clubId === userClubId);
    let activeStarters = clubPlayers.filter(pl => pl.starter && !isPlayerUnavailable(pl));
    if (activeStarters.length < 11) {
      const healthyBench = clubPlayers
        .filter(pl => !pl.starter && !isPlayerUnavailable(pl))
        .sort((a, b) => b.ovr - a.ovr);
      for (const sub of healthyBench) {
        if (activeStarters.length >= 11) break;
        sub.starter = true;
        activeStarters.push(sub);
      }
    }

    if (reports.length > 0) {
      draft.inbox = [
        {
          id: `med_${Date.now()}`,
          title: "🏥 Parte Médico y Disciplinario Post-Partido",
          date: `Temporada ${state.season || 1}`,
          body: reports.join(" "),
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    }
  });

  return reports;
}

export function advanceMedicalRecovery() {
  store.update(["players"], draft => {
    Object.values(draft.players || {}).forEach(p => {
      if ((p.injuredMatches || 0) > 0) {
        p.injuredMatches -= 1;
        if (p.injuredMatches === 0) {
          p.stamina = Math.max(p.stamina || 75, 85);
        }
      }
      if ((p.suspendedMatches || 0) > 0) {
        p.suspendedMatches -= 1;
      }
    });
  });
}