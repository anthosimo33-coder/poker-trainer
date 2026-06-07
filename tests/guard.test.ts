import { describe, it, expect, afterEach } from "vitest";
import { resolveTestConvexUrl } from "./e2e/_guard";

/**
 * Garde anti-prod (S12) : les opérations de TEST (seed/reset/purge) doivent
 * échouer bruyamment si la cible Convex est (ou pourrait être) la prod.
 * `resolveTestConvexUrl` lit process.env en priorité sur .env.local — on pilote
 * donc le test via process.env.
 */
const SAVED = {
  dep: process.env.CONVEX_DEPLOYMENT,
  url: process.env.NEXT_PUBLIC_CONVEX_URL,
};

afterEach(() => {
  // Restaure l'environnement réel (.env.local du dev) après chaque cas.
  if (SAVED.dep === undefined) delete process.env.CONVEX_DEPLOYMENT;
  else process.env.CONVEX_DEPLOYMENT = SAVED.dep;
  if (SAVED.url === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
  else process.env.NEXT_PUBLIC_CONVEX_URL = SAVED.url;
});

describe("resolveTestConvexUrl — garde anti-prod", () => {
  it("REFUSE un déploiement de production (CONVEX_DEPLOYMENT=prod:…)", () => {
    process.env.CONVEX_DEPLOYMENT = "prod:shiny-tiger-123";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://shiny-tiger-123.convex.cloud";
    expect(() => resolveTestConvexUrl()).toThrow(/PRODUCTION/i);
  });

  it("REFUSE une URL incohérente avec le déploiement déclaré (URL prod, dep dev)", () => {
    process.env.CONVEX_DEPLOYMENT = "dev:ceaseless-lemming-498";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://shiny-tiger-123.convex.cloud";
    expect(() => resolveTestConvexUrl()).toThrow(/incohérente|REFUS/i);
  });

  it("ACCEPTE un déploiement dev cohérent et renvoie son URL", () => {
    process.env.CONVEX_DEPLOYMENT = "dev:ceaseless-lemming-498";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://ceaseless-lemming-498.convex.cloud";
    expect(resolveTestConvexUrl()).toBe("https://ceaseless-lemming-498.convex.cloud");
  });

  it("ACCEPTE un déploiement local (préfixe local:)", () => {
    process.env.CONVEX_DEPLOYMENT = "local:my-machine-abc";
    process.env.NEXT_PUBLIC_CONVEX_URL = "http://127.0.0.1:3210/my-machine-abc";
    expect(resolveTestConvexUrl()).toContain("my-machine-abc");
  });
});
