import { test, expect, type Page } from "@playwright/test";

// S4a : le drill est désormais verrouillé tant que la théorie M1.1 + quick check
// ne sont pas validés. Les tests qui drillent doivent donc d'abord compléter la
// théorie (le spec a introduit ce gating, ce qui invalide l'accès direct).
async function completeM11TheoryAndOpenDrill(page: Page) {
  await page.goto("/module/m1/theory/m1-1");
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await expect(page.getByText(/Question 1/)).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /^B/ }).first().click();
    if (i < 2) await page.getByRole("button", { name: /Suivant/ }).click();
  }
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await expect(page.getByText(/Quick check validé/)).toBeVisible();
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();
  await expect(page.getByText("Décompose avant de décider.")).toBeVisible({ timeout: 15_000 });
}

test.describe("Drill M1.1 — flow complet", () => {
  test("affiche la home Atelier", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Serge/)).toBeVisible();
    await expect(page.getByText("Modules de la formation")).toBeVisible();
  });

  test("navigation vers le drill via la topbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Drill" }).first().click();
    await expect(page).toHaveURL(/\/drill/);
  });

  test("complète un spot M1.1 et reçoit une correction", async ({ page }) => {
    await completeM11TheoryAndOpenDrill(page);

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
    test.slow(); // 60s timeout par défaut

    await completeM11TheoryAndOpenDrill(page);

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

  test("flow théorie : lecture → quick check 3/3 → drill débloqué", async ({ page }) => {
    // Nouveau user anonyme (contexte navigateur frais)
    await page.goto("/");
    await expect(page.getByText(/Bienvenue Serge/)).toBeVisible({ timeout: 15_000 });

    // Click sur M·I → route vers théorie (verrouillé)
    await page.getByText("Pot odds & cotes implicites").click();
    await expect(page).toHaveURL(/\/module\/m1\/theory\/m1-1/);
    await expect(page.getByText(/Pot odds basiques/)).toBeVisible({ timeout: 20_000 });

    // Scroll en bas, click "Passer le quick check"
    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    await expect(page.getByText(/Question 1/)).toBeVisible();

    // Réponds aux 3 questions correctement (B, B, B)
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    // Vérifie le résultat (3/3 — assertion spécifique pour éviter le strict-mode
    // multi-match d'un simple getByText("3"))
    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await expect(page.getByText("3 / 3")).toBeVisible();

    // Click "Démarrer le drill"
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m1-1/);
    await expect(page.getByText(/Décompose avant de décider/)).toBeVisible({ timeout: 15_000 });
  });

  test("drill verrouillé si théorie pas faite", async ({ page }) => {
    // Nouveau user
    await page.goto("/drill/m1-1");
    await expect(page.getByText(/Drill verrouillé/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Lire la théorie/ })).toBeVisible();
  });
});
