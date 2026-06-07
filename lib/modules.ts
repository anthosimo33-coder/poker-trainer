/**
 * Catalogue canonique des modules / sous-modules de la formation (S12).
 *
 * Source unique partagée par l'Atelier (`app/(app)/page.tsx`) et les index
 * `/drill` et `/theory`. Évite une 3ᵉ copie de la même structure. Les libellés
 * courts par sous-module (pages /leaks, /stats, header de drill) restent locaux
 * à ces surfaces car ils ont des contraintes d'affichage différentes.
 */

export interface SubmoduleDef {
  /** Slug DB, format point : "m1.1". */
  slug: string;
  /** Slug URL, format tiret : "m1-1". */
  urlSlug: string;
  title: string;
  available: boolean;
}

export interface ModuleDef {
  /** Slug module : "m1". */
  slug: string;
  /** Badge affiché : "M·I". */
  badge: string;
  title: string;
  desc: string;
  available: boolean;
  submodules: SubmoduleDef[];
}

export const MODULES: ModuleDef[] = [
  {
    slug: "m1",
    badge: "M·I",
    title: "Pot odds & cotes implicites",
    desc: "Calcul mental de l'equity requise face à toute mise",
    available: true,
    submodules: [
      { slug: "m1.1", urlSlug: "m1-1", title: "Pot odds basiques", available: true },
      { slug: "m1.2", urlSlug: "m1-2", title: "Conversion ratio ↔ pourcentage", available: true },
      { slug: "m1.3", urlSlug: "m1-3", title: "Cotes implicites", available: true },
      { slug: "m1.4", urlSlug: "m1-4", title: "Reverse implied odds", available: true },
    ],
  },
  {
    slug: "m2",
    badge: "M·II",
    title: "Equity & outs",
    desc: "Évaluer la force de ta main face à un range, heads-up et multiway",
    available: true,
    submodules: [
      { slug: "m2.1", urlSlug: "m2-1", title: "Outs et règle des 4&2", available: true },
      { slug: "m2.2", urlSlug: "m2-2", title: "Equity heads-up précise", available: true },
      { slug: "m2.3", urlSlug: "m2-3", title: "Equity multiway", available: true },
      { slug: "m2.4", urlSlug: "m2-4", title: "Equity vs range", available: true },
    ],
  },
  {
    slug: "m3",
    badge: "M·III",
    title: "EV de décisions composites",
    desc: "Push/fold, 3bet, check-raise — pondération multi-branches",
    available: true,
    submodules: [
      { slug: "m3.1", urlSlug: "m3-1", title: "Push/fold sub-15bb", available: true },
      { slug: "m3.2", urlSlug: "m3-2", title: "Fold equity et décomposition", available: true },
      { slug: "m3.3", urlSlug: "m3-3", title: "EV composites multi-branches", available: true },
      { slug: "m3.4", urlSlug: "m3-4", title: "Check-raise et lignes complexes", available: true },
    ],
  },
  {
    slug: "m4",
    badge: "M·IV",
    title: "ICM — bulle & table finale",
    desc: "Pondération Malmuth-Harville, bubble factor, payouts MTT",
    available: true,
    submodules: [
      { slug: "m4.1", urlSlug: "m4-1", title: "Calcul équité ICM", available: true },
      { slug: "m4.2", urlSlug: "m4-2", title: "Bubble factor et risk premium", available: true },
      { slug: "m4.3", urlSlug: "m4-3", title: "Adjustments par position", available: true },
      { slug: "m4.4", urlSlug: "m4-4", title: "Table finale ICM", available: true },
    ],
  },
  {
    slug: "m5",
    badge: "M·V",
    title: "Ranges Nash push/fold",
    desc: "L'arsenal sub-15bb : mémorisation des ranges optimales",
    available: true,
    submodules: [
      { slug: "m5.1", urlSlug: "m5-1", title: "SB push range Nash", available: true },
      { slug: "m5.2", urlSlug: "m5-2", title: "BB call vs SB push", available: true },
      { slug: "m5.3", urlSlug: "m5-3", title: "BTN push range Nash", available: true },
      { slug: "m5.4", urlSlug: "m5-4", title: "Call ranges par position", available: true },
    ],
  },
];
