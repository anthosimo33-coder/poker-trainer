import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots from "../content/spots/m2-3.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s6c");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot = (typeof spots)[number];

const eq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Lit, dans l'ordre du DOM, les cartes visibles (aria-label "R of S"). */
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

/** Identifie le spot 3-way servi dans le pool pré-calculé. */
async function matchSpot(page: Page): Promise<Spot> {
  const c = await readCards(page);
  const hero = c.slice(0, 2);
  const v1 = c.slice(2, 4);
  const v2 = c.slice(4, 6);
  const board = c.slice(6);
  const found = (spots as Spot[]).find(
    (s) =>
      eq(s.heroCards, hero) &&
      eq(s.villain1Cards, v1) &&
      eq(s.villain2Cards, v2) &&
      eq(s.board, board)
  );
  if (!found) throw new Error(`Spot introuvable pour ${c.join(" ")}`);
  return found;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Théorie M2.3 — full page
  await page.goto(`${BASE}/module/m2/theory/m2-3`);
  await page.getByRole("heading", { name: /Equity multiway/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "theory-m2-3.png"), fullPage: true });

  // 2. Quick check — question 1
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m2-3.png"), fullPage: false });

  // 3/3 (B, C, B) → débloque le drill
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^C/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 3. Drill 3-way — 3 mains visibles + champ equity
  await page.getByText("Estime ton equity.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "drill-m2-3-spot.png"), fullPage: true });

  // 4. Correction "Excellent" — réponse = vraie equity
  const s1 = await matchSpot(page);
  await page.getByPlaceholder("ex. 38").fill(String(s1.expected.equity));
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m2-3-correction-excellent.png"), fullPage: true });

  // 5. Correction "Faux" — réponse décalée de ≥25 points
  await page.getByRole("button", { name: /Spot suivant/ }).click();
  await page.getByText("Estime ton equity.").waitFor({ timeout: 10_000 });
  const s2 = await matchSpot(page);
  const t = s2.expected.equity;
  const wrong = t < 50 ? t + 25 : t - 25;
  await page.getByPlaceholder("ex. 38").fill(String(Math.round(wrong)));
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m2-3-correction-faux.png"), fullPage: true });

  await browser.close();
  console.log("S6c screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
