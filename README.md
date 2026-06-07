# Poker Trainer

Logiciel d'entraînement mathématique au poker MTT — niveau pro.

## Commandes

```bash
pnpm dev              # Lance Next.js + Convex en parallèle
pnpm dev:next         # Next.js seul
pnpm dev:convex       # Convex seul
pnpm test             # Tests Vitest en watch
pnpm test:run         # Tests une seule fois
pnpm build            # Build production
```

## Setup initial

Après le premier `pnpm dev:convex` (ou `pnpm dlx convex dev --once`) qui déploie le schema,
seeder les modules/sous-modules une fois :

```bash
pnpm dlx convex run seed:seedModules   # → { modules: 5, submodules: 8 }
```

> Note : l'app ne **lit** pas les tables `modules`/`submodules` (l'Atelier et les
> index utilisent `lib/modules.ts` ; les drills, des slugs string). Ce seed est
> optionnel. Le contenu Leçon, lui, doit être seedé : `pnpm seed:lessons`.

## Déploiement & tests

- **`DEPLOYMENT.md`** — runbook de mise en ligne Vercel + Convex prod (+ rollback).
- **`TESTING.md`** — run e2e reproductible, identité de test anti-churn, garde
  anti-prod, purge des données de test.

## Stack

- Next.js 14 + TypeScript + Tailwind
- Convex (backend/DB/auth)
- pokersolver (évaluation 7-card, Cactus Kev)
- Vitest

## Structure

- `app/` — pages Next.js (App Router)
- `convex/` — backend Convex (schema, queries, mutations)
- `lib/poker/` — logique poker pure (cards, evaluator, equity à venir)
- `tests/` — tests Vitest
