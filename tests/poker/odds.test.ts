import { describe, it, expect } from "vitest";
import { potOdds, evaluateCall, impliedOdds } from "@/lib/poker/odds";

describe("potOdds", () => {
  it("calcule la cote canonique : pot 4, bet 2", () => {
    const r = potOdds({ pot: 4, bet: 2 });
    expect(r.finalPot).toBe(8);
    expect(r.ratio).toBeCloseTo(3, 5); // (4+2)/2 = 3
    expect(r.requiredEquity).toBeCloseTo(25, 5); // 2/8 = 25 %
    expect(r.toCall).toBe(2);
  });

  // NOTE (écart S2) : le spec annonçait 33.333 % avec un commentaire "1:1".
  // C'est une erreur du spec : pour pot 100 / bet 50, ratio = (100+50)/50 = 3:1
  // et equity requise = 50 / (100 + 2×50) = 50/200 = 25 %. La formule canonique
  // (et l'implémentation, et les tests pot 4/bet 2 et pot 4000/bet 3200) donnent 25 %.
  it("calcule la cote du pot 100 / bet 50 (ratio 3:1 → 25 %)", () => {
    const r = potOdds({ pot: 100, bet: 50 });
    expect(r.ratio).toBeCloseTo(3, 5);
    expect(r.requiredEquity).toBeCloseTo(25, 5);
  });

  it("calcule la cote du pot 4000 / bet 3200 (référence du PRD)", () => {
    const r = potOdds({ pot: 4000, bet: 3200 });
    expect(r.requiredEquity).toBeCloseTo(30.769, 2);
    expect(r.finalPot).toBe(10400);
  });

  it("throw sur pot négatif", () => {
    expect(() => potOdds({ pot: -1, bet: 1 })).toThrow();
  });

  it("throw sur bet nul ou négatif", () => {
    expect(() => potOdds({ pot: 10, bet: 0 })).toThrow();
    expect(() => potOdds({ pot: 10, bet: -5 })).toThrow();
  });
});

describe("evaluateCall", () => {
  it('décide "call" quand equity > required', () => {
    const r = evaluateCall({ pot: 4, bet: 2, estimatedEquity: 40 });
    expect(r.decision).toBe("call");
    expect(r.edge).toBeCloseTo(15, 2);
  });

  it('décide "fold" quand equity < required', () => {
    const r = evaluateCall({ pot: 4, bet: 2, estimatedEquity: 10 });
    expect(r.decision).toBe("fold");
    expect(r.edge).toBeCloseTo(-15, 2);
  });

  it('décide "indifferent" quand equity ≈ required', () => {
    const r = evaluateCall({ pot: 4, bet: 2, estimatedEquity: 25.2 });
    expect(r.decision).toBe("indifferent");
  });

  it("calcule l'EV du call", () => {
    // pot 4, bet 2, equity 50 % → EV = 0.5 × 8 - 2 = 2
    const r = evaluateCall({ pot: 4, bet: 2, estimatedEquity: 50 });
    expect(r.evCall).toBeCloseTo(2, 5);
  });
});

describe("impliedOdds", () => {
  it("retourne 0 quand l'equity actuelle suffit", () => {
    const r = impliedOdds({ pot: 4, bet: 2, realEquity: 30, effectiveStack: 100 });
    expect(r.neededExtra).toBe(0);
  });

  it("calcule le gain futur nécessaire quand l'equity est insuffisante", () => {
    // pot 4, bet 2, equity 20 %. Required = 25 %.
    // X = 2/0.2 - 8 = 10 - 8 = 2 → il faut gagner 2 de plus en moyenne.
    const r = impliedOdds({ pot: 4, bet: 2, realEquity: 20, effectiveStack: 100 });
    expect(r.neededExtra).toBeCloseTo(2, 5);
    expect(r.impliedRatio).toBeCloseTo(1, 5);
  });
});
