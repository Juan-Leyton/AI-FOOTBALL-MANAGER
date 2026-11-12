const CLUB_TEMPLATES = [
  { id: "c1", name: "Real Madrid CF", ovr: 89, budget: 120000000, colors: ["#ffffff", "#f59e0b"] },
  { id: "c2", name: "FC Barcelona", ovr: 87, budget: 85000000, colors: ["#a50044", "#004d98"] },
  { id: "c3", name: "Atlético Madrid", ovr: 85, budget: 75000000, colors: ["#cb3524", "#ffffff"] },
  { id: "c4", name: "Athletic Club", ovr: 82, budget: 55000000, colors: ["#ee2523", "#ffffff"] },
  { id: "c5", name: "Real Sociedad", ovr: 82, budget: 52000000, colors: ["#0067b1", "#ffffff"] },
  { id: "c6", name: "Villarreal CF", ovr: 81, budget: 48000000, colors: ["#ffe667", "#005187"] },
  { id: "c7", name: "Real Betis", ovr: 80, budget: 45000000, colors: ["#0bb363", "#ffffff"] },
  { id: "c8", name: "Sevilla FC", ovr: 79, budget: 42000000, colors: ["#d4021d", "#ffffff"] },
  { id: "c9", name: "Valencia CF", ovr: 78, budget: 38000000, colors: ["#ffffff", "#000000"] },
  { id: "c10", name: "Girona FC", ovr: 79, budget: 40000000, colors: ["#e2001a", "#ffffff"] },
  { id: "c11", name: "CA Osasuna", ovr: 77, budget: 32000000, colors: ["#d91a21", "#0a1f44"] },
  { id: "c12", name: "Celta de Vigo", ovr: 77, budget: 34000000, colors: ["#8ac3ee", "#ffffff"] }
];

const FIRST_NAMES = ["Carlos", "Mateo", "Lucas", "Hugo", "Martín", "Daniel", "Pablo", "Alejandro", "Adrián", "Álvaro", "Diego", "Javier", "Iker", "Nico", "Gavi", "Pedri", "Lamine", "Julián", "Rodrigo", "Fede", "Vinícius", "Jude", "Brahim", "Mikel", "Unai", "Oihan", "Iñaki", "Alex", "Ferran", "Pau"];
const LAST_NAMES = ["García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutiérrez", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Ramírez", "Serrano", "Blanco", "Molina"];

const SQUAD_BLUEPRINT = [
  "POR", "POR",
  "DEF", "DEF", "DEF", "DEF", "DEF",
  "MED", "MED", "MED", "MED", "MED",
  "DEL", "DEL", "DEL", "DEL"
];

function randomName(usedNames) {
  let name = "";
  do {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    name = `${fn} ${ln}`;
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

export function createInitialDatabase() {
  const clubs = {};
  const players = {};
  const usedNames = new Set();

  CLUB_TEMPLATES.forEach(tpl => {
    clubs[tpl.id] = {
      ...tpl,
      formation: "4-3-3",
      tactics: { mentality: 55, tempo: 55, press: 55 }
    };

    let startersAssigned = 0;
    SQUAD_BLUEPRINT.forEach((pos, idx) => {
      const pid = `${tpl.id}_p${idx + 1}`;
      const isStarter = startersAssigned < 11 && (
        (pos === "POR" && idx === 0) ||
        (pos === "DEF" && idx <= 5) ||
        (pos === "MED" && idx <= 9) ||
        (pos === "DEL" && idx <= 14)
      );
      if (isStarter) startersAssigned++;

      const variance = isStarter ? Math.floor(Math.random() * 5) - 1 : Math.floor(Math.random() * 6) - 5;
      const ovr = Math.max(68, Math.min(93, tpl.ovr + variance));
      const age = Math.floor(Math.random() * 16) + 18;
      const contractYears = Math.floor(Math.random() * 4) + 1;

      players[pid] = {
        id: pid,
        clubId: tpl.id,
        name: randomName(usedNames),
        pos,
        age,
        ovr,
        stamina: 100,
        morale: 85,
        goals: 0,
        contractYears,
        wage: Math.round(ovr * 1150),
        starter: isStarter
      };
    });
  });

  return { clubs, players };
}

export const generateInitialDatabase = createInitialDatabase;