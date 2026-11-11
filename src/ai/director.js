/**
 * src/ai/director.js - Director Narrativo de Eventos Dinámicos
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

export function triggerPostMatchEvent() {
  const state = store.get();
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];

  const newEvent = {
    id: `ev_${Date.now()}`,
    title: template.title,
    body: template.body,
    date: `Jornada ${(state.competitions[state.activeCompId]?.currentRound || 0) + 1}`,
    choices: template.choices,
    resolved: false
  };

  store.update(["inbox"], draft => {
    draft.inbox = [newEvent, ...(draft.inbox || [])];
  });
}

export function resolveInboxChoice(eventId, choiceIdx) {
  const state = store.get();
  const ev = (state.inbox || []).find(item => item.id === eventId);
  if (!ev || ev.resolved) return;

  const choice = ev.choices[choiceIdx];
  if (!choice) return;

  store.update(["inbox", "budget", "boardConfidence", "players"], draft => {
    const target = draft.inbox.find(item => item.id === eventId);
    target.resolved = true;
    target.chosenLabel = choice.label;

    if (choice.effect.budget) {
      draft.budget = Math.max(0, (draft.budget || 0) + choice.effect.budget);
    }
    if (choice.effect.confidence) {
      draft.boardConfidence = Math.min(100, Math.max(0, (draft.boardConfidence || 80) + choice.effect.confidence));
    }
    if (choice.effect.spawnYouth) {
      const yId = `p_youth_${Date.now()}`;
      draft.players[yId] = {
        id: yId,
        clubId: draft.userClubId,
        name: "Hugo Promesa",
        pos: "MED",
        age: 17,
        ovr: 76,
        stamina: 100,
        morale: 95,
        starter: false,
        wage: 8000
      };
    }
  });
}