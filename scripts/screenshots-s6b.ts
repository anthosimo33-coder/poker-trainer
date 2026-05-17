import { chromium, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import spots from "../content/spots/m2-2.json";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s6b");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

type Spot = (typeof spots)[number];

const eq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Lit, dans l'ordre du DOM, les cartes visibles (PlayingCard aria-label "R of S"). */
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

/** Identifie le spot servi (hero+vilain+board) dans le pool pré-calculé. */
async function matchSpot(page: Page): Promise<Spot> {
  const cards = await readCards(page);
  const hero = cards.slice(0, 2);
  const vil = cards.slice(2, 4);
  const board = cards.slice(4);
  const found = (spots as Spot[]).find(
    (s) =>
      eq(s.heroCards, hero) &&
      eq(s.villainCards, vil) &&
      eq(s.board, board)
  );
  if (!found) throw new Error(`Spot introuvable pour ${cards.join(" ")}`);
  return found;
}

async function passQuickCheck(page: Page) {
  await page.getByRole("button", { name: /Passer le quick check/ }).click({ timeout: 20_000 });
  await page.getByText(/Question 1/).waitFor({ timeout: 10_000 });
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Théorie M2.2 — full page
  await page.goto(`${BASE}/module/m2/theory/m2-2`);
  await page.getByRole("heading", { name: /Equity heads-up/i }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "theory-m2-2.png"), fullPage: true });

  // 2. Quick check — question 1
  await passQuickCheck(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "quickcheck-m2-2.png"), fullPage: false });

  // 3/3 (B, B, B) → débloque le drill
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("button", { name: /^B/ }).first().click();
  await page.getByRole("button", { name: /Valider mes réponses/ }).click();
  await page.getByText(/Quick check validé/).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Démarrer le drill/ }).click();

  // 3. Drill en cours — cartes vilain visibles + champ equity
  await page.getByText("Estime ton equity.").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "drill-m2-2-spot.png"), fullPage: true });

  // 4. Correction "Excellent" — réponse = vraie equity (erreur 0)
  const spot1 = await matchSpot(page);
  await page.getByPlaceholder("ex. 47").fill(String(spot1.expected.equity));
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m2-2-correction-excellent.png"), fullPage: true });

  // 5. Correction "Faux" — réponse volontairement décalée de ≥25 points
  await page.getByRole("button", { name: /Spot suivant/ }).click();
  await page.getByText("Estime ton equity.").waitFor({ timeout: 10_000 });
  const spot2 = await matchSpot(page);
  const trueEq = spot2.expected.equity;
  const wrong = trueEq < 50 ? trueEq + 25 : trueEq - 25;
  await page.getByPlaceholder("ex. 47").fill(String(Math.round(wrong)));
  await page.getByRole("button", { name: /Valider la réponse/ }).click();
  await page.getByText(/Spot suivant/).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "drill-m2-2-correction-faux.png"), fullPage: true });

  await browser.close();
  console.log("S6b screenshots saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
