# Screenshots S12 — production readiness + passe UX

Régénérables : serveur dev lancé (`pnpm dev:next`) puis `pnpm screenshots:s12`
(anonIds de test fixes + reset → aucun churn). Les « before » des stubs se
recapturent via `git checkout <s11> -- app/(app)/{drill,theory}/page.tsx` puis
`tsx scripts/screenshots-s12.ts --before`.

## Changements visuels — avant / après

Les **deux seuls** changements visuels de S12 sont les pages d'index `/drill` et
`/theory`, qui étaient des stubs « sera construit dans une prochaine session ».

| Avant (stub) | Après (index) |
| --- | --- |
| `drill-stub-before.png` | `drill-index.png` |
| `theory-stub-before.png` | `theory-index.png` |

Le refactor de l'Atelier (passage sur `lib/modules`) est **visuellement
identique** (sortie inchangée) — pas de before/after.

## États vides (inchangés, capturés pour la passe de cohérence)

- `atelier-empty.png` — Atelier, user vierge (Bienvenue, métriques à 0).
- `leaks-empty.png` — `/leaks` sans leak (message + CTA « Aller drillet → »).
- `stats-empty.png` — `/stats` sans donnée (KPIs à 0 + empty state calibration).

## États peuplés (contraste)

- `stats-seeded.png` — `/stats` avec données (calibration, biais, tendance Nash…).
- `leaks-seeded.png` — `/leaks` avec un leak détecté.
