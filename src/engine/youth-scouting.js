import { store } from "../core/state.js";

export const SCOUTING_REGIONS = [
  {
    id: "esp",
    name: "España",
    flag: "🇪🇸",
    cost: 600000,
    specialty: "Técnica y Posesión",
    firstNames: ["Iker", "Unai", "Gavi", "Lamine", "Pau", "Marc", "Hugo", "Dani", "Álvaro", "Yeray", "Nico", "Xavi"],
    lastNames: ["Navarro", "Serrano", "Méndez", "Valverde", "Oyarzabal", "Zubimendi", "Cubarsí", "Fermín", "Soler", "Garrido", "Pino", "Ruiz"]
  },
  {
    id: "bra",
    name: "Brasil",
    flag: "🇧🇷",
    cost: 750000,
    specialty: "Regate y Desequilibrio",
    firstNames: ["Endrick", "Estêvão", "Kauã", "Vitor", "João", "Matheus", "Gabriel", "Lucas", "Arthur", "Caio", "Rafael", "Thiago"],
    lastNames: ["Silva", "Santos", "Oliveira", "Roque", "Gomes", "Almeida", "Ribeiro", "Costa", "Nunes", "Teixeira", "Pereira", "Lopes"]
  },
  {
    id: "arg",
    name: "Argentina",
    flag: "🇦🇷",
    cost: 700000,
    specialty: "Garra y Visión",
    firstNames: ["Franco", "Claudio", "Valentín", "Thiago", "Mateo", "Enzo", "Julián", "Alejo", "Bautista", "Lautaro", "Facundo", "Benjamín"],
    lastNames: ["Mastantuono", "Echeverri", "Barco", "Almada", "Paz", "Garnacho", "Redondo", "Véliz", "Romero", "Medina", "Sosa", "Acuña"]
  },
  {
    id: "eng",
    name: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    cost: 650000,
    specialty: "Ritmo y Potencia",
    firstNames: ["Jude", "Kobbie", "Ethan", "Cole", "Bukayo", "Myles", "Archie", "Jarell", "Adam", "Harvey", "Lewis", "Rico"],
    lastNames: ["Mainoo", "Nwaneri", "Gray", "Wharton", "Palmer", "Lewis", "Hall", "Elliott", "Quansah", "Gordon", "Bellingham", "Foden"]
  },
  {
    id: "ita",
    name: "Italia",
    flag: "🇮🇹",
    cost: 600000,
    specialty: "Táctica y Defensa",
    firstNames: ["Francesco", "Giorgio", "Simone", "Lorenzo", "Mattia", "Niccolò", "Riccardo", "Davide", "Alessandro", "Federico", "Andrea", "Marco"],
    lastNames: ["Camarda", "Scalvini", "Calafiori", "Ricci", "Baldanzi", "Fagioli", "Casadei", "Bastoni", "Tonali", "Maldini", "Raspadori", "Frattesi"]
  },
  {
    id: "ger",
    name: "Alemania",
    flag: "🇩🇪",
    cost: 650000,
    specialty: "Físico y Presión",
    firstNames: ["Florian", "Jamal", "Aleksandar", "Paul", "Tom", "Youssoufa", "Brajan", "Maximilian", "karim", "Lennart", "Noah", "Felix"],
    lastNames: ["Wirtz", "Pavlovic", "Wanner", "Bischof", "Gruda", "Beier", "Adeyemi", "Stiller", "Moukoko", "Bisseck", "Kimmich", "Havertz"]
  }
];

const POSITIONS = ["POR", "DEF", "DEF", "MED", "MED", "DEL", "DEL"];

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function scoutYouthRegion(regionId) {
  const state = store.get();
  const region = SCOUTING_REGIONS.find(r => r.id === regionId);
  if (!region) return { ok: false, msg: "Región de ojeo no válida." };

  if ((state.budget || 0) < region.cost) {
    return {
      ok: false,
      msg: `Presupuesto insuficiente. Necesitas ${(region.cost / 1e6).toFixed(2)} M€ para enviar ojeadores a ${region.name}.`
    };
  }

  const youthLvl = state.staff?.youth || 1;
  const reports = [];

  for (let i = 0; i < 4; i++) {
    const pos = randItem(POSITIONS);
    const age = 15 + Math.floor(Math.random() * 3); // 15, 16 o 17 años
    const baseOvr = 58 + youthLvl * 2 + Math.floor(Math.random() * 6);
    const potMin = Math.min(89, baseOvr + 12 + Math.floor(Math.random() * 6));
    const potMax = Math.min(95, potMin + 4 + Math.floor(Math.random() * 5));
    const signFee = Math.round((150000 + (potMax - 75) * 35000) / 10000) * 10000;

    reports.push({
      id: `rep_${region.id}_${Date.now()}_${i}`,
      name: `${randItem(region.firstNames)} ${randItem(region.lastNames)}`,
      age,
      pos,
      ovr: baseOvr,
      potMin,
      potMax,
      potential: Math.round((potMin + potMax) / 2),
      countryFlag: region.flag,
      countryName: region.name,
      signFee
    });
  }

  store.update(["budget", "youthReports", "lastScoutRegion"], draft => {
    draft.budget -= region.cost;
    draft.youthReports = reports;
    draft.lastScoutRegion = region.id;
  });

  return {
    ok: true,
    msg: `Informe recibido desde ${region.flag} ${region.name}: 4 promesas detectadas.`
  };
}

export function signProspectToAcademy(reportId) {
  const state = store.get();
  const reports = state.youthReports || [];
  const prospect = reports.find(r => r.id === reportId);
  if (!prospect) return { ok: false, msg: "Informe de promesa no encontrado." };

  const academy = state.youthAcademy || [];
  if (academy.length >= 8) {
    return { ok: false, msg: "Tu Academia Sub-18 está llena (máximo 8 canteranos). Promueve o libera alguno primero." };
  }

  if ((state.budget || 0) < prospect.signFee) {
    return { ok: false, msg: `Necesitas ${(prospect.signFee / 1e6).toFixed(2)} M€ para firmar su beca juvenil.` };
  }

  store.update(["budget", "youthReports", "youthAcademy"], draft => {
    draft.budget -= prospect.signFee;
    draft.youthReports = (draft.youthReports || []).filter(r => r.id !== reportId);
    draft.youthAcademy = [
      ...(draft.youthAcademy || []),
      {
        ...prospect,
        id: `acad_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        progress: 0
      }
    ];
  });

  return {
    ok: true,
    msg: `${prospect.name} (${prospect.pos}, POT ${prospect.potMin}-${prospect.potMax}) se unió a tu Academia Sub-18.`
  };
}

export function promoteAcademyPlayerToFirstTeam(academyId) {
  const state = store.get();
  const uid = state.userClubId;
  const academy = state.youthAcademy || [];
  const prospect = academy.find(a => a.id === academyId);
  if (!prospect || !uid) return { ok: false, msg: "Canterano no encontrado." };

  const squadCount = Object.values(state.players || {}).filter(p => p.clubId === uid).length;
  if (squadCount >= 28) {
    return { ok: false, msg: "Tu primer equipo ya tiene 28 jugadores. Vende alguno antes de ascender canteranos." };
  }

  const newPlayerId = `youth_pro_${Date.now()}_${Math.floor(Math.random() * 999)}`;

  store.update(["youthAcademy", "players", "inbox"], draft => {
    draft.youthAcademy = (draft.youthAcademy || []).filter(a => a.id !== academyId);
    draft.players[newPlayerId] = {
      id: newPlayerId,
      name: prospect.name,
      age: Math.max(16, prospect.age),
      pos: prospect.pos,
      ovr: Math.min(76, prospect.ovr + 2),
      potential: prospect.potential || prospect.potMax || 86,
      clubId: uid,
      starter: false,
      stamina: 98,
      morale: 92,
      contractYears: 4,
      goals: 0,
      isYouth: true
    };

    draft.inbox = [
      {
        id: `acad_prom_${Date.now()}`,
        title: `🌟 Canterano ascendido: ${prospect.name}`,
        date: `Temporada ${state.season || 1}`,
        body: `${prospect.name} (${prospect.pos}, ${prospect.age} años, OVR ${prospect.ovr + 2}, Potencial ${prospect.potential}) ha firmado su primer contrato profesional de 4 años con el primer equipo.`,
        choices: [],
        resolved: true
      },
      ...(draft.inbox || [])
    ];
  });

  return {
    ok: true,
    msg: `¡${prospect.name} ascendido al primer equipo con contrato de 4 años!`
  };
}

export function releaseAcademyPlayer(academyId) {
  store.update(["youthAcademy"], draft => {
    draft.youthAcademy = (draft.youthAcademy || []).filter(a => a.id !== academyId);
  });
  return { ok: true, msg: "Canterano liberado de la academia." };
}