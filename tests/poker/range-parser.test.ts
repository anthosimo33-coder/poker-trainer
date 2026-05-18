import { describe, it, expect } from "vitest";
import {
  parseRange,
  rangeSize,
  rangePercentage,
  rangeToGrid,
} from "@/lib/poker/range-parser";
import { CANONICAL_RANGES } from "@/content/ranges/canonical";

describe("parseRange — mains isolées", () => {
  it("AA : 6 combos", () => {
    expect(rangeSize("AA")).toBe(6);
  });
  it("AKs : 4 combos", () => {
    expect(rangeSize("AKs")).toBe(4);
  });
  it("AKo : 12 combos", () => {
    expect(rangeSize("AKo")).toBe(12);
  });
  it("AK (sans suffixe) : 16 combos", () => {
    expect(rangeSize("AK")).toBe(16);
  });
});

describe("parseRange — ranges +", () => {
  it("22+ : 13 paires × 6 = 78 combos", () => {
    expect(rangeSize("22+")).toBe(78);
  });
  it("TT+ : 5 paires × 6 = 30 combos", () => {
    expect(rangeSize("TT+")).toBe(30);
  });
  it("ATs+ : 4 × 4 = 16 combos", () => {
    expect(rangeSize("ATs+")).toBe(16);
  });
  it("KJo+ : 2 × 12 = 24 combos", () => {
    expect(rangeSize("KJo+")).toBe(24);
  });
});

describe("parseRange — multi-expressions", () => {
  it("22+, AKs : 78 + 4 = 82 combos", () => {
    expect(rangeSize("22+, AKs")).toBe(82);
  });
  it("range complexe BTN-like", () => {
    // Le spec annonçait « ~45 % / 550-620 combos » mais la notation fournie
    // somme en réalité à 378 combos (~28.5 %) — chaque sous-range a son
    // décompte standard (22+ =78, A2s+ =48, A8o+ =72, …). Bornes corrigées
    // sur la vraie valeur (parser validé par les tests unitaires ci-dessus).
    const range =
      "22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, A8o+, K9o+, Q9o+, J9o+, T9o";
    const size = rangeSize(range);
    expect(size).toBeGreaterThan(350);
    expect(size).toBeLessThan(410);
  });
});

describe("parseRange — déduplication", () => {
  it("AA + 22+ : pas de doublon", () => {
    expect(rangeSize("AA, 22+")).toBe(78);
  });
});

describe("rangePercentage", () => {
  it("22+ ≈ 5.88 %", () => {
    expect(rangePercentage("22+")).toBeCloseTo((78 / 1326) * 100, 1);
  });
});

describe("rangeToGrid", () => {
  it("AA active uniquement (0,0)", () => {
    const grid = rangeToGrid("AA");
    expect(grid[0][0]).toBe(true);
    expect(grid[1][1]).toBe(false);
    expect(grid[0][1]).toBe(false);
  });
  it("AKs active (0,1) au-dessus diagonale", () => {
    const grid = rangeToGrid("AKs");
    expect(grid[0][1]).toBe(true);
    expect(grid[1][0]).toBe(false);
  });
  it("AKo active (1,0) sous diagonale", () => {
    const grid = rangeToGrid("AKo");
    expect(grid[1][0]).toBe(true);
    expect(grid[0][1]).toBe(false);
  });
});

describe("parseRange — robustesse", () => {
  it("toutes les expressions valides parsent sans erreur", () => {
    for (const n of ["AA", "AKs", "AKo", "AK", "22+", "ATs+", "KJo+", "T9s", "54s"]) {
      expect(() => parseRange(n)).not.toThrow();
    }
  });
  it("notation intervalle (-) supportée", () => {
    expect(rangeSize("TT-22")).toBe(9 * 6); // TT..22 = 9 paires
    expect(rangeSize("ATs-A8s")).toBe(3 * 4); // ATs,A9s,A8s
    expect(rangeSize("K6s-K8s")).toBe(3 * 4); // ordre inversé géré
  });
});

describe("CANONICAL_RANGES", () => {
  it("contient au moins 25 ranges", () => {
    expect(CANONICAL_RANGES.length).toBeGreaterThanOrEqual(25);
  });
  it("tous les slugs sont uniques", () => {
    const slugs = CANONICAL_RANGES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("toutes les notations parsent sans erreur", () => {
    for (const r of CANONICAL_RANGES) {
      expect(() => parseRange(r.notation)).not.toThrow();
      expect(rangeSize(r.notation)).toBeGreaterThan(0);
    }
  });
});
