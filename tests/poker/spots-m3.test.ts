import { describe, it, expect } from "vitest";
import spots32 from "@/content/spots/m3-2.json";
import spots33 from "@/content/spots/m3-3.json";
import type { PrecomputedM32Spot, PrecomputedM33Spot } from "@/content/spots/types";

const S32 = spots32 as unknown as PrecomputedM32Spot[];
const S33 = spots33 as unknown as PrecomputedM33Spot[];

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
