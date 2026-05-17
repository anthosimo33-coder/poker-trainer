import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s5d");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Index Leçon — section complète (12/28 · 9/24 · 4/62)
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Lexique").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "lesson-index-final.png"), fullPage: true });

  // 2. Mode livre Lexique — chapitre 03 "La notation des ranges" ouvert (sommaire 4 chapitres)
  await page.goto(`${BASE}/lesson/lexique`);
  await page.getByText("Sommaire").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /notation des ranges/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "book-lexique-final.png"), fullPage: true });

  // 3. Détail fiche steal (Stratégie) — pills connexes cross-livres avec tag "Méca"
  await page.goto(`${BASE}/lesson/strategie/cards/steal`);
  await page.getByText("Fiches connexes").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "card-detail-cross-livres.png"), fullPage: true });

  // 4. Détail fiche level enrichie — exemple TPTK / check-raise
  await page.goto(`${BASE}/lesson/lexique/cards/level`);
  await page.getByText(/TPTK/).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "card-detail-level-enriched.png"), fullPage: true });

  // 5. Search ⌘K — "MDF" → Minimum defense frequency
  await page.goto(`${BASE}/lesson`);
  await page.getByText("Lexique").waitFor({ timeout: 15_000 });
  await page.keyboard.press("Meta+k");
  await page.locator('input[placeholder*="Rechercher"]').fill("MDF");
  await page.getByText(/minimum defense frequency/i).first().waitFor({ timeout: 8_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "search-mdf-result.png"), fullPage: false });

  await browser.close();
  console.log("S5d screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
