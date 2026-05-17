import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s5b");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Index Leçon — Livre I + Livre II peuplés
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Stratégie").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "lesson-index-2-livres.png"), fullPage: true });

  // 2. Mode livre Stratégie — sommaire 9 chapitres + chapitre 01
  await page.goto(`${BASE}/lesson/strategie`);
  await page.getByText("Sommaire").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "book-strategie-reader.png"), fullPage: true });

  // 3. Mode fiches Stratégie — grille 24 fiches
  await page.goto(`${BASE}/lesson/strategie/cards`);
  await page.getByText("fiches.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "cards-strategie-grid.png"), fullPage: true });

  // 4. Détail fiche "Range" — vérification fix h2 (pas de titre redondant)
  await page.goto(`${BASE}/lesson/strategie/cards/range`);
  await page.getByText("Fiches connexes").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "card-detail-range.png"), fullPage: true });

  // 5. Search ⌘K — filtre Stratégie + query "range"
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Stratégie").waitFor({ timeout: 15_000 });
  await page.keyboard.press("Meta+k");
  await page.locator('input[placeholder*="Rechercher"]').fill("range");
  await page.getByRole("button", { name: /Stratégie/i }).click();
  await page.getByText(/Range/).first().waitFor({ timeout: 8_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "search-strategie-filter.png"), fullPage: false });

  await browser.close();
  console.log("S5b screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
