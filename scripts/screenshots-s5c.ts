import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s5c");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Index Leçon — 3 livres peuplés (12/28, 9/24, 2/40)
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Lexique").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "lesson-index-3-livres.png"), fullPage: true });

  // 2. Mode livre Lexique — chapitre 02 "La notation des mains" ouvert
  await page.goto(`${BASE}/lesson/lexique`);
  await page.getByText("Sommaire").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /notation des mains/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "book-lexique-reader.png"), fullPage: true });

  // 3. Mode fiches Lexique — grille des 40 fiches
  await page.goto(`${BASE}/lesson/lexique/cards`);
  await page.getByText("fiches.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "cards-lexique-grid.png"), fullPage: true });

  // 4. Détail fiche 3-bet
  await page.goto(`${BASE}/lesson/lexique/cards/3bet`);
  await page.getByText("Fiches connexes").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "card-detail-3bet.png"), fullPage: true });

  // 5. Search ⌘K — filtre Lexique (amber) + query "barrel"
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Lexique").waitFor({ timeout: 15_000 });
  await page.keyboard.press("Meta+k");
  await page.locator('input[placeholder*="Rechercher"]').fill("barrel");
  await page.getByRole("button", { name: /Lexique/i }).click();
  await page.getByText(/barrel/i).first().waitFor({ timeout: 8_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "search-lexique-amber.png"), fullPage: false });

  await browser.close();
  console.log("S5c screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
