import { describe, it, expect } from "vitest";
import {
  icmEquity,
  icmEquityPercent,
  chipEquityPercent,
  bubbleFactor,
  icmDecisionCall,
} from "@/lib/poker/icm";

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

describe("bubbleFactor — sit & go bulle", () => {
  it("Bulle 4 joueurs, 3 payés : BF significatif (~1.5) pour le chipleader", () => {
    // Vrai résultat : BF = 1.55 (entre spec range 1.2-2). ✓
    const result = bubbleFactor({
      players: [
        { id: "leader", stack: 7000 },
        { id: "mid1", stack: 5000 },
        { id: "mid2", stack: 5000 },
        { id: "short", stack: 1000 },
      ],
      payouts: [50, 30, 20],
      heroId: "leader",
      villainId: "mid1",
      pushAmount: 5000,
    });
    expect(result.bubbleFactor).toBeGreaterThan(1.2);
    expect(result.bubbleFactor).toBeLessThan(2);
  });

  it("Cash (WTA) : BF ≈ 1 (pas de concavité)", () => {
    const result = bubbleFactor({
      players: [
        { id: "a", stack: 5000 },
        { id: "b", stack: 5000 },
      ],
      payouts: [100],
      heroId: "a",
      villainId: "b",
      pushAmount: 5000,
    });
    expect(result.bubbleFactor).toBeCloseTo(1, 1);
  });

  it("Short stack en bulle : BF supérieur à 1 (effet bubble), même si moins extrême que le leader", () => {
    // Vrai résultat : BF = 1.29. Spec attendait > 1.5 mais la math donne 1.29 :
    // le short stack a gain et perte ICM relativement proportionnels (en pts %),
    // donc son BF est moins extrême que celui du chip leader.
    const result = bubbleFactor({
      players: [
        { id: "short", stack: 1000 },
        { id: "leader", stack: 7000 },
        { id: "mid1", stack: 5000 },
        { id: "mid2", stack: 5000 },
      ],
      payouts: [50, 30, 20],
      heroId: "short",
      villainId: "leader",
      pushAmount: 1000,
    });
    expect(result.bubbleFactor).toBeGreaterThan(1.2);
  });

  it("Payouts steep (4 paid, 40/30/20/10) : BF > 1 par concavité résiduelle", () => {
    // Vrai résultat : BF = 1.587. Spec attendait < 1.3 mais avec 40/30/20/10,
    // les écarts de payouts créent encore une concavité importante. Seul un
    // structure flat (satellite) ou WTA donne BF ≈ 1.
    const result = bubbleFactor({
      players: [
        { id: "a", stack: 7000 },
        { id: "b", stack: 5000 },
        { id: "c", stack: 5000 },
        { id: "d", stack: 3000 },
      ],
      payouts: [40, 30, 20, 10],
      heroId: "a",
      villainId: "b",
      pushAmount: 5000,
    });
    expect(result.bubbleFactor).toBeGreaterThan(1);
    expect(result.bubbleFactor).toBeLessThan(2);
  });

  it("Cohérence : eq_ICM_required = BF / (BF + 1) (relation inverse)", () => {
    const result = bubbleFactor({
      players: [
        { id: "hero", stack: 6000 },
        { id: "v1", stack: 5000 },
        { id: "v2", stack: 4000 },
        { id: "v3", stack: 3000 },
      ],
      payouts: [50, 30, 20],
      heroId: "hero",
      villainId: "v1",
      pushAmount: 5000,
    });
    const bfDerived =
      result.requiredEquityICM / (100 - result.requiredEquityICM);
    expect(bfDerived).toBeCloseTo(result.bubbleFactor, 2);
  });
});

describe("icmDecisionCall", () => {
  it("Push profitable en chips mais -EV en ICM en bulle (cas typique)", () => {
    const result = icmDecisionCall({
      players: [
        { id: "leader", stack: 7000 },
        { id: "mid1", stack: 5000 },
        { id: "mid2", stack: 5000 },
        { id: "short", stack: 1000 },
      ],
      payouts: [50, 30, 20],
      heroId: "leader",
      villainId: "mid1",
      pushAmount: 5000,
      actualEquity: 52,
    });
    // En chips, 52% c'est un call +EV (>50%). En ICM, requis ~60.8%.
    expect(result.shouldCall).toBe(false);
    expect(result.marginPts).toBeLessThan(0);
  });

  it("Call clairement +EV : equity dépasse largement le seuil ICM", () => {
    const result = icmDecisionCall({
      players: [
        { id: "leader", stack: 7000 },
        { id: "mid1", stack: 5000 },
        { id: "mid2", stack: 5000 },
        { id: "short", stack: 1000 },
      ],
      payouts: [50, 30, 20],
      heroId: "leader",
      villainId: "mid1",
      pushAmount: 5000,
      actualEquity: 75, // équity AA-style
    });
    expect(result.shouldCall).toBe(true);
    expect(result.marginPts).toBeGreaterThan(0);
  });
});
