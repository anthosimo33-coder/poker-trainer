import { describe, it, expect } from "vitest";
import { generatePotOddsSpot } from "@/lib/poker/spot-generators/m1-1-pot-odds";
import { generatePotOddsConversionSpot } from "@/lib/poker/spot-generators/m1-2-conversion";
import { generateImpliedOddsSpot } from "@/lib/poker/spot-generators/m1-3-implied";
import { generateReverseImpliedSpot } from "@/lib/poker/spot-generators/m1-4-reverse-implied";

describe("generators — cohérence des spots", () => {
  it("M1.1 génère des spots valides", () => {
    const spot = generatePotOddsSpot();
    expect(spot.heroCards).toHaveLength(2);
    expect(spot.board).toHaveLength(3);
    expect(spot.expected.requiredEquity).toBeGreaterThan(0);
    expect(spot.expected.requiredEquity).toBeLessThan(100);
  });

  it("M1.2 génère un mode et une question valides", () => {
    const spot = generatePotOddsConversionSpot();
    expect(["ratio", "percent", "cross"]).toContain(spot.mode);
    expect(["ratio", "percent"]).toContain(spot.ask);
    if (spot.mode === "cross") {
      expect(spot.given).toBeDefined();
      expect(spot.given!.value).toBeGreaterThan(0);
    }
  });

  it("M1.3 fournit une description de tirage et une equity réelle", () => {
    const spot = generateImpliedOddsSpot();
    expect(spot.drawDescription).toBeTruthy();
    expect(spot.realEquity).toBeGreaterThan(0);
    expect(spot.expected.neededExtraBb).toBeGreaterThanOrEqual(0);
  });

  it("M1.4 fournit une main faite et l'equity ajustée", () => {
    const spot = generateReverseImpliedSpot();
    expect(spot.handDescription).toBeTruthy();
    expect(spot.adjustedEquity).toBeLessThanOrEqual(spot.apparentEquity);
    expect(spot.expected.estimatedFutureLossBb).toBeGreaterThan(0);
  });
});

describe("generators — déterminisme avec RNG", () => {
  it("M1.1 produit le même spot avec un RNG identique", () => {
    const rng1 = () => 0.5;
    const rng2 = () => 0.5;
    const a = generatePotOddsSpot(rng1);
    const b = generatePotOddsSpot(rng2);
    expect(a.heroCards).toEqual(b.heroCards);
    expect(a.board).toEqual(b.board);
    expect(a.potBb).toEqual(b.potBb);
  });
});
