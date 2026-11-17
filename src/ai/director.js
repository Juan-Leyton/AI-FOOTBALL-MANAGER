/**
 * src/ai/director.js - Director Narrativo de Eventos Dinámicos y Ofertas de Banquillo
 */
import { store } from "../core/state.js";

const EVENT_TEMPLATES = [
  {
    id: "ev_sponsor",
    title: "Oferta de Patrocinio Regional",
    body: "Una empresa tecnológica local quiere patrocinar las vallas del estadio durante el resto de la temporada, pero exige visibilidad exclusiva.",
    choices: [
      { label: "Aceptar acuerdo (+4.5 M€ presupuesto)", effect: { budget: 4500000, confidence: 3 } },
      { label: "Rechazar para mantener prestigio (+5% Confianza)", effect: { budget: 0, confidence: 5 } }
    ]
  },
  {
    id: "ev_star_unhappy",
    title: "Tensión en el Vestuario",
    body: "Uno de los pesos pesados del vestuario ha filtrado a la prensa que el ritmo de los entrenamientos tácticos es demasiado exigente.",
    choices: [
      { label: "Imponer autoridad del Míster (-4% Confianza, +Moral)", effect: { budget: 0, confidence: -4 } },
      { label: "Dar día libre a la plantilla (-1.0 M€ primas, +4% Confianza)", effect: { budget: -1000000, confidence: 4 } }
    ]
  },
  {
    id: "ev_academy_gem",
    title: "Informe del Ojeador Juvenil",
    body: "El director de la cantera ha descubierto a un joven talento de 17 años despuntando en el filial. Pide invertir en su contrato profesional.",
    choices: [
      { label: "Promover al primer equipo (-2.5 M€ bono firma)", effect: { budget: -2500000, spawnYouth: true } },
      { label: "Dejarlo madurar un año más en el juvenil", effect: { budget: 0, confidence: 1 } }
    ]
  },
  {
    id: "ev_press_conference",
    title: "Rueda de Prensa Previa",
    body: "Los periodistas te preguntan si el equipo tiene plantilla suficiente para pelear por el título esta temporada.",
    choices: [
      { label: "Prometer el título (Alta presión, +6% Confianza)", effect: { budget: 0, confidence: 6 } },
      { label: "Ser cauto e ir partido a partido (+2% Confianza)", effect: { budget: 0, confidence: 2 } }
    ]
  }
];

function maybeGenerateManagerJobOffer(state) {
  const trophiesCount = (state.trophies || []).length;
  const mgrLevel = state.managerProfile?.level || 1;
  const currentClub = state.clubs?.[state.userClubId];
  if (!currentClub) return null;

  // Solo ofrecer banquillo si el mánager tiene prestigio (títulos o nivel >= 2) y ~14% de prob por jornada
  if (trophiesCount === 0 && mgrLevel < 2) return null;
  if (Math.random() > 0.14) return null;

  const humanClubIds = new Set([
    state.userClubId,
    ...(state.mpManagers || []).map(m => m.clubId)
  ]);

  const minOvr = Math.min(84, (currentClub.ovr || 75) + 1);
  const suitors = Object.values(state.clubs || {}).filter(
    c => !humanClubIds.has(c.id) && c.ovr >= minOvr && c.leagueId !== currentClub.leagueId
  );
  if (!suitors.length) return null;

  const targetClub = suitors[Math.floor(Math.random() * suitors.length)];
  return {
    id: `job_offer_${targetClub.id}_${Date.now()}`,
    type: "manager_job_offer",
    targetClubId: targetClub.id,
    title: `💼 Oferta de Banquillo Internacional: ${targetClub.flag || ""} ${targetClub.name}`,
    body: `La directiva de <b>${targetClub.name}</b> (${targetClub.leagueName}, OVR ${targetClub.ovr}) está impresionada con tu palmarés y te ofrece tomar las riendas del club de inmediato con un presupuesto de <b>${((targetClub.budget || 45000000) / 1e6).toFixed(1)} M€</b>.<br><br><i>⚠️ Si aceptas, abandonarás tu club actual y te trasladarás a ${targetClub.country}.</i>`,
    date: `Temporada ${state.season || 1}`,
    choices: [
      { label: `✍️ Firmar por ${targetClub.name} (${targetClub.leagueName})` },
      { label: "Rechazar oferta y seguir en mi club actual (+4% Confianza)" }
    ],
    resolved: false
  };
}

export function triggerPostMatchEvent() {
  const state = store.get();

  const jobOffer = maybeGenerateManagerJobOffer(state);
  if (jobOffer) {
    store.update(["inbox"], draft => {
      draft.inbox = [jobOffer, ...(draft.inbox || [])];
    });
    return;
  }

  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const newEvent = {
    id: `ev_${Date.now()}`,
    title: template.title,
    body: template.body,
    date: `Temporada ${state.season || 1}`,
    choices: template.choices,
    resolved: false
  };

  store.update(["inbox"], draft => {
    draft.inbox = [newEvent, ...(draft.inbox || [])];
  });
}

function switchManagerClub(draft, newClubId) {
  const oldClubId = draft.userClubId;
  const newClub = draft.clubs?.[newClubId];
  if (!newClub || oldClubId === newClubId) return;

  // Guardar presupuesto actual en el club saliente
  if (draft.clubs[oldClubId]) {
    draft.clubs[oldClubId].budget = draft.budget;
  }

  draft.userClubId = newClubId;
  draft.budget = newClub.budget || 40000000;
  draft.boardConfidence = 85;

  // Actualizar referencia en multijugador si aplica
  if (Array.isArray(draft.mpManagers)) {
    const activeMgr = draft.mpManagers.find(m => m.clubId === oldClubId);
    if (activeMgr) {
      activeMgr.clubId = newClubId;
      activeMgr.budget = draft.budget;
    }
  }

  // Intercambiar league_1 y otherLeagues para que la nueva liga sea la principal
  const comps = draft.competitions;
  if (comps && comps.otherLeagues?.[newClub.leagueId]) {
    const prevPrimary = comps.league_1;
    const nextPrimary = comps.otherLeagues[newClub.leagueId];

    delete comps.otherLeagues[newClub.leagueId];
    if (prevPrimary?.realId) {
      comps.otherLeagues[prevPrimary.realId] = { ...prevPrimary, id: prevPrimary.realId };
    }
    comps.league_1 = { ...nextPrimary, id: "league_1" };
  }
}

export function resolveInboxChoice(eventId, choiceIdx) {
  const state = store.get();
  const ev = (state.inbox || []).find(item => item.id === eventId);
  if (!ev || ev.resolved) return;

  const choice = ev.choices[choiceIdx];
  if (!choice) return;

  // Manejo especial para Oferta de Banquillo Internacional
  if (ev.type === "manager_job_offer") {
    store.update(["inbox", "userClubId", "budget", "boardConfidence", "clubs", "competitions", "mpManagers"], draft => {
      const target = draft.inbox.find(item => item.id === eventId);
      target.resolved = true;
      target.chosenLabel = choice.label;

      if (choiceIdx === 0 && ev.targetClubId && draft.clubs[ev.targetClubId]) {
        switchManagerClub(draft, ev.targetClubId);
      } else {
        draft.boardConfidence = Math.min(100, (draft.boardConfidence || 80) + 4);
      }
    });
    return;
  }

  store.update(["inbox", "budget", "boardConfidence", "players"], draft => {
    const target = draft.inbox.find(item => item.id === eventId);
    target.resolved = true;
    target.chosenLabel = choice.label;

    if (choice.effect?.budget) {
      draft.budget = Math.max(0, (draft.budget || 0) + choice.effect.budget);
    }
    if (choice.effect?.confidence) {
      draft.boardConfidence = Math.min(100, Math.max(0, (draft.boardConfidence || 80) + choice.effect.confidence));
    }
    if (choice.effect?.spawnYouth) {
      const userClub = draft.clubs?.[draft.userClubId];
      const yId = `p_youth_${Date.now()}`;
      draft.players[yId] = {
        id: yId,
        clubId: draft.userClubId,
        name: "Hugo Promesa",
        nationality: userClub?.country || "España",
        flag: userClub?.flag || "🇪🇸",
        pos: "MED",
        age: 17,
        ovr: 76,
        stamina: 100,
        morale: 95,
        starter: false,
        contractYears: 4,
        wage: 8000
      };
    }
  });
}