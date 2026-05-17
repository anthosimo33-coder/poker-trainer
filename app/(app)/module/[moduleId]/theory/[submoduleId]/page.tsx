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
