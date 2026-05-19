import { describe, it, expect } from "vitest";
import {
  evPushAllIn,
  evCallAllIn,
  requiredEquityForCall,
  breakEvenPFold,
  evMultiBranch,
  evCheckRaise,
} from "@/lib/poker/ev";
import { parseRange } from "@/lib/poker/range-parser";

// Itérations explicites basses : la moyenne sur N combos lisse la variance MC
// (σ_agrégé ≈ 0.2 %), et ça garde chaque test < 5 s (timeout vitest). Le spec
// hardcodait 5 000 → ~12-17 s pour 46-290 combos, incompatible avec le timeout.

describe("evPushAllIn — push profitable", () => {
  it("AA push 10bb vs tight call range : EV largement positive", () => {
    const result = evPushAllIn({
      heroCards: ["As", "Ah"],
      heroStack: 10,
      villainStack: 10,
      potBefore: 1.5,
      villainCallRange: parseRange("TT+, AKs, AKo"),
      iterations: 400,
    });
    expect(result.evBb).toBeGreaterThan(2);
    expect(result.equityVsCallRange).toBeGreaterThan(70);
  });

  it("72o push 10bb vs same range : EV faible (peu de showdown value)", () => {
    const result = evPushAllIn({
      heroCards: ["7s", "2h"],
      heroStack: 10,
      villainStack: 10,
      potBefore: 1.5,
      villainCallRange: parseRange("TT+, AKs, AKo"),
      iterations: 400,
    });
    expect(result.evBb).toBeLessThan(1);
    expect(result.equityVsCallRange).toBeLessThan(25);
  });

  it("P(fold) = 1 - call_range_size / 397 si pas de total range", () => {
    const result = evPushAllIn({
      heroCards: ["As", "Ah"],
      heroStack: 10,
      villainStack: 10,
      potBefore: 1.5,
      villainCallRange: parseRange("TT+, AKs"), // 34 combos
      iterations: 300,
    });
    // P(fold) ≈ 1 - 34/397 ≈ 0.914
    expect(result.pFold).toBeGreaterThan(0.85);
    expect(result.pFold).toBeLessThan(0.95);
  });
});

describe("evCallAllIn", () => {
  it("AKs call all-in vs push range large : EV positive", () => {
    const result = evCallAllIn({
      heroCards: ["As", "Ks"],
      callAmount: 9.5,
      potBefore: 11.5,
      villainPushRange: parseRange(
        "22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, A8o+, K9o+"
      ),
      iterations: 250,
    });
    expect(result.evBb).toBeGreaterThan(0);
  });
});

describe("requiredEquityForCall", () => {
  it("call 9.5bb pour pot final 21bb → equity requise ~45%", () => {
    const req = requiredEquityForCall(9.5, 11.5);
    expect(req).toBeCloseTo(9.5 / 21, 2);
    expect(req).toBeGreaterThan(0.43);
    expect(req).toBeLessThan(0.47);
  });
});

describe("evPushAllIn — avec villainTotalRange", () => {
  it("KK push 10bb, call ~8% sur defense ~35% : P(fold) précis ≈ 0.8", () => {
    const totalRange = parseRange(
      "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A5o+, K9o+, Q9o+, J9o+, T9o"
    );
    const callRange = parseRange("88+, AJs+, AQo+, KQs");
    const result = evPushAllIn({
      heroCards: ["Ks", "Kh"],
      heroStack: 10,
      villainStack: 10,
      potBefore: 1.5,
      villainCallRange: callRange,
      villainTotalRange: totalRange,
      iterations: 400,
    });
    // pFold = 1 − call_combos / total_combos (déterministe : 82/442 → ~0.814).
    expect(result.pFold).toBeGreaterThan(0.7);
    expect(result.pFold).toBeLessThan(0.85);
  });
});

describe("breakEvenPFold", () => {
  it("AA vs tight call range : pFold break-even = 0 (push +EV même si call à 100 %)", () => {
    const result = breakEvenPFold({
      heroCards: ["As", "Ah"],
      heroStack: 10,
      villainStack: 10,
      potBefore: 1.5,
      villainCallRange: parseRange("TT+, AKs, AKo"),
      iterations: 400,
    });
    expect(result.pFoldBreakEven).toBeCloseTo(0, 1);
    expect(result.evIfCall).toBeGreaterThan(0);
  });

  it("72o vs tight call range : pFold break-even significatif, evIfCall < 0", () => {
    const result = breakEvenPFold({
      heroCards: ["7s", "2h"],
      heroStack: 10,
      villainStack: 10,
      potBefore: 1.5,
      villainCallRange: parseRange("TT+, AKs, AKo"),
      iterations: 400,
    });
    // Spec attendait < 0.7 ; la vraie valeur MC est ~0.80 (72o n'a que ~19 %
    // d'equity vs TT+/AKs/AKo → evIfCall ≈ −6 bb → breakeven ≈ 0.80). Borne
    // haute corrigée à 0.95 (fix principiel : l'intention « FE significative,
    // call −EV » est préservée ; flaggé dans le rapport).
    expect(result.pFoldBreakEven).toBeGreaterThan(0.6);
    expect(result.pFoldBreakEven).toBeLessThan(0.95);
    expect(result.evIfCall).toBeLessThan(0);
  });
});

describe("evMultiBranch", () => {
  it("3 branches qui somment à 1 : EV = somme pondérée", () => {
    const result = evMultiBranch([
      { label: "fold", probability: 0.6, evIfBranch: 5 },
      { label: "call", probability: 0.3, evIfBranch: -2 },
      { label: "raise", probability: 0.1, evIfBranch: -8 },
    ]);
    // 0.6 × 5 + 0.3 × (−2) + 0.1 × (−8) = 3.0 − 0.6 − 0.8 = 1.6
    expect(result.evBb).toBeCloseTo(1.6, 1);
  });

  it("probabilités ne somment pas à 1 : erreur", () => {
    expect(() =>
      evMultiBranch([
        { label: "a", probability: 0.5, evIfBranch: 1 },
        { label: "b", probability: 0.3, evIfBranch: 2 },
      ])
    ).toThrow(/somment/);
  });
});

describe("evCheckRaise", () => {
  it("Set OOP check-raise vs c-bet range large : EV positive et fold equity élevée", () => {
    const cbetRange = parseRange(
      "22+, A2s+, K2s+, Q9s+, JTs, T9s, 98s, A8o+, KTo+"
    );
    const callRange = parseRange("KK+, AKs, K9s+, KQo");
    const threeBetRange = parseRange("77, KK");
    const result = evCheckRaise({
      heroCards: ["7c", "7h"],
      potPreflop: 6,
      cbetSize: 3,
      raiseSize: 9,
      effectiveStack: 30,
      villainCBetRange: cbetRange,
      villainCallVsRaiseRange: callRange,
      villain3BetRange: threeBetRange,
      board: ["7s", "Ks", "2d"],
      realizationFactor: 0.85,
      iterations: 400,
    });
    expect(result.evBb).toBeGreaterThan(2);
    expect(result.pFold).toBeGreaterThan(0.4);
  });

  it("Bluff check-raise pur : equity vs call faible, fold equity domine", () => {
    const cbetRange = parseRange(
      "22+, A2s+, K2s+, Q9s+, JTs, T9s, 98s, A8o+, KTo+"
    );
    const callRange = parseRange("KK, KQs, KJs, KTs, KQo");
    const threeBetRange = parseRange("AA, KK");
    const result = evCheckRaise({
      heroCards: ["9d", "8c"],
      potPreflop: 6,
      cbetSize: 3,
      raiseSize: 9,
      effectiveStack: 30,
      villainCBetRange: cbetRange,
      villainCallVsRaiseRange: callRange,
      villain3BetRange: threeBetRange,
      board: ["Kh", "7c", "2d"],
      iterations: 400,
    });
    expect(result.equityVsCallRange).toBeLessThan(20);
    expect(result.pFold).toBeGreaterThan(0.5);
  });

  it("Validation : call + 3-bet > c-bet range → erreur explicite", () => {
    expect(() =>
      evCheckRaise({
        heroCards: ["7c", "7h"],
        potPreflop: 6,
        cbetSize: 3,
        raiseSize: 9,
        effectiveStack: 30,
        villainCBetRange: parseRange("AA, KK"),
        villainCallVsRaiseRange: parseRange("AA"),
        villain3BetRange: parseRange("KK, QQ"),
        board: ["7s", "Ks", "2d"],
      })
    ).toThrow(/call \+ 3bet/);
  });
});
