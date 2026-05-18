import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots32 from "../content/spots/m3-2.json";
import spots33 from "../content/spots/m3-3.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s7b");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot32 = (typeof spots32)[number];
type Spot33 = (typeof spots33)[number];

/** Lit le scenarioLabel rendu dans le BetTag (strong.font-mono). */
async function visibleLabel(page: Page): Promise<string> {
  return (await page.locator("strong.font-mono").first().innerText()).trim();
}

async function quickCheck(page: Page, answers: string[]) {
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  for (let i = 0; i < answers.length; i++) {
    await page.getByRole("button", { name: new RegExp(`^${answers[i]}`) }).first().click();
    if (i < answers.length - 1) {
      await page.getByRole("button", { name: /Suivant/ }).click();
    }
  }
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ===== M3.2 =====
  await page.goto(`${BASE}/module/m3/theory/m3-2`);
  await page.getByRole("heading", { name: /Fold equity et décomposition/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "theory-m3-2.png"), fullPage: true });

  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m3-2.png"), fullPage: false });
  // m3-2 : B, A, A
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^A/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^A/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  await page.getByText("Quelle FE pour break-even ?").waitFor({ timeout: 15_000 });
  const lbl32 = await visibleLabel(page);
  const s32 = (spots32 as Spot32[]).find((s) => s.scenarioLabel.trim() === lbl32);
  if (!s32) throw new Error(`M3.2 spot introuvable : ${lbl32}`);
  const trueBe = Math.round(s32.expected.pFoldBreakEven * 1000) / 10;
  await page.getByPlaceholder("ex. 52").fill(String(trueBe));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m3-2-spot.png"), fullPage: true });

  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "drill-m3-2-correction-excellent.png"), fullPage: true });

  // Spot suivant → réponse fausse (écart > 15 pts)
  await page.getByRole("button", { name: /Spot suivant/ }).click();
  await page.getByText("Quelle FE pour break-even ?").waitFor({ timeout: 10_000 });
  const lbl32b = await visibleLabel(page);
  const s32b = (spots32 as Spot32[]).find((s) => s.scenarioLabel.trim() === lbl32b);
  if (!s32b) throw new Error(`M3.2 spot 2 introuvable : ${lbl32b}`);
  const trueBe2 = Math.round(s32b.expected.pFoldBreakEven * 1000) / 10;
  await page.getByPlaceholder("ex. 52").fill(String(Math.max(0, Math.min(100, trueBe2 + 40))));
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "drill-m3-2-correction-faux.png"), fullPage: true });

  // ===== M3.3 =====
  await page.goto(`${BASE}/module/m3/theory/m3-3`);
  await page.getByRole("heading", { name: /EV composites multi-branches/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "theory-m3-3.png"), fullPage: true });

  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m3-3.png"), fullPage: false });
  // m3-3 : B, B, C
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^C/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  await page.getByText("Trois branches, une EV.").waitFor({ timeout: 15_000 });
  const lbl33 = await visibleLabel(page);
  const s33 = (spots33 as Spot33[]).find((s) => s.scenarioLabel.trim() === lbl33);
  if (!s33) throw new Error(`M3.3 spot introuvable : ${lbl33}`);
  await page.getByPlaceholder("ex. 55").fill(String(Math.round(s33.expected.pFold * 1000) / 10));
  await page.getByPlaceholder("ex. 35").fill(String(Math.round(s33.expected.pCall * 1000) / 10));
  await page.getByPlaceholder("ex. 10").fill(String(Math.round(s33.expected.pFourBet * 1000) / 10));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m3-3-spot.png"), fullPage: true });

  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "drill-m3-3-correction-excellent.png"), fullPage: true });

  // ===== Atelier — progression M·III =====
  await page.goto(`${BASE}/`);
  await page.getByText("EV de décisions composites").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "atelier-m3-progression.png"), fullPage: true });

  await browser.close();
  console.log("S7b screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
