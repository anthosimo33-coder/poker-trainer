"use client";

import { useEffect, useState, Suspense, type ComponentType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { urlSlugToDbSlug } from "@/lib/slug";

// Map des slugs → composants MDX
const THEORY_LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "m1-1": () => import("@/content/theory/m1-1.mdx"),
  "m1-2": () => import("@/content/theory/m1-2.mdx"),
  "m1-3": () => import("@/content/theory/m1-3.mdx"),
  "m1-4": () => import("@/content/theory/m1-4.mdx"),
  "m2-1": () => import("@/content/theory/m2-1.mdx"),
  "m2-2": () => import("@/content/theory/m2-2.mdx"),
  "m2-3": () => import("@/content/theory/m2-3.mdx"),
  "m2-4": () => import("@/content/theory/m2-4.mdx"),
  "m3-1": () => import("@/content/theory/m3-1.mdx"),
  "m3-2": () => import("@/content/theory/m3-2.mdx"),
  "m3-3": () => import("@/content/theory/m3-3.mdx"),
  "m3-4": () => import("@/content/theory/m3-4.mdx"),
  "m4-1": () => import("@/content/theory/m4-1.mdx"),
  "m4-2": () => import("@/content/theory/m4-2.mdx"),
  "m4-3": () => import("@/content/theory/m4-3.mdx"),
  "m4-4": () => import("@/content/theory/m4-4.mdx"),
};

function TheoryContent() {
  const params = useParams();
  const moduleId = params.moduleId as string;
  const submoduleId = params.submoduleId as string;

  const { userId } = useCurrentUser();
  const [TheoryComponent, setTheoryComponent] = useState<ComponentType | null>(null);
  const [showQuickCheck, setShowQuickCheck] = useState(false);

  useEffect(() => {
    const loader = THEORY_LOADERS[submoduleId];
    if (!loader) return;
    loader().then((mod) => setTheoryComponent(() => mod.default));
  }, [submoduleId]);

  if (!THEORY_LOADERS[submoduleId]) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-16">
        <div className="text-text-muted">Théorie non disponible pour ce sous-module.</div>
        <Link href="/" className="text-purple-400 hover:underline">Retour à l&apos;Atelier</Link>
      </main>
    );
  }

  if (!TheoryComponent) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-16">
        <div className="text-text-muted">Chargement de la théorie…</div>
      </main>
    );
  }

  return (
    <main className="max-w-[720px] mx-auto px-8 pt-12 pb-24">
      <div style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] font-mono text-text-muted hover:text-text mb-12 transition-colors"
        >
          ← Atelier
        </Link>

        <article>
          <TheoryComponent />
        </article>

        <div
          className="mt-16 pt-10 flex justify-between items-center"
          style={{ borderTop: "0.5px solid var(--border)" }}
        >
          <div className="text-[12px] font-mono text-text-faint">
            M·{moduleId.replace("m", "")} — Sous-module {submoduleId.replace(`${moduleId}-`, "")} / 4
          </div>
          <button
            onClick={() => setShowQuickCheck(true)}
            className="px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 hover:-translate-y-px text-white"
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
            }}
          >
            Passer le quick check →
          </button>
        </div>
      </div>

      {showQuickCheck && (
        <QuickCheckModal
          submoduleId={submoduleId}
          userId={userId}
          onClose={() => setShowQuickCheck(false)}
        />
      )}
    </main>
  );
}

// ====================================
// QUICK CHECK MODAL — INLINE COMPONENT
// ====================================

interface QuickCheckQuestion {
  question: string;
  options: { letter: string; text: string }[];
  correctLetter: string;
  explanation: string;
}

// Banque de QCM par submodule — pour cette session, M1.1 seulement
const QUESTIONS: Record<string, QuickCheckQuestion[]> = {
  "m1-1": [
    {
      question:
        "Le pot est à 4bb, le vilain bet 4bb. Quelle est l'equity requise pour caller à long terme ?",
      options: [
        { letter: "A", text: "25 %" },
        { letter: "B", text: "33.3 %" },
        { letter: "C", text: "50 %" },
        { letter: "D", text: "40 %" },
      ],
      correctLetter: "B",
      explanation:
        "Equity requise = bet / (pot + 2 × bet) = 4 / (4 + 8) = 4 / 12 = 33.3 %. La règle « bet = pot → 2:1 cote, 33.3 % equity » est à mémoriser.",
    },
    {
      question:
        "Pourquoi le pot final dans la formule contient-il « 2 × bet » au dénominateur ?",
      options: [
        { letter: "A", text: "Parce que le pot double à chaque street." },
        {
          letter: "B",
          text: "Parce que tu dois additionner la mise du vilain et ta propre mise au pot existant.",
        },
        {
          letter: "C",
          text: "Parce que la mise compte deux fois (une pour la cote, une pour l'EV).",
        },
        { letter: "D", text: "Par convention historique du jeu." },
      ],
      correctLetter: "B",
      explanation:
        "Le pot final = pot existant + mise du vilain + ta mise (qui égale celle du vilain en cas de call). D'où le 2 × bet.",
    },
    {
      question:
        "Tu as un tirage couleur au flop (~36 % d'equity). Le vilain bet 1/2 pot (cote 3:1, equity requise 25 %). Quel call est correct ?",
      options: [
        { letter: "A", text: "Fold — l'equity est insuffisante." },
        {
          letter: "B",
          text: "Call — l'equity de 36 % dépasse le seuil requis de 25 %.",
        },
        {
          letter: "C",
          text: "Raise — toujours raise un tirage couleur en position.",
        },
        {
          letter: "D",
          text: "Indifférent — il faut considérer les cotes implicites.",
        },
      ],
      correctLetter: "B",
      explanation:
        "36 % > 25 %, donc le call est +EV. Les cotes implicites le rendraient encore plus profitable (gain probable sur les streets suivantes en cas de touche).",
    },
  ],

  "m1-2": [
    {
      question: "Tu as une cote du pot de 3:1. Quelle est l'equity requise en pourcentage ?",
      options: [
        { letter: "A", text: "20 %" },
        { letter: "B", text: "25 %" },
        { letter: "C", text: "30 %" },
        { letter: "D", text: "33.3 %" },
      ],
      correctLetter: "B",
      explanation: "Formule ratio → % : 1 / (3 + 1) = 25 %. Apprends les 4 points d'ancrage : 1:1 = 50 %, 2:1 = 33.3 %, 3:1 = 25 %, 4:1 = 20 %.",
    },
    {
      question: "L'equity requise est de 33.3 %. Quelle est la cote du pot ?",
      options: [
        { letter: "A", text: "1:1" },
        { letter: "B", text: "1.5:1" },
        { letter: "C", text: "2:1" },
        { letter: "D", text: "3:1" },
      ],
      correctLetter: "C",
      explanation: "Formule % → ratio : (100 - 33.3) / 33.3 ≈ 2. Donc cote 2:1. Mnémonique : « bet = pot → 2:1 → 33.3 % ».",
    },
    {
      question: "Pourquoi maîtriser les deux formats (ratio et %) plutôt qu'un seul ?",
      options: [
        { letter: "A", text: "Par tradition du jeu." },
        { letter: "B", text: "Parce que les solvers utilisent l'un et les coachs l'autre — tu dois lire les deux sans hésiter." },
        { letter: "C", text: "Parce que le ratio est plus précis pour les implied odds." },
        { letter: "D", text: "Parce que le % est plus précis pour les pot odds simples." },
      ],
      correctLetter: "B",
      explanation: "Le ratio et le pourcentage décrivent la même réalité mais s'utilisent dans des contextes différents (solvers, coachs, conversation en table). L'hésitation à convertir est un leak.",
    },
  ],

  "m1-3": [
    {
      question: "Pot 4bb, bet 4bb (cote 2:1, equity requise 33.3 %). Tu as un tirage couleur (36 % equity). Le call est-il profitable ?",
      options: [
        { letter: "A", text: "Non, equity insuffisante." },
        { letter: "B", text: "Oui, equity de 36 % > 33.3 % requis." },
        { letter: "C", text: "Indifférent." },
        { letter: "D", text: "Profitable uniquement avec implied odds." },
      ],
      correctLetter: "B",
      explanation: "Avec 36 % > 33.3 %, le call est déjà +EV en pot odds purs. Les implied odds le rendent encore plus profitable mais ne sont pas nécessaires à la décision.",
    },
    {
      question: "Tu as un tirage quinte ventrale (~16 % equity). Le vilain bet pot (equity requise 33.3 %). Quel gain futur minimum dois-tu pouvoir extraire en moyenne pour que le call soit break-even ?",
      options: [
        { letter: "A", text: "Aucun, la cote suffit." },
        { letter: "B", text: "Le gain doit être au moins égal à la mise vilain." },
        { letter: "C", text: "Environ 2× la mise vilain en moyenne." },
        { letter: "D", text: "Aucun montant ne rend ce call profitable." },
      ],
      correctLetter: "C",
      explanation: "Avec 16 % d'equity et un bet pot, la formule X = bet/equity − pot final donne un gain futur d'environ 3× la mise du vilain. En pratique, peu de mains permettent d'extraire ça — d'où la règle « ventrale = rarement profitable sans cote directe ».",
    },
    {
      question: "Quand les implied odds sont-elles surestimées en pratique ?",
      options: [
        { letter: "A", text: "Quand le tirage est visible (3 cartes de même couleur sur le board)." },
        { letter: "B", text: "Quand le stack effectif est court." },
        { letter: "C", text: "Quand le vilain est un nit qui fold facilement post-touche." },
        { letter: "D", text: "Toutes ces réponses." },
      ],
      correctLetter: "D",
      explanation: "Les trois situations limitent le gain futur réel : tirage visible = adversaire qui fold, stack court = pas d'argent à extraire, nit = fold facile. La cote implied théorique n'est utile que si les conditions de l'extraction sont réelles.",
    },
  ],

  "m1-4": [
    {
      question: "Pourquoi une top paire kicker faible est-elle une main reverse implied ?",
      options: [
        { letter: "A", text: "Parce qu'elle perd contre les tirages." },
        { letter: "B", text: "Parce que ses gains sont plafonnés et ses pertes amplifiées : quand elle est devant, le vilain fold ou call petit ; quand elle est derrière (kicker dominé), le vilain raise et elle paie deux streets." },
        { letter: "C", text: "Parce qu'elle est mathématiquement faible." },
        { letter: "D", text: "Parce qu'elle ne gagne jamais au showdown." },
      ],
      correctLetter: "B",
      explanation: "Le reverse implied vient de l'asymétrie des résultats : tu n'es payé que quand tu es devant légèrement, et tu paies beaucoup quand tu es dominé. L'apparence (tu es devant en moyenne) ment sur les vrais flows d'argent.",
    },
    {
      question: "Ton equity apparente est 65 % avec TPKW (top paire kicker faible). Comment ajuster pour la décision ?",
      options: [
        { letter: "A", text: "Utiliser 65 % comme si c'était une main faite." },
        { letter: "B", text: "Pénaliser à ~48 % pour refléter les pertes futures probables." },
        { letter: "C", text: "Ajouter 10 % pour la value de la position." },
        { letter: "D", text: "Doubler pour les implied odds." },
      ],
      correctLetter: "B",
      explanation: "L'equity apparente surestime ta vraie equity nette. L'ajustement reverse implied (typiquement -15 à -20 points sur les mains marginales) te donne l'equity « effective » à utiliser pour la décision.",
    },
    {
      question: "Quel type de board augmente le plus le reverse implied de ta top paire ?",
      options: [
        { letter: "A", text: "Board sec et rainbow (T 7 2 différentes couleurs)." },
        { letter: "B", text: "Board très texturé (T 9 8 deux couleurs, tirages multiples)." },
        { letter: "C", text: "Board paire (T T 4)." },
        { letter: "D", text: "Board avec As (A T 5)." },
      ],
      correctLetter: "B",
      explanation: "Plus le board est texturé (tirages couleur, quinte, double tirage), plus les barrels suivants du vilain sont crédibles et plus tu paies cher si tu es derrière. Les boards secs limitent le reverse implied car peu de cartes changent la donne.",
    },
  ],

  "m2-1": [
    {
      question: "Tu as un tirage couleur au flop (9 outs). Avec la règle des 4 et 2, quelle est ton equity approximative ?",
      options: [
        { letter: "A", text: "18 %" },
        { letter: "B", text: "27 %" },
        { letter: "C", text: "36 %" },
        { letter: "D", text: "54 %" },
      ],
      correctLetter: "C",
      explanation: "Au flop (2 cartes à venir), equity ≈ outs × 4 = 9 × 4 = 36 %. La règle des 4 et 2 est une approximation rapide à mémoriser.",
    },
    {
      question: "Tu as un tirage quinte ventrale au turn (4 outs). Quelle est ton equity approximative ?",
      options: [
        { letter: "A", text: "4 %" },
        { letter: "B", text: "8 %" },
        { letter: "C", text: "16 %" },
        { letter: "D", text: "32 %" },
      ],
      correctLetter: "B",
      explanation: "Au turn (1 carte à venir), equity ≈ outs × 2 = 4 × 2 = 8 %. Une quinte ventrale au turn est rarement profitable face à un bet sans implied odds substantielles.",
    },
    {
      question: "Pourquoi la règle « × 4 » au flop est-elle approximative et non exacte ?",
      options: [
        { letter: "A", text: "Parce qu'il faudrait multiplier par 4.5 pour être précis." },
        { letter: "B", text: "Parce qu'elle surestime légèrement les gros tirages (>8 outs) — le vrai calcul est plus proche de outs × 4 - (outs - 8)." },
        { letter: "C", text: "Parce qu'elle ne tient pas compte des outs du vilain." },
        { letter: "D", text: "Parce qu'elle dépend du sizing du bet." },
      ],
      correctLetter: "B",
      explanation: "La règle des 4 est exacte pour ~8 outs. Au-delà, elle surestime (15 outs × 4 = 60 %, vraie equity ≈ 54 %). Un ajustement simple : retirer (outs - 8) du résultat.",
    },
  ],

  "m2-2": [
    {
      question: "Quelle est l'equity approximative de AKo face à 77 préflop ?",
      options: [
        { letter: "A", text: "30 % (AKo dominé)" },
        { letter: "B", text: "47 % (77 légèrement favorite)" },
        { letter: "C", text: "60 % (AKo favorite)" },
        { letter: "D", text: "80 % (77 largement favorite)" },
      ],
      correctLetter: "B",
      explanation: "AKo vs 77 est ~47/53 : la paire est légèrement favorite, mais le matchup est proche du coin flip. Cette ancre est essentielle pour calibrer l'intuition contre les paires moyennes.",
    },
    {
      question: "Tu as un tirage couleur nu (9 outs) au flop contre une over-pair. Quelle est ton equity précise ?",
      options: [
        { letter: "A", text: "~25 %" },
        { letter: "B", text: "~36 %" },
        { letter: "C", text: "~45 %" },
        { letter: "D", text: "~50 %" },
      ],
      correctLetter: "B",
      explanation: "Tirage couleur nu = 9 outs propres. Equity flop ≈ outs × 4 = 36 %. La règle 4&2 est ici exacte parce qu'on a 9 outs (la formule corrigée outs × 4 - (outs - 8) donne 36 - 1 = 35 %, très proche).",
    },
    {
      question: "Quelle erreur de calibration est la plus typique chez un joueur intermédiaire ?",
      options: [
        { letter: "A", text: "Sous-estimer ses paires faites." },
        { letter: "B", text: "Surestimer ses tirages combinés (flush + straight)." },
        { letter: "C", text: "Sous-estimer ses tirages couleur." },
        { letter: "D", text: "Surestimer ses over-pairs sur boards humides." },
      ],
      correctLetter: "B",
      explanation: "Les tirages combinés sont attirants visuellement (« 15 outs ! ») mais la règle 4 × 15 = 60 % surestime de ~6 points. La vraie equity est ~54 %. Le biais d'optimisme amplifie cette erreur en table.",
    },
  ],

  "m2-3": [
    {
      question: "En heads-up, ton tirage couleur a ~36 % d'equity. En 3-way (toi vs 2 vilains précis), quelle est ton equity approximative ?",
      options: [
        { letter: "A", text: "~36 % (inchangé)" },
        { letter: "B", text: "~25 % (× 0.7)" },
        { letter: "C", text: "~12 % (divisé par 3)" },
        { letter: "D", text: "~50 % (plus de mains à battre = plus d'opportunités)" },
      ],
      correctLetter: "B",
      explanation: "En multiway, certains de tes outs sont morts (donnent une main inférieure à un autre vilain). La règle empirique : × 0.7 pour passer du heads-up au 3-way. Ton ~36 % heads-up devient ~25 % en 3-way.",
    },
    {
      question: "Quel type de main gagne en valeur en multiway par rapport au heads-up ?",
      options: [
        { letter: "A", text: "AKo (high cards offsuit)" },
        { letter: "B", text: "Top paire kicker faible (ex. A♠5♦ sur A♥9♣2♠)" },
        { letter: "C", text: "Suited connectors (ex. 8♠7♠)" },
        { letter: "D", text: "Tirage quinte ventrale" },
      ],
      correctLetter: "C",
      explanation: "Les suited connectors valent plus en multiway : ils touchent rarement, mais quand ils touchent (couleur, quinte), le pot est gros (plus de joueurs, plus de mises). Les mains polarisées (fortes ou speculatives) battent les mains marginales.",
    },
    {
      question: "Tu as TPTK (top pair top kicker, ex. A♦K♠ sur A♣9♥2♦) en 3-way au flop. Pourquoi est-ce plus dangereux qu'en heads-up ?",
      options: [
        { letter: "A", text: "Ton kicker compte moins en multiway." },
        { letter: "B", text: "Statistiquement, l'un des deux vilains a plus souvent two pair ou un set que vs un seul vilain." },
        { letter: "C", text: "Les tirages couleur sont plus fréquents en multiway." },
        { letter: "D", text: "Ton equity globale baisse à 33 %." },
      ],
      correctLetter: "B",
      explanation: "Multiway, la probabilité que l'un des vilains ait une main qui te bat (set, two pair, slowplay) double en 3-way. TPTK reste favorite face à chaque vilain individuellement, mais perd ~10-15 points d'equity face au range combiné des deux vilains.",
    },
  ],

  "m2-4": [
    {
      question: "Tu as AKs face à un open BTN à ~45 % (range très large). Quelle est ton equity approximative ?",
      options: [
        { letter: "A", text: "~75 % (AKs domine la plupart des mains)" },
        { letter: "B", text: "~62 % (favorite mais loin de la domination)" },
        { letter: "C", text: "~50 % (coin flip global)" },
        { letter: "D", text: "~40 % (le range BTN est trop large pour AKs)" },
      ],
      correctLetter: "B",
      explanation: "AKs vs BTN open 45 % ≈ 62 %. Tu domines toutes les mains plus faibles (~80 % du range), tu es à 30 % vs AA-KK (rares), à 50 % vs les paires moyennes. La moyenne pondérée tombe à ~62 %.",
    },
    {
      question: "Pourquoi raisonner en range plutôt qu'en main précise est crucial en table ?",
      options: [
        { letter: "A", text: "Parce que les solvers le font." },
        { letter: "B", text: "Parce que tu ne sais jamais quelle main exacte a le vilain — tu connais seulement son range plausible compte tenu de ses actions." },
        { letter: "C", text: "Parce que c'est plus rapide mentalement." },
        { letter: "D", text: "Parce que les ranges sont plus stables que les mains." },
      ],
      correctLetter: "B",
      explanation: "Le raisonnement en main précise est fantasmagorique — tu décides contre une carte imaginée. Le raisonnement en range est empirique — tu décides contre la distribution réelle des combos plausibles. C'est la différence entre le drilleur et le joueur.",
    },
    {
      question: "Quel est le biais typique des joueurs intermédiaires face à un range adverse ?",
      options: [
        { letter: "A", text: "Sur-estimer la fréquence du nut du range." },
        { letter: "B", text: "Sous-estimer la fréquence du nut du range." },
        { letter: "C", text: "Se focaliser sur le meilleur ou le pire combo plutôt que sur la moyenne pondérée." },
        { letter: "D", text: "Ignorer le range pour ne raisonner qu'en pot odds." },
      ],
      correctLetter: "C",
      explanation: "Le biais d'ancrage : « il a peut-être AA » (pire scénario) ou « il bluffe peut-être » (meilleur scénario). Le bon raisonnement est la moyenne sur tout le range. Calibrer cette moyenne est exactement ce que M2.4 entraîne.",
    },
  ],

  "m3-1": [
    {
      question: "Quelle est la formule canonique de l'EV d'un push all-in ?",
      options: [
        { letter: "A", text: "EV = equity × pot" },
        { letter: "B", text: "EV = P(fold) × pot_avant_push + P(call) × (equity_vs_call_range × pot_final - call_amount × (1-equity))" },
        { letter: "C", text: "EV = pot odds × equity" },
        { letter: "D", text: "EV = fold_equity + showdown_equity" },
      ],
      correctLetter: "B",
      explanation: "Deux termes additionnés : (1) ce que tu prends par fold du vilain, pondéré par P(fold). (2) ce que tu gagnes ou perds au showdown si vilain call, pondéré par P(call). C'est la formule de base de tout le module M·III.",
    },
    {
      question: "Tu pushes 72o pour 10bb depuis SB. Vilain BB call avec un range tight (~8% du deck). Pourquoi le push peut être +EV ?",
      options: [
        { letter: "A", text: "72o a une bonne equity vs les paires." },
        { letter: "B", text: "Parce que P(fold) ≈ 92% : tu gagnes le pot avant push 92 fois sur 100, ce qui compense les pertes 8% du temps." },
        { letter: "C", text: "Parce que 72o a un bon potentiel postflop." },
        { letter: "D", text: "Parce que le pot est trop gros pour fold." },
      ],
      correctLetter: "B",
      explanation: "C'est tout l'effet de la fold equity. 92% × 1.5bb (pot) + 8% × (~12% × 21bb - 9.5bb) ≈ +1.38 - 0.84 = +0.54 bb. Push profitable malgré une main faible parce que le call range est extrêmement tight. C'est la base du push light en short stack.",
    },
    {
      question: "Tu pushes 5bb depuis SB. Pourquoi tu peux pusher plus large qu'à 10bb ?",
      options: [
        { letter: "A", text: "Parce que tu prends plus de risque." },
        { letter: "B", text: "Parce qu'à 5bb, le vilain BB doit call avec une cote ~3:1, donc avec un range très large (~50% du deck). La fold equity baisse mais ton equity vs le call range augmente — push any two devient parfois profitable." },
        { letter: "C", text: "Parce que 5bb c'est désespéré." },
        { letter: "D", text: "Parce que la position SB devient meilleure." },
      ],
      correctLetter: "B",
      explanation: "À 5bb push, vilain BB risque ~4.5bb pour gagner ~6.5bb (pot final). Cote ~1.44:1, equity requise ~41%. Le vilain call ~50% des mains. Hero ne gagne plus par fold (P(fold) ≈ 50%) mais son equity vs un call range large remonte (n'importe quel A est devant la moitié du deck). Push any two peut devenir +EV.",
    },
  ],

  "m3-2": [
    {
      question:
        "Tu as 72o et tu pushes 10bb depuis SB. Ton equity vs call range tight est ~15 %, evIfCall = -3 bb. Quelle est la P(fold) minimum pour que le push soit break-even ?",
      options: [
        { letter: "A", text: "0 % (le push est toujours +EV)" },
        { letter: "B", text: "~67 % (-(-3) / (1.5 - (-3)) = 3 / 4.5 ≈ 0.67)" },
        { letter: "C", text: "~100 % (il faut absolument que vilain fold)" },
        { letter: "D", text: "Impossible à calculer sans la P(fold) réelle." },
      ],
      correctLetter: "B",
      explanation: "Formule : pFoldBreakEven = -evIfCall / (pot - evIfCall) = -(-3) / (1.5 - (-3)) = 3 / 4.5 ≈ 0.67. Tu as besoin que vilain fold au moins 67 % du temps. C'est la signature mathématique du push light : tu paries sur la fold equity, pas sur la main.",
    },
    {
      question: "Tu as AA et tu pushes 10bb. evIfCall = +4 bb (tu domines même le call range). Quelle FE breakeven ?",
      options: [
        { letter: "A", text: "0 % — le push est +EV même si vilain call 100 % du temps." },
        { letter: "B", text: "~30 % — il faut toujours un peu de FE." },
        { letter: "C", text: "~50 % — la moitié du temps." },
        { letter: "D", text: "~100 % — il faut absolument qu'il fold." },
      ],
      correctLetter: "A",
      explanation: "Quand evIfCall > 0, la formule donne pFoldBreakEven = -evIfCall / (pot - evIfCall) < 0, plancher à 0. Concrètement : tu *veux* être call avec AA. La fold equity est un bonus, pas une nécessité. Push n'importe quelle fréquence de FE.",
    },
    {
      question: "Pourquoi un push 72o à 5bb peut être profitable mais le même push à 12bb est désastreux ?",
      options: [
        { letter: "A", text: "À 5bb, vilain call avec ~50 % du deck (pot odds énormes). Ton equity vs ce range très large est ~30 %. evIfCall remonte donc la FE breakeven baisse. À 12bb, vilain call serré (~10 %), ton equity vs ce range très tight chute à ~12 %, evIfCall plonge à -8 bb, FE breakeven monte à ~80 % — irréalisable." },
        { letter: "B", text: "À 5bb, les ranges sont identiques à 12bb." },
        { letter: "C", text: "À 5bb, la position SB devient plus forte." },
        { letter: "D", text: "À 5bb, les antes compensent." },
      ],
      correctLetter: "A",
      explanation: "C'est la signature du push court : à 5bb, vilain ne peut pas fold (pot odds), son range call est très large, ton equity vs ce range remonte. À 12bb, vilain peut fold tight, son call range tight te domine, ton equity s'effondre. La FE breakeven bouge inversement à la stack.",
    },
  ],

  "m3-3": [
    {
      question:
        "Tu 3-bet et le vilain peut fold (60 %, tu gagnes +5 bb), call (30 %, EV -2 bb) ou 4-bet (10 %, EV -8 bb). Quelle est l'EV totale du 3-bet ?",
      options: [
        { letter: "A", text: "+5 bb (la branche fold domine)" },
        { letter: "B", text: "+1.6 bb (0.6×5 + 0.3×(-2) + 0.1×(-8))" },
        { letter: "C", text: "-2 bb (la moyenne des trois EV)" },
        { letter: "D", text: "0 bb (les branches s'annulent)" },
      ],
      correctLetter: "B",
      explanation: "EV = Σ Pᵢ × EVᵢ = 0.6×5 + 0.3×(-2) + 0.1×(-8) = 3.0 - 0.6 - 0.8 = +1.6 bb. On pondère chaque branche par sa probabilité et on somme — jamais une simple moyenne, jamais une seule branche.",
    },
    {
      question: "Pourquoi appliquer un realization factor (~0.85) à la branche « call » d'un 3-bet ?",
      options: [
        { letter: "A", text: "Pour pénaliser arbitrairement les bluffs." },
        { letter: "B", text: "Parce que la branche call n'est pas un abattage : il reste du poker à jouer, et hors de position sans initiative tu ne réalises jamais 100 % de ton equity brute." },
        { letter: "C", text: "Parce que les solvers l'exigent." },
        { letter: "D", text: "Pour compenser les antes." },
      ],
      correctLetter: "B",
      explanation: "L'equity brute suppose un abattage gratuit. En réalité tu joues encore 3 streets : tu te fais bluffer, tu fold le meilleur main parfois, tu ne touches pas. Le realization factor (~0.80 OOP, ~0.90 IP) corrige ce biais. L'oublier surestime tous les call.",
    },
    {
      question: "Quelle est l'erreur structurelle la plus grave dans un calcul d'EV multi-branches ?",
      options: [
        { letter: "A", text: "Arrondir les probabilités au pourcent près." },
        { letter: "B", text: "Utiliser bb plutôt que des jetons réels." },
        { letter: "C", text: "Oublier une branche (ex. ignorer le 4-bet) : Σ Pᵢ ≠ 1, l'EV n'est pas imprécise mais structurellement fausse." },
        { letter: "D", text: "Calculer l'equity vs le range total au lieu du call range." },
      ],
      correctLetter: "C",
      explanation: "Une probabilité mal estimée donne une EV imprécise. Une branche oubliée donne une EV fausse : la masse de probabilité ne somme plus à 1, le résultat n'a plus de sens. Énumérer toutes les branches avant de pondérer est non négociable.",
    },
  ],

  "m3-4": [
    {
      question: "Pourquoi le check-raise est-il l'arme principale d'OOP ?",
      options: [
        { letter: "A", text: "Parce qu'il fait fold plus de mains qu'un raise IP." },
        { letter: "B", text: "Parce qu'il est la seule façon, hors position, de prendre l'initiative agressive sans renoncer à check ses mains marginales." },
        { letter: "C", text: "Parce que le c-bet adverse est toujours large." },
        { letter: "D", text: "Parce qu'il est plus rentable que le raise donk." },
      ],
      correctLetter: "B",
      explanation: "OOP, tu réponds aux actions adverses. Le check-raise te permet de transformer une attitude apparemment passive (check) en une attitude agressive sans interrompre le sizing optimal d'OOP. C'est la seule arme qui te donne l'initiative tout en gardant un range de check fort.",
    },
    {
      question: "Tu check-raise un bluff pur (9♠8♣ sur K♥7♦2♠). Vilain c-bet range large (~70 %), call vs raise très tight (~8 %). Pourquoi ce check-raise peut être +EV ?",
      options: [
        { letter: "A", text: "Parce que 98o a une bonne equity vs un set." },
        { letter: "B", text: "Parce que P(fold) ≈ 88 %, et le pot que tu ramasses est suffisant pour compenser les ~12 % où tu te fais call sans equity." },
        { letter: "C", text: "Parce que tu vas toucher la quinte au turn." },
        { letter: "D", text: "Parce que le board K♥7♦2♠ est connu pour favoriser OOP." },
      ],
      correctLetter: "B",
      explanation: "C'est l'effet de la fold equity sur un board dry. Vilain c-bet 70 % mais ne défend que ~8 %. 0.88 × pot_apres_cbet ≈ +5 bb de fold equity. Même si tu perds ~3 bb les 12 % du temps où tu es call, la moyenne pondérée reste positive. C'est la signature d'un bon bluff CR : board dry + range advantage + sizing convaincant.",
    },
    {
      question: "Tu check-raise 7♣7♥ pour value sur K♠7♦2♣ vs un c-bet 33 %. Ton equity vs call range est 78 %. Pourquoi l'EV réalisée sera-t-elle inférieure à ce que ton equity brut suggère ?",
      options: [
        { letter: "A", text: "Parce que vous serez OOP au turn, et certaines turns rendent ta main moins lisible." },
        { letter: "B", text: "Parce que vilain peut fold avant le showdown même quand tu touches ta full." },
        { letter: "C", text: "Parce que vilain hand sera plus lisible (top pair top kicker) et tu pourras extraire plus de value." },
        { letter: "D", text: "Parce que le realization factor OOP postflop est ~0.80, donc 78 % d'equity ≈ 62 % réalisé en moyenne." },
      ],
      correctLetter: "D",
      explanation: "Le realization factor postflop OOP est ~0.80 : tu ne réalises pas 100 % de ton equity parce que tu joues les rues suivantes les yeux bandés, et tu folderas certaines spots où ton set est encore favorite. 78 % × 0.80 = ~62 % d'equity *réalisée*. C'est la première différence majeure entre preflop (M·I-M·III) et postflop : equity ≠ realization.",
    },
  ],

  "m4-1": [
    {
      question: "Pourquoi en MTT 1 chip ne vaut-il pas 1 unité de prizepool ?",
      options: [
        { letter: "A", text: "Parce que les chips ont une valeur fictive." },
        { letter: "B", text: "Parce que la fonction stack → équité $ est concave : tu ne peux pas tout perdre (places payées) ni tout gagner (le 2ème prend une part). La valeur marginale décroît avec le stack." },
        { letter: "C", text: "Parce que les payouts ne sont pas connus à l'avance." },
        { letter: "D", text: "Parce que la variance brouille la valeur." },
      ],
      correctLetter: "B",
      explanation: "La concavité est la propriété fondamentale de l'ICM. Plus tu accumules de chips, moins chaque chip supplémentaire vaut. Conséquence : le chip leader perd à l'ICM, le short stack gagne. C'est pourquoi 50 % des chips ≠ 50 % du prizepool.",
    },
    {
      question: "3 joueurs, stacks égaux à 5000, payouts 50/30/20. Quelle est l'équité ICM de chacun ?",
      options: [
        { letter: "A", text: "50/30/20 (chip leader prend tout)" },
        { letter: "B", text: "33.3 / 33.3 / 33.3 (avec stacks égaux, équité = moyenne des payouts)" },
        { letter: "C", text: "50/50/0 (deux premiers seulement)" },
        { letter: "D", text: "Impossible à dire sans plus d'info" },
      ],
      correctLetter: "B",
      explanation: "Stacks égaux ⇒ chaque joueur a la même probabilité de finir à chaque position. Équité = (50 + 30 + 20) / 3 = 33.3 %. C'est le baseline : tout écart de cette valeur révèle le pouvoir prédictif de ton stack relatif.",
    },
    {
      question: "Bulle 4 joueurs, 3 payés. Stacks : 8000 / 6000 / 5000 / 1000. Le short (1000 chips) a 5 % de chip equity. Quelle est probablement son équité ICM ?",
      options: [
        { letter: "A", text: "~5 % (égal à sa chip equity)" },
        { letter: "B", text: "~15 % (significativement plus que sa chip equity, car la 3ème place lui est presque garantie)" },
        { letter: "C", text: "~0 % (il va éliminer en bulle)" },
        { letter: "D", text: "~25 % (équité égale parmi les payés)" },
      ],
      correctLetter: "B",
      explanation: "L'effet ICM est le plus visible sur le short en bulle. Bien qu'il n'ait que 5 % des chips, sa probabilité de toucher la 3ème place (20 % du prizepool) est élevée. Son équité ICM est ~3-4× sa chip equity. C'est pourquoi pousher en short stack contre lui est coûteux en $ : il a déjà presque l'argent.",
    },
  ],

  "m4-2": [
    {
      question: "Le bubble factor mesure :",
      options: [
        { letter: "A", text: "Le nombre de joueurs avant l'argent." },
        { letter: "B", text: "Le ratio entre la perte ICM si tu busts et le gain ICM si tu doubles. Quand BF > 1, tu dois être plus prudent qu'en cash." },
        { letter: "C", text: "Le pourcentage de chip equity perdu par le chipleader." },
        { letter: "D", text: "La pression psychologique en bulle." },
      ],
      correctLetter: "B",
      explanation: "BF = (perte_ICM_si_lose) / (gain_ICM_si_win). En cash, perdre 5 bb = gagner 5 bb en valeur, donc BF = 1. En bulle, perdre 5 bb (potentiel bust) te coûte plus en équité $ que gagner 5 bb ne te rapporte. Le BF capture cette asymétrie.",
    },
    {
      question: "Tu pushes en bulle avec un BF de 1.5. Ton équité chip de break-even est 50 % (call break-even sur pot odds 1:1). Quelle équité ICM as-tu besoin ?",
      options: [
        { letter: "A", text: "50 % (BF n'affecte pas l'équity requise)" },
        { letter: "B", text: "75 % (50 × 1.5)" },
        { letter: "C", text: "60 % (formule : BF / (BF + 1) = 1.5 / 2.5)" },
        { letter: "D", text: "Impossible à calculer sans plus d'info" },
      ],
      correctLetter: "C",
      explanation: "Formule : eq_ICM_required = BF / (BF + 1) = 1.5 / 2.5 = 60 %. C'est ~10 points de plus que le seuil chip. Le BF augmente l'équity requise non-linéairement (pas une simple multiplication).",
    },
    {
      question: "Pourquoi le chip leader doit-il pusher light et call tight en bulle ?",
      options: [
        { letter: "A", text: "Parce qu'il a déjà gagné le tournoi statistiquement." },
        { letter: "B", text: "Parce que son BF est asymétrique : il pousse contre des stacks effectivement courts (gain ICM modeste, perte ICM modeste = BF bas) mais call contre des stacks effectifs gros (perte ICM massive, gain ICM modeste = BF élevé)." },
        { letter: "C", text: "Parce que c'est la stratégie standard." },
        { letter: "D", text: "Parce qu'il doit conserver son avantage." },
      ],
      correctLetter: "B",
      explanation: "Le BF est asymétrique. Quand le leader push, il risque peu de son stack (effective = min stacks), gain ICM modeste, perte ICM modeste → BF push faible → push light. Quand il call, il risque souvent un gros stack (un autre big stack le call back), perte ICM massive, gain ICM modeste → BF call élevé → call tight. C'est la signature fondamentale du jeu de bulle.",
    },
  ],

  "m4-3": [
    {
      question: "Tu pushes UTG en bulle 9-way avec 5 joueurs derrière toi. Le BF brut (face à un vilain spécifique) est 1.5. Quel est le BF effectif à utiliser ?",
      options: [
        { letter: "A", text: "1.5 (le BF brut s'applique tel quel)" },
        { letter: "B", text: "~2.6 (1.5 × 1.75 selon la position factor cap)" },
        { letter: "C", text: "~7.5 (BF × N joueurs)" },
        { letter: "D", text: "Impossible à calculer sans les ranges adverses" },
      ],
      correctLetter: "B",
      explanation: "Position factor = 0.15 × 5 = 0.75, plafonné. BF_adjusted = 1.5 × 1.75 = 2.625 ≈ 2.6. Pousser UTG en bulle profonde demande une équity ICM requise très haute (~72 %).",
    },
    {
      question: "Pourquoi le chip leader doit-il être prudent en EP en bulle ?",
      options: [
        { letter: "A", text: "Parce qu'il a déjà gagné virtuellement." },
        { letter: "B", text: "Parce que son BF est amplifié par la position : push EP avec 4-5 joueurs derrière = chance élevée qu'un d'eux ait un monstre, et le chip leader a beaucoup à perdre en ICM." },
        { letter: "C", text: "Parce que c'est convention." },
        { letter: "D", text: "Parce qu'il doit conserver son image." },
      ],
      correctLetter: "B",
      explanation: "Le chip leader perd à l'ICM (M4.1). Push EP = expose à 4-5 joueurs potentiels avec mains fortes. Le BF position monte à 1.75 × BF_base. Conséquence : tighter en EP, plus loose en LP.",
    },
    {
      question: "SB vs BB en bulle : 0 joueurs derrière. Que devient le position factor ?",
      options: [
        { letter: "A", text: "1.00 (pas d'adjustment, BF brut s'applique)" },
        { letter: "B", text: "0.50 (la position SB est défavorable)" },
        { letter: "C", text: "1.25 (légère adjust quand même)" },
        { letter: "D", text: "Dépend du stack" },
      ],
      correctLetter: "A",
      explanation: "Position factor = 0.15 × 0 = 0. Multiplier = 1.00. SB vs BB en bulle = le cas de référence pour le BF brut. Aucun joueur derrière, aucune mine. C'est pourquoi les ranges SB push 10bb sont parmi les mieux étudiés (M·V).",
    },
  ],

  "m4-4": [
    {
      question: "Table finale 9 joueurs avec payouts steep (40/22/13/9/6/4/3/2/1). Le chip leader (30 % des chips) a quelle équité ICM approximative ?",
      options: [
        { letter: "A", text: "30 % (équité = chip equity)" },
        { letter: "B", text: "~22-25 % (perte significative à l'ICM)" },
        { letter: "C", text: "40 % (le chip leader prend tout)" },
        { letter: "D", text: "Impossible à dire sans plus d'info" },
      ],
      correctLetter: "B",
      explanation: "Avec 9 joueurs et payouts très steep, le chip leader perd ~5-8 pts à l'ICM. Sa chip equity 30 % devient ~22-25 % en équité $. C'est l'effet concavité amplifié par les écarts payouts.",
    },
    {
      question: "Pourquoi le mid stack est-il le plus contraint en FT ?",
      options: [
        { letter: "A", text: "Parce qu'il joue les pires mains." },
        { letter: "B", text: "Parce qu'il est squeezé entre le chip leader (BF call élevé contre lui) et le short stack (qui doit risquer). Push trop = risques inutiles ; call trop = perte contre des ranges tight." },
        { letter: "C", text: "Parce que sa position est mauvaise." },
        { letter: "D", text: "Parce qu'il a moins de chips." },
      ],
      correctLetter: "B",
      explanation: "Le mid stack en FT est dans une zone morte : il ne peut ni écraser (pas assez de chips), ni attendre indéfiniment (les blinds montent). Sa stratégie optimale : être très sélectif, laisser le short bust, attendre des spots clairement +EV même en ICM.",
    },
    {
      question: "Heads-up FT (2 derniers) avec payouts proches (30/20). Comment évolue le BF ?",
      options: [
        { letter: "A", text: "Il reste très élevé car c'est la FT" },
        { letter: "B", text: "Il revient proche de 1 : l'écart 30/20 est modeste, gagner ≈ perdre en termes d'équité $" },
        { letter: "C", text: "Il devient infini (winner takes all)" },
        { letter: "D", text: "Il dépend uniquement des stacks" },
      ],
      correctLetter: "B",
      explanation: "Heads-up FT 30/20 = écart 10 pts. BF ≈ (équité_perdue_si_bust) / (équité_gagnée_si_double). Avec stacks proches, les deux sont modestes et proches. BF tombe à ~1.05-1.15, très proche du cash. C'est pourquoi le HU FT se joue agressif, contrairement à la phase 5-9 joueurs.",
    },
  ],
};

function QuickCheckModal({
  submoduleId,
  userId,
  onClose,
}: {
  submoduleId: string;
  userId: Id<"users"> | null;
  onClose: () => void;
}) {
  const questions = QUESTIONS[submoduleId] ?? [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const recordCompletion = useMutation(api.theoryCompletions.recordCompletion);

  const currentQ = questions[currentIdx];

  function handleSelect(letter: string) {
    setSelected({ ...selected, [currentIdx]: letter });
  }

  async function handleSubmit() {
    const score = questions.reduce(
      (s, q, i) => s + (selected[i] === q.correctLetter ? 1 : 0),
      0
    );
    if (userId) {
      await recordCompletion({ userId, submoduleSlug: urlSlugToDbSlug(submoduleId), quickCheckScore: score });
    }
    setShowResults(true);
  }

  const score = questions.reduce(
    (s, q, i) => s + (selected[i] === q.correctLetter ? 1 : 0),
    0
  );
  const passed = score >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(10, 13, 12, 0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-xl p-9"
        style={{
          background: "var(--bg-elevated)",
          border: "0.5px solid var(--border-strong)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "fadeUp 300ms var(--ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!showResults ? (
          <>
            <div className="flex justify-between items-baseline mb-7">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.08em] mb-2" style={{ color: "var(--purple-300)" }}>
                  Quick check
                </div>
                <div className="text-[22px] font-medium tracking-[-0.015em]">
                  Question {currentIdx + 1} <span className="text-text-faint">sur {questions.length}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-text-faint hover:text-text transition-colors text-2xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <p className="text-[17px] font-medium leading-[1.45] mb-6">{currentQ.question}</p>

            <div className="flex flex-col gap-2 mb-8">
              {currentQ.options.map((opt) => {
                const isSelected = selected[currentIdx] === opt.letter;
                return (
                  <button
                    key={opt.letter}
                    onClick={() => handleSelect(opt.letter)}
                    className="rounded px-5 py-4 text-left flex items-center gap-3.5 transition-all duration-200"
                    style={{
                      background: isSelected ? "var(--purple-glow)" : "var(--surface)",
                      border: `0.5px solid ${isSelected ? "var(--purple-400)" : "var(--border)"}`,
                      ...(isSelected && { boxShadow: "0 0 0 0.5px var(--purple-400)" }),
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono font-medium transition-all duration-200"
                      style={{
                        background: isSelected ? "var(--purple-glow)" : "var(--surface-strong)",
                        color: isSelected ? "var(--purple-300)" : "var(--text-muted)",
                        border: `0.5px solid ${isSelected ? "var(--purple-400)" : "var(--border)"}`,
                      }}
                    >
                      {opt.letter}
                    </span>
                    <span className="text-[14px] text-text">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 rounded text-[12px] font-medium transition-all duration-200 disabled:opacity-30"
                style={{
                  background: "transparent",
                  color: "var(--text-muted)",
                }}
              >
                ← Précédent
              </button>
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  disabled={!selected[currentIdx]}
                  className="px-4 py-2 rounded text-[12px] font-medium transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: "var(--surface)",
                    border: "0.5px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  Suivant →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(selected).length < questions.length}
                  className="px-5 py-2.5 rounded text-[12px] font-medium transition-all duration-200 disabled:opacity-40 text-white"
                  style={{
                    background: "var(--purple-500)",
                    border: "0.5px solid var(--purple-500)",
                    boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
                  }}
                >
                  Valider mes réponses →
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-mono uppercase tracking-[0.08em] mb-3" style={{ color: passed ? "var(--green)" : "var(--amber)" }}>
              {passed ? "Quick check validé" : "À retravailler"}
            </div>
            <h2 className="text-[36px] font-semibold tracking-[-0.03em] leading-none mb-3">
              {score} <span className="text-text-faint">/ {questions.length}</span>
            </h2>
            <p className="text-[15px] text-text-muted mb-7">
              {passed
                ? "Tu maîtrises l'essentiel. Le drill est débloqué."
                : "Tu n'as pas atteint le seuil minimum de 2/3. Relis la théorie et réessaye."}
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {questions.map((q, i) => {
                const userAnswer = selected[i];
                const correct = userAnswer === q.correctLetter;
                return (
                  <div
                    key={i}
                    className="rounded px-5 py-4"
                    style={{
                      background: "var(--surface)",
                      border: "0.5px solid var(--border)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="text-[11px] font-mono mt-0.5"
                        style={{ color: correct ? "var(--green)" : "var(--red)" }}
                      >
                        {correct ? "✓" : "✗"}
                      </span>
                      <div className="flex-1">
                        <div className="text-[13px] font-medium mb-1">{q.question}</div>
                        <div className="text-[12px] text-text-muted leading-[1.6]">
                          {correct ? null : <><span className="text-red">Ta réponse : {userAnswer}</span> · <span className="text-green">Bonne réponse : {q.correctLetter}</span><br/></>}
                          <span className="text-text-faint">{q.explanation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelected({});
                  setCurrentIdx(0);
                  setShowResults(false);
                }}
                className="px-5 py-3 rounded text-[13px] font-medium transition-all duration-200"
                style={{
                  background: "var(--surface)",
                  border: "0.5px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                Refaire le quick check
              </button>
              {passed ? (
                <Link
                  href={`/drill/${submoduleId}`}
                  className="flex-1 px-5 py-3 rounded text-[13px] font-medium transition-all duration-200 text-white text-center"
                  style={{
                    background: "var(--purple-500)",
                    border: "0.5px solid var(--purple-500)",
                    boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
                  }}
                >
                  Démarrer le drill →
                </Link>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-3 rounded text-[13px] font-medium transition-all duration-200"
                  style={{
                    background: "var(--surface-strong)",
                    border: "0.5px solid var(--border-strong)",
                    color: "var(--text-muted)",
                  }}
                >
                  Relire la théorie
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TheoryPage() {
  return (
    <Suspense fallback={<main className="max-w-[720px] mx-auto px-8 py-16 text-text-muted">Chargement…</main>}>
      <TheoryContent />
    </Suspense>
  );
}
