import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock limpio de localStorage para el entorno Node de pruebas
const memStorage = {};
globalThis.localStorage = {
  getItem: key => memStorage[key] ?? null,
  setItem: (key, val) => { memStorage[key] = String(val); },
  removeItem: key => { delete memStorage[key]; },
  clear: () => { Object.keys(memStorage).forEach(k => delete memStorage[k]); }
};

export function getRealisticWeeklyWage(player) {
  if (!player) return 25000;
  if (player.wage && player.wage > 0) return player.wage;
  const ovr = player.ovr || 75;
  const expBase = Math.pow(Math.max(1, ovr - 60), 2.55) * 185;
  const eliteMult = ovr >= 88 ? 1 + (ovr - 87) * 0.09 : 1.0;
  const ageFactor = player.age >= 32 ? 0.85 : player.age <= 20 ? 0.62 : 1.0;
  return Math.max(8000, Math.round((expBase * eliteMult * ageFactor) / 1000) * 1000);
}

import { store } from "../src/core/state.js";
import {
  calculateMarketValue,
  buyPlayer,
  sellPlayer,
  maybeGenerateIncomingOffer,
  respondToTransferOffer
} from "../src/engine/transfers.js";

describe("Motor de Traspasos (transfers.js)", () => {
  beforeEach(() => {
    const players = {};
    for (let i = 1; i <= 15; i++) {
      players[`p${i}`] = {
        id: `p${i}`,
        name: `Jugador Propio ${i}`,
        clubId: "club_user",
        pos: "MED",
        age: 24,
        ovr: 80,
        starter: i <= 11
      };
    }

    players["p_ext"] = {
      id: "p_ext",
      name: "Fichaje Objetivo",
      clubId: "club_rival",
      pos: "DEL",
      age: 21,
      ovr: 82,
      starter: true
    };

    store.update(["userClubId", "clubs", "players", "inbox", "budget", "season", "staff"], draft => {
      draft.userClubId = "club_user";
      draft.season = 1;
      draft.budget = 150000000;
      draft.staff = { scout: 1 };
      draft.clubs = {
        club_user: { id: "club_user", name: "Club Usuario", ovr: 80, budget: 150000000 },
        club_rival: { id: "club_rival", name: "Club Rival", ovr: 84, budget: 90000000 }
      };
      draft.players = players;
      draft.inbox = undefined;
    });
  });

  it("no lanza error al generar ofertas entrantes en draft.inbox (regresión jornadas 7-9)", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);

    expect(() => {
      maybeGenerateIncomingOffer();
    }).not.toThrow();

    const state = store.get();
    expect(Array.isArray(state.inbox)).toBe(true);
    expect(state.inbox.length).toBe(1);
    expect(state.inbox[0].type).toBe("transfer_offer");

    randomSpy.mockRestore();
  });

  it("permite aceptar una oferta entrante, traspasa al jugador y suma el dinero", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.05);
    maybeGenerateIncomingOffer();
    randomSpy.mockRestore();

    const offer = store.get().inbox[0];
    const budgetBefore = store.get().budget;

    const res = respondToTransferOffer(offer.id, 0);
    expect(res.ok).toBe(true);

    const stateAfter = store.get();
    expect(stateAfter.budget).toBe(budgetBefore + offer.offerAmount);
    expect(stateAfter.players[offer.playerId].clubId).toBe(offer.buyerId);
    expect(stateAfter.inbox[0].resolved).toBe(true);
  });

  it("compra y vende jugadores actualizando presupuesto, club e inbox", () => {
    const buyRes = buyPlayer("p_ext");
    expect(buyRes.ok).toBe(true);
    expect(store.get().players["p_ext"].clubId).toBe("club_user");

    const sellRes = sellPlayer("p_ext");
    expect(sellRes.ok).toBe(true);
    expect(store.get().players["p_ext"].clubId).toBe("club_rival");
  });

  it("calcula valores de mercado coherentes con edad, nivel de ojeador y escala exponencial 90+", () => {
    const youngStar = { ovr: 85, age: 20 };
    const veteran = { ovr: 85, age: 33 };
    expect(calculateMarketValue(youngStar, 1)).toBeGreaterThan(calculateMarketValue(veteran, 1));
    expect(calculateMarketValue(youngStar, 5)).toBeLessThan(calculateMarketValue(youngStar, 1));

    const worldClass90 = calculateMarketValue({ ovr: 90, age: 26 }, 1);
    const goat95 = calculateMarketValue({ ovr: 95, age: 25 }, 1);
    expect(worldClass90).toBeGreaterThanOrEqual(120000000);
    expect(worldClass90).toBeLessThanOrEqual(200000000);
    expect(goat95).toBeLessThanOrEqual(200000000);
    expect(goat95).toBeGreaterThan(worldClass90);
  });

  
});