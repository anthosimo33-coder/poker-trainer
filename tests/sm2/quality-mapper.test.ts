import { describe, it, expect } from "vitest";
import { attemptToQuality } from "@/lib/sm2/quality-mapper";

describe("attemptToQuality — sous-modules binaires (M·V)", () => {
  it("excellent → 5", () => {
    expect(attemptToQuality("excellent", 0, true)).toBe(5);
  });
  it("faux → 1 quelle que soit l'erreur", () => {
    expect(attemptToQuality("faux", 1, true)).toBe(1);
    expect(attemptToQuality("faux", -1, true)).toBe(1);
  });
});

describe("attemptToQuality — sous-modules nuancés (M·II → M·IV)", () => {
  it("excellent → 5", () => expect(attemptToQuality("excellent", 0.5, false)).toBe(5));
  it("juste → 4", () => expect(attemptToQuality("juste", 2, false)).toBe(4));
  it("proche → 3", () => expect(attemptToQuality("proche", 4, false)).toBe(3));
  it("faux avec erreur modérée → 1", () => {
    expect(attemptToQuality("faux", 8, false)).toBe(1);
  });
  it("faux avec erreur extrême (> 15) → 0 (blackout)", () => {
    expect(attemptToQuality("faux", 20, false)).toBe(0);
    expect(attemptToQuality("faux", -18, false)).toBe(0);
  });
});
