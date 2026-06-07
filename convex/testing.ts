import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Mutations utilitaires pour les TESTS / l'hygiène des données (S12).
 *
 * IMPORTANT — protection anti-prod : ces fonctions sont destructrices. La
 * protection vit côté APPELANT : tous les chemins de test (tests/e2e/_seed.ts,
 * _fixtures.ts, scripts/purge-test-data.ts) résolvent l'URL Convex via
 * {@link file://../tests/e2e/_guard.ts} `resolveTestConvexUrl()`, qui REFUSE de
 * cibler un déploiement de production et échoue bruyamment. La purge en masse
 * exige en plus un `confirm` explicite. Aucun de ces chemins ne peut donc
 * atteindre la prod par accident.
 *
 * Ces fonctions ne touchent QUE les données utilisateur (users + leurs lignes
 * dépendantes). Elles ne suppriment jamais le CONTENU (modules, submodules,
 * lessonBooks/Chapters/Cards).
 */

interface DependentCounts {
  attempts: number;
  sessions: number;
  sessionSpots: number;
  completions: number;
  leaks: number;
  leakPatterns: number;
  patternProgress: number;
}

function zeroCounts(): DependentCounts {
  return {
    attempts: 0,
    sessions: 0,
    sessionSpots: 0,
    completions: 0,
    leaks: 0,
    leakPatterns: 0,
    patternProgress: 0,
  };
}

/** Supprime toutes les lignes dépendantes d'un user (garde la ligne user). */
async function deleteUserDependents(
  ctx: MutationCtx,
  userId: Id<"users">,
  acc: DependentCounts
): Promise<void> {
  // sessions → sessionSpots (pas d'index by_user sur sessionSpots).
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const s of sessions) {
    const spots = await ctx.db
      .query("sessionSpots")
      .withIndex("by_session", (q) => q.eq("sessionId", s._id))
      .collect();
    for (const sp of spots) {
      await ctx.db.delete(sp._id);
      acc.sessionSpots++;
    }
    await ctx.db.delete(s._id);
    acc.sessions++;
  }
  for (const t of await ctx.db
    .query("spotAttempts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(t._id);
    acc.attempts++;
  }
  for (const t of await ctx.db
    .query("theoryCompletions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(t._id);
    acc.completions++;
  }
  for (const t of await ctx.db
    .query("leaks")
    .withIndex("by_user_active", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(t._id);
    acc.leaks++;
  }
  for (const t of await ctx.db
    .query("leakPatterns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(t._id);
    acc.leakPatterns++;
  }
  for (const t of await ctx.db
    .query("patternProgress")
    .withIndex("by_user_pattern", (q) => q.eq("userId", userId))
    .collect()) {
    await ctx.db.delete(t._id);
    acc.patternProgress++;
  }
}

/**
 * Remet à zéro l'état d'UN user de test (par anonymousId), en gardant sa ligne
 * `users`. Sert au reset par-test des e2e : ardoise propre, sans créer de nouvel
 * utilisateur (donc pas de churn). No-op si le user n'existe pas encore.
 */
export const clearUserData = mutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
      .unique();
    const counts = zeroCounts();
    if (!user) return { found: false, ...counts };
    await deleteUserDependents(ctx, user._id, counts);
    return { found: true, ...counts };
  },
});

/**
 * Purge en masse des users de TEST + leurs lignes dépendantes (déploiement
 * dev/test uniquement — garantie par la garde anti-prod de l'appelant).
 * Batché : traite au plus `limit` users par appel et renvoie `more` pour que le
 * script boucle (évite les limites de transaction Convex sur de gros volumes).
 *
 * Sélection : `all=true` purge TOUS les users (le dev n'a jamais eu de vrai
 * user) ; sinon on ne purge que ceux dont l'anonymousId commence par l'un des
 * `prefixes`.
 */
export const purgeTestUsers = mutation({
  args: {
    confirm: v.string(),
    all: v.optional(v.boolean()),
    prefixes: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { confirm, all, prefixes, limit }) => {
    if (confirm !== "PURGE_TEST_DATA") {
      throw new Error(
        "purgeTestUsers : confirm requis ('PURGE_TEST_DATA'). Abandon."
      );
    }
    if (!all && (!prefixes || prefixes.length === 0)) {
      throw new Error(
        "purgeTestUsers : préciser `all: true` ou une liste de `prefixes`."
      );
    }
    const batch = limit ?? 100;
    // On prend un peu plus que `batch` pour savoir s'il en reste (more).
    const candidates = await ctx.db.query("users").take(batch + 1);
    const matching = candidates.filter(
      (u) => all || (prefixes ?? []).some((p) => u.anonymousId.startsWith(p))
    );
    const toProcess = matching.slice(0, batch);

    const counts = zeroCounts();
    let users = 0;
    for (const u of toProcess) {
      await deleteUserDependents(ctx, u._id, counts);
      await ctx.db.delete(u._id);
      users++;
    }
    // `more` : il restait au moins un candidat au-delà du batch traité.
    const more = matching.length > toProcess.length || candidates.length > batch;
    return { users, more, ...counts };
  },
});

/** Compte les users (pour le reporting de purge). */
export const countUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return { total: users.length };
  },
});
