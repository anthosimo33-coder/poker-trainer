import { describe, it, expect } from "vitest";
import { evPushAllIn, evCallAllIn, requiredEquityForCall } from "@/lib/poker/ev";
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
