"use client";

import { useEffect, useState, Suspense, type ComponentType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

// Map des slugs → composants MDX
const THEORY_LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  "m1-1": () => import("@/content/theory/m1-1.mdx"),
  // M1.2, M1.3, M1.4 arriveront en S4b
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
      await recordCompletion({ userId, submoduleSlug: submoduleId.replace("m1-1", "m1.1").replace("m1-2", "m1.2").replace("m1-3", "m1.3").replace("m1-4", "m1.4"), quickCheckScore: score });
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
