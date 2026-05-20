import { describe, it, expect } from "vitest";
import spots from "@/content/spots/m2-2.json";
import spots3way from "@/content/spots/m2-3.json";
import spots31 from "@/content/spots/m3-1.json";
import spots41 from "@/content/spots/m4-1.json";

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

describe("M3.1 precomputed spots", () => {
  it("contient au moins 100 spots", () => {
    expect(spots31.length).toBeGreaterThanOrEqual(100);
  });

  it("toutes les EV sont dans une plage réaliste (-5 à +10 bb)", () => {
    for (const s of spots31) {
      expect(s.expected.evBb).toBeGreaterThan(-5);
      expect(s.expected.evBb).toBeLessThan(10);
    }
  });

  it("toutes les P(fold) sont entre 0 et 1", () => {
    for (const s of spots31) {
      expect(s.expected.pFold).toBeGreaterThanOrEqual(0);
      expect(s.expected.pFold).toBeLessThanOrEqual(1);
    }
  });

  it("distribution EV équilibrée (au moins 30% dans bande ±1 bb)", () => {
    const inBand = spots31.filter((s) => Math.abs(s.expected.evBb) <= 1);
    expect(inBand.length / spots31.length).toBeGreaterThan(0.3);
  });
});

describe("M4.1 precomputed spots", () => {
  it("contient au moins 100 spots", () => {
    expect(spots41.length).toBeGreaterThanOrEqual(100);
  });

  it("somme des équités ICM = somme des payouts payables (positions ≤ #joueurs)", () => {
    // Pour un snapshot N-way dans une structure à K payouts :
    // - si N ≥ K : tout le prizepool est distribué entre les N joueurs (sum = 100)
    // - si N < K : seules les N premières places sont jouables, somme = Σ payouts[0..N-1]
    for (const s of spots41) {
      const expectedSum = s.payouts
        .slice(0, s.players.length)
        .reduce((a: number, p: number) => a + p, 0);
      const totalEq = Object.values(s.expected.allEquities).reduce(
        (acc: number, e) => acc + (e as number),
        0
      );
      expect(totalEq).toBeCloseTo(expectedSum, 0);
    }
  });

  it("chip leader ICM ≤ chip equity (égalité en WTA), short stack ICM > chip equity", () => {
    // Exception WTA : avec un seul payout, ICM = chip equity (concavité dégénérée).
    for (const s of spots41) {
      const isWTA = s.payouts.length === 1;
      if (s.spotType === "chip-leader") {
        if (isWTA) {
          expect(s.expected.icmEffect).toBeCloseTo(0, 1);
        } else {
          expect(s.expected.icmEffect).toBeLessThan(0);
        }
      }
      if (s.spotType === "short-stack") {
        if (isWTA) {
          expect(s.expected.icmEffect).toBeCloseTo(0, 1);
        } else {
          expect(s.expected.icmEffect).toBeGreaterThan(0);
        }
      }
    }
  });

  it("toutes les distributions de types représentées (>= 10 % chacune sauf FT/satellite)", () => {
    const types = ["equal-stacks", "chip-leader", "short-stack", "bubble"];
    for (const t of types) {
      const count = spots41.filter((s) => s.spotType === t).length;
      expect(count / spots41.length).toBeGreaterThan(0.1);
    }
  });

  it("hero equity ICM toujours entre 0 et 100", () => {
    for (const s of spots41) {
      expect(s.expected.heroEquityPercent).toBeGreaterThanOrEqual(0);
      expect(s.expected.heroEquityPercent).toBeLessThanOrEqual(100);
    }
  });

  it("payouts somment à 100 %", () => {
    for (const s of spots41) {
      const sum = s.payouts.reduce((a: number, p: number) => a + p, 0);
      expect(sum).toBe(100);
    }
  });
});
