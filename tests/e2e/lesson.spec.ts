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
});
