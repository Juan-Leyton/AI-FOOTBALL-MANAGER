import { store } from "../core/state.js";
import { grantManagerXp } from "./career-hooks.js";

export function ensurePressAndRecordsState() {
  const state = store.get();
  if (!state || !state.userClubId) return;

  if (!state.clubRecords || typeof state.unbeatenStreak !== "number" || state.pendingPressConference === undefined) {
    store.update(["clubRecords", "unbeatenStreak", "pendingPressConference"], draft => {
      if (!draft.clubRecords) {
        draft.clubRecords = {
          biggestWin: { score: "0-0", rival: "-", season: 1, diff: 0 },
          bestUnbeatenStreak: 0,
          highestPointsSeason: 0,
          biggestTransferFee: { playerName: "-", fee: 0, season: 1 }
        };
      }
      if (typeof draft.unbeatenStreak !== "number") {
        draft.unbeatenStreak = 0;
      }
      if (draft.pendingPressConference === undefined) {
        draft.pendingPressConference = null;
      }
    });
  }
}

// Actualiza récords y genera una rueda de prensa tras cada partido del usuario
export function registerPostMatchPressAndRecords(homeName, awayName, gh, ga, wasUserHome) {
  ensurePressAndRecordsState();
  const userGoals = wasUserHome ? gh : ga;
  const rivalGoals = wasUserHome ? ga : gh;
  const rivalName = wasUserHome ? awayName : homeName;
  const diff = userGoals - rivalGoals;
  const won = diff > 0;
  const drew = diff === 0;

  store.update(["clubRecords", "unbeatenStreak", "pendingPressConference"], draft => {
    if (!draft.clubRecords) {
      draft.clubRecords = {
        biggestWin: { score: "0-0", rival: "-", season: 1, diff: 0 },
        bestUnbeatenStreak: 0,
        highestPointsSeason: 0,
        biggestTransferFee: { playerName: "-", fee: 0, season: 1 }
      };
    }

    // 1. Actualizar racha invicta y mayor goleada
    if (won || drew) {
      draft.unbeatenStreak = (draft.unbeatenStreak || 0) + 1;
      if (draft.unbeatenStreak > (draft.clubRecords.bestUnbeatenStreak || 0)) {
        draft.clubRecords.bestUnbeatenStreak = draft.unbeatenStreak;
      }
    } else {
      draft.unbeatenStreak = 0;
    }

    if (won && diff > (draft.clubRecords.biggestWin?.diff || 0)) {
      draft.clubRecords.biggestWin = {
        score: `${userGoals}-${rivalGoals}`,
        rival: rivalName,
        season: draft.season || 1,
        diff
      };
    }

    // 2. Generar pregunta de rueda de prensa contextual
    let headline = "";
    let question = "";
    let options = [];

    if (won && diff >= 3) {
      headline = `🎙️ Rueda de Prensa tras exhibición (${userGoals}-${rivalGoals} vs ${rivalName})`;
      question = `"Míster, hoy el equipo pasó por encima de ${rivalName}. ¿Creen en el vestuario que ya son el rival a batir del campeonato?"`;
      options = [
        {
          label: "🔥 'No tenemos techo, vamos a por todos los títulos'",
          effectText: "+6% Moral plantilla • +4 Confianza Directiva • +60 XP",
          moraleDelta: 6,
          boardDelta: 4,
          xp: 60
        },
        {
          label: "🧊 'Pies en la tierra, esto son solo 3 puntos'",
          effectText: "+4% Recuperación Física • +3% Moral • +50 XP",
          moraleDelta: 3,
          staminaDelta: 4,
          boardDelta: 2,
          xp: 50
        },
        {
          label: "🌟 'El mérito es 100% de los jugadores y la afición'",
          effectText: "+9% Moral plantilla • +40 XP",
          moraleDelta: 9,
          boardDelta: 1,
          xp: 40
        }
      ];
    } else if (won) {
      headline = `🎙️ Rueda de Prensa post-victoria (${userGoals}-${rivalGoals} vs ${rivalName})`;
      question = `"Triunfo trabajado frente a ${rivalName}. ¿Qué aspecto táctico fue la clave para decantar el partido?"`;
      options = [
        {
          label: "🧠 'La disciplina táctica y el compromiso sin balón'",
          effectText: "+5 Confianza Directiva • +3% Moral • +55 XP",
          moraleDelta: 3,
          boardDelta: 5,
          xp: 55
        },
        {
          label: "⚡ 'La pegada de nuestros atacantes en los momentos clave'",
          effectText: "+6% Moral plantilla • +45 XP",
          moraleDelta: 6,
          boardDelta: 2,
          xp: 45
        },
        {
          label: "🔄 'Los suplentes entraron con hambre y cambiaron el ritmo'",
          effectText: "+8% Moral suplentes • +45 XP",
          benchMoraleDelta: 8,
          moraleDelta: 2,
          xp: 45
        }
      ];
    } else if (drew) {
      headline = `🎙️ Rueda de Prensa tras empate (${userGoals}-${rivalGoals} vs ${rivalName})`;
      question = `"Empate ante ${rivalName} que deja sensaciones mixtas. ¿Siente que se escaparon dos puntos hoy?"`;
      options = [
        {
          label: "🛡️ 'Sumar siempre es positivo, el equipo compitió bien'",
          effectText: "+4% Moral plantilla • +35 XP",
          moraleDelta: 4,
          boardDelta: 1,
          xp: 35
        },
        {
          label: "⚠️ 'Nos faltó contundencia en las áreas, toca exigir más'",
          effectText: "+4 Confianza Directiva • -2% Moral • +50 XP",
          moraleDelta: -2,
          boardDelta: 4,
          xp: 50
        },
        {
          label: "🤝 'Asumo la responsabilidad táctica, mejoraremos la próxima fecha'",
          effectText: "+6% Moral plantilla • -2 Confianza • +45 XP",
          moraleDelta: 6,
          boardDelta: -2,
          xp: 45
        }
      ];
    } else {
      headline = `🎙️ Rueda de Prensa tras derrota (${userGoals}-${rivalGoals} vs ${rivalName})`;
      question = `"Dura caída frente a ${rivalName} (${userGoals}-${rivalGoals}). La afición pide explicaciones, ¿qué mensaje envía?"`;
      options = [
        {
          label: "🛡️ 'Yo soy el máximo responsable, protejo a mis jugadores'",
          effectText: "+7% Moral plantilla • -3 Confianza Directiva • +50 XP",
          moraleDelta: 7,
          boardDelta: -3,
          xp: 50
        },
        {
          label: "🔥 'Hoy no estuvimos a la altura del escudo, habrá cambios'",
          effectText: "+5 Confianza Directiva • -4% Moral • +60 XP",
          moraleDelta: -4,
          boardDelta: 5,
          xp: 60
        },
        {
          label: "📈 'Analizaremos los errores en vídeo y volveremos más fuertes'",
          effectText: "+3% Recuperación Física • +2% Moral • +45 XP",
          moraleDelta: 2,
          staminaDelta: 3,
          boardDelta: 1,
          xp: 45
        }
      ];
    }

    draft.pendingPressConference = {
      id: `press_${Date.now()}`,
      headline,
      question,
      options
    };
  });
}

export function answerPressConference(optionIndex) {
  const state = store.get();
  const press = state.pendingPressConference;
  if (!press || !press.options?.[optionIndex]) {
    return { ok: false, msg: "No hay rueda de prensa pendiente." };
  }

  const chosen = press.options[optionIndex];

  store.update(["players", "boardConfidence", "pendingPressConference", "inbox"], draft => {
    draft.boardConfidence = Math.max(15, Math.min(100, (draft.boardConfidence || 80) + (chosen.boardDelta || 0)));

    Object.values(draft.players || {}).forEach(p => {
      if (p.clubId === draft.userClubId) {
        const extra = !p.starter && chosen.benchMoraleDelta ? chosen.benchMoraleDelta : 0;
        p.morale = Math.max(25, Math.min(100, (p.morale ?? 82) + (chosen.moraleDelta || 0) + extra));
        if (chosen.staminaDelta) {
          p.stamina = Math.min(100, (p.stamina ?? 90) + chosen.staminaDelta);
        }
      }
    });

    draft.inbox = [
      {
        id: `press_log_${Date.now()}`,
        title: press.headline,
        body: `Declaración ante los medios: ${chosen.label} (${chosen.effectText}).`,
        date: `T${draft.season || 1}`,
        resolved: true
      },
      ...(draft.inbox || [])
    ].slice(0, 25);

    draft.pendingPressConference = null;
  });

  if (chosen.xp) {
    grantManagerXp(chosen.xp, "Rueda de Prensa");
  }

  return { ok: true, msg: `🎙️ Declaración registrada: ${chosen.effectText}` };
}

// Analiza el estado anímico del vestuario
export function getLockerRoomDynamics(state) {
  const squad = Object.values(state.players || {}).filter(p => p.clubId === state.userClubId);
  if (squad.length === 0) return null;

  const avgMorale = Math.round(squad.reduce((s, p) => s + (p.morale ?? 82), 0) / squad.length);

  // Líderes del vestuario (veteranos o estrellas con moral alta)
  const leaders = squad
    .filter(p => (p.age >= 27 || p.ovr >= 82) && (p.morale ?? 82) >= 82)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 3);

  // Jugadores inquietos (buen OVR pero suplentes o moral < 72)
  const unsettled = squad
    .filter(p => (!p.starter && p.ovr >= 76) || (p.morale ?? 82) < 72)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 4);

  return {
    avgMorale,
    leaders,
    unsettled,
    atmosphere:
      avgMorale >= 86 ? { label: "Vestuario Unido y Eufórico", color: "#34d399" } :
      avgMorale >= 72 ? { label: "Ambiente Profesional Estable", color: "#38bdf8" } :
      { label: "Tensión en el Vestuario", color: "#f87171" }
  };
}

// Charla motivacional de vestuario (1 vez por jornada)
export function holdTeamMeeting() {
  const state = store.get();
  const roundKey = `${state.season || 1}_${state.competitions?.league_1?.currentRound || 0}`;
  if (state.lastTeamMeetingRound === roundKey) {
    return { ok: false, msg: "Ya diste una charla grupal esta jornada. Espera al próximo partido." };
  }

  store.update(["players", "lastTeamMeetingRound"], draft => {
    draft.lastTeamMeetingRound = roundKey;
    Object.values(draft.players || {}).forEach(p => {
      if (p.clubId === draft.userClubId) {
        p.morale = Math.min(100, (p.morale ?? 80) + 7);
      }
    });
  });

  grantManagerXp(35, "Charla de vestuario");
  return { ok: true, msg: "🗣️ ¡Gran charla motivacional! La moral de toda la plantilla subió +7%." };
}