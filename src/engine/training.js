import { store } from "../core/state.js";

export const TRAINING_PLANS = {
  balanced: {
    key: "balanced",
    name: "Equilibrado",
    desc: "Mantiene el ritmo competitivo y una recuperación estándar.",
    staminaMod: 0,
    growthBonus: 1.0
  },
  attack: {
    key: "attack",
    name: "Ataque y Definición",
    desc: "Aumenta +35% la progresión de delanteros y medios, con +2% de desgaste.",
    staminaMod: -2,
    growthBonus: 1.35,
    targetPositions: ["DEL", "MED"]
  },
  defense: {
    key: "defense",
    name: "Solidez Defensiva",
    desc: "Aumenta +35% la progresión de defensas y porteros, con +2% de desgaste.",
    staminaMod: -2,
    growthBonus: 1.35,
    targetPositions: ["DEF", "POR"]
  },
  recovery: {
    key: "recovery",
    name: "Recuperación Física",
    desc: "Prioriza el descanso: +8% extra de recuperación física tras cada jornada.",
    staminaMod: 8,
    growthBonus: 0.6
  }
};

export function setTrainingPlan(planKey) {
  if (!TRAINING_PLANS[planKey]) return;
  store.update(["trainingPlan"], draft => {
    draft.trainingPlan = planKey;
  });
}