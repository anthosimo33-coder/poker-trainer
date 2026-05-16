import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const recordAttempt = mutation({
  args: {
    userId: v.id("users"),
    submoduleSlug: v.string(),
    spotId: v.string(),
    spotSnapshot: v.any(),
    expected: v.any(),
    userAnswer: v.any(),
    isCorrect: v.boolean(),
    timeMs: v.number(),
    hintUsed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("spotAttempts", {
      ...args,
      attemptedAt: Date.now(),
      repetitionCount: 0,
      easeFactor: 2.5,
    });
  },
});

export const listRecentAttempts = query({
  args: { userId: v.id("users"), limit: v.number() },
  handler: async (ctx, { userId, limit }) => {
    return await ctx.db
      .query("spotAttempts")
      .withIndex("by_user_attemptedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const getSubmoduleStats = query({
  args: { userId: v.id("users"), submoduleSlug: v.string(), lastN: v.optional(v.number()) },
  handler: async (ctx, { userId, submoduleSlug, lastN = 30 }) => {
    const attempts = await ctx.db
      .query("spotAttempts")
      .withIndex("by_user_submodule", (q) =>
        q.eq("userId", userId).eq("submoduleSlug", submoduleSlug)
      )
      .order("desc")
      .take(lastN);
    if (attempts.length === 0) {
      return { totalAttempts: 0, correctAttempts: 0, accuracy: 0, avgTimeMs: 0 };
    }
    const correctAttempts = attempts.filter((a) => a.isCorrect).length;
    const avgTimeMs = Math.round(attempts.reduce((s, a) => s + a.timeMs, 0) / attempts.length);
    return {
      totalAttempts: attempts.length,
      correctAttempts,
      accuracy: (correctAttempts / attempts.length) * 100,
      avgTimeMs,
    };
  },
});

export const getGlobalStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const attempts = await ctx.db
      .query("spotAttempts")
      .withIndex("by_user_attemptedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000); // dernier 1000 pour stats globales
    if (attempts.length === 0) {
      return { totalAttempts: 0, accuracy: 0, currentStreakDays: 0 };
    }
    const correct = attempts.filter((a) => a.isCorrect).length;

    // Streak : nombre de jours consécutifs avec au moins 1 attempt
    const days = new Set(
      attempts.map((a) => new Date(a.attemptedAt).toISOString().slice(0, 10))
    );
    const sortedDays = Array.from(days).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    // Le streak commence aujourd'hui ou hier (tolérance)
    if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
      streak = 0;
    } else {
      let cursor = new Date(sortedDays[0] + "T00:00:00");
      for (const d of sortedDays) {
        if (d === cursor.toISOString().slice(0, 10)) {
          streak++;
          cursor = new Date(cursor.getTime() - 86400_000);
        } else {
          break;
        }
      }
    }

    return {
      totalAttempts: attempts.length,
      accuracy: (correct / attempts.length) * 100,
      currentStreakDays: streak,
    };
  },
});
