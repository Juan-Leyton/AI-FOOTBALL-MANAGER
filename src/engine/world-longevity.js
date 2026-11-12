import { store } from "../core/state.js";

const REGEN_FIRST_NAMES = [
  "Mateo", "Thiago", "Lamine", "Endrick", "Lucas", "Enzo", "Nicolás", "Julián",
  "Gavi", "Jamal", "Florian", "Kenan", "Arda", "Warren", "Jude", "Kylian"
];

const REGEN_LAST_NAMES = [
  "Mendoza", "Castillo", "Rojas", "Silveira", "Bellingham", "Alcaraz", "Vargas",
  "Sánchez", "Montoya", "Ferreira", "Lombardi", "Kroos", "Modrić", "Benzema", "Zidane", "Iniesta"
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function processSeasonRetirementsAndRegens() {
  const state = store.get();
  const season = state.season || 1;
  const allClubIds = Object.keys(state.clubs || {});
  if (!allClubIds.length) return { retired: [], regens: [] };

  const retired = [];
  const regens = [];

  store.update(["players", "hallOfFame", "inbox"], draft => {
    Object.values(draft.players || {}).forEach(p => {
      if (p.isCustomLegend) return; // Las leyendas personalizadas evolucionan hasta veteranos sin desaparecer pronto

      const age = p.age || 25;
      const retireChance = age >= 38 ? 0.85 : age >= 36 ? 0.55 : age >= 34 ? 0.25 : 0;

      if (retireChance > 0 && Math.random() < retireChance) {
        const clubName = draft.clubs[p.clubId]?.name || "Agente Libre";
        retired.push({
          name: p.name,
          age,
          pos: p.pos,
          ovr: p.ovr,
          clubName,
          wasUserPlayer: p.clubId === draft.userClubId
        });

        // Crear Regen (reencarnación joven de 17-18 años con gran potencial)
        const targetClubId = pickRandom(allClubIds);
        const regenId = `regen_s${season}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        const regenName = `${pickRandom(REGEN_FIRST_NAMES)} ${pickRandom(REGEN_LAST_NAMES)}`;
        const pot = Math.max(84, Math.min(95, (p.ovr || 80) + 5));

        const regenObj = {
          id: regenId,
          name: regenName,
          age: 17 + Math.floor(Math.random() * 2),
          pos: p.pos,
          ovr: 66 + Math.floor(Math.random() * 7),
          potential: pot,
          clubId: targetClubId,
          starter: false,
          stamina: 98,
          morale: 90,
          contractYears: 4,
          goals: 0,
          isYouth: true,
          isRegen: true,
          regenOf: p.name
        };

        draft.players[regenId] = regenObj;
        regens.push({
          ...regenObj,
          clubName: draft.clubs[targetClubId]?.name || "-"
        });

        delete draft.players[p.id];
      }
    });

    // Registrar historial de la temporada en el Salón de la Fama
    const uid = draft.userClubId;
    const standings = draft.competitions?.league_1?.standings || {};
    const sorted = Object.entries(standings)
      .map(([cid, s]) => ({ cid, pts: s.pts || 0, dg: (s.gf || 0) - (s.ga || 0) }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg);

    const userRank = sorted.findIndex(x => x.cid === uid) + 1;
    const userPts = standings[uid]?.pts || 0;

    const topScorer = Object.values(draft.players || {})
      .filter(p => p.clubId === uid)
      .sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];

    draft.hallOfFame = [
      {
        season,
        clubName: draft.clubs[uid]?.name || "Mi Club",
        leaguePos: userRank || "-",
        points: userPts,
        topScorerName: topScorer?.name || "-",
        topScorerGoals: topScorer?.goals || 0
      },
      ...(draft.hallOfFame || [])
    ];

    if (retired.length > 0) {
      const topRetired = retired
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 5)
        .map(r => `• <b>${r.name}</b> (${r.age}a, OVR ${r.ovr} — ${r.clubName})`)
        .join("<br>");

      draft.inbox = [
        {
          id: `retire_news_s${season}_${Date.now()}`,
          title: `📰 Retiros y Nuevos Regens — Fin de Temporada ${season}`,
          date: `Temporada ${season}`,
          body: `${retired.length} veteranos han colgado las botas y ${regens.length} nuevas promesas (Regens) han debutado en las canteras de Europa.<br><br><b>Retiros destacados:</b><br>${topRetired}`,
          choices: [],
          resolved: true
        },
        ...(draft.inbox || [])
      ];
    }
  });

  return { retired, regens };
}