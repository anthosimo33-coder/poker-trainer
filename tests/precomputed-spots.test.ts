import { describe, it, expect } from "vitest";
import spots from "@/content/spots/m2-2.json";

describe("M2.2 precomputed spots", () => {
  it("contient au moins 100 spots", () => {
    expect(spots.length).toBeGreaterThanOrEqual(100);
  });

  it("toutes les equity sont entre 0 et 100", () => {
    for (const spot of spots) {
      expect(spot.expected.equity).toBeGreaterThanOrEqual(0);
      expect(spot.expected.equity).toBeLessThanOrEqual(100);
    }
  });

  it("aucune carte dupliquée dans un spot", () => {
    for (const spot of spots) {
      const allCards = [...spot.heroCards, ...spot.villainCards, ...spot.board];
      const unique = new Set(allCards);
      expect(unique.size).toBe(allCards.length);
    }
  });

  it("scenarioLabel non vide", () => {
    for (const spot of spots) {
      expect(spot.scenarioLabel.length).toBeGreaterThan(5);
    }
  });

  it("distribution : au moins 1 spot par street", () => {
    const streets = new Set(spots.map((s) => s.street));
    expect(streets.has("preflop")).toBe(true);
    expect(streets.has("flop")).toBe(true);
    expect(streets.has("turn")).toBe(true);
  });
});
