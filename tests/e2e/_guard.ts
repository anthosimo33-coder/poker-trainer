/**
 * Garde anti-prod (S12) — point de passage UNIQUE pour résoudre l'URL Convex de
 * toute opération de TEST (seed e2e, reset par-test, purge). Garantit qu'aucune
 * écriture/purge de test ne peut atteindre un déploiement de PRODUCTION.
 *
 * Vecteurs d'accident couverts :
 *  - CONVEX_DEPLOYMENT = `prod:…`            → refus (déploiement de prod).
 *  - NEXT_PUBLIC_CONVEX_URL pointant ailleurs que le déploiement déclaré
 *    (ex. URL prod laissée alors que CONVEX_DEPLOYMENT est resté en dev)
 *                                            → refus (cible incohérente).
 *  - variables absentes                      → refus (impossible de vérifier).
 *
 * Toutes les erreurs sont bruyantes (throw) — jamais de fallback silencieux.
 */
import fs from "fs";
import path from "path";

export function readEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\s+#.*$/, "").trim();
  }
  return out;
}

/**
 * Résout l'URL Convex de test en échouant si elle pointe (ou pourrait pointer)
 * sur la prod. À utiliser partout où un test écrit/purge des données.
 */
export function resolveTestConvexUrl(): string {
  const env = readEnvLocal();
  const deployment = (process.env.CONVEX_DEPLOYMENT ?? env.CONVEX_DEPLOYMENT ?? "").trim();
  const url = (process.env.NEXT_PUBLIC_CONVEX_URL ?? env.NEXT_PUBLIC_CONVEX_URL ?? "").trim();

  if (!url) {
    throw new Error("[anti-prod] NEXT_PUBLIC_CONVEX_URL introuvable (.env.local).");
  }
  if (!deployment) {
    throw new Error(
      "[anti-prod] CONVEX_DEPLOYMENT introuvable (.env.local) — impossible de vérifier que la cible n'est pas la prod. Abandon."
    );
  }
  if (deployment.startsWith("prod:")) {
    throw new Error(
      `[anti-prod] REFUS : CONVEX_DEPLOYMENT=${deployment} est un déploiement de PRODUCTION. ` +
        "Les données de test ne doivent JAMAIS y être écrites/purgées."
    );
  }
  // Le nom du déploiement (après `dev:`/`local:`) doit apparaître dans l'URL :
  // empêche de garder CONVEX_DEPLOYMENT en dev tout en pointant l'URL sur la prod.
  const name = deployment.includes(":") ? deployment.split(":")[1] : deployment;
  if (name && !url.includes(name)) {
    throw new Error(
      `[anti-prod] REFUS : NEXT_PUBLIC_CONVEX_URL (${url}) ne correspond pas au déploiement ${deployment}. ` +
        "Cible incohérente — abandon."
    );
  }
  return url;
}
