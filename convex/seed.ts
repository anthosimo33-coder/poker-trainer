import { internalMutation } from "./_generated/server";

export const seedModules = internalMutation({
  args: {},
  handler: async (ctx) => {
    const MODULES = [
      { slug: "m1", name: "Pot odds & cotes implicites", description: "Calcul mental de l'equity requise face à toute mise", orderIndex: 1, unlockThreshold: 80 },
      { slug: "m2", name: "Equity & outs", description: "Évaluer la force de ta main face à un range", orderIndex: 2, unlockThreshold: 80 },
      { slug: "m3", name: "EV de décisions composites", description: "Push/fold, 3bet, check-raise", orderIndex: 3, unlockThreshold: 80 },
      { slug: "m4", name: "ICM — bulle & table finale", description: "Pondération Malmuth-Harville, bubble factor", orderIndex: 4, unlockThreshold: 80 },
      { slug: "m5", name: "Ranges Nash push/fold", description: "Ranges optimales sub-15bb par position", orderIndex: 5, unlockThreshold: 80 },
    ];

    const SUBMODULES = [
      { slug: "m1.1", moduleSlug: "m1", name: "Pot odds basiques", description: "Calcul direct de la cote et de l'equity requise", orderIndex: 1 },
      { slug: "m1.2", moduleSlug: "m1", name: "Pot odds en pourcentage vs ratio", description: "Conversion fluide entre les deux formats", orderIndex: 2 },
      { slug: "m1.3", moduleSlug: "m1", name: "Cotes implicites", description: "Estimation du futur revenue", orderIndex: 3 },
      { slug: "m1.4", moduleSlug: "m1", name: "Reverse implied odds", description: "Estimation des pertes futures probables", orderIndex: 4 },
      // M·II — Equity & outs (S6a : m2.1 jouable ; m2.2-m2.4 seedés mais lockés UI jusqu'à S6b/c)
      { slug: "m2.1", moduleSlug: "m2", name: "Outs et règle des 4&2", description: "Compter les outs et estimer l'equity par la règle des 4 et 2", orderIndex: 1 },
      { slug: "m2.2", moduleSlug: "m2", name: "Equity heads-up précise", description: "Equity exacte d'une main face à une main", orderIndex: 2 },
      { slug: "m2.3", moduleSlug: "m2", name: "Equity multiway", description: "Equity face à plusieurs adversaires", orderIndex: 3 },
      { slug: "m2.4", moduleSlug: "m2", name: "Equity vs range", description: "Equity d'une main face à un range complet", orderIndex: 4 },
    ];

    for (const mod of MODULES) {
      const existing = await ctx.db
        .query("modules")
        .withIndex("by_slug", (q) => q.eq("slug", mod.slug))
        .unique();
      if (!existing) await ctx.db.insert("modules", mod);
    }
    for (const sub of SUBMODULES) {
      const existing = await ctx.db
        .query("submodules")
        .withIndex("by_slug", (q) => q.eq("slug", sub.slug))
        .unique();
      if (!existing) await ctx.db.insert("submodules", sub);
    }

    return { modules: MODULES.length, submodules: SUBMODULES.length };
  },
});
