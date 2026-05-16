import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startSession = mutation({
  args: {
    userId: v.id("users"),
    moduleSlug: v.string(),
    submoduleSlug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      ...args,
      startedAt: Date.now(),
      totalSpots: 0,
      correctSpots: 0,
    });
  },
});

export const addSpotToSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    attemptId: v.id("spotAttempts"),
    orderIndex: v.number(),
    isCorrect: v.boolean(),
  },
  handler: async (ctx, { sessionId, attemptId, orderIndex, isCorrect }) => {
    await ctx.db.insert("sessionSpots", { sessionId, attemptId, orderIndex });
    const session = await ctx.db.get(sessionId);
    if (session) {
      await ctx.db.patch(sessionId, {
        totalSpots: session.totalSpots + 1,
        correctSpots: session.correctSpots + (isCorrect ? 1 : 0),
      });
    }
  },
});

export const endSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { endedAt: Date.now() });
  },
});

export const getSessionWithSpots = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const sessionSpots = await ctx.db
      .query("sessionSpots")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const sortedSpots = sessionSpots.sort((a, b) => a.orderIndex - b.orderIndex);
    const attempts = await Promise.all(
      sortedSpots.map((s) => ctx.db.get(s.attemptId))
    );
    return {
      session,
      attempts: attempts.filter((a) => a !== null),
    };
  },
});
