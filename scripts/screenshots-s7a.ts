import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots from "../content/spots/m3-1.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s7a");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot = (typeof spots)[number];

/** Identifie le spot servi via le scenarioLabel (unique par template). */
async function matchSpot(page: Page): Promise<Spot> {
  const label = (
    await page.locator("strong").filter({ hasText: / push / }).first().innerText()
  ).trim();
  const found = (spots as Spot[]).find((s) => s.scenarioLabel.trim() === label);
  if (!found) throw new Error(`Spot introuvable pour : ${label}`);
  return found;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier — M·III déverrouillé
  await page.goto(`${BASE}/`);
  await page.getByText("EV de décisions composites").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-m3-unlocked.png"), fullPage: true });

  // 2. Théorie M3.1
  await page.goto(`${BASE}/module/m3/theory/m3-1`);
  await page.getByRole("heading", { name: /Push.fold sub-15bb/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "theory-m3-1.png"), fullPage: true });

  // 3. Quick check Q1
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m3-1.png"), fullPage: false });

  // 3/3 (B, B, B) → drill
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 4. Drill spot — call range + 2 champs + EV live
  await page.getByText("Push ou fold ?").waitFor({ timeout: 15_000 });
  const s = await matchSpot(page);
  // Saisit des valeurs proches du vrai → EV live visible (pas encore validé).
  await page.getByPlaceholder("ex. 78").fill(String(Math.round(s.expected.pFold * 100)));
  await page.getByPlaceholder("ex. 38").fill(String(Math.round(s.expected.equityVsCallRange)));
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "drill-m3-1-spot.png"), fullPage: true });

  // 5. Correction — décomposition pFold/equity + EV vraie (réponse exacte → Excellent)
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m3-1-correction.png"), fullPage: true });

  await browser.close();
  console.log("S7a screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
