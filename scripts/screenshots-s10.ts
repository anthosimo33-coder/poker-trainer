/**
 * Screenshots S10 — SM-2 spaced repetition + leak detection.
 *
 * Prérequis : un serveur dev sur http://localhost:3000.
 * Les données (user + théorie + attempts → leaks) sont semées via
 * ConvexHttpClient (chemin Node fiable) ; le navigateur ne fait que des lectures.
 */
import { chromium, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";
import { api } from "../convex/_generated/api";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s10");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

function convexUrl(): string {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const m = raw.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
  if (!m) throw new Error("NEXT_PUBLIC_CONVEX_URL introuvable");
  return m[1].trim();
}

const client = new ConvexHttpClient(convexUrl());

function marginalSpot(i: number) {
  return {
    id: `shot-marginal-${i}`,
    heroCards: ["As", "Kd"],
    board: ["2c", "7h", "9s"],
    effectiveStackBb: 40,
    potBb: 10,
    betBb: 6,
    heroPosition: "BTN",
    villainPosition: "CO",
    expected: { requiredEquity: 28, ratio: 2.1, finalPotBb: 22 },
  };
}
function cheapSpot(i: number) {
  return {
    id: `shot-cheap-${i}`,
    heroCards: ["Qs", "Jd"],
    board: ["2c", "7h", "9s"],
    effectiveStackBb: 40,
    potBb: 12,
    betBb: 4,
    heroPosition: "CO",
    villainPosition: "MP",
    expected: { requiredEquity: 20, ratio: 4, finalPotBb: 20 },
  };
}

async function ensureUser(anonymousId: string) {
  return client.mutation(api.users.getOrCreateAnonymousUser, { anonymousId });
}

async function seedRich(anonymousId: string) {
  const userId = await ensureUser(anonymousId);
  await client.mutation(api.theoryCompletions.recordCompletion, {
    userId,
    submoduleSlug: "m1.1",
    quickCheckScore: 3,
  });
  const attempt = async (spot: ReturnType<typeof marginalSpot>, isCorrect: boolean) => {
    const attemptId = await client.mutation(api.attempts.recordAttempt, {
      userId,
      submoduleSlug: "m1.1",
      spotId: spot.id,
      spotSnapshot: spot,
      expected: spot.expected,
      userAnswer: {},
      isCorrect,
      timeMs: 1200,
      hintUsed: false,
      scoreLevel: isCorrect ? "excellent" : "faux",
    });
    await client.mutation(api.patterns.updateAfterAttempt, { attemptId });
  };
  for (let i = 0; i < 6; i++) await attempt(marginalSpot(i), false); // sévère
  for (let i = 0; i < 6; i++) await attempt(cheapSpot(i), true); // → 60 %
  for (let i = 6; i < 10; i++) await attempt(cheapSpot(i), false); // modéré
}

async function newCtx(browser: Awaited<ReturnType<typeof chromium.launch>>, anonymousId: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((id) => {
    localStorage.setItem("poker-trainer.anonymousId", id);
  }, anonymousId);
  return ctx;
}

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function main() {
  console.log("Seeding via Convex…");
  const RICH = "s10-shot-rich";
  const EMPTY = "s10-shot-empty";
  await seedRich(RICH);
  await ensureUser(EMPTY); // user vierge, aucun leak

  const browser = await chromium.launch();

  // 1 & 5 — /leaks vide + panneau explicatif (critères de détection)
  {
    const ctx = await newCtx(browser, EMPTY);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/leaks`);
    await page.getByText(/Aucun leak détecté/).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(500);
    await shot(page, "leaks-empty.png");
    const panel = page.getByText(/un leak apparaît dès qu/i).locator("xpath=ancestor::div[1]");
    await panel.screenshot({ path: path.join(OUT, "theory-or-doc-explaining-sm2.png") });
    await ctx.close();
  }

  // 2, 3, 6 — /leaks avec leaks + détail carte + bloc SM-2
  {
    const ctx = await newCtx(browser, RICH);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/leaks`);
    await page.getByText("Call marginal (eq requise 25-30 %)").waitFor({ timeout: 20_000 });
    // Attendre le bloc SM-2 (query getPatternProgress par carte) avant de capturer.
    await page.getByTestId("sm2-debug").first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await shot(page, "leaks-with-leaks.png");
    await page.getByTestId("leak-card").first().screenshot({
      path: path.join(OUT, "leak-card-detail.png"),
    });
    await page.getByTestId("sm2-debug").first().screenshot({
      path: path.join(OUT, "pattern-progress-debug.png"),
    });
    await ctx.close();
  }

  // 4 — drill en focus mode (bandeau "Focus pattern")
  {
    const ctx = await newCtx(browser, RICH);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/drill/m1-1?focusPattern=m1-1-equity-marginal`);
    await page.getByText("Focus pattern").waitFor({ timeout: 45_000 });
    await page.getByText("Décompose avant de décider.").first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(700);
    await shot(page, "drill-priority-mode.png");
    await ctx.close();
  }

  // 7 — Atelier : nav "Mes leaks" + métrique "Fuites actives"
  {
    const ctx = await newCtx(browser, RICH);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);
    await page.getByText("Modules de la formation").waitFor({ timeout: 20_000 });
    await page.waitForTimeout(700);
    await shot(page, "atelier-with-leaks-nav.png");
    await ctx.close();
  }

  await browser.close();
  console.log("Screenshots S10 →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
