import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots42 from "../content/spots/m4-2.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s8b");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot42 = (typeof spots42)[number];

/** Lit le scenarioLabel rendu dans le BetTag (strong.font-mono). */
async function visibleLabel(page: Page): Promise<string> {
  return (await page.locator("strong.font-mono").first().innerText()).trim();
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Théorie M4.2
  await page.goto(`${BASE}/module/m4/theory/m4-2`);
  await page.getByRole("heading", { name: /Bubble factor et risk premium/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "theory-m4-2.png"), fullPage: true });

  // 2. Quick check
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m4-2.png"), fullPage: false });
  // B, C, B
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^C/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 3. Drill — table snapshot + 2 champs + BF live
  await page.getByText(/Deux équités, un bubble factor/i).waitFor({ timeout: 15_000 });
  const lbl = await visibleLabel(page);
  const s = (spots42 as Spot42[]).find((x) => x.scenarioLabel.trim() === lbl);
  if (!s) throw new Error(`M4.2 spot introuvable : ${lbl}`);
  // Pré-remplissage avec les vraies valeurs pour montrer BF live
  await page.getByPlaceholder("ex. 50").fill(String(s.expected.requiredEquityChip));
  await page.getByPlaceholder("ex. 62").fill(String(s.expected.requiredEquityICM));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "drill-m4-2-spot.png"), fullPage: true });

  // 4. Correction — décomposition chip vs ICM equity
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m4-2-correction.png"), fullPage: true });

  // 5. Atelier — Module M·IV à 2/4
  await page.goto(`${BASE}/`);
  await page.getByText("ICM — bulle & table finale").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-m4-progression.png"), fullPage: true });

  await browser.close();
  console.log("S8b screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
