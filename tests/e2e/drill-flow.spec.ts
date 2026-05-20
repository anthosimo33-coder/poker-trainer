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

    // S4b : l'Atelier expose 4 sous-modules ; le lien théorie est la row du
    // sous-module "Pot odds basiques" (le titre du module n'est plus cliquable).
    await page.getByText("Pot odds basiques").click();
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
    // Nouveau user — S4b fix 1.4 : le badge est désormais "Théorie à lire" (purple)
    await page.goto("/drill/m1-1");
    await expect(page.getByText(/Théorie à lire/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Lire la théorie/ })).toBeVisible();
  });

  test("flow complet M1.2 : théorie → quick check → drill", async ({ page }) => {
    await page.goto("/module/m1/theory/m1-2");
    await expect(page.getByRole("heading", { name: /Conversion/ })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    await expect(page.getByText(/Question 1/)).toBeVisible();

    // Réponses correctes M1.2 : B, C, B
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^C/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m1-2/);
  });

  test("M1.3 et M1.4 sont accessibles via la théorie", async ({ page }) => {
    // Assertions ciblées sur le h1 (regex large du spec = strict-mode multi-match)
    await page.goto("/module/m1/theory/m1-3");
    await expect(page.getByRole("heading", { name: /Cotes implicites/ })).toBeVisible({ timeout: 20_000 });

    await page.goto("/module/m1/theory/m1-4");
    await expect(page.getByRole("heading", { name: /Reverse implied/ })).toBeVisible({ timeout: 20_000 });
  });

  test("M2.1 — accessible après quick check, drill jouable", async ({ page }) => {
    await page.goto("/module/m2/theory/m2-1");
    await expect(page.getByText(/Outs et règle/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Réponses 3/3 (C, B, B)
    await page.getByRole("button", { name: /^C/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m2-1/);
  });

  test("Atelier : M·II déverrouillé, modules M·IV / M·V encore lockés", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Equity & outs")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Outs et règle des 4&2")).toBeVisible();
    // S7c : M·III complet → seuls M·IV/M·V restent lockés (≥ 2 « Verrouillé »).
    const lockedCount = await page.getByText("Verrouillé").count();
    expect(lockedCount).toBeGreaterThanOrEqual(2);
  });

  test("M2.2 — théorie → quick check → drill avec scoring nuancé", async ({ page }) => {
    await page.goto("/module/m2/theory/m2-2");
    await expect(page.getByText(/Equity heads-up/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready (le spec l'omet) : attendre le modal avant de répondre,
    // comme completeM11TheoryAndOpenDrill et le script screenshots. Sans ça,
    // la séquence rapide peut court-circuiter recordCompletion (userId pas prêt).
    await expect(page.getByText(/Question 1/)).toBeVisible();
    // 3/3
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m2-2/);
    // Cartes vilain visibles. Timeout 15s : la chaîne gate→completion→session
    // →spot du drill dépasse les 5s par défaut sur une route dev à froid
    // (même garde que completeM11TheoryAndOpenDrill / tests M1.x).
    await expect(page.getByText(/Vilain/i)).toBeVisible({ timeout: 15_000 });
  });

  test("M2.3 — théorie → quick check → drill 3-way", async ({ page }) => {
    await page.goto("/module/m2/theory/m2-3");
    await expect(page.getByText(/Equity multiway/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready (le spec l'omet) : attendre le modal avant de répondre,
    // sinon recordCompletion peut être court-circuité (userId pas prêt) — cf. S6b.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^C/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m2-3/);
    // 3 mains visibles (timeout 15s : chaîne gate→completion→session→spot).
    await expect(page.getByText(/Adversaire 1/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Adversaire 2/i)).toBeVisible();
  });

  test("M2.4 — théorie → quick check → drill avec range visualisé", async ({ page }) => {
    await page.goto("/module/m2/theory/m2-4");
    await expect(page.getByText(/Equity vs range/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready (cf. S6b/S6c) : attendre le modal avant de répondre.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^C/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m2-4/);
    // Grille 13×13 visible (timeout 15s : chaîne gate→completion→session→spot).
    await expect(
      page.locator('[title="AA"], [title="KK"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("M3.1 — flow complet push/fold avec saisie décomposée", async ({ page }) => {
    await page.goto("/module/m3/theory/m3-1");
    await expect(
      page.getByText(/Push.fold sub-15bb|Push.fold preflop/i)
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready (cf. S6b/S6c/S6d) : attendre le modal avant de répondre.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m3-1/);
    // Saisie décomposée : P(fold) + Equity vs call range (timeout 15s : gate).
    await expect(page.getByText(/P\(fold\)/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Equity vs call range/i)).toBeVisible();
  });

  test("M3.2 — flow complet fold equity avec saisie pFoldBreakeven", async ({ page }) => {
    await page.goto("/module/m3/theory/m3-2");
    await expect(
      page.getByText(/Fold equity et décomposition|fold equity/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready (cf. S6b/S6c/S6d/S7a) : attendre le modal avant de répondre.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    // m3-2 : réponses correctes B, A, A.
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^A/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^A/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m3-2/);
    // Saisie 1 champ : P(fold) break-even + verdict push +EV/-EV (timeout : gate).
    await expect(page.getByText(/Quelle FE pour break-even/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/P\(fold\) break-even/i).first()).toBeVisible();
  });

  test("M3.3 — flow complet EV multi-branches avec saisie 3 champs", async ({ page }) => {
    await page.goto("/module/m3/theory/m3-3");
    await expect(
      page.getByText(/EV composites multi-branches|multi-branches/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready : attendre le modal avant de répondre.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    // m3-3 : réponses correctes B, B, C.
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^C/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m3-3/);
    // Saisie décomposée 3 champs : P(fold)+P(call)+P(raise) (timeout : gate).
    await expect(page.getByText(/Trois branches, une EV/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Somme/i).first()).toBeVisible();
  });

  test("M3.4 — flow complet check-raise flop avec saisie décomposée 3 champs", async ({ page }) => {
    await page.goto("/module/m3/theory/m3-4");
    await expect(
      page.getByText(/Check-raise et lignes complexes|check-raise/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready (cf. S6b/S6c/S6d/S7a/S7b) : attendre le modal avant de répondre.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    // m3-4 : réponses correctes B, B, D.
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^D/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m3-4/);
    // Saisie 3 champs : P(fold) + P(call) + Equity vs call range (timeout : gate).
    await expect(page.getByText(/Trois branches, postflop/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/P\(fold\)/i).first()).toBeVisible();
    await expect(page.getByText(/Equity vs call range/i).first()).toBeVisible();
  });

  test("M4.1 — flow complet ICM avec saisie 1 champ équité $", async ({ page }) => {
    await page.goto("/module/m4/theory/m4-1");
    await expect(
      page.getByText(/Calcul équité ICM|ICM/i).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Passer le quick check/ }).click();
    // Garde page-ready : attendre le modal avant de répondre.
    await expect(page.getByText(/Question 1/)).toBeVisible();
    // m4-1 : réponses correctes B, B, B.
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Suivant/ }).click();
    await page.getByRole("button", { name: /^B/ }).first().click();
    await page.getByRole("button", { name: /Valider mes réponses/ }).click();

    await expect(page.getByText(/Quick check validé/)).toBeVisible();
    await page.getByRole("link", { name: /Démarrer le drill/ }).click();
    await expect(page).toHaveURL(/\/drill\/m4-1/);
    // Saisie 1 champ : équité ICM hero (en % du prizepool) (timeout : gate).
    await expect(page.getByText(/Quelle est ton équité/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Équité ICM hero/i).first()).toBeVisible();
    await expect(page.getByText(/Chip equity hero/i)).toBeVisible();
  });
});
