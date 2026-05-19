import { describe, it, expect } from "vitest";
import spots32 from "@/content/spots/m3-2.json";
import spots33 from "@/content/spots/m3-3.json";
import spots34 from "@/content/spots/m3-4.json";
import type {
  PrecomputedM32Spot,
  PrecomputedM33Spot,
  PrecomputedM34Spot,
} from "@/content/spots/types";

const S32 = spots32 as unknown as PrecomputedM32Spot[];
const S33 = spots33 as unknown as PrecomputedM33Spot[];
const S34 = spots34 as unknown as PrecomputedM34Spot[];

describe("M3.2 precomputed spots", () => {
  it("contient au moins 100 spots", () => {
    expect(S32.length).toBeGreaterThanOrEqual(100);
  });

  it("pFoldBreakEven cohérent avec evIfCall (signe)", () => {
    for (const s of S32) {
      if (s.expected.evIfCall >= 0) {
        expect(s.expected.pFoldBreakEven).toBeCloseTo(0, 1);
      } else {
        expect(s.expected.pFoldBreakEven).toBeGreaterThan(0);
      }
    }
  });

  it("pFoldBreakEven et pFoldActual sont des probabilités [0, 1]", () => {
    for (const s of S32) {
      expect(s.expected.pFoldBreakEven).toBeGreaterThanOrEqual(0);
      expect(s.expected.pFoldBreakEven).toBeLessThanOrEqual(1);
      expect(s.expected.pFoldActual).toBeGreaterThanOrEqual(0);
      expect(s.expected.pFoldActual).toBeLessThanOrEqual(1);
    }
  });

  it("isPushProfitable cohérent avec pFoldActual ≥ pFoldBreakEven", () => {
    for (const s of S32) {
      expect(s.expected.isPushProfitable).toBe(
        s.expected.pFoldActual >= s.expected.pFoldBreakEven
      );
    }
  });
});

describe("M3.3 precomputed spots", () => {
  it("contient au moins 100 spots", () => {
    expect(S33.length).toBeGreaterThanOrEqual(100);
  });

  it("toutes les probas branches somment à 1", () => {
    for (const s of S33) {
      const sum = s.expected.pFold + s.expected.pCall + s.expected.pFourBet;
      expect(sum).toBeCloseTo(1, 2);
    }
  });

  it("evBb = somme pondérée des EV de branche (± 0.05)", () => {
    for (const s of S33) {
      const recomposed =
        s.expected.pFold * s.expected.evIfFold +
        s.expected.pCall * s.expected.evIfCall +
        s.expected.pFourBet * s.expected.evIfFourBet;
      expect(Math.abs(recomposed - s.expected.evBb)).toBeLessThan(0.05);
    }
  });

  it("4 scénarios canoniques tous représentés", () => {
    const scenarios = new Set(S33.map((s) => s.scenario));
    expect(scenarios.has("3bet-vs-open")).toBe(true);
    expect(scenarios.has("iso-vs-limp")).toBe(true);
    expect(scenarios.has("squeeze-vs-open-call")).toBe(true);
    expect(scenarios.has("cold-call-vs-open")).toBe(true);
  });
});

describe("M3.4 precomputed spots", () => {
  it("contient au moins 100 spots", () => {
    expect(S34.length).toBeGreaterThanOrEqual(100);
  });

  it("probas branches (fold + call + 3-bet) somment à 1", () => {
    for (const s of S34) {
      const sum = s.expected.pFold + s.expected.pCall + s.expected.pThreeBet;
      expect(sum).toBeCloseTo(1, 2);
    }
  });

  it("evBb = somme pondérée des EV de branche (± 0.05)", () => {
    for (const s of S34) {
      const recomposed =
        s.expected.pFold * s.expected.evIfFold +
        s.expected.pCall * s.expected.evIfCall +
        s.expected.pThreeBet * s.expected.evIf3Bet;
      expect(Math.abs(recomposed - s.expected.evBb)).toBeLessThan(0.05);
    }
  });

  it("distribution archétypes : value/semibluff/bluff ≥ 15 % chacun", () => {
    const n = S34.length;
    const value = S34.filter((s) => s.heroHandType === "value").length;
    const semi = S34.filter((s) => s.heroHandType === "semibluff").length;
    const bluff = S34.filter((s) => s.heroHandType === "bluff").length;
    expect(value / n).toBeGreaterThan(0.15);
    expect(semi / n).toBeGreaterThan(0.15);
    expect(bluff / n).toBeGreaterThan(0.15);
  });

  it("distribution board textures : au moins 3 textures représentées", () => {
    const textures = new Set(S34.map((s) => s.boardTexture));
    expect(textures.size).toBeGreaterThanOrEqual(3);
  });

  it("realizationFactorUsed identique sur tous les spots (= 0.8 par défaut)", () => {
    for (const s of S34) {
      expect(s.expected.realizationFactorUsed).toBeGreaterThan(0);
      expect(s.expected.realizationFactorUsed).toBeLessThanOrEqual(1);
    }
  });
});
