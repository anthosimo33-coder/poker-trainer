import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s9a");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier — M·V déverrouillé
  await page.goto(`${BASE}/`);
  await page.getByText("Ranges Nash push/fold").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await shot(page, "atelier-m5-unlocked.png");

  // 2. Théorie M5.1
  await page.goto(`${BASE}/module/m5/theory/m5-1`);
  await page.getByRole("heading", { name: /SB push range Nash/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await shot(page, "theory-m5-1.png");

  // 3. Quick check
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, "quickcheck-m5-1.png", false);
  // B, B, B
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 4. Drill — 2 boutons binaires + spot Nash
  await page.getByText(/Push ou fold/i).first().waitFor({ timeout: 15_000 });
  // Pré-clic sur PUSH pour montrer l'état highlighted
  await page.getByRole("button", { name: /^PUSH/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "drill-m5-1-spot.png");

  // 5. Correction (après validation) - montre le verdict + grille Nash range
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await shot(page, "drill-m5-1-review.png");

  await browser.close();
  console.log("S9a screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
