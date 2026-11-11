const FIRST_NAMES = [
  "Carlos", "Alejandro", "Javier", "Miguel", "David", "Daniel", "Pablo", "Álvaro",
  "Adrián", "Diego", "Sergio", "Lucas", "Mateo", "Hugo", "Martín", "Leo",
  "Nicolás", "Marcos", "Iker", "Unai", "Gavi", "Pedri", "Rodrigo", "Ferran",
  "Kylian", "Vinicius", "Jude", "Federico", "Luka", "Toni", "Antoine", "Jan"
];

const LAST_NAMES = [
  "García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez",
  "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz",
  "Álvarez", "Romero", "Alonso", "Gutiérrez", "Navarro", "Torres", "Domínguez", "Vázquez",
  "Ramos", "Gil", "Ramírez", "Serrano", "Blanco", "Molina", "Morales", "Suárez"
];

const CLUB_TEMPLATES = [
  { id: "c1", name: "Real Madrid JS", ovr: 87, budget: 65000000, colors: ["#1e293b", "#f8fafc"] },
  { id: "c2", name: "FC Barcelona DOM", ovr: 86, budget: 55000000, colors: ["#1d4ed8", "#b91c1c"] },
  { id: "c3", name: "Atlético Canvas", ovr: 84, budget: 45000000, colors: ["#dc2626", "#f8fafc"] },
  { id: "c4", name: "Real Sociedad Vite", ovr: 81, budget: 32000000, colors: ["#0284c7", "#f8fafc"] },
  { id: "c5", name: "Athletic Node", ovr: 80, budget: 30000000, colors: ["#b91c1c", "#111827"] },
  { id: "c6", name: "Villarreal ES6", ovr: 79, budget: 28000000, colors: ["#eab308", "#1e3a8a"] },
  { id: "c7", name: "Real Betis Async", ovr: 79, budget: 26000000, colors: ["#15803d", "#f8fafc"] },
  { id: "c8", name: "Sevilla Storage", ovr: 78, budget: 25000000, colors: ["#ef4444", "#f8fafc"] },
  { id: "c9", name: "Valencia Module", ovr: 77, budget: 22000000, colors: ["#f97316", "#111827"] },
  { id: "c10", name: "Girona Vector", ovr: 78, budget: 24000000, colors: ["#e11d48", "#f8fafc"] },
  { id: "c11", name: "Celta State", ovr: 75, budget: 18000000, colors: ["#38bdf8", "#f8fafc"] },
  { id: "c12", name: "Osasuna Engine", ovr: 75, budget: 16000000, colors: ["#991b1b", "#1e3a8a"] }
];

const SQUAD_BLUEPRINT = [
  "POR", "POR",
  "DEF", "DEF", "DEF", "DEF", "DEF",
  "MED", "MED", "MED", "MED", "MED",
  "DEL", "DEL", "DEL", "DEL"
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateInitialDatabase() {
  const clubs = {};
  const players = {};
  const usedNames = new Set();
  let pCounter = 1;

  CLUB_TEMPLATES.forEach(tpl => {
    clubs[tpl.id] = {
      id: tpl.id,
      name: tpl.name,
      ovr: tpl.ovr,
      budget: tpl.budget,
      colors: tpl.colors,
      formation: "4-3-3",
      tactics: { mentality: 55, tempo: 55, press: 50 }
    };

    SQUAD_BLUEPRINT.forEach((pos, idx) => {
      let fullName = "";
      do {
        fullName = `${FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[randInt(0, LAST_NAMES.length - 1)]}`;
      } while (usedNames.has(fullName));
      usedNames.add(fullName);

      const isStarter = idx === 0 || (idx >= 2 && idx <= 5) || (idx >= 7 && idx <= 9) || (idx >= 12 && idx <= 14);
      const ovr = Math.max(66, Math.min(92, tpl.ovr + randInt(-4, 4)));
      const age = randInt(18, 33);
      const pid = `p_${pCounter++}`;

      players[pid] = {
        id: pid,
        name: fullName,
        clubId: tpl.id,
        pos,
        age,
        ovr,
        stamina: 100,
        starter: isStarter,
        wage: Math.round(ovr * 1150)
      };
    });
  });

  return { clubs, players };
}

export const buildInitialWorld = generateInitialDatabase;