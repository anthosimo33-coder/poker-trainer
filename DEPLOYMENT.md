# Déploiement — Poker Trainer (Vercel + Convex prod)

Runbook vérifié pour mettre l'application en ligne. Conçu pour être exécuté par
quelqu'un qui n'a **jamais** déployé ce projet. Suivre les étapes dans l'ordre.

Flux validé contre la doc officielle Convex (production hosting / Vercel,
juin 2026). La commande clé est `npx convex deploy --cmd 'pnpm build'` : elle
pousse les fonctions Convex **et** build Next en injectant l'URL du déploiement
**prod** — voir l'étape 4.

---

## 0. Architecture & ce que « prod » contient au démarrage

- **Frontend** : Next.js 14 (App Router) hébergé sur **Vercel**.
- **Backend / DB** : un déploiement Convex **production**, distinct du déploiement
  `dev` utilisé en local (`dev:ceaseless-lemming-498`).
- **Auth** : anonyme via `localStorage` (`poker-trainer.anonymousId`). Aucun
  service externe, aucune dépendance à un état dev — le bootstrap (durci en S11,
  `hooks/useEnsuredUserId.ts`) crée l'utilisateur au premier accès, identique en
  prod.
- **La prod démarre VIERGE** : 0 user, 0 attempt, 0 leak. Le premier utilisateur
  réel sera le premier `users` créé. Seul le **contenu** (fiches Leçon) doit être
  seedé une fois — voir l'étape 5.

> ⚠️ Les données de **test** (users e2e, attempts, leaks générés par
> `tests/e2e/_seed.ts`) ne peuvent **jamais** atteindre la prod : une garde
> anti-prod fait échouer le seed/purge si l'URL ne pointe pas sur le déploiement
> de test. Voir [Hygiène des données](#8-hygiène-des-données-rappel).

---

## 1. Prérequis

- Un compte **Vercel** et un compte **Convex** (déjà le cas : team `thumbai`,
  projet `poker-trainer`).
- Le repo poussé sur un remote Git (GitHub/GitLab/Bitbucket) que Vercel peut lire.
  > Vérifier : `git remote -v`. S'il n'y en a pas, créer un repo distant et
  > `git push -u origin main` avant de continuer.
- `pnpm` installé localement (pour le seed de contenu de l'étape 5).
- Build local au vert (déjà vérifié cette session) :
  ```bash
  pnpm build        # → ✓ Compiled successfully, 0 erreur, 0 warning
  ```

---

## 2. Créer le déploiement Convex de production

1. Ouvrir le dashboard Convex du projet :
   <https://dashboard.convex.dev/d/ceaseless-lemming-498> (déploiement **dev**),
   puis basculer sur le projet `poker-trainer`.
2. Créer / sélectionner le déploiement **Production** du projet (onglet de
   sélection de déploiement en haut → **Production**). C'est un déploiement
   séparé du dev ; il est vide au départ.

> Rien à pousser manuellement ici : les fonctions et le schéma seront poussés
> automatiquement par `convex deploy` au premier build Vercel (étape 4).

---

## 3. Générer la clé de déploiement production

1. Dans le dashboard, déploiement **Production** → **Settings** → onglet
   **General**.
2. Cliquer **Generate Production Deploy Key**.
3. **Copier** la clé (elle commence par `prod:`). Elle ne sera ré-affichée qu'une
   fois — la régénérer si perdue.

---

## 4. Configurer le projet Vercel

1. Sur Vercel : **Add New… → Project** → importer le repo Git.
2. **Framework Preset** : Next.js (auto-détecté). **Install Command** : laisser
   par défaut (Vercel détecte `pnpm` via `pnpm-lock.yaml`).
3. **Build Command** : remplacer par exactement :
   ```
   npx convex deploy --cmd 'pnpm build'
   ```
   - `npx convex` résout le binaire local (convex est une dépendance).
   - Équivalent `npm` si préféré : `npx convex deploy --cmd 'npm run build'`.
   - Cette commande lit `CONVEX_DEPLOY_KEY`, pousse les fonctions Convex sur le
     déploiement **prod**, **détecte automatiquement Next.js** et exporte
     `NEXT_PUBLIC_CONVEX_URL` (l'URL prod) dans l'environnement du build, puis
     lance `pnpm build`. Aucun flag `--cmd-url-env-var-name` n'est nécessaire :
     la détection auto Next.js suffit.
4. **Environment Variables** → ajouter :

   | Name                | Value                          | Environments |
   | ------------------- | ------------------------------ | ------------ |
   | `CONVEX_DEPLOY_KEY` | *(la clé `prod:` de l'étape 3)* | **Production** uniquement |

   - **Ne PAS** définir `NEXT_PUBLIC_CONVEX_URL` à la main : `convex deploy`
     l'injecte au build à partir de la clé. La définir manuellement risquerait de
     pointer la prod sur le mauvais déploiement.
   - Restreindre la clé à **Production** : les builds Preview ne doivent pas
     pousser sur le déploiement prod. (Pour activer plus tard des Preview
     Deployments Convex, générer une *Preview Deploy Key* dédiée et la scoper
     Preview — hors périmètre v1.)

---

## 5. Première mise en ligne + seed du contenu

1. Lancer le premier déploiement (push sur la branche de prod, ou **Deploy**
   depuis Vercel). Le build doit afficher, dans les logs Vercel, le push des
   fonctions Convex puis `✓ Compiled successfully`.
2. **Seeder le contenu Leçon** (obligatoire — sinon `/lesson` est vide). Le
   contenu se seede en pointant le script sur l'URL **prod** (récupérable dans le
   dashboard prod, onglet Settings, ou dans les logs de build) :
   ```bash
   NEXT_PUBLIC_CONVEX_URL='https://<prod-name>.convex.cloud' pnpm seed:lessons
   # → ✓ Books seedés ; Livre I/II/III chapitres + fiches
   ```
   Idempotent : ré-exécutable sans dupliquer.
3. *(Optionnel)* Seeder les tables `modules`/`submodules` (l'app ne les **lit
   pas** — l'Atelier utilise des données en dur et les drills des slugs string —
   mais c'est inclus pour cohérence) :
   ```bash
   npx convex run seed:seedModules --prod   # → { modules: 5, submodules: 8 }
   ```

---

## 6. Vérification post-déploiement (smoke test)

Sur l'URL de production, vérifier rapidement :

- [ ] `/` (Atelier) charge — bandeau « Bienvenue Serge / Première session ».
- [ ] La nav 6 entrées fonctionne ; `/drill` et `/theory` affichent leur index
      (pas d'écran vide), `/leaks` et `/stats` affichent leurs états vides
      propres (0 leak / 0 donnée).
- [ ] `/lesson` liste bien les 3 livres avec leurs compteurs de fiches (preuve
      que le seed de l'étape 5 a fonctionné).
- [ ] Ouvrir un sous-module : lire la théorie → passer le quick check →
      le drill se déverrouille → valider un spot → l'attempt est **persisté**
      (recharger : le compteur d'attempts a augmenté ; `/stats` se peuple).
- [ ] Dashboard Convex **prod** → Data → `users` contient **ton** user (le
      premier réel), et `spotAttempts` les attempts du smoke test. **Aucune**
      donnée de test parasite.

---

## 7. Rollback

Le rollback se fait des **deux** côtés (front + backend) :

- **Vercel (frontend)** : Project → **Deployments** → choisir le déploiement
  précédent stable → menu **⋯ → Promote to Production** (ou *Instant Rollback*).
  Réaffecte instantanément le trafic à l'ancien build.
- **Convex (backend/fonctions)** : les fonctions sont versionnées par
  déploiement. Pour revenir à une version antérieure des fonctions, re-déployer
  le commit précédent (re-promote le déploiement Vercel correspondant relance
  `convex deploy` sur ce commit) **ou** depuis le dashboard prod consulter
  l'historique des push. Les **migrations de données** ne sont pas
  auto-réversibles : le schéma de cette v1 est purement additif (`v.optional`)
  donc un retour arrière des fonctions reste compatible avec les données déjà
  écrites.

> Règle : après un rollback frontend, vérifier que la version de fonctions Convex
> attendue par ce frontend est bien celle déployée (re-promote le bon commit
> Vercel garantit la cohérence des deux).

---

## 8. Hygiène des données (rappel)

- Le seed de **contenu** (`pnpm seed:lessons`, `seed:seedModules`) est légitime
  en prod : il n'écrit que des fiches/modules, jamais d'utilisateur ni d'attempt.
- Le seed de **test** (`tests/e2e/_seed.ts`, `seedStats`, `seedLeaks`) et le
  script de purge (`scripts/purge-test-data.ts`) embarquent une **garde
  anti-prod** : ils refusent de s'exécuter si la cible n'est pas le déploiement
  de **test/dev** déclaré, et échouent bruyamment sinon. Il est donc impossible
  d'écrire ou de purger des données de test en prod par accident.
- La prod ne doit jamais être la cible d'un run Playwright. La config Playwright
  vise `http://localhost:3000` (build/dev local → déploiement dev).

---

## Référence — variables d'environnement

| Variable                 | Où                       | Rôle |
| ------------------------ | ------------------------ | ---- |
| `CONVEX_DEPLOY_KEY`      | Vercel (Production)      | Autorise `convex deploy` à pousser sur la prod + injecter l'URL. |
| `NEXT_PUBLIC_CONVEX_URL` | injectée par `convex deploy` au build (prod) ; `.env.local` (dev) | URL publique du déploiement Convex lue par `ConvexReactClient`. |
| `CONVEX_DEPLOYMENT`      | `.env.local` (dev)       | Identité du déploiement local (`dev:…`). Sert aussi à la garde anti-prod des seeds de test. |
