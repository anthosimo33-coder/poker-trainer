import { describe, it, expect } from "vitest";
import spots from "@/content/spots/m2-2.json";
import spots3way from "@/content/spots/m2-3.json";

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

describe("M2.3 precomputed spots", () => {
  it("contient au moins 80 spots", () => {
    expect(spots3way.length).toBeGreaterThanOrEqual(80);
  });

  it("tous les spots sont 3-way (cartes distinctes)", () => {
    for (const s of spots3way) {
      const all = [...s.heroCards, ...s.villain1Cards, ...s.villain2Cards, ...s.board];
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it("distribution équilibrée (bande utile 20-80 majoritaire)", () => {
    const inBand = spots3way.filter(
      (s) => s.expected.equity >= 20 && s.expected.equity <= 80
    );
    expect(inBand.length / spots3way.length).toBeGreaterThan(0.6);
  });
});
