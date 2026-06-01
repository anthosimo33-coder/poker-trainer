import { describe, it, expect } from "vitest";
import {
  PATTERNS,
  PATTERNS_BY_ID,
  matchPatterns,
  submoduleOf,
  patternsForSubmodule,
} from "@/content/patterns/definitions";
import { SPOT_GENERATORS } from "@/lib/poker/spot-generators/registry";
import type { GenericSpot } from "@/lib/poker/spot-generators/types";
import type { PotOddsSpot } from "@/lib/poker/spot-generators/m1-1-pot-odds";
import { classifyHand } from "@/lib/poker/hand-classifier";

/** RNG déterministe (mulberry32) pour générer des spots reproductibles. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUBMODULES = Object.keys(SPOT_GENERATORS);

/** Génère `n` spots d'un sous-module avec un RNG seedé. */
function generateMany<T extends GenericSpot = GenericSpot>(
  slug: string,
  n: number,
  seed = 1
): T[] {
  const gen = SPOT_GENERATORS[slug];
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => gen(rng) as T);
}

describe("Catalogue de patterns", () => {
  it("définit au moins 80 patterns", () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(80);
  });

  it("a des patternId uniques", () => {
    const ids = PATTERNS.map((p) => p.patternId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("couvre les 20 sous-modules avec ≥ 3 patterns chacun", () => {
    for (const slug of SUBMODULES) {
      expect(patternsForSubmodule(slug).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("PATTERNS_BY_ID indexe tout le catalogue", () => {
    expect(Object.keys(PATTERNS_BY_ID).length).toBe(PATTERNS.length);
    expect(PATTERNS_BY_ID["m5-1-stack-10bb"]?.label).toContain("10 bb");
  });
});

describe("submoduleOf", () => {
  it("retourne m1.1 pour un PotOddsSpot (sans submoduleSlug)", () => {
    const spot = SPOT_GENERATORS["m1.1"](makeRng(3));
    expect(submoduleOf(spot)).toBe("m1.1");
  });
  it("retourne le slug porté par les autres spots", () => {
    expect(submoduleOf(SPOT_GENERATORS["m5.1"](makeRng(3)))).toBe("m5.1");
    expect(submoduleOf(SPOT_GENERATORS["m4.2"](makeRng(3)))).toBe("m4.2");
  });
});

describe("Couverture & isolation du matching", () => {
  it("chaque spot généré matche au moins un pattern de SON sous-module", () => {
    for (const slug of SUBMODULES) {
      const spots = generateMany(slug, 60, 42);
      for (const spot of spots) {
        const matches = matchPatterns(spot);
        expect(matches.length).toBeGreaterThanOrEqual(1);
        // Isolation : aucun pattern d'un autre sous-module ne matche.
        expect(matches.every((p) => p.submoduleSlug === slug)).toBe(true);
      }
    }
  });

  it("chaque pattern défini est atteignable (matché par ≥ 1 spot généré)", () => {
    // Garde-fou anti « bande morte » : un seuil mal calibré rendrait un pattern
    // jamais matchable. On échantillonne largement chaque sous-module.
    const hit = new Set<string>();
    for (const slug of SUBMODULES) {
      for (const spot of generateMany(slug, 800, 123)) {
        for (const p of matchPatterns(spot)) hit.add(p.patternId);
      }
    }
    const unreachable = PATTERNS.filter((p) => !hit.has(p.patternId)).map((p) => p.patternId);
    expect(unreachable).toEqual([]);
  });

  it("un pattern n'est jamais matché par un spot d'un autre sous-module", () => {
    const m51Spots = generateMany("m5.1", 40, 7);
    const m11Pattern = PATTERNS_BY_ID["m1-1-equity-cheap"];
    expect(m51Spots.some((s) => m11Pattern.matchSpot(s))).toBe(false);
  });
});

describe("Matching par dimension", () => {
  it("M5.1 — un spot à 10 bb matche stack-10bb", () => {
    const spots = generateMany("m5.1", 200, 11);
    const tenBb = spots.find((s) => "heroStack" in s && s.heroStack === 10);
    expect(tenBb).toBeDefined();
    const ids = matchPatterns(tenBb!).map((p) => p.patternId);
    expect(ids).toContain("m5-1-stack-10bb");
  });

  it("M5.1 — un A-petit-offsuit matche hand-ax-small", () => {
    const spots = generateMany("m5.1", 400, 5);
    const target = spots.find(
      (s) => "heroCards" in s && classifyHand(s.heroCards) === "ax-offsuit-small"
    );
    expect(target).toBeDefined();
    expect(matchPatterns(target!).map((p) => p.patternId)).toContain("m5-1-hand-ax-small");
  });

  it("M3.4 — un board sec matche dry-board", () => {
    const spots = generateMany("m3.4", 200, 9);
    const dry = spots.find((s) => "boardTexture" in s && s.boardTexture === "dry");
    expect(dry).toBeDefined();
    expect(matchPatterns(dry!).map((p) => p.patternId)).toContain("m3-4-board-dry");
  });

  it("M2.2 — un spot préflop matche street-preflop", () => {
    const spots = generateMany("m2.2", 200, 13);
    const pf = spots.find((s) => "street" in s && s.street === "preflop");
    expect(pf).toBeDefined();
    expect(matchPatterns(pf!).map((p) => p.patternId)).toContain("m2-2-street-preflop");
  });

  it("M4.1 — chaque spotType matche son pattern scenario_type", () => {
    const spots = generateMany("m4.1", 300, 17);
    const leader = spots.find((s) => "spotType" in s && s.spotType === "chip-leader");
    expect(leader).toBeDefined();
    expect(matchPatterns(leader!).map((p) => p.patternId)).toContain("m4-1-chip-leader");
  });

  it("M1.1 — un spot eq requise < 25 matche equity-cheap", () => {
    const spots = generateMany<PotOddsSpot>("m1.1", 200, 23);
    const cheap = spots.find((s) => s.expected.requiredEquity < 25);
    expect(cheap).toBeDefined();
    expect(matchPatterns(cheap!).map((p) => p.patternId)).toContain("m1-1-equity-cheap");
  });
});
