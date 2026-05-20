import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots41 from "../content/spots/m4-1.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s8a");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot41 = (typeof spots41)[number];

/** Lit le scenarioLabel rendu dans le BetTag (strong.font-mono). */
async function visibleLabel(page: Page): Promise<string> {
  return (await page.locator("strong.font-mono").first().innerText()).trim();
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier — M·IV déverrouillé
  await page.goto(`${BASE}/`);
  await page.getByText("ICM — bulle & table finale").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-m4-unlocked.png"), fullPage: true });

  // 2. Théorie M4.1
  await page.goto(`${BASE}/module/m4/theory/m4-1`);
  await page.getByRole("heading", { name: /Calcul équité ICM/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "theory-m4-1.png"), fullPage: true });

  // 3. Quick check
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m4-1.png"), fullPage: false });
  // B, B, B
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 4. Drill — table ICM avec saisie
  await page.getByText("Quelle est ton équité").first().waitFor({ timeout: 15_000 });
  const lbl = await visibleLabel(page);
  const s = (spots41 as Spot41[]).find((x) => x.scenarioLabel.trim() === lbl);
  if (!s) throw new Error(`M4.1 spot introuvable : ${lbl}`);
  // Pré-remplissage avec une estimation proche (chip equity comme baseline naïve).
  await page.getByPlaceholder("ex. 38.5").fill(String(s.expected.heroChipEquityPercent));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "drill-m4-1-spot.png"), fullPage: true });

  // 5. Correction — décomposition chip vs ICM equity
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m4-1-correction.png"), fullPage: true });

  await browser.close();
  console.log("S8a screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
