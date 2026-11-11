// src/core/career-state.js
import { store } from "./state.js";

// Inicializa una nueva partida de Modo Carrera
export function initCareerMode(managerName, chosenClubId) {
  const initialData = {
    manager: {
      name: managerName,
      reputation: 50 // Sube ganando partidos
    },
    userClubId: chosenClubId,
    date: new Date("2024-08-01"), // Inicio de temporada
    season: 2024,
    finances: {
      budget: 15000000, // $15M para fichajes
      wageBudget: 200000 // Presupuesto salarial
    },
    // Base de datos global de jugadores
    players: {
      "p1": { id: "p1", name: "L. Messi", pos: "DEL", ovr: 91, age: 36, teamId: "c1", value: 40000000, wage: 120000 },
      "p2": { id: "p2", name: "J. Bellingham", pos: "MED", ovr: 88, age: 20, teamId: "c1", value: 90000000, wage: 80000 },
      "p3": { id: "p3", name: "V. van Dijk", pos: "DEF", ovr: 89, age: 32, teamId: "c2", value: 50000000, wage: 95000 },
      // Aquí se agregarán cientos de jugadores generados o reales
    },
    // La Liga
    league: {
      name: "Primera División",
      matchday: 1,
      standings: {
        "c1": { pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 },
        "c2": { pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 },
        // ... todos los equipos
      },
      schedule: [
        // Jornada 1
        [{ home: "c1", away: "c2", played: false, scoreH: null, scoreA: null }],
        // Jornada 2...
      ]
    },
    messages: [
      { from: "Directiva", subject: "Bienvenido al club", body: "Confiamos en ti para ganar la liga.", read: false }
    ]
  };

  store.update(["career"], draft => {
    draft.career = initialData;
  });
}