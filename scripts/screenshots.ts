// scripts/screenshots.ts
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s2");
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(OUT, "home-atelier.png"), fullPage: true });

  await page.goto("http://localhost:3000/drill/m1-1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "drill-spot.png"), fullPage: true });

  // Crop des cartes du héros (4e image demandée par le spec)
  const heroCards = page
    .getByText("Ta main", { exact: true })
    .locator("xpath=following-sibling::div[1]");
  await heroCards.screenshot({ path: path.join(OUT, "playing-cards.png") });

  // Remplit + valide
  await page.getByPlaceholder("ex. 2.25").fill("2");
  await page.getByPlaceholder("ex. 30.8 %").fill("33");
  await page.getByRole("button", { name: "call" }).click();
  await page.getByRole("button", { name: /Valider/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "drill-correction.png"), fullPage: true });

  await browser.close();
  console.log("Screenshots saved to", OUT);
}

main().catch(console.error);
