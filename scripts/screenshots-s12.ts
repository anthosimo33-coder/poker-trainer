/**
 * Screenshots S12 — index /drill & /theory (nouveaux), états vides, et états
 * peuplés pour contraste.
 *
 * Prérequis : un serveur dev sur http://localhost:3000.
 * Hygiène : anonIds de test FIXES + reset (clearUserData) → aucun churn
 * (cohérent avec Phase 1). Données peuplées via seedStats (qui seede aussi les
 * leaks) ; le navigateur ne fait que des lectures.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { resolveTestConvexUrl } from "../tests/e2e/_guard";
import { seedStats } from "../tests/e2e/_seed";

const OUT = path.join(process.cwd(), "docs", "screenshots", "s12");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const ANON_CLEAN = "e2e-test-s12-clean";
const ANON_SEEDED = "e2e-test-s12-seeded";

async function clearUser(anonymousId: string) {
  const client = new ConvexHttpClient(resolveTestConvexUrl());
  await client.mutation(api.testing.clearUserData, { anonymousId });
}

async function newCtx(browser: Browser, anonymousId: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript((id) => {
    localStorage.setItem("poker-trainer.anonymousId", id);
  }, anonymousId);
  return ctx;
}

async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, name), fullPage });
  console.log("  →", name);
}

async function main() {
  const browser = await chromium.launch();

  // --- Mode --before : capture les anciens stubs /drill & /theory (à lancer
  // après `git checkout <s11> -- app/(app)/{drill,theory}/page.tsx`). ---
  if (process.argv.includes("--before")) {
    const ctx = await newCtx(browser, ANON_CLEAN);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/drill`);
    await page.getByRole("heading", { name: "Drill" }).first().waitFor({ timeout: 30_000 });
    await shot(page, "drill-stub-before.png");
    await page.goto(`${BASE}/theory`);
    await page.getByRole("heading", { name: "Théorie" }).first().waitFor({ timeout: 30_000 });
    await shot(page, "theory-stub-before.png");
    await ctx.close();
    await browser.close();
    console.log("Before-stubs S12 →", OUT);
    return;
  }

  // --- États statiques + vides (user resetté, aucune donnée) ---
  await clearUser(ANON_CLEAN);
  {
    const ctx = await newCtx(browser, ANON_CLEAN);
    const page = await ctx.newPage();

    await page.goto(`${BASE}/drill`);
    await page.getByRole("heading", { name: "Drill" }).first().waitFor({ timeout: 30_000 });
    await shot(page, "drill-index.png");

    await page.goto(`${BASE}/theory`);
    await page.getByRole("heading", { name: "Théorie" }).first().waitFor({ timeout: 30_000 });
    await shot(page, "theory-index.png");

    await page.goto(`${BASE}/`);
    await page.getByText(/Bienvenue Serge/).waitFor({ timeout: 30_000 });
    await shot(page, "atelier-empty.png");

    await page.goto(`${BASE}/leaks`);
    await page.getByText(/Aucun leak détecté/).first().waitFor({ timeout: 30_000 });
    await shot(page, "leaks-empty.png");

    await page.goto(`${BASE}/stats`);
    await page.getByRole("heading", { name: /calibration/i }).first().waitFor({ timeout: 30_000 });
    await shot(page, "stats-empty.png");

    await ctx.close();
  }

  // --- États peuplés (seed complet : calibration, biais, tendance Nash, leaks) ---
  console.log("Seeding stats+leaks (peut prendre ~1-2 min)…", ANON_SEEDED);
  await clearUser(ANON_SEEDED);
  await seedStats(ANON_SEEDED);
  {
    const ctx = await newCtx(browser, ANON_SEEDED);
    const page = await ctx.newPage();

    await page.goto(`${BASE}/stats`);
    await page.locator(".recharts-surface").first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await shot(page, "stats-seeded.png");

    await page.goto(`${BASE}/leaks`);
    await page.locator('[data-testid="leak-card"]').first().waitFor({ timeout: 30_000 });
    await shot(page, "leaks-seeded.png");

    await ctx.close();
  }

  await browser.close();
  console.log("Screenshots S12 →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
