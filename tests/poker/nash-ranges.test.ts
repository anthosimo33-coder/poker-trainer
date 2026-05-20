import { describe, it, expect } from "vitest";
import {
  isInRange,
  rangeMembership,
  compareToNash,
} from "@/lib/poker/range-parser";
import {
  NASH_SB_PUSH_RANGES,
  getNashSBPushRange,
} from "@/content/ranges/nash-sb-push";
import type { Card } from "@/lib/poker/cards";

describe("isInRange", () => {
  it("AsKs est dans 'AA, AKs'", () => {
    expect(isInRange(["As", "Ks"], "AA, AKs")).toBe(true);
  });

  it("AhKd n'est pas dans 'AKs' (offsuit non match)", () => {
    expect(isInRange(["Ah", "Kd"], "AKs")).toBe(false);
  });

  it("AhKd est dans 'AKo' (offsuit match)", () => {
    expect(isInRange(["Ah", "Kd"], "AKo")).toBe(true);
  });

  it("2s2h est dans '22+' (paire la plus basse)", () => {
    expect(isInRange(["2s", "2h"], "22+")).toBe(true);
  });

  it("7s2h n'est pas dans 'AA, AKs'", () => {
    expect(isInRange(["7s", "2h"], "AA, AKs")).toBe(false);
  });

  it("ordre des cartes ne change rien (KsAs = AsKs)", () => {
    expect(isInRange(["Ks", "As"], "AKs")).toBe(true);
  });
});

describe("NASH_SB_PUSH_RANGES", () => {
  it("contient 6 ranges (stacks 5, 7, 8, 10, 12, 15)", () => {
    expect(NASH_SB_PUSH_RANGES.length).toBe(6);
    const depths = NASH_SB_PUSH_RANGES.map((r) => r.stackDepth);
    expect(depths).toEqual([5, 7, 8, 10, 12, 15]);
  });

  it("range push à 5bb > 10bb > 15bb (décroissant en taille)", () => {
    const r5 = getNashSBPushRange(5);
    const r10 = getNashSBPushRange(10);
    const r15 = getNashSBPushRange(15);
    expect(r5).toBeDefined();
    expect(r10).toBeDefined();
    expect(r15).toBeDefined();
    expect(r5!.combos).toBeGreaterThan(r10!.combos);
    expect(r10!.combos).toBeGreaterThan(r15!.combos);
  });

  it("AA est dans tous les ranges (toujours push)", () => {
    for (const r of NASH_SB_PUSH_RANGES) {
      expect(isInRange(["As", "Ah"], r.notation)).toBe(true);
    }
  });

  it("22 est dans tous les ranges (toujours push)", () => {
    for (const r of NASH_SB_PUSH_RANGES) {
      expect(isInRange(["2s", "2h"], r.notation)).toBe(true);
    }
  });

  it("72s est dans le range 5bb mais pas dans 15bb (suited only à 5bb)", () => {
    // Le range 5bb inclut `72s+` (suited) mais pas `72o` (offsuit).
    // Pédagogiquement : à 5bb même la pire main suited reste pushable.
    expect(isInRange(["7s", "2s"], getNashSBPushRange(5)!.notation)).toBe(true);
    expect(isInRange(["7s", "2s"], getNashSBPushRange(15)!.notation)).toBe(false);
  });

  it("KQo est dans tous les ranges 5-15bb (broadway robust)", () => {
    for (const r of NASH_SB_PUSH_RANGES) {
      expect(isInRange(["Ks", "Qh"], r.notation)).toBe(true);
    }
  });

  it("percentageOfDeck décroissant de 5bb à 15bb", () => {
    for (let i = 1; i < NASH_SB_PUSH_RANGES.length; i++) {
      expect(NASH_SB_PUSH_RANGES[i].percentageOfDeck).toBeLessThan(
        NASH_SB_PUSH_RANGES[i - 1].percentageOfDeck
      );
    }
  });
});

describe("rangeMembership", () => {
  it("4 mains dont 2 dans le range → 50 % membership", () => {
    const hands: [Card, Card][] = [
      ["As", "Ah"], // AA → in
      ["Ks", "Kh"], // KK → in
      ["7s", "2h"], // 72o → out
      ["8c", "3d"], // 83o → out
    ];
    const result = rangeMembership(hands, "AA, KK");
    expect(result.inRange.length).toBe(2);
    expect(result.outOfRange.length).toBe(2);
    expect(result.membershipPercentage).toBeCloseTo(50, 1);
  });
});

describe("compareToNash", () => {
  it("user push exactement le range Nash : accuracy 100 %", () => {
    const spots: Array<{ hand: [Card, Card]; userAction: "push" | "fold" }> = [
      { hand: ["As", "Ah"], userAction: "push" },
      { hand: ["7s", "2h"], userAction: "fold" },
      { hand: ["Ks", "Kh"], userAction: "push" },
    ];
    const result = compareToNash(spots, "AA, KK");
    expect(result.accuracy).toBe(100);
    expect(result.correctChoices).toBe(3);
  });

  it("user over-push : signedRangeDelta > 0", () => {
    const spots: Array<{ hand: [Card, Card]; userAction: "push" | "fold" }> = [
      { hand: ["As", "Ah"], userAction: "push" }, // correct (in AA)
      { hand: ["7s", "2h"], userAction: "push" }, // over-push
      { hand: ["Ks", "Kh"], userAction: "push" }, // correct (in KK)
    ];
    const result = compareToNash(spots, "AA, KK");
    expect(result.signedRangeDelta).toBeGreaterThan(0);
    expect(result.pushedButShouldFold).toHaveLength(1);
    expect(result.userPushPercentage).toBeCloseTo(100, 1);
    expect(result.nashPushPercentage).toBeCloseTo(66.67, 1);
  });

  it("user under-push : signedRangeDelta < 0", () => {
    const spots: Array<{ hand: [Card, Card]; userAction: "push" | "fold" }> = [
      { hand: ["As", "Ah"], userAction: "fold" }, // under-push (AA dans range)
      { hand: ["7s", "2h"], userAction: "fold" }, // correct
      { hand: ["Ks", "Kh"], userAction: "fold" }, // under-push (KK dans range)
    ];
    const result = compareToNash(spots, "AA, KK");
    expect(result.signedRangeDelta).toBeLessThan(0);
    expect(result.foldedButShouldPush).toHaveLength(2);
    expect(result.accuracy).toBeCloseTo(33.33, 1);
  });
});
