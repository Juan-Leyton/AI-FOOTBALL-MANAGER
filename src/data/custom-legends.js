import { store } from "../core/state.js";

export const CUSTOM_FRIENDS_ROSTER = [
  {
    id: "legend_juan_jose_leyton",
    name: "Juan Jose Leyton",
    age: 19,
    pos: "MED",
    ovr: 82,
    potential: 94,
    preferredClubNames: ["Real Madrid", "FC Barcelona", "Atlético"],
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
    preferredClubNames: ["Manchester City", "Arsenal", "Liverpool"],
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
    preferredClubNames: ["Inter", "AC Milan", "Juventus"],
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
    preferredClubNames: ["FC Barcelona", "Real Madrid", "Sevilla"],
    fallbackLeague: "esp_1",
    customBoosts: { RIT: 3, TIR: 0, PAS: 4, DEF: 8 },
    bioTag: "🌟 Generación Dorada"
  }
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

  const alreadyInjected = CUSTOM_FRIENDS_ROSTER.every(f => Boolean(state.players[f.id]));
  if (alreadyInjected) return;

  store.update(["players", "inbox"], draft => {
    CUSTOM_FRIENDS_ROSTER.forEach(spec => {
      if (draft.players[spec.id]) return;

      const targetClubId = resolveTargetClubId(draft.clubs, spec);
      if (!targetClubId) return;

      // Reemplaza al suplente más bajo de esa misma posición en el club destino para mantener plantillas equilibradas
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

    // Notificación especial en Bandeja IA si aún no existe
    const hasNews = (draft.inbox || []).some(m => m.id === "news_golden_generation_2026");
    if (!hasNews) {
      const summaryLines = CUSTOM_FRIENDS_ROSTER.map(spec => {
        const p = draft.players[spec.id];
        const cName = draft.clubs[p?.clubId]?.name || "-";
        return `• <b>${spec.name}</b> (${spec.pos}, OVR ${spec.ovr} / POT ${spec.potential}) — <i>${cName}</i>`;
      }).join("<br>");

      draft.inbox = [
        {
          id: "news_golden_generation_2026",
          title: "🇨🇴 Informe Especial: La Nueva Generación Dorada en Europa",
          date: `Temporada ${state.season || 1}`,
          body: `Los ojeadores internacionales destacan a 5 jóvenes llamados a dominar el fútbol mundial esta década:<br><br>${summaryLines}`,
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    }
  });
}