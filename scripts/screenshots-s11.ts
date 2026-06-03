/**
 * Screenshots S11 — page /stats (calibration & biais).
 *
 * Prérequis : un serveur dev sur http://localhost:3000.
 * Données semées via ConvexHttpClient (seedStats partagé avec les e2e) ; le
 * navigateur ne fait que des lectures.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { seedStats } from "../tests/e2e/_seed";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s11");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

async function newCtx(browser: Browser, anonymousId: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((id) => {
    localStorage.setItem("poker-trainer.anonymousId", id);
  }, anonymousId);
  return ctx;
}

/** Capture la <section> dont le titre h2 correspond. */
async function shotSection(page: Page, heading: RegExp, name: string) {
  const section = page
    .getByRole("heading", { name: heading })
    .first()
    .locator("xpath=ancestor::section[1]");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await section.screenshot({ path: path.join(OUT, name) });
}

async function main() {
  const ANON = `s11-stats-${Date.now()}`;
  console.log("Seeding stats via Convex…", ANON);
  await seedStats(ANON);

  const browser = await chromium.launch();
  const ctx = await newCtx(browser, ANON);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/stats`);
  await page.getByRole("heading", { name: /calibration/i }).first().waitFor({ timeout: 30_000 });
  // Attendre que les graphes recharts soient montés.
  await page.locator(".recharts-surface").first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1200);

  // 8 — nav avec « Stats » (topbar, en haut de page).
  await page.locator("nav").first().screenshot({ path: path.join(OUT, "nav-with-stats.png") });

  // 1 — page complète.
  await page.screenshot({ path: path.join(OUT, "stats-overview-full.png"), fullPage: true });

  // 2-7 — sections individuelles.
  await shotSection(page, /^Équité — estimé vs réel$/, "calibration-equity.png");
  await shotSection(page, /^Équité ICM — estimé vs réel$/, "calibration-icm.png");
  await shotSection(page, /^EV en bb/, "bias-ev.png");
  await shotSection(page, /Push \/ fold par stack/, "nash-tendency.png");
  await shotSection(page, /Accuracy par sous-module/, "submodule-accuracy.png");
  await shotSection(page, /Accuracy dans le temps/, "accuracy-over-time.png");

  await ctx.close();
  await browser.close();
  console.log("Screenshots S11 →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
