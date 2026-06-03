import { test, expect } from "@playwright/test";
import { seedStats } from "./_seed";

test.describe("Stats — page calibration & biais (S11)", () => {
  test("/stats : KPIs + au moins un graphe non vide après seeding", async ({ page }) => {
    test.slow(); // le seed (mode light) crée ~30 attempts via ConvexHttpClient
    const anonymousId = `e2e-stats-${Date.now()}`;
    await seedStats(anonymousId, { light: true });

    // Injecte l'anonId AVANT le bootstrap de la page (même user que le seed).
    await page.addInitScript((id) => {
      window.localStorage.setItem("poker-trainer.anonymousId", id);
    }, anonymousId);

    await page.goto("/stats");
    await expect(page.getByRole("heading", { name: /calibration/i })).toBeVisible({
      timeout: 15_000,
    });

    // KPIs présents.
    await expect(page.getByText("Accuracy globale")).toBeVisible();
    await expect(page.getByText("Spots drillés")).toBeVisible();

    // Au moins un graphe recharts rendu = données non vides (l'empty state n'a
    // pas de .recharts-surface).
    await expect(page.locator(".recharts-surface").first()).toBeVisible({
      timeout: 15_000,
    });

    // La section calibration équité affiche son interprétation (graphe peuplé).
    await expect(page.getByText(/diagonale/i).first()).toBeVisible();
  });

  test("quick-check sur user frais → complétion enregistrée, drill débloqué (fix bootstrap)", async ({
    page,
  }) => {
    // Contexte neuf = user anonyme jamais bootstrappé : on enchaîne le quick
    // check immédiatement. Avant le fix S11, recordCompletion était skippé tant
    // que `userId` n'était pas résolu → le drill restait verrouillé. Désormais
    // handleSubmit attend ensureUserId() : l'écriture n'est jamais perdue.
    await page.addInitScript(() => {
      window.localStorage.removeItem("poker-trainer.anonymousId");
    });

    await page.goto("/module/m1/theory/m1-1");
    await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
    await expect(page.getByText(/Question 1/)).toBeVisible();

    // Réponses 3/3 (B, B, B) enchaînées sans attente d'auth.
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    // La complétion s'enregistre (le bouton attend l'auth) puis débloque le drill.
    await expect(page.getByText(/Quick check validé/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m1-1/);
    // Preuve que le gate est passé (completion lue depuis Convex) : le drill rend.
    await expect(page.getByText("Décompose avant de décider.")).toBeVisible({
      timeout: 15_000,
    });
  });
});
