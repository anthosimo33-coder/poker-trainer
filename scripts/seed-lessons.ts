import fs from "fs";
import path from "path";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import mecaniques from "../content/lessons/mecaniques";
import strategie from "../content/lessons/strategie";
import lexique from "../content/lessons/lexique";

// Le spec lit process.env.NEXT_PUBLIC_CONVEX_URL mais rien ne le peuple pour un
// run `tsx` autonome. On charge .env.local minimalement (gap du script du spec).
function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL manquant");

  const client = new ConvexClient(url);

  // 1. Seed books d'abord
  await client.mutation(api.lessons.seedLessons, {});
  console.log("✓ Books seedés");

  // 2. Seed contenu du livre I — Mécaniques
  const r1 = await client.mutation(api.lessons.seedBookContent, mecaniques);
  console.log(`✓ Livre I — Mécaniques : ${r1.chapters} chapitres, ${r1.cards} fiches`);

  // 3. Seed contenu du livre II — Stratégie
  const r2 = await client.mutation(api.lessons.seedBookContent, strategie);
  console.log(`✓ Livre II — Stratégie : ${r2.chapters} chapitres, ${r2.cards} fiches`);

  // 4. Seed contenu du livre III — Lexique
  const r3 = await client.mutation(api.lessons.seedBookContent, lexique);
  console.log(`✓ Livre III — Lexique : ${r3.chapters} chapitres, ${r3.cards} fiches`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
