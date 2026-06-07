import { describe, it, expect } from "vitest";
import { MODULES } from "@/lib/modules";

/**
 * Invariants du catalogue (S12) — source unique partagée par l'Atelier et les
 * index /drill & /theory. Un typo ici casserait silencieusement les liens des
 * trois surfaces, d'où ces garde-fous.
 */
describe("MODULES — catalogue canonique", () => {
  it("5 modules × 4 sous-modules = 20 (trainer v1 complet)", () => {
    expect(MODULES).toHaveLength(5);
    const subs = MODULES.flatMap((m) => m.submodules);
    expect(subs).toHaveLength(20);
    for (const m of MODULES) expect(m.submodules).toHaveLength(4);
  });

  it("tout est disponible en v1 (aucun module/sous-module verrouillé)", () => {
    for (const m of MODULES) {
      expect(m.available).toBe(true);
      for (const s of m.submodules) expect(s.available).toBe(true);
    }
  });

  it("urlSlug = slug avec point → tiret, et slug enfant préfixé par le module", () => {
    for (const m of MODULES) {
      for (const s of m.submodules) {
        expect(s.urlSlug).toBe(s.slug.replace(".", "-"));
        expect(s.slug.startsWith(`${m.slug}.`)).toBe(true);
      }
    }
  });

  it("slugs, urlSlugs et badges uniques", () => {
    const slugs = MODULES.flatMap((m) => m.submodules.map((s) => s.slug));
    const urlSlugs = MODULES.flatMap((m) => m.submodules.map((s) => s.urlSlug));
    const badges = MODULES.map((m) => m.badge);
    const moduleSlugs = MODULES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(20);
    expect(new Set(urlSlugs).size).toBe(20);
    expect(new Set(badges).size).toBe(5);
    expect(new Set(moduleSlugs).size).toBe(5);
  });
});
