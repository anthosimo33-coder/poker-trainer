import { describe, it, expect } from "vitest";
import {
  detectLeak,
  computeMedian,
  getThresholdForSubmodule,
  type AttemptLike,
  type LeakPatternInfo,
} from "@/lib/leaks/detector";

const NOW = 1_700_000_000_000;

const PATTERN_M22: LeakPatternInfo = {
  patternId: "m2-2-test",
  label: "Test M2.2",
  submoduleSlug: "m2.2",
};

function att(
  scoreLevel: AttemptLike["scoreLevel"],
  signedError = 0
): AttemptLike {
  const isCorrect = scoreLevel === "excellent" || scoreLevel === "juste";
  return { scoreLevel, signedError, isCorrect };
}

function repeat(n: number, a: AttemptLike): AttemptLike[] {
  return Array.from({ length: n }, () => ({ ...a }));
}

describe("computeMedian", () => {
  it("liste impaire", () => expect(computeMedian([3, 1, 2])).toBe(2));
  it("liste paire → moyenne des deux centraux", () =>
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5));
  it("liste vide → 0", () => expect(computeMedian([])).toBe(0));
});

describe("getThresholdForSubmodule", () => {
  it("mappe chaque module sur son seuil", () => {
    expect(getThresholdForSubmodule("m1.1")).toBe(5);
    expect(getThresholdForSubmodule("m2.3")).toBe(8);
    expect(getThresholdForSubmodule("m3.1")).toBe(0.3);
    expect(getThresholdForSubmodule("m4.2")).toBe(8);
    expect(getThresholdForSubmodule("m5.1")).toBe(0.15);
  });
});

describe("detectLeak", () => {
  it("échantillon insuffisant (< 5 attempts) → null", () => {
    const attempts = repeat(4, att("faux", -20));
    expect(detectLeak(PATTERN_M22, attempts, NOW)).toBeNull();
  });

  it("accuracy 60 % → leak avec raison low-accuracy", () => {
    // 3 corrects / 5 = 60 % < 70 %.
    const attempts = [...repeat(3, att("excellent")), ...repeat(2, att("faux"))];
    const leak = detectLeak(PATTERN_M22, attempts, NOW);
    expect(leak).not.toBeNull();
    expect(leak!.reasons.some((r) => r.type === "low-accuracy")).toBe(true);
    expect(leak!.accuracy).toBeCloseTo(0.6, 5);
    expect(leak!.attemptsAnalyzed).toBe(5);
  });

  it("accuracy élevée mais biais signedError médian +10 → leak signed-bias 'over'", () => {
    // Test d'indépendance : les deux signaux sont évalués séparément.
    const attempts = repeat(10, att("juste", 10));
    const leak = detectLeak(PATTERN_M22, attempts, NOW);
    expect(leak).not.toBeNull();
    expect(leak!.reasons.some((r) => r.type === "low-accuracy")).toBe(false);
    const bias = leak!.reasons.find((r) => r.type === "signed-bias-high");
    if (bias?.type !== "signed-bias-high") throw new Error("raison signed-bias attendue");
    expect(bias.direction).toBe("over");
    expect(leak!.signedErrorMedian).toBe(10);
  });

  it("biais négatif → direction 'under'", () => {
    const attempts = repeat(10, att("juste", -12));
    const leak = detectLeak(PATTERN_M22, attempts, NOW);
    const bias = leak!.reasons.find((r) => r.type === "signed-bias-high");
    if (bias?.type !== "signed-bias-high") throw new Error("raison signed-bias attendue");
    expect(bias.direction).toBe("under");
  });

  it("pattern sain (accuracy 100 %, biais ~0) → null", () => {
    const attempts = [
      ...repeat(6, att("excellent", 1)),
      ...repeat(4, att("juste", -1)),
    ];
    expect(detectLeak(PATTERN_M22, attempts, NOW)).toBeNull();
  });

  it("severity severe quand accuracy très basse", () => {
    const attempts = [...repeat(1, att("excellent")), ...repeat(9, att("faux", -3))];
    const leak = detectLeak(PATTERN_M22, attempts, NOW);
    expect(leak!.severity).toBe("severe");
  });

  it("ne garde que les 20 derniers attempts", () => {
    // 30 attempts : 10 vieux corrects + 20 récents à 50 % → la fenêtre voit 50 %.
    const attempts = [
      ...repeat(10, att("excellent")),
      ...repeat(10, att("excellent")),
      ...repeat(10, att("faux", -5)),
    ];
    const leak = detectLeak(PATTERN_M22, attempts, NOW);
    expect(leak).not.toBeNull();
    expect(leak!.attemptsAnalyzed).toBe(20);
    expect(leak!.accuracy).toBeCloseTo(0.5, 5);
  });

  it("propage detectedAt depuis now", () => {
    const attempts = repeat(6, att("faux", -2));
    const leak = detectLeak(PATTERN_M22, attempts, NOW);
    expect(leak!.detectedAt).toBe(NOW);
  });
});
