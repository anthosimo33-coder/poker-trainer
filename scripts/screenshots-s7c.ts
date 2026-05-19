import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots34 from "../content/spots/m3-4.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s7c");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot34 = (typeof spots34)[number];

/** Lit le scenarioLabel rendu dans le BetTag (strong.font-mono). */
async function visibleLabel(page: Page): Promise<string> {
  return (await page.locator("strong.font-mono").first().innerText()).trim();
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Théorie M3.4
  await page.goto(`${BASE}/module/m3/theory/m3-4`);
  await page.getByRole("heading", { name: /Check-raise et lignes complexes/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "theory-m3-4.png"), fullPage: true });

  // 2. Quick check
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m3-4.png"), fullPage: false });
  // B, B, D
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^D/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 3. Drill — saisie EV live
  await page.getByText("Trois branches, postflop.").waitFor({ timeout: 15_000 });
  const lbl = await visibleLabel(page);
  const s = (spots34 as Spot34[]).find((x) => x.scenarioLabel.trim() === lbl);
  if (!s) throw new Error(`M3.4 spot introuvable : ${lbl}`);
  await page.getByPlaceholder("ex. 60").fill(String(Math.round(s.expected.pFold * 1000) / 10));
  await page.getByPlaceholder("ex. 30").fill(String(Math.round(s.expected.pCall * 1000) / 10));
  await page
    .getByPlaceholder("ex. 45")
    .fill(String(Math.round(s.expected.equityVsCallRange * 10) / 10));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "drill-m3-4-spot.png"), fullPage: true });

  // 4. Correction — décomposition 3 branches
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m3-4-correction.png"), fullPage: true });

  // 5. Atelier — Module M·III complet
  await page.goto(`${BASE}/`);
  await page.getByText("EV de décisions composites").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-m3-complete.png"), fullPage: true });

  await browser.close();
  console.log("S7c screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
