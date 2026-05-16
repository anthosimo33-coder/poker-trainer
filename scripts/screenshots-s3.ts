// scripts/screenshots-s3.ts
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s3");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  // Contexte neuf = localStorage vide = nouvel user anonyme (0 spot drillé).
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier vide (avant tout drill)
  await page.goto(`${BASE}/`);
  await page.getByText("Bienvenue Serge.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "atelier-empty.png"), fullPage: true });

  // 2. Close-up des cartes corrigées
  await page.goto(`${BASE}/drill/m1-1`);
  await page.getByText("Décompose avant de décider.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  const heroCards = page
    .getByText("Ta main", { exact: true })
    .locator("xpath=following-sibling::div[1]");
  await heroCards.screenshot({ path: path.join(OUT, "drill-card-fixed.png") });

  // 3. Drillet 20 spots → page review post-session
  for (let i = 1; i <= 20; i++) {
    await page.getByPlaceholder("ex. 2.25").fill("2");
    await page.getByPlaceholder("ex. 30.8 %").fill("33");
    await page.getByRole("button", { name: "call" }).click();
    await page.getByRole("button", { name: /Valider la réponse/ }).click();
    await page.getByRole("button", { name: /Spot suivant/ }).click();
    if (i < 20) {
      await page.getByText("Décompose avant de décider.").waitFor();
    }
  }
  await page.waitForURL(/\/review/, { timeout: 20_000 });
  await page.getByText(/sur 20 réussis/).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "review-session.png"), fullPage: true });

  // 4. Atelier avec données (même user, 20 attempts persistés)
  await page.goto(`${BASE}/`);
  await page.getByText("Re-bonjour Serge.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "atelier-with-data.png"), fullPage: true });

  await browser.close();
  console.log("S3 screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
