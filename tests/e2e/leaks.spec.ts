import { test, expect, type Page } from "@playwright/test";
import { seedLeaks } from "./_seed";

// S10 — leak detection + drill prioritization e2e.
// Le leak est créé via le VRAI code (recordAttempt → updateAfterAttempt) appelé
// depuis Node (ConvexHttpClient), puis vérifié côté navigateur (lectures). On
// évite ainsi la course de bootstrap d'user anonyme du parcours quick-check.

const FOCUS_PATTERN = "m1-1-equity-marginal";
const FOCUS_LABEL = "Call marginal (eq requise 25-30 %)";

async function useSeededUser(page: Page, anonymousId: string) {
  await page.addInitScript((id) => {
    localStorage.setItem("poker-trainer.anonymousId", id);
  }, anonymousId);
}

test.describe("S10 — leaks & focus drill", () => {
  test.describe.configure({ mode: "serial" });

  test("un leak créé (recordAttempt → updateAfterAttempt) s'affiche sur /leaks", async ({ page }) => {
    test.slow();
    const id = "s10-e2e-display";
    await seedLeaks(id);
    await useSeededUser(page, id);

    await page.goto("/leaks");
    await expect(page.getByRole("heading", { name: /Mes leaks actifs/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(FOCUS_LABEL)).toBeVisible({ timeout: 20_000 });
    // La carte expose la précision et la sévérité (0 % → sévère).
    await expect(page.getByText(/Précision/).first()).toBeVisible();
    await expect(page.getByText(/Sévère/).first()).toBeVisible();
  });

  test("page /leaks → 'Drill ce pattern' lance le focus mode", async ({ page }) => {
    test.slow();
    const id = "s10-e2e-focus";
    await seedLeaks(id);
    await useSeededUser(page, id);

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
