// S12 : `test` étendu = anonId fixe par test + reset (pas de churn). Le leak est
// seedé sous ce même anonId, déjà injecté/resetté par la fixture.
import { test, expect } from "./_fixtures";
import { seedLeaks } from "./_seed";

// S10 — leak detection + drill prioritization e2e.
// Le leak est créé via le VRAI code (recordAttempt → updateAfterAttempt) appelé
// depuis Node (ConvexHttpClient), puis vérifié côté navigateur (lectures). On
// évite ainsi la course de bootstrap d'user anonyme du parcours quick-check.

const FOCUS_PATTERN = "m1-1-equity-marginal";
const FOCUS_LABEL = "Call marginal (eq requise 25-30 %)";

test.describe("S10 — leaks & focus drill", () => {
  test("un leak créé (recordAttempt → updateAfterAttempt) s'affiche sur /leaks", async ({ page, anonId }) => {
    test.slow();
    await seedLeaks(anonId);

    await page.goto("/leaks");
    await expect(page.getByRole("heading", { name: /Mes leaks actifs/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FOCUS_LABEL)).toBeVisible({ timeout: 20_000 });
    // La carte expose la précision et la sévérité (0 % → sévère).
    await expect(page.getByText(/Précision/).first()).toBeVisible();
    await expect(page.getByText(/Sévère/).first()).toBeVisible();
  });

  test("page /leaks → 'Drill ce pattern' lance le focus mode", async ({ page, anonId }) => {
    test.slow();
    await seedLeaks(anonId);

    await page.goto("/leaks");
    await expect(page.getByText(FOCUS_LABEL)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: /Drill ce pattern/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`focusPattern=${FOCUS_PATTERN}`));
    // Le bandeau focus confirme que le drill cible bien ce pattern (route /drill
    // lourde → marge de cold-compile).
    await expect(page.getByText("Focus pattern")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(FOCUS_LABEL)).toBeVisible();
  });
});
