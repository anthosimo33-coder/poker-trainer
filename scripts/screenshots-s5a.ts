import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s5a");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Index Leçon — 3 livres
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Mécaniques").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "lesson-index.png"), fullPage: true });

  // 2. Mode livre Mécaniques — sommaire + chapitre 01
  await page.goto(`${BASE}/lesson/mecaniques`);
  await page.getByText("Sommaire").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "lesson-book-reader.png"), fullPage: true });

  // 3. Mode fiches — grille des 28 fiches
  await page.goto(`${BASE}/lesson/mecaniques/cards`);
  await page.getByText("fiches.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "lesson-cards-grid.png"), fullPage: true });

  // 4. Détail d'une fiche (BTN — une position)
  await page.goto(`${BASE}/lesson/mecaniques/cards/btn`);
  await page.getByText("Fiches connexes").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "lesson-card-detail.png"), fullPage: true });

  // 5. Modal ⌘K — recherche "tirage"
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Mécaniques").waitFor({ timeout: 15_000 });
  await page.keyboard.press("Meta+k");
  await page.locator('input[placeholder*="Rechercher"]').fill("tirage");
  await page.getByText(/tirage/i).first().waitFor({ timeout: 8_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "search-modal.png"), fullPage: false });

  await browser.close();
  console.log("S5a screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
