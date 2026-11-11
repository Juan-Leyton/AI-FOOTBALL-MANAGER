import "./style.css";
import { store } from "./core/state.js";
import { generateInitialDatabase } from "./data/database.js";
import { initCompetitions } from "./engine/competitions.js";
import { initUI } from "./ui/dom-manager.js";

function bootstrap() {
  const current = store.get();
  const hasValidLeague = current?.competitions?.league_1?.schedule?.length > 0;

  if (!current || !current.clubs || !hasValidLeague) {
    const { clubs, players } = generateInitialDatabase();
    const competitions = initCompetitions(clubs);

    store.update(["clubs", "players", "competitions", "activeCompId", "season", "budget", "boardConfidence", "staff", "inbox", "activeTab"], draft => {
      draft.clubs = clubs;
      draft.players = players;
      draft.competitions = competitions;
      draft.activeCompId = "league_1";
      draft.season = 1;
      draft.budget = 50000000;
      draft.boardConfidence = 85;
      draft.staff = { fitness: 1, scout: 1, youth: 1 };
      draft.inbox = [];
      draft.activeTab = "home";
      draft.userClubId = null;
      draft.liveMatch = null;
    });
  }

  initUI();
}

bootstrap();