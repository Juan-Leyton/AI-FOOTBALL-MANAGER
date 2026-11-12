import { store } from "../core/state.js";

export const CUSTOM_FRIENDS_ROSTER = [
  {
    id: "legend_juan_jose_leyton",
    name: "Juan Jose Leyton",
    age: 19,
    pos: "MED",
    ovr: 82,
    potential: 94,
    nationality: "Colombia",
    natCode: "COL",
    flag: "🇨🇴",
    preferredClubNames: ["Madrid Blanco", "FC Condal", "Atlético"],
    fallbackLeague: "esp_1",
    customBoosts: { RIT: 4, TIR: 5, PAS: 7, DEF: 2 },
    bioTag: "🌟 Generación Dorada"
  },
  {
    id: "legend_santiago_gutierrez",
    name: "Santiago Gutierrez",
    age: 20,
    pos: "DEL",
    ovr: 81,
    potential: 92,
    nationality: "Colombia",
    natCode: "COL",
    flag: "🇨🇴",
    preferredClubNames: ["Manchester Sky", "Arsenal", "Liverpool"],
    fallbackLeague: "eng_1",
    customBoosts: { RIT: 6, TIR: 7, PAS: 3, DEF: 0 },
    bioTag: "🌟 Generación Dorada"
  },
  {
    id: "legend_samuel_rave",
    name: "Samuel Rave",
    age: 20,
    pos: "DEF",
    ovr: 80,
    potential: 91,
    nationality: "Colombia",
    natCode: "COL",
    flag: "🇨🇴",
    preferredClubNames: ["Inter", "AC Rossoneri", "Juventus"],
    fallbackLeague: "ita_1",
    customBoosts: { RIT: 4, TIR: 1, PAS: 4, DEF: 7 },
    bioTag: "🌟 Generación Dorada"
  },
  {
    id: "legend_kevin_galvis",
    name: "Kevin Galvis",
    age: 19,
    pos: "MED",
    ovr: 79,
    potential: 91,
    nationality: "Colombia",
    natCode: "COL",
    flag: "🇨🇴",
    preferredClubNames: ["Bayern", "Dortmund", "Leverkusen"],
    fallbackLeague: "ger_1",
    customBoosts: { RIT: 5, TIR: 4, PAS: 5, DEF: 4 },
    bioTag: "🌟 Generación Dorada"
  },
  {
    id: "legend_samuel_sanchez_barriguete",
    name: "Samuel Sanchez Barriguete",
    age: 20,
    pos: "POR",
    ovr: 80,
    potential: 92,
    nationality: "Colombia",
    natCode: "COL",
    flag: "🇨🇴",
    preferredClubNames: ["FC Condal", "Madrid Blanco", "Sevilla"],
    fallbackLeague: "esp_1",
    customBoosts: { RIT: 3, TIR: 0, PAS: 4, DEF: 8 },
    bioTag: "🌟 Generación Dorada"
  }
];

export const WORLD_COUNTRY_LEGENDS = [
  // Colombia
  { id: "icon_col_valderrama", name: "Carlos Valderrama", age: 27, pos: "MED", ovr: 90, nationality: "Colombia", natCode: "COL", flag: "🇨🇴", customBoosts: { RIT: 2, TIR: 5, PAS: 9, DEF: 2 } },
  { id: "icon_col_falcao", name: "Radamel Falcao", age: 26, pos: "DEL", ovr: 90, nationality: "Colombia", natCode: "COL", flag: "🇨🇴", customBoosts: { RIT: 5, TIR: 9, PAS: 4, DEF: 1 } },
  // Argentina
  { id: "icon_arg_maradona", name: "Diego Maradona", age: 26, pos: "MED", ovr: 94, nationality: "Argentina", natCode: "ARG", flag: "🇦🇷", customBoosts: { RIT: 8, TIR: 9, PAS: 9, DEF: 2 } },
  { id: "icon_arg_batistuta", name: "Gabriel Batistuta", age: 27, pos: "DEL", ovr: 91, nationality: "Argentina", natCode: "ARG", flag: "🇦🇷", customBoosts: { RIT: 6, TIR: 9, PAS: 4, DEF: 1 } },
  // Brasil
  { id: "icon_bra_pele", name: "Edson Arantes Pelé", age: 25, pos: "DEL", ovr: 95, nationality: "Brasil", natCode: "BRA", flag: "🇧🇷", customBoosts: { RIT: 9, TIR: 9, PAS: 8, DEF: 2 } },
  { id: "icon_bra_ronaldo", name: "Ronaldo Nazário", age: 24, pos: "DEL", ovr: 93, nationality: "Brasil", natCode: "BRA", flag: "🇧🇷", customBoosts: { RIT: 9, TIR: 9, PAS: 6, DEF: 0 } },
  // España
  { id: "icon_esp_iniesta", name: "Andrés Iniesta", age: 27, pos: "MED", ovr: 92, nationality: "España", natCode: "ESP", flag: "🇪🇸", customBoosts: { RIT: 5, TIR: 6, PAS: 9, DEF: 4 } },
  { id: "icon_esp_casillas", name: "Iker Casillas", age: 26, pos: "POR", ovr: 91, nationality: "España", natCode: "ESP", flag: "🇪🇸", customBoosts: { RIT: 6, TIR: 0, PAS: 5, DEF: 9 } },
  // Francia
  { id: "icon_fra_zidane", name: "Zinedine Zidane", age: 27, pos: "MED", ovr: 93, nationality: "Francia", natCode: "FRA", flag: "🇫🇷", customBoosts: { RIT: 5, TIR: 8, PAS: 9, DEF: 4 } },
  { id: "icon_fra_henry", name: "Thierry Henry", age: 26, pos: "DEL", ovr: 92, nationality: "Francia", natCode: "FRA", flag: "🇫🇷", customBoosts: { RIT: 9, TIR: 9, PAS: 6, DEF: 1 } },
  // Portugal
  { id: "icon_por_eusebio", name: "Eusébio da Silva", age: 25, pos: "DEL", ovr: 92, nationality: "Portugal", natCode: "POR", flag: "🇵🇹", customBoosts: { RIT: 9, TIR: 9, PAS: 6, DEF: 1 } },
  { id: "icon_por_figo", name: "Luís Figo", age: 27, pos: "MED", ovr: 90, nationality: "Portugal", natCode: "POR", flag: "🇵🇹", customBoosts: { RIT: 7, TIR: 7, PAS: 8, DEF: 3 } },
  // Países Bajos
  { id: "icon_ned_cruyff", name: "Johan Cruyff", age: 26, pos: "DEL", ovr: 94, nationality: "Países Bajos", natCode: "NED", flag: "🇳🇱", customBoosts: { RIT: 8, TIR: 8, PAS: 9, DEF: 3 } },
  { id: "icon_ned_vanbasten", name: "Marco van Basten", age: 26, pos: "DEL", ovr: 92, nationality: "Países Bajos", natCode: "NED", flag: "🇳🇱", customBoosts: { RIT: 7, TIR: 9, PAS: 6, DEF: 1 } },
  // Inglaterra
  { id: "icon_eng_charlton", name: "Bobby Charlton", age: 27, pos: "MED", ovr: 91, nationality: "Inglaterra", natCode: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", customBoosts: { RIT: 6, TIR: 9, PAS: 8, DEF: 4 } },
  { id: "icon_eng_rooney", name: "Wayne Rooney", age: 25, pos: "DEL", ovr: 90, nationality: "Inglaterra", natCode: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", customBoosts: { RIT: 7, TIR: 8, PAS: 7, DEF: 4 } },
  // Italia
  { id: "icon_ita_maldini", name: "Paolo Maldini", age: 27, pos: "DEF", ovr: 93, nationality: "Italia", natCode: "ITA", flag: "🇮🇹", customBoosts: { RIT: 7, TIR: 2, PAS: 6, DEF: 9 } },
  { id: "icon_ita_buffon", name: "Gianluigi Buffon", age: 28, pos: "POR", ovr: 92, nationality: "Italia", natCode: "ITA", flag: "🇮🇹", customBoosts: { RIT: 4, TIR: 0, PAS: 5, DEF: 9 } },
  // Alemania
  { id: "icon_ger_beckenbauer", name: "Franz Beckenbauer", age: 27, pos: "DEF", ovr: 93, nationality: "Alemania", natCode: "GER", flag: "🇩🇪", customBoosts: { RIT: 6, TIR: 5, PAS: 8, DEF: 9 } },
  { id: "icon_ger_gmuller", name: "Gerd Müller", age: 26, pos: "DEL", ovr: 92, nationality: "Alemania", natCode: "GER", flag: "🇩🇪", customBoosts: { RIT: 7, TIR: 9, PAS: 5, DEF: 1 } }
];

function resolveTargetClubId(clubs, spec) {
  const allClubs = Object.values(clubs || {});
  for (const hint of spec.preferredClubNames) {
    const match = allClubs.find(c => c.name.toLowerCase().includes(hint.toLowerCase()));
    if (match) return match.id;
  }
  const byLeague = allClubs.find(c => c.leagueId === spec.fallbackLeague);
  return byLeague ? byLeague.id : allClubs[0]?.id;
}

export function injectCustomLegends() {
  const state = store.get();
  if (!state.clubs || !state.players) return;

  const friendsReady = CUSTOM_FRIENDS_ROSTER.every(f => Boolean(state.players[f.id]));
  const iconsReady = WORLD_COUNTRY_LEGENDS.every(ic => Boolean(state.players[ic.id]));
  if (friendsReady && iconsReady) return;

  store.update(["players", "inbox"], draft => {
    // 1. Generación Dorada en clubes europeos
    CUSTOM_FRIENDS_ROSTER.forEach(spec => {
      if (draft.players[spec.id]) return;

      const targetClubId = resolveTargetClubId(draft.clubs, spec);
      if (!targetClubId) return;

      const clubPlayersSamePos = Object.values(draft.players)
        .filter(p => p.clubId === targetClubId && p.pos === spec.pos && !p.isCustomLegend)
        .sort((a, b) => a.ovr - b.ovr);

      const wasStarter = clubPlayersSamePos[0]?.starter ?? true;
      if (clubPlayersSamePos.length > 2) {
        delete draft.players[clubPlayersSamePos[0].id];
      }

      draft.players[spec.id] = {
        id: spec.id,
        name: spec.name,
        age: spec.age,
        pos: spec.pos,
        ovr: spec.ovr,
        potential: spec.potential,
        nationality: spec.nationality,
        natCode: spec.natCode,
        flag: spec.flag,
        clubId: targetClubId,
        starter: wasStarter,
        stamina: 99,
        morale: 95,
        contractYears: 4,
        goals: 0,
        isYouth: true,
        isCustomLegend: true,
        customBoosts: spec.customBoosts
      };
    });

    // 2. Íconos Históricos Mundiales disponibles en el Mercado como Agentes Libres de Élite
    WORLD_COUNTRY_LEGENDS.forEach(icon => {
      if (draft.players[icon.id]) return;
      draft.players[icon.id] = {
        id: icon.id,
        name: icon.name,
        age: icon.age,
        pos: icon.pos,
        ovr: icon.ovr,
        nationality: icon.nationality,
        natCode: icon.natCode,
        flag: icon.flag,
        clubId: "free_agent",
        starter: false,
        stamina: 99,
        morale: 95,
        contractYears: 0,
        goals: 0,
        isCustomLegend: true,
        isWorldIcon: true,
        customBoosts: icon.customBoosts
      };
    });

    const hasNews = (draft.inbox || []).some(m => m.id === "news_golden_generation_2026");
    if (!hasNews) {
      const summaryLines = CUSTOM_FRIENDS_ROSTER.map(spec => {
        const p = draft.players[spec.id];
        const cName = draft.clubs[p?.clubId]?.name || "-";
        return `• ${spec.flag} <b>${spec.name}</b> (${spec.pos}, OVR ${spec.ovr} / POT ${spec.potential}) — <i>${cName}</i>`;
      }).join("<br>");

      draft.inbox = [
        {
          id: "news_golden_generation_2026",
          title: "🇨🇴 Informe Especial: Generación Dorada y Leyendas Mundiales",
          date: `Temporada ${state.season || 1}`,
          body: `Los ojeadores internacionales destacan a 5 jóvenes colombianos en Europa:<br><br>${summaryLines}<br><br>Además, <b>20 Leyendas Históricas</b> (Pelé, Maradona, Cruyff, Zidane, Valderrama, Falcao, Maldini, Beckenbauer...) han llegado al Mercado como <b>Agentes Libres</b>.`,
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    }
  });
}