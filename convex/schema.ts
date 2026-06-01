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
    // Erreur signée pour les drills à composante numérique (estimation user −
    // vraie valeur). Fonde le calibration tracking de S11. Optionnel : les
    // drills juste/faux purs (M1.1 ratio exact) ne le renseignent pas, et les
    // attempts M1.x existants restent valides sans migration.
    signedError: v.optional(v.number()),
    // Niveau de score nuancé ("excellent"|"juste"|"proche"|"faux"). Alimente le
    // mapping qualité SM-2 (S10). Optionnel : les attempts d'avant S10 restent
    // valides ; le leak detector retombe alors sur isCorrect.
    scoreLevel: v.optional(v.string()),
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

  // === SM-2 spaced repetition (S10) : un état de révision par (user, pattern). ===
  patternProgress: defineTable({
    userId: v.id("users"),
    patternId: v.string(),
    easinessFactor: v.number(),
    interval: v.number(),
    repetition: v.number(),
    nextReviewAt: v.number(),
    lastReviewedAt: v.number(),
    attemptsCount: v.number(),
    // Dernier attempt traité — garde-fou d'idempotence (re-run ne ré-avance pas SM-2).
    lastAttemptId: v.optional(v.id("spotAttempts")),
  })
    .index("by_user_pattern", ["userId", "patternId"])
    .index("by_user_due", ["userId", "nextReviewAt"]),

  // === Leak detection (S10) : un leak actif (resolvedAt absent) ou résolu par pattern. ===
  leaks: defineTable({
    userId: v.id("users"),
    patternId: v.string(),
    patternLabel: v.string(),
    submoduleSlug: v.string(),
    severity: v.string(), // "minor" | "moderate" | "severe"
    reasons: v.array(
      v.union(
        v.object({
          type: v.literal("low-accuracy"),
          accuracy: v.number(),
          threshold: v.number(),
        }),
        v.object({
          type: v.literal("signed-bias-high"),
          median: v.number(),
          threshold: v.number(),
          direction: v.union(v.literal("over"), v.literal("under")),
        })
      )
    ),
    attemptsAnalyzed: v.number(),
    accuracy: v.number(),
    signedErrorMedian: v.number(),
    detectedAt: v.number(),
    resolvedAt: v.optional(v.number()), // absent = leak actif
  })
    .index("by_user_active", ["userId", "resolvedAt"])
    .index("by_user_pattern", ["userId", "patternId"]),

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
