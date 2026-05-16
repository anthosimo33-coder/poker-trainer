import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Pour l'instant, auth anonyme : on crée un user au premier accès et on stocke un identifiant local.
    anonymousId: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_anonymousId", ["anonymousId"]),

  modules: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    orderIndex: v.number(),
    unlockThreshold: v.number(), // accuracy % nécessaire pour débloquer le suivant
  }).index("by_slug", ["slug"]),

  submodules: defineTable({
    slug: v.string(),
    moduleSlug: v.string(),
    name: v.string(),
    description: v.string(),
    orderIndex: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_module", ["moduleSlug"]),

  spotAttempts: defineTable({
    userId: v.id("users"),
    submoduleSlug: v.string(),
    spotId: v.string(),
    // Snapshot du spot servi (cartes, stacks, pot, bet, position) pour pouvoir le rejouer/audit
    spotSnapshot: v.any(),
    // Réponse attendue
    expected: v.any(),
    // Réponse utilisateur
    userAnswer: v.any(),
    isCorrect: v.boolean(),
    timeMs: v.number(),
    hintUsed: v.boolean(),
    attemptedAt: v.number(),
    // Pour spaced repetition (S6+)
    nextReviewAt: v.optional(v.number()),
    repetitionCount: v.number(),
    easeFactor: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_submodule", ["userId", "submoduleSlug"])
    .index("by_user_attemptedAt", ["userId", "attemptedAt"]),

  sessions: defineTable({
    userId: v.id("users"),
    moduleSlug: v.string(),
    submoduleSlug: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    totalSpots: v.number(),
    correctSpots: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_startedAt", ["userId", "startedAt"]),

  sessionSpots: defineTable({
    sessionId: v.id("sessions"),
    attemptId: v.id("spotAttempts"),
    orderIndex: v.number(),
  })
    .index("by_session", ["sessionId"]),

  leakPatterns: defineTable({
    userId: v.id("users"),
    submoduleSlug: v.string(),
    patternType: v.string(),
    detectedAt: v.number(),
    evidenceAttempts: v.number(),
    active: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "active"]),

  // === Leçon (seedée en S5, table définie pour cohérence) ===
  lessonBooks: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    orderIndex: v.number(),
  }).index("by_slug", ["slug"]),

  lessonChapters: defineTable({
    slug: v.string(),
    bookSlug: v.string(),
    name: v.string(),
    contentMd: v.string(),
    orderIndex: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_book", ["bookSlug"]),

  lessonCards: defineTable({
    slug: v.string(),
    bookSlug: v.string(),
    term: v.string(),
    shortDef: v.string(),
    fullContentMd: v.string(),
    relatedCardSlugs: v.array(v.string()),
    searchKeywords: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_book", ["bookSlug"]),

  theoryCompletions: defineTable({
    userId: v.id("users"),
    submoduleSlug: v.string(),
    completedAt: v.number(),
    quickCheckScore: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_submodule", ["userId", "submoduleSlug"]),
});
