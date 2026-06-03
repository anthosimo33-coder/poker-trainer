import { v } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
// Logique d'agrégation PURE (imports de VALEUR en relatif — esbuild Convex).
import {
  accuracyBySubmodule as aggAccuracyBySubmodule,
  accuracyOverTime as aggAccuracyOverTime,
  biasStats,
  calibrationSeries,
  globalKpis as aggGlobalKpis,
  nashTendency as aggNashTendency,
  sm2Forecast as aggSm2Forecast,
  type AttemptLite,
} from "../lib/stats/aggregate";
import { SUBMODULES_BY_KIND, type EstimationKind } from "../lib/stats/estimation";

/**
 * Fenêtres bornées (cf. spec : « pas de scan complet, borner si volume »). Toutes
 * les lectures passent par un index `by_user*`. Pour un seul user ces plafonds
 * sont très larges ; au-delà, les stats sont windowées (noté dans le rapport).
 */
const MAX_RECENT = 2000; // attempts récents (KPIs, accuracy globale/temporelle)
const MAX_PER_SUBMODULE = 1000; // attempts par sous-module (calibration/biais/nash)

/** Les 20 sous-modules, ordre module → sous-module. */
const ALL_SUBMODULES = [
  "m1.1", "m1.2", "m1.3", "m1.4",
  "m2.1", "m2.2", "m2.3", "m2.4",
  "m3.1", "m3.2", "m3.3", "m3.4",
  "m4.1", "m4.2", "m4.3", "m4.4",
  "m5.1", "m5.2", "m5.3", "m5.4",
];

type AttemptDoc = {
  submoduleSlug: string;
  userAnswer?: unknown;
  expected?: unknown;
  spotSnapshot?: unknown;
  signedError?: number;
  isCorrect: boolean;
  attemptedAt: number;
};

function toLite(d: AttemptDoc): AttemptLite {
  return {
    submoduleSlug: d.submoduleSlug,
    userAnswer: d.userAnswer,
    expected: d.expected,
    spotSnapshot: d.spotSnapshot,
    signedError: d.signedError,
    isCorrect: d.isCorrect,
    attemptedAt: d.attemptedAt,
  };
}

/** Attempts récents tous sous-modules confondus (index by_user_attemptedAt). */
async function loadRecent(
  ctx: QueryCtx,
  userId: Id<"users">,
  limit: number
): Promise<AttemptLite[]> {
  const docs = await ctx.db
    .query("spotAttempts")
    .withIndex("by_user_attemptedAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);
  return docs.map(toLite);
}

/** Attempts ciblés sur un ensemble de sous-modules (index by_user_submodule). */
async function loadBySubmodules(
  ctx: QueryCtx,
  userId: Id<"users">,
  slugs: string[],
  perSlugLimit: number
): Promise<AttemptLite[]> {
  const out: AttemptLite[] = [];
  for (const slug of slugs) {
    const docs = await ctx.db
      .query("spotAttempts")
      .withIndex("by_user_submodule", (q) =>
        q.eq("userId", userId).eq("submoduleSlug", slug)
      )
      .order("desc")
      .take(perSlugLimit);
    for (const d of docs) out.push(toLite(d));
  }
  return out;
}

async function countActiveLeaks(ctx: QueryCtx, userId: Id<"users">): Promise<number> {
  const leaks = await ctx.db
    .query("leaks")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("resolvedAt", undefined))
    .collect();
  return leaks.length;
}

/** KPIs globaux : accuracy, volume, streak, leaks actifs. */
export const globalKpis = query({
  args: { userId: v.id("users"), now: v.number() },
  handler: async (ctx, { userId, now }) => {
    const [attempts, activeLeaks] = await Promise.all([
      loadRecent(ctx, userId, MAX_RECENT),
      countActiveLeaks(ctx, userId),
    ]);
    return aggGlobalKpis(attempts, activeLeaks, now);
  },
});

/**
 * Points de calibration pour un kind de calibration (equity_winrate | icm_equity)
 * : estimé binné en déciles, une série par sous-module.
 */
export const calibrationPoints = query({
  args: { userId: v.id("users"), kind: v.string() },
  handler: async (ctx, { userId, kind }) => {
    if (kind !== "equity_winrate" && kind !== "icm_equity") return [];
    const slugs = SUBMODULES_BY_KIND[kind as EstimationKind];
    const attempts = await loadBySubmodules(ctx, userId, slugs, MAX_PER_SUBMODULE);
    return calibrationSeries(attempts, kind);
  },
});

/**
 * Distribution de biais pour un kind à échelle non-% (ev_bb | bubble_factor) :
 * histogramme de l'erreur signée + mean + median.
 */
export const biasDistribution = query({
  args: { userId: v.id("users"), kind: v.string() },
  handler: async (ctx, { userId, kind }) => {
    if (kind !== "ev_bb" && kind !== "bubble_factor") {
      return { bins: [], mean: 0, median: 0, count: 0, min: 0, max: 0 };
    }
    const slugs = SUBMODULES_BY_KIND[kind as EstimationKind];
    const attempts = await loadBySubmodules(ctx, userId, slugs, MAX_PER_SUBMODULE);
    return biasStats(attempts, kind);
  },
});

/** Tendance push/fold par stack depth (M5.x) : over / correct / under. */
export const nashTendency = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const attempts = await loadBySubmodules(
      ctx,
      userId,
      ["m5.1", "m5.2", "m5.3", "m5.4"],
      MAX_PER_SUBMODULE
    );
    return aggNashTendency(attempts);
  },
});

/** Accuracy par sous-module (20 entrées, fenêtre récente). */
export const accuracyBySubmodule = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const attempts = await loadRecent(ctx, userId, MAX_RECENT);
    return aggAccuracyBySubmodule(attempts, ALL_SUBMODULES);
  },
});

/** Accuracy agrégée par jour (UTC), fenêtre récente. */
export const accuracyOverTime = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const attempts = await loadRecent(ctx, userId, MAX_RECENT);
    return aggAccuracyOverTime(attempts);
  },
});

/** Prévision SM-2 : dus aujourd'hui / cette semaine / total + EF moyen. */
export const sm2Forecast = query({
  args: { userId: v.id("users"), now: v.number() },
  handler: async (ctx, { userId, now }) => {
    const progress = await ctx.db
      .query("patternProgress")
      .withIndex("by_user_pattern", (q) => q.eq("userId", userId))
      .collect();
    return aggSm2Forecast(
      progress.map((p) => ({
        nextReviewAt: p.nextReviewAt,
        easinessFactor: p.easinessFactor,
      })),
      now
    );
  },
});
