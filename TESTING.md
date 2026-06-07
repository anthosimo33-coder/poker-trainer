# Tests & hygiène des données

## Tests unitaires (Vitest)

```bash
pnpm test:run        # une passe (≈ 380 tests)
pnpm test            # watch
```

## E2E (Playwright) — run reproductible 100 %

La flakiness e2e historique (S7c→S11) vient **uniquement** du mode dev de Next :
les routes compilent paresseusement, et en parallèle plusieurs workers tapent des
routes encore froides → timeouts intermittents sur la 1ʳᵉ assertion. Ce n'est pas
un bug applicatif (en prod, `next build` précompile tout).

**Mode reproductible (recommandé)** — serveur chaud + un seul worker :

```bash
# 1. Lancer le serveur dev (dans un terminal séparé) et le laisser tourner
pnpm dev:next

# 2. Précompiler chaque pattern de route, puis lancer les e2e en single-worker
pnpm test:e2e:stable          # = warm-routes + playwright --workers=1
```

Ou manuellement :

```bash
pnpm warm                     # curl séquentiel de chaque pattern de route
pnpm test:e2e --workers=1     # réutilise le serveur lancé (reuseExistingServer)
```

Le run par défaut `pnpm test:e2e` (parallèle, sans warm-up) reste utilisable mais
peut montrer des échecs cold-compile intermittents au premier passage ; relancer
ou utiliser le mode stable ci-dessus.

## Identité de test & anti-churn

- Chaque test e2e utilise un **anonId déterministe par test** (préfixe
  `e2e-test-`), injecté dans `localStorage` et **remis à zéro** avant le test
  (`tests/e2e/_fixtures.ts` → `clearUserData`). Conséquence : un ensemble **borné**
  de users de test (un par test), réutilisés d'un run à l'autre — **plus de
  churn** (le diag S11 montrait 496+ users accumulés par contextes navigateur
  neufs).
- Le chemin d'écriture exercé reste le **vrai** (`recordAttempt` →
  `updateAfterAttempt`) ; seul le déclencheur (anonId) est fixé.

## Garde anti-prod

Toute opération de test qui écrit/purge passe par
`tests/e2e/_guard.ts` → `resolveTestConvexUrl()`, qui **refuse bruyamment** si la
cible Convex est (ou pourrait être) la production :

- `CONVEX_DEPLOYMENT=prod:…` → refus ;
- URL incohérente avec le déploiement déclaré (URL prod, deployment dev) → refus ;
- variables absentes → refus.

Couvert par `tests/guard.test.ts`. Il est donc **impossible** d'écrire ou de
purger des données de test en prod par accident.

## Purge des données de test (dev uniquement)

```bash
pnpm purge:test-data            # purge TOUS les users dev + dépendants (dev = 100 % test)
pnpm purge:test-data --prefix e2e-test-    # purge ciblée par préfixe
pnpm purge:test-data --dry      # compte seulement
```

Ne touche jamais le **contenu** (modules / submodules / lessons). La garde
anti-prod s'applique (refus si la cible est la prod).
