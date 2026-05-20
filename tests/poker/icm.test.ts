import { describe, it, expect } from "vitest";
import { icmEquity, icmEquityPercent, chipEquityPercent } from "@/lib/poker/icm";

describe("icmEquity — cas trivial", () => {
  it("1 joueur, 1 payout : équité = payout total", () => {
    const result = icmEquity([{ id: "hero", stack: 1000 }], [100]);
    expect(result.equities.hero).toBeCloseTo(100, 1);
  });

  it("Heads-up égalité : 50/50 sur WTA", () => {
    const result = icmEquity(
      [
        { id: "a", stack: 1000 },
        { id: "b", stack: 1000 },
      ],
      [100]
    );
    expect(result.equities.a).toBeCloseTo(50, 1);
    expect(result.equities.b).toBeCloseTo(50, 1);
  });

  it("Heads-up 80/20 stacks sur WTA : équités 80/20", () => {
    const result = icmEquity(
      [
        { id: "big", stack: 8000 },
        { id: "small", stack: 2000 },
      ],
      [100]
    );
    expect(result.equities.big).toBeCloseTo(80, 1);
    expect(result.equities.small).toBeCloseTo(20, 1);
  });
});

describe("icmEquity — 3 joueurs, sit & go standard", () => {
  it("Stacks égaux 3-way (50/30/20) : équités égales = 33.3 %", () => {
    const result = icmEquity(
      [
        { id: "a", stack: 1000 },
        { id: "b", stack: 1000 },
        { id: "c", stack: 1000 },
      ],
      [50, 30, 20]
    );
    expect(result.equities.a).toBeCloseTo(33.33, 1);
    expect(result.equities.b).toBeCloseTo(33.33, 1);
    expect(result.equities.c).toBeCloseTo(33.33, 1);
  });

  it("Stacks 5000/3000/2000 : effet ICM (concavité)", () => {
    // Vrai résultat Malmuth-Harville : big 38.39 / med 32.75 / small 28.86.
    // Spec ranges (>40 et >20 && <28) ne correspondent pas au calcul exact ;
    // bandes ajustées pour matcher la réalité tout en préservant l'invariant
    // pédagogique (big < chip eq 50, small > chip eq 20).
    const result = icmEquity(
      [
        { id: "big", stack: 5000 },
        { id: "med", stack: 3000 },
        { id: "small", stack: 2000 },
      ],
      [50, 30, 20]
    );
    expect(result.equities.big).toBeLessThan(50);
    expect(result.equities.big).toBeGreaterThan(35);
    expect(result.equities.small).toBeGreaterThan(20);
    expect(result.equities.small).toBeLessThan(32);
    expect(result.totalEquity).toBeCloseTo(100, 1);
  });

  it("Chip leader vs short stack : effet ICM marqué", () => {
    // Vrai résultat : leader passe de chip eq 80% à ICM ~45.78%.
    const result = icmEquity(
      [
        { id: "leader", stack: 8000 },
        { id: "mid1", stack: 1000 },
        { id: "mid2", stack: 1000 },
      ],
      [50, 30, 20]
    );
    expect(result.equities.leader).toBeLessThan(60);
    expect(result.equities.leader).toBeGreaterThan(40);
  });
});

describe("icmEquity — bulle 4 joueurs, 3 payés", () => {
  it("Bubble factor visible : short stack a une équité bien plus haute que sa chip equity", () => {
    const result = icmEquity(
      [
        { id: "leader", stack: 7000 },
        { id: "mid1", stack: 5000 },
        { id: "mid2", stack: 5000 },
        { id: "short", stack: 1000 },
      ],
      [50, 30, 20]
    );
    const totalChips = 7000 + 5000 + 5000 + 1000;
    const chipEqShort = (1000 / totalChips) * 100; // 5.56 %
    expect(result.equities.short).toBeGreaterThan(chipEqShort);
    expect(result.equities.short).toBeLessThan(15);
  });
});

describe("icmEquityPercent", () => {
  it("retourne la part du prizepool en pourcentage", () => {
    const v = icmEquityPercent(
      [
        { id: "a", stack: 5000 },
        { id: "b", stack: 5000 },
      ],
      [100],
      "a"
    );
    expect(v).toBeCloseTo(50, 1);
  });
});

describe("chipEquityPercent", () => {
  it("calcul direct stack / total", () => {
    expect(
      chipEquityPercent(
        [
          { id: "a", stack: 5000 },
          { id: "b", stack: 5000 },
        ],
        "a"
      )
    ).toBeCloseTo(50, 1);
  });
});
