import { test, expect } from "@playwright/test";

test.describe("Leçon", () => {
  test("affiche les 3 livres", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page.getByText("Mécaniques")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Stratégie")).toBeVisible();
    await expect(page.getByText("Lexique")).toBeVisible();
  });

  test("mode livre Mécaniques : sommaire + contenu", async ({ page }) => {
    await page.goto("/lesson/mecaniques");
    await expect(page.getByText("Sommaire")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/déroulement|positions|actions/i).first()).toBeVisible();
  });

  test("mode fiches : grille + détail", async ({ page }) => {
    await page.goto("/lesson/mecaniques/cards");
    await expect(page.getByText("fiches.")).toBeVisible({ timeout: 15_000 });
    await page.locator("a").filter({ hasText: /Préflop|Flop|UTG/i }).first().click();
    await expect(page).toHaveURL(/\/cards\//);
  });

  test("search ⌘K ouvre et trouve", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page.getByText("Mécaniques")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Meta+k");
    await page.locator('input[placeholder*="Rechercher"]').fill("position");
    await expect(page.getByText(/position/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("Livre II — Stratégie accessible et peuplé", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page.getByText("Stratégie")).toBeVisible({ timeout: 15_000 });

    await page.locator("a").filter({ hasText: /Stratégie/ }).first().click();
    await expect(page).toHaveURL(/\/lesson\/strategie/);

    await expect(page.getByText(/Hand selection|position|agressivité/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Mode fiches Stratégie : 24 fiches", async ({ page }) => {
    await page.goto("/lesson/strategie/cards");
    await expect(page.getByText(/fiches\./)).toBeVisible({ timeout: 15_000 });
    const cards = page.locator('a[href*="/lesson/strategie/cards/"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(20);
  });

  test("Détail fiche Stratégie : pas de h2 redondant", async ({ page }) => {
    await page.goto("/lesson/strategie/cards/range");
    await expect(page.getByRole("heading", { name: /^Range$/, level: 1 })).toBeVisible({ timeout: 10_000 });
    const h2 = page.getByRole("heading", { level: 2 }).first();
    if (await h2.isVisible()) {
      const text = (await h2.textContent()) ?? "";
      expect(text.toLowerCase()).not.toBe("range");
    }
  });

  test("Search ⌘K : filtre Stratégie fonctionne", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page.getByText("Mécaniques")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Meta+k");
    await page.locator('input[placeholder*="Rechercher"]').fill("range");
    await page.getByRole("button", { name: /Stratégie/i }).click();
    await expect(page.getByText(/Range/).first()).toBeVisible({ timeout: 5_000 });
  });

  test("Livre III — Lexique accessible et peuplé (partie 1)", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page.getByText("Lexique")).toBeVisible({ timeout: 15_000 });

    await page.locator("a").filter({ hasText: /Lexique/ }).first().click();
    await expect(page).toHaveURL(/\/lesson\/lexique/);
    await expect(page.getByText(/langage|notation/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Mode fiches Lexique : 40 fiches", async ({ page }) => {
    await page.goto("/lesson/lexique/cards");
    await expect(page.getByText(/fiches\./)).toBeVisible({ timeout: 15_000 });
    const cards = page.locator('a[href*="/lesson/lexique/cards/"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(36);
  });

  test("Détail fiche 3-bet : convention sans h2 redondant", async ({ page }) => {
    await page.goto("/lesson/lexique/cards/3bet");
    await expect(page.getByRole("heading", { name: /^3-bet$/i, level: 1 })).toBeVisible({ timeout: 10_000 });
    const h2 = page.getByRole("heading", { level: 2 }).first();
    if (await h2.isVisible()) {
      const text = (await h2.textContent()) ?? "";
      expect(text.toLowerCase()).not.toMatch(/^3-bet$/);
    }
  });

  test("Search ⌘K Lexique : filtre fonctionne", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page.getByText("Lexique")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Meta+k");
    await page.locator('input[placeholder*="Rechercher"]').fill("3bet");
    await expect(page.getByText(/3-bet/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
