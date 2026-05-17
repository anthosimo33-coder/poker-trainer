import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============== QUERIES ==============

export const listBooks = query({
  args: {},
  handler: async (ctx) => {
    const books = await ctx.db.query("lessonBooks").collect();
    return books.sort((a, b) => a.orderIndex - b.orderIndex);
  },
});

export const getBook = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("lessonBooks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const listChaptersForBook = query({
  args: { bookSlug: v.string() },
  handler: async (ctx, { bookSlug }) => {
    const chapters = await ctx.db
      .query("lessonChapters")
      .withIndex("by_book", (q) => q.eq("bookSlug", bookSlug))
      .collect();
    return chapters.sort((a, b) => a.orderIndex - b.orderIndex);
  },
});

export const getChapter = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("lessonChapters")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const listCardsForBook = query({
  args: { bookSlug: v.string() },
  handler: async (ctx, { bookSlug }) => {
    return await ctx.db
      .query("lessonCards")
      .withIndex("by_book", (q) => q.eq("bookSlug", bookSlug))
      .collect();
  },
});

export const listAllCards = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("lessonCards").collect();
  },
});

export const getCard = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("lessonCards")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/**
 * Retourne les fiches qui matchent les slugs fournis, tous livres confondus.
 * Maintient l'ordre des slugs reçus pour préserver l'intention pédagogique.
 */
export const getCardsBySlugs = query({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, { slugs }) => {
    if (slugs.length === 0) return [];
    const cards = await Promise.all(
      slugs.map((slug) =>
        ctx.db
          .query("lessonCards")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique()
      )
    );
    // Filtre les nulls (slugs introuvables) en gardant l'ordre
    return cards.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

/**
 * Recherche full-text simple : matche sur term + shortDef + searchKeywords.
 * Insensible à la casse, basée sur sous-chaîne.
 * Filtres optionnels par livre.
 */
export const searchCards = query({
  args: {
    query: v.string(),
    bookSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, bookSlug, limit = 30 }) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const allCards = bookSlug
      ? await ctx.db
          .query("lessonCards")
          .withIndex("by_book", (qb) => qb.eq("bookSlug", bookSlug))
          .collect()
      : await ctx.db.query("lessonCards").collect();

    // Scoring : term exact match > term prefix > shortDef > searchKeywords
    const scored = allCards
      .map((card) => {
        const term = card.term.toLowerCase();
        const shortDef = card.shortDef.toLowerCase();
        const keywords = card.searchKeywords.toLowerCase();

        let score = 0;
        if (term === q) score += 100;
        else if (term.startsWith(q)) score += 50;
        else if (term.includes(q)) score += 30;
        if (shortDef.includes(q)) score += 10;
        if (keywords.includes(q)) score += 5;

        return { card, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.card);
  },
});

// ============== SEED (mutations publiques — projet perso, à protéger avec auth plus tard) ==============

export const seedLessons = mutation({
  args: {},
  handler: async (ctx) => {
    const BOOKS = [
      {
        slug: "mecaniques",
        name: "Mécaniques",
        description:
          "Le déroulement d'une main, les positions, les actions, les blinds, le classement des mains, les spécificités tournois.",
        orderIndex: 1,
      },
      {
        slug: "strategie",
        name: "Stratégie",
        description:
          "Hand selection par position, importance de la position, agressivité, stack-to-pot ratio, M-ratio, notion de range.",
        orderIndex: 2,
      },
      {
        slug: "lexique",
        name: "Lexique",
        description:
          "Tous les termes techniques (3bet, squeeze, c-bet, polarized…), la notation des mains, la notation des ranges.",
        orderIndex: 3,
      },
    ];

    for (const book of BOOKS) {
      const existing = await ctx.db
        .query("lessonBooks")
        .withIndex("by_slug", (q) => q.eq("slug", book.slug))
        .unique();
      if (!existing) await ctx.db.insert("lessonBooks", book);
    }

    return { books: BOOKS.length };
  },
});

/**
 * Seed des chapitres et fiches d'un livre.
 * Idempotent : insère si absent, met à jour si existant.
 */
export const seedBookContent = mutation({
  args: {
    bookSlug: v.string(),
    chapters: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        contentMd: v.string(),
        orderIndex: v.number(),
      })
    ),
    cards: v.array(
      v.object({
        slug: v.string(),
        term: v.string(),
        shortDef: v.string(),
        fullContentMd: v.string(),
        relatedCardSlugs: v.array(v.string()),
        searchKeywords: v.string(),
      })
    ),
  },
  handler: async (ctx, { bookSlug, chapters, cards }) => {
    for (const chapter of chapters) {
      const existing = await ctx.db
        .query("lessonChapters")
        .withIndex("by_slug", (q) => q.eq("slug", chapter.slug))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { ...chapter, bookSlug });
      } else {
        await ctx.db.insert("lessonChapters", { ...chapter, bookSlug });
      }
    }
    for (const card of cards) {
      const existing = await ctx.db
        .query("lessonCards")
        .withIndex("by_slug", (q) => q.eq("slug", card.slug))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { ...card, bookSlug });
      } else {
        await ctx.db.insert("lessonCards", { ...card, bookSlug });
      }
    }
    return { chapters: chapters.length, cards: cards.length };
  },
});
