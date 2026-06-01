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
import { api } from "@/convex/_generated/api";

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
