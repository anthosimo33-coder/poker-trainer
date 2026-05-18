import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots from "../content/spots/m2-4.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s6d");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot = (typeof spots)[number];

const eq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

async function readCards(page: Page): Promise<string[]> {
  const labels = await page.$$eval("[aria-label]", (els) =>
    els
      .map((e) => e.getAttribute("aria-label") || "")
      .filter((l) => /^[2-9TJQKA] of [shdc]$/.test(l))
  );
  return labels.map((l) => {
    const [r, , s] = l.split(" ");
    return `${r}${s}`;
  });
}

/** Identifie le spot M2.4 servi (hero + board + notation du range). */
async function matchSpot(page: Page): Promise<Spot> {
  const cards = await readCards(page);
  const hero = cards.slice(0, 2);
  const board = cards.slice(2);
  const notation = (await page.locator(".break-words").first().innerText()).trim();
  const found = (spots as Spot[]).find(
    (s) =>
      eq(s.heroCards, hero) &&
      eq(s.board, board) &&
      s.villainRangeNotation.trim() === notation
  );
  if (!found) throw new Error(`Spot introuvable : ${hero.join("")} | ${board.join("")} | ${notation.slice(0, 30)}`);
  return found;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Théorie M2.4
  await page.goto(`${BASE}/module/m2/theory/m2-4`);
  await page.getByRole("heading", { name: /Equity vs range/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "theory-m2-4.png"), fullPage: true });

  // 2. Quick check Q1
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m2-4.png"), fullPage: false });

  // 3/3 (B, B, C) → drill
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^C/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 3. Drill spot — range visualisé
  await page.getByText("Estime ton equity.").waitFor({ timeout: 15_000 });
  await page.locator('[title="AA"]').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "drill-m2-4-spot.png"), fullPage: true });

  // 5. Close-up du composant RangeDisplay (capture l'élément)
  await page.locator(".space-y-3").first().screenshot({
    path: path.join(OUT, "range-display-detail.png"),
  });

  // 4. Correction "Excellent" — réponse = vraie equity
  const s1 = await matchSpot(page);
  await page.getByPlaceholder("ex. 55").fill(String(s1.expected.equity));
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m2-4-correction-excellent.png"), fullPage: true });

  await browser.close();
  console.log("S6d screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
