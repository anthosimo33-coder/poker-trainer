/**
 * Purge des données de TEST sur le déploiement dev/test (S12).
 *
 * Supprime les users de test + TOUTES leurs lignes dépendantes (attempts,
 * sessions, sessionSpots, theoryCompletions, leaks, leakPatterns,
 * patternProgress). Ne touche JAMAIS le contenu (modules/submodules/lessons).
 *
 * Sécurité :
 *  - URL résolue via `resolveTestConvexUrl()` → REFUS bruyant si la cible est un
 *    déploiement de production (cf. tests/e2e/_guard.ts).
 *  - mutation `purgeTestUsers` exige `confirm: "PURGE_TEST_DATA"`.
 *
 * Usage :
 *   pnpm tsx scripts/purge-test-data.ts            # purge TOUS les users (dev = 100% test)
 *   pnpm tsx scripts/purge-test-data.ts --prefix e2e-test-   # purge ciblée par préfixe
 *   pnpm tsx scripts/purge-test-data.ts --dry              # compte seulement, ne supprime rien
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { resolveTestConvexUrl } from "../tests/e2e/_guard";

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const prefixArg = args.find((a) => a.startsWith("--prefix"));
  const prefix = prefixArg ? prefixArg.split("=")[1] ?? args[args.indexOf(prefixArg) + 1] : undefined;

  const url = resolveTestConvexUrl(); // throw si prod
  const client = new ConvexHttpClient(url);

  const before = await client.query(api.testing.countUsers, {});
  console.log(`Cible : ${url}`);
  console.log(`Users avant : ${before.total}`);
  if (prefix) console.log(`Mode : préfixe « ${prefix} »`);
  else console.log("Mode : TOUS les users (le dev n'a jamais eu de vrai user)");

  if (dry) {
    console.log("--dry : aucune suppression effectuée.");
    return;
  }

  const totals = {
    users: 0,
    attempts: 0,
    sessions: 0,
    sessionSpots: 0,
    completions: 0,
    leaks: 0,
    leakPatterns: 0,
    patternProgress: 0,
  };

  // Batch volontairement petit : supprimer un user + toutes ses lignes
  // dépendantes dans une seule mutation a un coût ; 25 reste loin des limites de
  // transaction Convex et borne la durée par appel (évite les `fetch failed`).
  const BATCH = 25;

  async function purgeOnce() {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await client.mutation(api.testing.purgeTestUsers, {
          confirm: "PURGE_TEST_DATA",
          all: prefix ? undefined : true,
          prefixes: prefix ? [prefix] : undefined,
          limit: BATCH,
        });
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
    throw lastErr;
  }

  let more = true;
  let round = 0;
  while (more) {
    const r = await purgeOnce();
    totals.users += r.users;
    totals.attempts += r.attempts;
    totals.sessions += r.sessions;
    totals.sessionSpots += r.sessionSpots;
    totals.completions += r.completions;
    totals.leaks += r.leaks;
    totals.leakPatterns += r.leakPatterns;
    totals.patternProgress += r.patternProgress;
    more = r.more;
    round++;
    process.stdout.write(`  lot ${round} : ${r.users} users… (reste : ${more})\n`);
    // Garde-fou anti-boucle (au cas où more resterait vrai sans progrès).
    if (r.users === 0 && more) break;
  }

  const after = await client.query(api.testing.countUsers, {});
  console.log("\n✓ Purge terminée");
  console.log(`  users supprimés       : ${totals.users}`);
  console.log(`  attempts              : ${totals.attempts}`);
  console.log(`  sessions              : ${totals.sessions}`);
  console.log(`  sessionSpots          : ${totals.sessionSpots}`);
  console.log(`  theoryCompletions     : ${totals.completions}`);
  console.log(`  leaks                 : ${totals.leaks}`);
  console.log(`  leakPatterns          : ${totals.leakPatterns}`);
  console.log(`  patternProgress       : ${totals.patternProgress}`);
  console.log(`  users restants        : ${after.total}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
