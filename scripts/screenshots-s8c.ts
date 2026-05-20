import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots43 from "../content/spots/m4-3.json";
import spots44 from "../content/spots/m4-4.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s8c");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot43 = (typeof spots43)[number];
type Spot44 = (typeof spots44)[number];

async function visibleLabel(page: Page): Promise<string> {
  return (await page.locator("strong.font-mono").first().innerText()).trim();
}

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // === M4.3 ===
  await page.goto(`${BASE}/module/m4/theory/m4-3`);
  await page.getByRole("heading", { name: /Adjustments par position/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await shot(page, "theory-m4-3.png");

  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, "quickcheck-m4-3.png", false);
  // B, B, A
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^A/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  await page.getByText(/BF brut, BF ajusté/i).waitFor({ timeout: 15_000 });
  const lbl43 = await visibleLabel(page);
  const s43 = (spots43 as Spot43[]).find((x) => x.scenarioLabel.trim() === lbl43);
  if (!s43) throw new Error(`M4.3 spot introuvable : ${lbl43}`);
  await page.getByPlaceholder("ex. 1.50").fill(String(s43.expected.baseBubbleFactor.toFixed(2)));
  await page.getByPlaceholder("ex. 2.18").fill(String(s43.expected.adjustedBubbleFactor.toFixed(2)));
  await page.waitForTimeout(700);
  await shot(page, "drill-m4-3-spot.png");

  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await shot(page, "drill-m4-3-correction.png");

  // === M4.4 ===
  await page.goto(`${BASE}/module/m4/theory/m4-4`);
  await page.getByRole("heading", { name: /Table finale ICM/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await shot(page, "theory-m4-4.png");

  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, "quickcheck-m4-4.png", false);
  // B, B, B
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  await page.getByText(/Quelle est ton équité/i).first().waitFor({ timeout: 15_000 });
  const lbl44 = await visibleLabel(page);
  const s44 = (spots44 as Spot44[]).find((x) => x.scenarioLabel.trim() === lbl44);
  if (!s44) throw new Error(`M4.4 spot introuvable : ${lbl44}`);
  await page.getByPlaceholder("ex. 22.5").fill(String(s44.expected.heroEquityBefore.toFixed(1)));
  await page.waitForTimeout(700);
  await shot(page, "drill-m4-4-spot.png");

  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await shot(page, "drill-m4-4-correction.png");

  // === Atelier views ===
  await page.goto(`${BASE}/`);
  await page.getByText("ICM — bulle & table finale").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await shot(page, "atelier-m4-complete.png");

  // overview (same page but emphasizes M·I to M·IV all complete)
  await page.waitForTimeout(400);
  await shot(page, "atelier-overview-m1-m4.png");

  await browser.close();
  console.log("S8c screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
