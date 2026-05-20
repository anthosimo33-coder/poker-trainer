import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s9b");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function flowSubmodule(
  page: Page,
  submoduleSlug: string,
  headingRe: RegExp,
  qcmAnswers: ("A" | "B" | "C" | "D")[],
  shotPrefix: string,
  drillPromptRe: RegExp,
  pickButtonRe: RegExp
) {
  await page.goto(`${BASE}/module/m5/theory/${submoduleSlug}`);
  await page.getByRole("heading", { name: headingRe }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  await shot(page, `theory-${shotPrefix}.png`);

  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, `quickcheck-${shotPrefix}.png`, false);
  for (let i = 0; i < qcmAnswers.length; i++) {
    await page.getByRole("button", { name: new RegExp("^" + qcmAnswers[i]) }).first().click();
    if (i < qcmAnswers.length - 1) {
      await page.getByRole("button", { name: /Suivant/ }).click();
    }
  }
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  await page.getByText(drillPromptRe).first().waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: pickButtonRe }).click();
  await page.waitForTimeout(500);
  await shot(page, `drill-${shotPrefix}-spot.png`);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // M5.2 — théorie + quick check + drill + review (correction)
  await flowSubmodule(
    page,
    "m5-2",
    /BB call vs SB push/i,
    ["B", "B", "B"],
    "m5-2",
    /Call ou fold/i,
    /^CALL/i
  );
  // Review correction
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await shot(page, "drill-m5-2-review.png");

  // M5.3 — théorie + quick check + drill
  await flowSubmodule(
    page,
    "m5-3",
    /BTN push range Nash/i,
    ["B", "C", "B"],
    "m5-3",
    /Push ou fold/i,
    /^PUSH/i
  );

  // M5.4 — théorie + quick check + drill
  await flowSubmodule(
    page,
    "m5-4",
    /Call ranges par position/i,
    ["C", "A", "B"],
    "m5-4",
    /Call ou fold/i,
    /^CALL/i
  );

  // Atelier M·V complet
  await page.goto(`${BASE}/`);
  await page.getByText("Ranges Nash push/fold").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await shot(page, "atelier-m5-complete.png");

  await browser.close();
  console.log("S9b screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
