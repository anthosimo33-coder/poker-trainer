import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s6a");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier — M·II déverrouillé, 4 sous-modules dont 3 lockés
  await page.goto(`${BASE}/`);
  await page.getByText("Equity & outs").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-m2-unlocked.png"), fullPage: true });

  // 2. Théorie M2.1 — full page
  await page.goto(`${BASE}/module/m2/theory/m2-1`);
  await page.getByRole("heading", { name: /Outs et règle/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "theory-m2-1-full.png"), fullPage: true });

  // 3. Quick check M2.1 — question 1 visible
  await page.getByRole("button", { name: /Passer le quick check/ }).click();
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m2-1.png"), fullPage: false });

  // Valider 3/3 (C, B, B) → débloque le drill
  await page.getByRole("button", { name: /^C/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 4. Drill M2.1 — champs Outs + Equity
  await page.getByText("Compte, puis applique.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "drill-m2-1-flop.png"), fullPage: true });

  // 5. Correction d'un spot M2.1 (règle outs × multiplicateur visible)
  await page.getByPlaceholder("ex. 9").fill("9");
  await page.getByPlaceholder("ex. 36 %").fill("36");
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Règle des 4 et 2/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "drill-m2-1-correction.png"), fullPage: true });

  await browser.close();
  console.log("S6a screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
