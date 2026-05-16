import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const recordCompletion = mutation({
  args: {
    userId: v.id("users"),
    submoduleSlug: v.string(),
    quickCheckScore: v.number(),
  },
  handler: async (ctx, args) => {
    // Update si existe, insert sinon
    const existing = await ctx.db
      .query("theoryCompletions")
      .withIndex("by_user_submodule", (q) =>
        q.eq("userId", args.userId).eq("submoduleSlug", args.submoduleSlug)
      )
      .unique();
    if (existing) {
      // On garde le meilleur score
      if (args.quickCheckScore > existing.quickCheckScore) {
        await ctx.db.patch(existing._id, {
          quickCheckScore: args.quickCheckScore,
          completedAt: Date.now(),
        });
      }
      return existing._id;
    }
    return await ctx.db.insert("theoryCompletions", {
      userId: args.userId,
      submoduleSlug: args.submoduleSlug,
      completedAt: Date.now(),
      quickCheckScore: args.quickCheckScore,
    });
  },
});

export const getCompletion = query({
  args: { userId: v.id("users"), submoduleSlug: v.string() },
  handler: async (ctx, { userId, submoduleSlug }) => {
    return await ctx.db
      .query("theoryCompletions")
      .withIndex("by_user_submodule", (q) =>
        q.eq("userId", userId).eq("submoduleSlug", submoduleSlug)
      )
      .unique();
  },
});

export const listCompletions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("theoryCompletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
