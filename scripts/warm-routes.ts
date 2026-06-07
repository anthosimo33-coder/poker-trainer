/**
 * Warm-up des routes Next (dev) avant un run e2e (S12).
 *
 * La flakiness e2e récurrente (S7c→S11) vient du mode dev : Next compile les
 * routes paresseusement, au premier accès. En parallèle, plusieurs workers
 * tapent des routes encore froides → timeouts sur la 1ʳᵉ assertion. On précompile
 * donc CHAQUE pattern de route (un seul URL par pattern suffit — le param ne
 * recompile pas) AVANT de lancer Playwright.
 *
 * En prod (Vercel `next build`) ce problème n'existe pas : tout est précompilé.
 *
 * Usage : serveur dev lancé (`pnpm dev:next`), puis `pnpm warm`.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// Un URL par PATTERN de route (les segments dynamiques compilent une seule fois).
const ROUTES = [
  "/",
  "/drill",
  "/theory",
  "/leaks",
  "/stats",
  "/lesson",
  "/lesson/mecaniques",
  "/lesson/mecaniques/cards",
  "/lesson/mecaniques/cards/range", // détail fiche (pattern)
  "/drill/m1-1", // drill dynamique (écran de lock si théorie non faite — compile quand même)
  "/drill/m1-1/review", // review dynamique
  "/module/m1/theory/m1-1", // théorie dynamique
];

async function main() {
  console.log(`Warm-up ${ROUTES.length} routes sur ${BASE}…`);
  for (const r of ROUTES) {
    const t0 = Date.now();
    try {
      const res = await fetch(BASE + r, { redirect: "manual" });
      console.log(`  ${res.status}  ${r}  (${Date.now() - t0}ms)`);
    } catch {
      console.log(`  ERR  ${r} — serveur dev lancé ?`);
    }
    // Petite pause : éviter de saturer le compilateur dev (cf. S8a, le warm-up
    // parallèle de 30 routes faisait crasher le serveur).
    await new Promise((res) => setTimeout(res, 700));
  }
  console.log("Routes chaudes. Lance les e2e : pnpm test:e2e --workers=1");
}

main();
