import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateAnonymousUser = mutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("users", {
      anonymousId,
      createdAt: Date.now(),
    });
  },
});

export const getUser = query({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
      .unique();
  },
});
