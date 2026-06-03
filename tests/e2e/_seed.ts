/**
 * Seeding e2e via ConvexHttpClient (chemin Node, fiable) plutôt que via le
 * parcours navigateur théorie→drill, dont le bootstrap d'user anonyme est sujet
 * à une course (le composant quick-check skippe recordCompletion tant que
 * `userId` n'est pas résolu). On exerce ici le VRAI code de création de leak
 * (recordAttempt + updateAfterAttempt), seul le déclencheur change.
 */
import fs from "fs";
import path from "path";
import { ConvexHttpClient } from "convex/browser";
// Import relatif (et non `@/…`) pour rester exécutable aussi sous tsx (scripts
// de screenshots), où l'alias `@` n'est pas résolu — cf. screenshots-s11.ts.
import { api } from "../../convex/_generated/api";

function convexUrl(): string {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const m = raw.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
  if (!m) throw new Error("NEXT_PUBLIC_CONVEX_URL introuvable dans .env.local");
  return m[1].trim();
}

/** Spot M1.1 minimal ciblant le pattern m1-1-equity-marginal (req. 28 %, bet 0.6 pot). */
function marginalSpot(i: number) {
  return {
    id: `seed-marginal-${i}`,
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

/** Spot M1.1 ciblant m1-1-equity-cheap (req. 20 %, petite mise). */
function cheapSpot(i: number) {
  return {
    id: `seed-cheap-${i}`,
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

type Spot = ReturnType<typeof marginalSpot>;

export interface SeedOptions {
  /** Ajoute un 2e pattern (cheap, sévérité moindre) pour varier l'affichage. */
  rich?: boolean;
}

/**
 * Crée (ou réutilise) l'user `anonymousId`, valide la théorie M1.1, puis génère
 * des attempts qui déclenchent un (ou des) leak(s). Idempotent par anonymousId.
 */
export async function seedLeaks(anonymousId: string, opts: SeedOptions = {}): Promise<void> {
  const client = new ConvexHttpClient(convexUrl());
  const userId = await client.mutation(api.users.getOrCreateAnonymousUser, { anonymousId });
  await client.mutation(api.theoryCompletions.recordCompletion, {
    userId,
    submoduleSlug: "m1.1",
    quickCheckScore: 3,
  });

  async function attempt(spot: Spot, isCorrect: boolean) {
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
  }

  // Pattern "marginal" : 6 faux → leak sévère (précision 0 %).
  for (let i = 0; i < 6; i++) await attempt(marginalSpot(i), false);

  if (opts.rich) {
    // Pattern "cheap" : 6 corrects + 4 faux → précision 60 % → leak modéré.
    for (let i = 0; i < 6; i++) await attempt(cheapSpot(i), true);
    for (let i = 6; i < 10; i++) await attempt(cheapSpot(i), false);
  }
}

/**
 * Seed riche pour la page /stats (S11) : attempts numériques répartis sur M·II
 * (calibration équité), M·III (biais EV), M·IV (calibration ICM + biais bubble
 * factor), M·V (tendance Nash), plus une progression sur 7 jours. Réutilise
 * seedLeaks(rich) pour peupler SM-2 (patternProgress) + leaks (KPI).
 *
 * Les extracteurs ne lisent que userAnswer/expected (calibration/biais) ou
 * spotSnapshot.heroStack (Nash) → les snapshots restent minimaux.
 */
const DAY_MS = 86_400_000;

export async function seedStats(
  anonymousId: string,
  opts: { light?: boolean } = {}
): Promise<void> {
  // Le Convex cloud sérialise les mutations → ~250 inserts ≈ 90 s. Le mode
  // `light` (e2e) sème un set compact (~30 attempts) suffisant pour prouver
  // « page chargée + ≥ 1 graphe non vide » ; le mode plein (screenshots) sème
  // la donnée riche multi-jours + SM-2.
  const light = opts.light ?? false;

  // SM-2 + leaks (KPI + forecast) — coûteux (updateAfterAttempt), sauté en light.
  if (!light) await seedLeaks(anonymousId, { rich: true });

  const client = new ConvexHttpClient(convexUrl());
  const userId = await client.mutation(api.users.getOrCreateAnonymousUser, { anonymousId });
  const now = Date.now();
  let seq = 0;
  // Les recordAttempt sont indépendants (pas de updateAfterAttempt) → on collecte
  // puis on exécute par lots concurrents (sinon ~250 aller-retours séquentiels
  // vers le Convex cloud dépassent le timeout e2e).
  const jobs: Array<() => Promise<unknown>> = [];

  function rec(args: {
    slug: string;
    snapshot?: unknown;
    expected: unknown;
    userAnswer: unknown;
    isCorrect: boolean;
    daysAgo: number;
    signedError?: number;
  }) {
    jobs.push(() =>
      client.mutation(api.attempts.recordAttempt, {
        userId,
        submoduleSlug: args.slug,
        spotId: `seed-${args.slug}-${seq++}`,
        spotSnapshot: args.snapshot ?? {},
        expected: args.expected,
        userAnswer: args.userAnswer,
        isCorrect: args.isCorrect,
        timeMs: 5000,
        hintUsed: false,
        scoreLevel: args.isCorrect ? "excellent" : "faux",
        ...(args.signedError !== undefined ? { signedError: args.signedError } : {}),
        attemptedAt: now - args.daysAgo * DAY_MS,
      })
    );
  }

  // 1) Progression sur 7 jours (accuracy 60 % → 90 %) — accuracyOverTime + KPI.
  if (!light) {
    for (let d = 6; d >= 0; d--) {
      const acc = 0.6 + (6 - d) * 0.05;
      for (let i = 0; i < 8; i++) {
        rec({
          slug: "m1.1",
          expected: { requiredEquity: 33, ratio: 2, finalPotBb: 20 },
          userAnswer: { decision: "call", ratio: "2", requiredEquity: "33" },
          isCorrect: i / 8 < acc,
          daysAgo: d,
        });
      }
    }
  }

  // 2) M2.2 calibration équité : sous-estimation systématique (~−3 pts).
  const eqTrue = light
    ? [22, 35, 48, 58, 68, 78]
    : [22, 26, 31, 35, 38, 42, 47, 52, 58, 63, 68, 72, 77, 82];
  for (const t of eqTrue) {
    for (let k = 0; k < 2; k++) {
      const user = Math.max(2, t - 3 - k);
      const se = Math.round((user - t) * 10) / 10;
      await rec({
        slug: "m2.2",
        expected: { equity: t, method: "monte-carlo", iterations: 1, wins: 1, losses: 1, ties: 0 },
        userAnswer: { equityHu: String(user) },
        isCorrect: Math.abs(se) <= 3,
        daysAgo: k,
        signedError: se,
      });
    }
  }

  // 3) M4.1 calibration ICM : légère sous-estimation.
  for (const t of light ? [12, 24, 36, 48] : [12, 18, 24, 30, 36, 42, 48, 28, 33, 40]) {
    const user = Math.max(2, Math.round((t - 2.5) * 10) / 10);
    const se = Math.round((user - t) * 10) / 10;
    await rec({
      slug: "m4.1",
      expected: { heroEquityPercent: t, heroChipEquityPercent: t + 2, icmEffect: 2, allEquities: {} },
      userAnswer: { equityIcmInput: String(user) },
      isCorrect: Math.abs(se) <= 3,
      daysAgo: 1,
      signedError: se,
    });
  }

  // 4) M3.1 / M3.3 biais EV (bb) : légère surestimation (médiane > 0).
  const evSe = light
    ? [-0.3, -0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.9, 0.1, 0.3]
    : [-0.6, -0.3, -0.1, 0, 0.1, 0.2, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9, 1.1, 0.2, 0.4, -0.2, 0.5, 0.3, 0.1];
  for (const se of evSe) {
    await rec({
      slug: "m3.1",
      expected: { evBb: 2, pFold: 0.5, equityVsCallRange: 45, combosInCallRange: 50 },
      userAnswer: { pFoldInput: "50", equityCallInput: "45" },
      isCorrect: Math.abs(se) <= 0.8,
      daysAgo: 0,
      signedError: se,
    });
  }
  if (!light) {
    for (const se of [0.2, -0.4, 0.5, 0.3, 0, 0.6, -0.1, 0.4]) {
      rec({
        slug: "m3.3",
        expected: { evBb: 3 },
        userAnswer: { pFoldBranchInput: "40", pCallBranchInput: "40", pRaiseBranchInput: "20" },
        isCorrect: Math.abs(se) <= 0.8,
        daysAgo: 2,
        signedError: se,
      });
    }

    // 5) M4.3 / M4.2 biais bubble factor (ratio) : légère surestimation.
    for (const t of [1.2, 1.5, 1.8, 2.2, 1.4, 1.6, 2.0, 1.3, 1.7, 1.9]) {
      const user = Math.round((t + 0.2) * 100) / 100;
      rec({
        slug: "m4.3",
        expected: {
          baseBubbleFactor: Math.round((t - 0.3) * 100) / 100,
          adjustedBubbleFactor: t,
          positionMultiplier: 1.2,
          requiredEquityChip: 40,
          requiredEquityICM: 50,
          heroEquityBefore: 30,
        },
        userAnswer: { bfBaseInput: String(Math.round((t - 0.3) * 100) / 100), bfAdjustedInput: String(user) },
        isCorrect: true,
        daysAgo: 1,
      });
    }
    for (const t of [1.3, 1.6, 1.9, 1.45, 1.75]) {
      const trueEq = (t / (t + 1)) * 100;
      const userEq = Math.round((trueEq + 3) * 10) / 10;
      rec({
        slug: "m4.2",
        expected: {
          bubbleFactor: t,
          requiredEquityChip: 40,
          requiredEquityICM: Math.round(trueEq * 10) / 10,
          heroEquityBefore: 30,
          heroEquityIfWin: 40,
          heroEquityIfLose: 20,
        },
        userAnswer: { equityChipReqInput: "40", equityIcmReqInput: String(userEq) },
        isCorrect: true,
        daysAgo: 1,
      });
    }
  }

  // 6) M5.x tendance Nash par stack (5bb = trop large, autres ~équilibrés).
  const nashByStack: Record<number, { correct: number; over: number; under: number }> = light
    ? { 10: { correct: 6, over: 3, under: 1 } }
    : {
        5: { correct: 6, over: 8, under: 1 },
        7: { correct: 10, over: 3, under: 2 },
        8: { correct: 11, over: 2, under: 2 },
        10: { correct: 13, over: 2, under: 1 },
        12: { correct: 9, over: 1, under: 3 },
        15: { correct: 8, over: 1, under: 1 },
      };
  for (const [stackStr, c] of Object.entries(nashByStack)) {
    const stack = Number(stackStr);
    const snap = { heroStack: stack };
    for (let i = 0; i < c.correct; i++)
      await rec({ slug: "m5.1", snapshot: snap, expected: { nashAction: "push" }, userAnswer: { nashActionInput: "push" }, isCorrect: true, daysAgo: i % 3, signedError: 0 });
    for (let i = 0; i < c.over; i++)
      await rec({ slug: "m5.1", snapshot: snap, expected: { nashAction: "fold" }, userAnswer: { nashActionInput: "push" }, isCorrect: false, daysAgo: i % 3, signedError: 1 });
    for (let i = 0; i < c.under; i++)
      await rec({ slug: "m5.1", snapshot: snap, expected: { nashAction: "push" }, userAnswer: { nashActionInput: "fold" }, isCorrect: false, daysAgo: i % 3, signedError: -1 });
  }

  // 7) Quelques sous-modules supplémentaires pour varier les couleurs (vert/ambre/rouge).
  async function fill(slug: string, n: number, acc: number, snapshot: unknown, expected: unknown, userAnswer: unknown) {
    for (let i = 0; i < n; i++) {
      await rec({ slug, snapshot, expected, userAnswer, isCorrect: i / n < acc, daysAgo: i % 5 });
    }
  }
  if (!light) {
    await fill("m2.1", 16, 0.9, {}, { equityApprox: 30 }, { equityInput: "30", outsInput: "9" });
    await fill("m1.2", 12, 0.82, {}, { ratio: 2 }, { ratio: "2" });
    await fill("m5.4", 14, 0.62, { heroStack: 10 }, { nashAction: "call" }, { nashCallActionInput: "call" });
  }

  // Exécution par lots concurrents (≈250 inserts → ~10 lots).
  const CHUNK = 25;
  for (let i = 0; i < jobs.length; i += CHUNK) {
    await Promise.all(jobs.slice(i, i + CHUNK).map((job) => job()));
  }
}
