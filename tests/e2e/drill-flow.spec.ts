import { test, expect } from "@playwright/test";

test.describe("Drill M1.1 — flow complet", () => {
  test("affiche la home Atelier", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bonsoir Serge")).toBeVisible();
    await expect(page.getByText("Modules de la formation")).toBeVisible();
  });

  test("navigation vers le drill via la topbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Drill" }).first().click();
    await expect(page).toHaveURL(/\/drill/);
  });

  test("complète un spot M1.1 et reçoit une correction", async ({ page }) => {
    await page.goto("/drill/m1-1");
    await expect(page.getByText("Décompose avant de décider.")).toBeVisible();

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
});
