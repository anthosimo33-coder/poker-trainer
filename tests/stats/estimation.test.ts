import { describe, it, expect } from "vitest";
import {
  biasValue,
  calibrationPair,
  estimationKind,
  parseNumeric,
  type EstimationKind,
} from "@/lib/stats/estimation";

describe("estimationKind — mapping exhaustif des 20 sous-modules", () => {
  const expected: Record<string, EstimationKind> = {
    "m1.1": "none", "m1.2": "none", "m1.3": "none", "m1.4": "none",
    "m2.1": "equity_winrate", "m2.2": "equity_winrate",
    "m2.3": "equity_winrate", "m2.4": "equity_winrate",
    "m3.1": "ev_bb", "m3.2": "none", "m3.3": "ev_bb", "m3.4": "ev_bb",
    "m4.1": "icm_equity", "m4.2": "bubble_factor",
    "m4.3": "bubble_factor", "m4.4": "icm_equity",
    "m5.1": "none", "m5.2": "none", "m5.3": "none", "m5.4": "none",
  };

  for (const [slug, kind] of Object.entries(expected)) {
    it(`${slug} → ${kind}`, () => {
      expect(estimationKind(slug)).toBe(kind);
    });
  }

  it("slug inconnu → none", () => {
    expect(estimationKind("m9.9")).toBe("none");
  });

  it("M3.2 est exclu de ev_bb (échelle pFoldBreakeven, pas bb)", () => {
    expect(estimationKind("m3.2")).toBe("none");
  });
});

describe("parseNumeric", () => {
  it("parse un pourcentage formaté", () => {
    expect(parseNumeric("30.8 %")).toBe(30.8);
  });
  it("parse une virgule décimale", () => {
    expect(parseNumeric("2,5")).toBe(2.5);
  });
  it("accepte un nombre déjà typé", () => {
    expect(parseNumeric(42)).toBe(42);
  });
  it("rejette une chaîne vide", () => {
    expect(parseNumeric("")).toBeNull();
  });
  it("rejette une chaîne non numérique", () => {
    expect(parseNumeric("abc")).toBeNull();
  });
  it("rejette null/undefined", () => {
    expect(parseNumeric(null)).toBeNull();
    expect(parseNumeric(undefined)).toBeNull();
  });
});

describe("calibrationPair — (estimé, réel)", () => {
  it("M2.2 : equityHu vs expected.equity", () => {
    expect(
      calibrationPair("m2.2", { equityHu: "40" }, { equity: 42.3 })
    ).toEqual({ predicted: 40, actual: 42.3 });
  });
  it("M2.1 : equityInput vs expected.equityApprox", () => {
    expect(
      calibrationPair("m2.1", { equityInput: "30" }, { equityApprox: 28 })
    ).toEqual({ predicted: 30, actual: 28 });
  });
  it("M4.1 : equityIcmInput vs expected.heroEquityPercent", () => {
    expect(
      calibrationPair("m4.1", { equityIcmInput: "38" }, { heroEquityPercent: 40 })
    ).toEqual({ predicted: 38, actual: 40 });
  });
  it("M4.4 : equityIcmFtInput vs expected.heroEquityBefore", () => {
    expect(
      calibrationPair("m4.4", { equityIcmFtInput: "22" }, { heroEquityBefore: 20 })
    ).toEqual({ predicted: 22, actual: 20 });
  });
  it("retourne null hors kind calibration (M3.1, M1.1)", () => {
    expect(calibrationPair("m3.1", { pFoldInput: "50" }, { evBb: 1 })).toBeNull();
    expect(calibrationPair("m1.1", {}, {})).toBeNull();
  });
  it("retourne null si un champ est illisible", () => {
    expect(calibrationPair("m2.2", { equityHu: "" }, { equity: 40 })).toBeNull();
    expect(calibrationPair("m2.2", { equityHu: "40" }, {})).toBeNull();
  });
});

describe("biasValue — erreur signée", () => {
  it("ev_bb (M3.1) : reprend le signedError stocké", () => {
    expect(biasValue("m3.1", {}, {}, 0.4)).toBe(0.4);
    expect(biasValue("m3.3", {}, {}, -1.2)).toBe(-1.2);
  });
  it("ev_bb : null si signedError absent", () => {
    expect(biasValue("m3.1", {}, {}, undefined)).toBeNull();
  });
  it("bubble_factor (M4.3) : BF ajusté saisi − BF ajusté réel", () => {
    expect(
      biasValue("m4.3", { bfAdjustedInput: "2.5" }, { adjustedBubbleFactor: 2.0 }, 0)
    ).toBe(0.5);
  });
  it("bubble_factor (M4.2) : BF implicite (eq_ICM) − BF réel", () => {
    // eq_ICM 60 % → BF implicite 0.6/0.4 = 1.5 ; 1.5 − 1.0 = 0.5
    expect(
      biasValue("m4.2", { equityIcmReqInput: "60" }, { bubbleFactor: 1.0 }, 5)
    ).toBe(0.5);
  });
  it("bubble_factor (M4.2) : null aux bornes (eq_ICM = 100 %)", () => {
    expect(
      biasValue("m4.2", { equityIcmReqInput: "100" }, { bubbleFactor: 2 }, 0)
    ).toBeNull();
  });
  it("retourne null hors kind biais (M2.2)", () => {
    expect(biasValue("m2.2", { equityHu: "40" }, { equity: 40 }, 0)).toBeNull();
  });
});
