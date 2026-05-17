import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s4b");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

// Bonnes réponses par sous-module (cf. QUESTIONS dans la page théorie)
const ANSWERS: Record<string, string[]> = {
  "m1-2": ["B", "C", "B"],
  "m1-3": ["B", "C", "D"],
  "m1-4": ["B", "B", "B"],
};

async function passQuickCheckAndOpenDrill(page: Page, answers: string[]) {
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  for (let i = 0; i < answers.length; i++) {
    await page.getByRole("button", { name: new RegExp(`^${answers[i]}`) }).first().click();
    if (i < answers.length - 1) {
      await page.getByRole("button", { name: /Suivant/ }).click();
    }
  }
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();
  await page.getByText("Décompose avant de décider.").waitFor({ timeout: 15_000 });
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier avec M·I expandé (4 sous-modules, état "Théorie à lire")
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "atelier-4-submodules.png"), fullPage: true });

  for (const sub of ["m1-2", "m1-3", "m1-4"]) {
    // Théorie full page
    await page.goto(`${BASE}/module/m1/theory/${sub}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `theory-${sub}.png`), fullPage: true });

    // Quick check → drill, puis screenshot du drill en cours
    await passQuickCheckAndOpenDrill(page, ANSWERS[sub]);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `drill-${sub}.png`), fullPage: true });
  }

  await browser.close();
  console.log("S4b screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
