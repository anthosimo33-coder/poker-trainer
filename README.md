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
