import { test, expect } from "@playwright/test";

test.describe("Drill M1.1 — flow complet", () => {
  test("affiche la home Atelier", async ({ page }) => {
    await page.goto("/");
    // S3 : l'Atelier est piloté par les données réelles — le titre est
    // "Bienvenue Serge." (0 attempt) ou "Re-bonjour Serge." (avec data).
    await expect(page.getByText(/Serge/)).toBeVisible();
    await expect(page.getByText("Modules de la formation")).toBeVisible();
  });

  test("navigation vers le drill via la topbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Drill" }).first().click();
    await expect(page).toHaveURL(/\/drill/);
  });

  test("complète un spot M1.1 et reçoit une correction", async ({ page }) => {
    await page.goto("/drill/m1-1");
    await expect(page.getByText("Décompose avant de décider.")).toBeVisible({ timeout: 15_000 });

    // Remplit des valeurs arbitraires (correctes ou pas, peu importe pour le flow)
    await page.getByPlaceholder("ex. 2.25").fill("2");
    await page.getByPlaceholder("ex. 30.8 %").fill("33");
    await page.getByRole("button", { name: "call" }).click();

    await page.getByRole("button", { name: /Valider la réponse/ }).click();

    // La correction apparaît
    await expect(page.getByText(/Identifier les montants/)).toBeVisible();
    await expect(page.getByText(/Calculer la cote/)).toBeVisible();
    await expect(page.getByText(/En déduire l'equity/)).toBeVisible();

    // Spot suivant
    await page.getByRole("button", { name: /Spot suivant/ }).click();
    await expect(page.getByText("Décompose avant de décider.")).toBeVisible();
  });

  test("complète une session de 20 spots et arrive en review", async ({ page }) => {
    // Skip si Convex pas dispo ou si on veut juste valider le UI
    test.slow(); // 60s timeout par défaut

    await page.goto("/drill/m1-1");
    await page.waitForSelector('text="Décompose avant de décider."', { timeout: 15_000 });

    // Drillet 20 spots en rafale avec des réponses arbitraires
    for (let i = 1; i <= 20; i++) {
      await page.getByPlaceholder("ex. 2.25").fill("2");
      await page.getByPlaceholder("ex. 30.8 %").fill("33");
      await page.getByRole("button", { name: "call" }).click();
      await page.getByRole("button", { name: /Valider la réponse/ }).click();

      // Spot suivant ou review
      if (i < 20) {
        await page.getByRole("button", { name: /Spot suivant/ }).click();
        await page.waitForSelector('text="Décompose avant de décider."');
      } else {
        await page.getByRole("button", { name: /Spot suivant/ }).click();
        await page.waitForURL(/\/review/);
        await expect(page.getByText(/sur 20 réussis/)).toBeVisible();
      }
    }
  });
});
