import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s4a");
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Atelier état "théorie à lire"
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-theory-todo.png"), fullPage: true });

  // 2. Page théorie complète
  await page.goto("http://localhost:3000/module/m1/theory/m1-1");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "theory-m1-1-full.png"), fullPage: true });

  // 3. Quick check (question 1)
  await page.getByRole("button", { name: /Passer le quick check/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-question.png"), fullPage: false });

  // 4. Quick check résultat (réponds toutes B, score 3/3)
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "quickcheck-results.png"), fullPage: false });

  // 5. Drill verrouillé (nouveau user — nouveau contexte)
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();
  await page2.goto("http://localhost:3000/drill/m1-1");
  await page2.waitForLoadState("networkidle");
  await page2.waitForTimeout(1200);
  await page2.screenshot({ path: path.join(OUT, "drill-locked.png"), fullPage: true });

  await browser.close();
  console.log("Screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
