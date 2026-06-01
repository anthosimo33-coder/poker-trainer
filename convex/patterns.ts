import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// Imports de VALEUR en chemins relatifs (résolus par l'esbuild de Convex).
// Les engines et le catalogue sont 100 % purs (cf. lib/sm2, lib/leaks).
import { PATTERNS, PATTERNS_BY_ID } from "../content/patterns/definitions";
import { newState, nextState, type SM2State } from "../lib/sm2/algorithm";
import { attemptToQuality, type ScoreLevel } from "../lib/sm2/quality-mapper";
import { detectLeak, type AttemptLike } from "../lib/leaks/detector";
import type { GenericSpot } from "../lib/poker/spot-generators/types";

/** Les sous-modules M·V sont à scoring binaire (push/fold, call/fold). */
function isBinarySubmodule(submoduleSlug: string): boolean {
  return submoduleSlug.startsWith("m5");
}

/** Combien d'attempts du sous-module on lit pour reconstituer la fenêtre par pattern. */
const SUBMODULE_LOOKBACK = 200;

/**
 * Recalcule l'état SM-2 et redétecte les leaks pour tous les patterns matchés
 * par un attempt. Appelée juste après `recordAttempt`.
 *
 * Idempotence : si un pattern a déjà été traité pour cet `attemptId`
 * (lastAttemptId), on le saute — un re-run ne ré-avance pas la révision.
 * Atomicité : tous les patterns d'un attempt sont traités dans la même
 * transaction Convex, donc aucune race entre patterns multiples.
 */
export const updateAfterAttempt = mutation({
  args: { attemptId: v.id("spotAttempts") },
  handler: async (ctx, { attemptId }) => {
    const attempt = await ctx.db.get(attemptId);
    if (!attempt) return;

    const spot = attempt.spotSnapshot as GenericSpot;
    const matchedPatterns = PATTERNS.filter(
      (p) => p.submoduleSlug === attempt.submoduleSlug && p.matchSpot(spot)
    );
    if (matchedPatterns.length === 0) return;

    const now = Date.now();
    const isBinary = isBinarySubmodule(attempt.submoduleSlug);
    const scoreLevel: ScoreLevel = (attempt.scoreLevel ??
      (attempt.isCorrect ? "excellent" : "faux")) as ScoreLevel;
    const quality = attemptToQuality(scoreLevel, attempt.signedError ?? 0, isBinary);

    // Une seule lecture des attempts du sous-module, réutilisée par pattern.
    // order("desc") = plus récents d'abord ; on remet en ordre chronologique.
    const recentDesc = await ctx.db
      .query("spotAttempts")
      .withIndex("by_user_submodule", (q) =>
        q.eq("userId", attempt.userId).eq("submoduleSlug", attempt.submoduleSlug)
      )
      .order("desc")
      .take(SUBMODULE_LOOKBACK);
    const chrono = [...recentDesc].reverse();

    for (const pattern of matchedPatterns) {
      // --- SM-2 (upsert idempotent) ---
      const existing = await ctx.db
        .query("patternProgress")
        .withIndex("by_user_pattern", (q) =>
          q.eq("userId", attempt.userId).eq("patternId", pattern.patternId)
        )
        .unique();

      if (existing && existing.lastAttemptId === attemptId) {
        // Déjà traité pour cet attempt : ne pas ré-avancer SM-2 ni recompter.
        continue;
      }

      const base: SM2State = existing
        ? {
            patternId: pattern.patternId,
            easinessFactor: existing.easinessFactor,
            interval: existing.interval,
            repetition: existing.repetition,
            nextReviewAt: existing.nextReviewAt,
            lastReviewedAt: existing.lastReviewedAt,
          }
        : newState(pattern.patternId);
      const next = nextState(base, quality, now);

      if (existing) {
        await ctx.db.patch(existing._id, {
          easinessFactor: next.easinessFactor,
          interval: next.interval,
          repetition: next.repetition,
          nextReviewAt: next.nextReviewAt,
          lastReviewedAt: next.lastReviewedAt,
          attemptsCount: existing.attemptsCount + 1,
          lastAttemptId: attemptId,
        });
      } else {
        await ctx.db.insert("patternProgress", {
          userId: attempt.userId,
          patternId: pattern.patternId,
          easinessFactor: next.easinessFactor,
          interval: next.interval,
          repetition: next.repetition,
          nextReviewAt: next.nextReviewAt,
          lastReviewedAt: next.lastReviewedAt,
          attemptsCount: 1,
          lastAttemptId: attemptId,
        });
      }

      // --- Leak detection sur la fenêtre du pattern ---
      const matchedAttempts: AttemptLike[] = chrono
        .filter((a) => pattern.matchSpot(a.spotSnapshot as GenericSpot))
        .map((a) => ({
          scoreLevel: a.scoreLevel,
          signedError: a.signedError,
          isCorrect: a.isCorrect,
        }));

      const leak = detectLeak(
        {
          patternId: pattern.patternId,
          label: pattern.label,
          submoduleSlug: pattern.submoduleSlug,
        },
        matchedAttempts,
        now
      );

      const existingLeak = await ctx.db
        .query("leaks")
        .withIndex("by_user_pattern", (q) =>
          q.eq("userId", attempt.userId).eq("patternId", pattern.patternId)
        )
        .filter((q) => q.eq(q.field("resolvedAt"), undefined))
        .unique();

      if (leak && !existingLeak) {
        await ctx.db.insert("leaks", { userId: attempt.userId, ...leak });
      } else if (leak && existingLeak) {
        await ctx.db.patch(existingLeak._id, {
          patternLabel: leak.patternLabel,
          severity: leak.severity,
          reasons: leak.reasons,
          attemptsAnalyzed: leak.attemptsAnalyzed,
          accuracy: leak.accuracy,
          signedErrorMedian: leak.signedErrorMedian,
          detectedAt: leak.detectedAt,
        });
      } else if (!leak && existingLeak) {
        await ctx.db.patch(existingLeak._id, { resolvedAt: now });
      }
    }
  },
});

/** Leaks actifs du user (resolvedAt absent). Instantané via index by_user_active. */
export const listActiveLeaks = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("leaks")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("resolvedAt", undefined))
      .collect();
  },
});

/**
 * Patterns dus pour révision (nextReviewAt <= now). `now` est passé par le
 * client : une query Convex est déterministe et ne peut pas appeler Date.now().
 * Filtre optionnel par sous-module (via le catalogue).
 */
export const listDuePatterns = query({
  args: {
    userId: v.id("users"),
    now: v.number(),
    submoduleSlug: v.optional(v.string()),
  },
  handler: async (ctx, { userId, now, submoduleSlug }) => {
    const due = await ctx.db
      .query("patternProgress")
      .withIndex("by_user_due", (q) => q.eq("userId", userId).lte("nextReviewAt", now))
      .collect();
    if (!submoduleSlug) return due;
    return due.filter((p) => PATTERNS_BY_ID[p.patternId]?.submoduleSlug === submoduleSlug);
  },
});

/** État SM-2 d'un pattern précis (vue debug / progression). */
export const getPatternProgress = query({
  args: { userId: v.id("users"), patternId: v.string() },
  handler: async (ctx, { userId, patternId }) => {
    return await ctx.db
      .query("patternProgress")
      .withIndex("by_user_pattern", (q) =>
        q.eq("userId", userId).eq("patternId", patternId)
      )
      .unique();
  },
});
