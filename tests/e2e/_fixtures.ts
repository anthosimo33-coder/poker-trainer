/**
 * Fixtures e2e (S12) — identité de test fixe & reproductible, SANS churn.
 *
 * Problème (diag S11) : chaque contexte navigateur neuf créait un user anonyme
 * (UUID aléatoire) → 496 users accumulés en dev. Les tests de flow s'appuyaient
 * en plus sur cette ardoise vierge « gratuite ».
 *
 * Solution : un anonId déterministe PAR TEST (stable d'un run à l'autre, unique
 * entre tests → isolation en parallèle), injecté dans localStorage AVANT le
 * bootstrap de la page, et l'état de ce user remis à zéro en amont
 * (`clearUserData`). Bénéfices : (a) plus de churn (ensemble borné d'ids),
 * (b) ardoise propre reproductible à chaque run, (c) le chemin d'écriture reste
 * le VRAI (recordAttempt/updateAfterAttempt) — seul le déclencheur change.
 *
 * NB : pas une identité unique globale — les 25 tests de flow écrivent et tournent
 * en parallèle ; un id partagé se clobbererait. L'ensemble reste néanmoins fixe et
 * borné (un id par test).
 */
import { test as base, expect, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { resolveTestConvexUrl } from "./_guard";

/** Préfixe commun à tous les users de test → ciblable par la purge. */
export const TEST_ANON_PREFIX = "e2e-test-";

/** anonId déterministe dérivé d'un libellé (titre de test ou scénario). */
export function testAnonId(label: string): string {
  // NFD puis suppression du non-alphanumérique : « é » → « e » + diacritique
  // combinant, ce dernier étant retiré par [^a-z0-9].
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return TEST_ANON_PREFIX + (slug || "default");
}

/** Ids de scénarios partagés (tests qui seedent puis lisent). */
export const TEST_ANON = {
  leaksDisplay: testAnonId("leaks-display"),
  leaksFocus: testAnonId("leaks-focus"),
  stats: testAnonId("stats"),
  lesson: testAnonId("lesson"),
} as const;

/** Injecte l'anonId dans localStorage avant tout script de page. */
export async function injectAnonId(page: Page, anonymousId: string): Promise<void> {
  await page.addInitScript((id) => {
    window.localStorage.setItem("poker-trainer.anonymousId", id);
  }, anonymousId);
}

/** Remet à zéro l'état d'un user de test (garde le user, vide ses données). */
export async function clearTestUser(anonymousId: string): Promise<void> {
  const client = new ConvexHttpClient(resolveTestConvexUrl());
  await client.mutation(api.testing.clearUserData, { anonymousId });
}

/**
 * `test` étendu : pour chaque test, dérive un anonId stable depuis le titre,
 * remet le user à zéro (Convex) puis l'injecte (localStorage). Auto → s'applique
 * à tous les tests du fichier sans boilerplate. `anonId` est exposé aux tests
 * qui veulent seeder explicitement sous la même identité.
 */
export const test = base.extend<{ anonId: string }>({
  anonId: async ({ page }, use, testInfo) => {
    const id = testAnonId(testInfo.title);
    await clearTestUser(id); // ardoise propre, même user réutilisé (pas de churn)
    await injectAnonId(page, id);
    await use(id);
  },
});

// Force l'exécution de la fixture `anonId` pour chaque test (sinon lazy).
test.beforeEach(async ({ anonId }) => {
  void anonId;
});

export { expect, type Page };
