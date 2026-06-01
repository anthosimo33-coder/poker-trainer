import { describe, it, expect } from "vitest";
import {
  selectSpot,
  shouldUsePriority,
  PRIORITY_PROBABILITY,
} from "@/lib/drill/spot-selector";
import { matchPatterns } from "@/content/patterns/definitions";

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG qui renvoie `first` au 1er appel (décision priorité) puis délègue. */
function rngWithFirst(first: number, rest: () => number): () => number {
  let used = false;
  return () => {
    if (!used) {
      used = true;
      return first;
    }
    return rest();
  };
}

describe("shouldUsePriority — ratio 60/40", () => {
  it("jamais prioritaire sans patterns ciblés", () => {
    expect(shouldUsePriority(0, 0.1)).toBe(false);
    expect(shouldUsePriority(0, 0.0)).toBe(false);
  });
  it("prioritaire sous le seuil 0.6", () => {
    expect(shouldUsePriority(3, 0.0)).toBe(true);
    expect(shouldUsePriority(3, 0.599)).toBe(true);
  });
  it("aléatoire au-dessus du seuil 0.6", () => {
    expect(shouldUsePriority(3, PRIORITY_PROBABILITY)).toBe(false);
    expect(shouldUsePriority(3, 0.9)).toBe(false);
  });
  it("converge vers ~60 % sur un grand échantillon", () => {
    const rng = makeRng(99);
    let priority = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      if (shouldUsePriority(2, rng())) priority++;
    }
    expect(priority / N).toBeGreaterThan(0.56);
    expect(priority / N).toBeLessThan(0.64);
  });
});

describe("selectSpot", () => {
  it("sans priorité → retourne un spot valide du sous-module (chemin aléatoire)", () => {
    const spot = selectSpot("m5.1", [], [], null, makeRng(1));
    expect("submoduleSlug" in spot && spot.submoduleSlug).toBe("m5.1");
  });

  it("priorité forcée → retourne un spot du pattern ciblé", () => {
    const spot = selectSpot(
      "m5.1",
      [{ patternId: "m5-1-stack-10bb" }],
      [],
      null,
      rngWithFirst(0.1, makeRng(3)) // 0.1 < 0.6 → priorité
    );
    const ids = matchPatterns(spot).map((p) => p.patternId);
    expect(ids).toContain("m5-1-stack-10bb");
  });

  it("décision aléatoire forcée → retourne quand même un spot valide", () => {
    const spot = selectSpot(
      "m5.1",
      [{ patternId: "m5-1-stack-10bb" }],
      [],
      null,
      rngWithFirst(0.9, makeRng(3)) // 0.9 > 0.6 → aléatoire
    );
    expect("submoduleSlug" in spot && spot.submoduleSlug).toBe("m5.1");
  });

  it("mode focus → tous les spots tirés matchent le pattern ciblé", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 30; i++) {
      const spot = selectSpot("m5.1", [], [], "m5-1-stack-15bb", rng);
      const ids = matchPatterns(spot).map((p) => p.patternId);
      expect(ids).toContain("m5-1-stack-15bb");
    }
  });

  it("priorité via duePatterns (et non leaks)", () => {
    const spot = selectSpot(
      "m3.1",
      [],
      [{ patternId: "m3-1-hand-premium" }],
      null,
      rngWithFirst(0.2, makeRng(5))
    );
    const ids = matchPatterns(spot).map((p) => p.patternId);
    expect(ids).toContain("m3-1-hand-premium");
  });

  it("sous-module inconnu → lève une erreur", () => {
    expect(() => selectSpot("m9.9", [], [], null, makeRng(1))).toThrow();
  });
});
