"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { PokerTable } from "@/components/poker/PokerTable";
import { generatePotOddsSpot, type PotOddsSpot } from "@/lib/poker/spot-generators/m1-1-pot-odds";
import { fmtPercent, fmtRatio, fmtBb, cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { Id } from "@/convex/_generated/dataModel";

interface Attempt {
  spotId: string;
  isCorrect: boolean;
  timeMs: number;
}

interface UserAnswer {
  requiredEquity: string; // %
  ratio: string; // ratio comme "X:1" ou nombre
  decision: "call" | "fold" | "raise" | null;
}

const SPOTS_PER_SESSION = 20;
const TOLERANCE_PCT = 1.5; // tolérance en points pour considérer la réponse correcte
const TOLERANCE_RATIO = 0.15; // tolérance pour le ratio

function parseAnswerNumber(input: string): number | null {
  const cleaned = input.replace(",", ".").replace(/[%\s]/g, "").trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseRatio(input: string): number | null {
  // Accepte "2.25", "2.25:1", "2.25 to 1", "2.25 à 1"
  const cleaned = input.toLowerCase().replace(",", ".").trim();
  const match = cleaned.match(/^([\d.]+)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

export default function DrillM1_1Page() {
  const { userId, isReady } = useCurrentUser();
  const [spot, setSpot] = useState<PotOddsSpot | null>(null);
  const [answer, setAnswer] = useState<UserAnswer>({ requiredEquity: "", ratio: "", decision: null });
  const [showCorrection, setShowCorrection] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [spotIndex, setSpotIndex] = useState(1);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const startSession = useMutation(api.sessions.startSession);
  const recordAttempt = useMutation(api.attempts.recordAttempt);
  const addSpotToSession = useMutation(api.sessions.addSpotToSession);
  const endSession = useMutation(api.sessions.endSession);

  // Start session une fois quand user prêt
  useEffect(() => {
    if (!isReady || !userId || sessionId) return;
    startSession({
      userId,
      moduleSlug: "m1",
      submoduleSlug: "m1.1",
    }).then(setSessionId);
  }, [isReady, userId, sessionId, startSession]);

  // Génère le premier spot une fois la session prête
  useEffect(() => {
    if (!spot && sessionId) {
      setSpot(generatePotOddsSpot());
      startedAtRef.current = Date.now();
    }
  }, [spot, sessionId]);

  const stats = useMemo(() => {
    const correct = attempts.filter((a) => a.isCorrect).length;
    const wrong = attempts.length - correct;
    const avgTime = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.timeMs, 0) / attempts.length / 1000)
      : 0;
    return { correct, wrong, avgTime };
  }, [attempts]);

  // Loading state pendant que user et session se setup
  if (!isReady || !sessionId || !spot) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="text-text-muted">Préparation de la session…</div>
      </main>
    );
  }

  const eqAnswered = parseAnswerNumber(answer.requiredEquity);
  const ratioAnswered = parseRatio(answer.ratio);
  const canValidate = eqAnswered !== null && ratioAnswered !== null && answer.decision !== null;

  // Décision attendue : si equity disponible > required → call ; sinon fold.
  // Pour M1.1 on ne donne pas d'equity réelle au joueur — la "bonne décision" est celle
  // qu'on lui apprend à inférer après calcul. Ici, on accepte fold si la cote est mauvaise (>50 % req),
  // call sinon. Pour le drill basique, on dit "call" car le but est de tester le calcul, pas la décision.
  const expectedDecision: "call" | "fold" = spot.expected.requiredEquity < 40 ? "call" : "fold";

  async function handleValidate() {
    if (!spot || !userId || !sessionId) return;
    const eqUser = parseAnswerNumber(answer.requiredEquity);
    const ratioUser = parseRatio(answer.ratio);
    const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.requiredEquity) <= TOLERANCE_PCT;
    const ratioOk = ratioUser !== null && Math.abs(ratioUser - spot.expected.ratio) <= TOLERANCE_RATIO;
    const decisionOk = answer.decision === expectedDecision;
    const isCorrect = eqOk && ratioOk && decisionOk;
    const timeMs = Date.now() - startedAtRef.current;

    const attemptId = await recordAttempt({
      userId,
      submoduleSlug: "m1.1",
      spotId: spot.id,
      spotSnapshot: spot,
      expected: spot.expected,
      userAnswer: answer,
      isCorrect,
      timeMs,
      hintUsed: false,
    });

    await addSpotToSession({
      sessionId,
      attemptId,
      orderIndex: spotIndex - 1,
      isCorrect,
    });

    setAttempts((prev) => [...prev, { spotId: spot.id, isCorrect, timeMs }]);
    setShowCorrection(true);
  }

  async function handleNext() {
    if (spotIndex >= SPOTS_PER_SESSION && sessionId) {
      await endSession({ sessionId });
      window.location.href = `/drill/m1-1/review?session=${sessionId}`;
      return;
    }
    setSpot(generatePotOddsSpot());
    setAnswer({ requiredEquity: "", ratio: "", decision: null });
    setShowCorrection(false);
    setSpotIndex((i) => i + 1);
    startedAtRef.current = Date.now();
  }

  return (
    <main className="max-w-[1200px] mx-auto px-8 py-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-10 pb-6" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-2">
            Module I · Pot odds · Sous-module 1
          </div>
          <div className="text-4xl font-semibold tracking-[-0.03em] leading-none">
            Spot {spotIndex}
            <span className="text-text-faint font-normal"> / {SPOTS_PER_SESSION}</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <ScoreStat label="Réussis" value={stats.correct} color="var(--green)" />
          <ScoreStat label="Ratés" value={stats.wrong} color="var(--red)" />
          <ScoreStat label="Temps moy." value={stats.avgTime} unit="s" pad={false} />
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-8">
        <PokerTable
          contextTag="MTT · mid-stage"
          contextInfo={`${spot.effectiveStackBb}bb effective`}
          stacks={[
            { label: "Toi", bb: spot.effectiveStackBb, position: spot.heroPosition },
            { label: "Vilain", bb: spot.effectiveStackBb - 2, position: spot.villainPosition },
            { label: "Pot", bb: spot.potBb, position: "au flop" },
          ]}
          heroCards={spot.heroCards}
          board={spot.board}
          action={
            <>
              Le {spot.villainPosition} <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de <BetTag>{fmtBb(spot.potBb)}</BetTag>. Action sur toi.
            </>
          }
          question="Calcule la cote du pot, l'equity requise pour caller, et donne ta décision."
        />

        {!showCorrection ? (
          <AnswerPanel
            answer={answer}
            setAnswer={setAnswer}
            canValidate={canValidate}
            onValidate={handleValidate}
          />
        ) : (
          <CorrectionPanel
            spot={spot}
            answer={answer}
            expectedDecision={expectedDecision}
            onNext={handleNext}
          />
        )}
      </div>
    </main>
  );
}

function ScoreStat({
  label,
  value,
  color,
  unit,
  pad = true,
}: {
  label: string;
  value: number;
  color?: string;
  unit?: string;
  pad?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-medium">{label}</span>
      <span className="text-2xl font-semibold font-mono leading-none tracking-tight" style={{ color }}>
        {pad ? String(value).padStart(2, "0") : value}
        {unit && <span className="text-xs text-text-faint font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function BetTag({ children }: { children: React.ReactNode }) {
  return (
    <strong
      className="font-mono font-medium text-[13px] px-1.5 py-0.5 rounded mx-0.5"
      style={{
        color: "var(--purple-300)",
        background: "var(--purple-glow)",
      }}
    >
      {children}
    </strong>
  );
}

function AnswerPanel({
  answer,
  setAnswer,
  canValidate,
  onValidate,
}: {
  answer: UserAnswer;
  setAnswer: (a: UserAnswer) => void;
  canValidate: boolean;
  onValidate: () => void;
}) {
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
        ◆ Ta réponse
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-7">
        Décompose avant de décider.
      </h2>

      <Field
        label="Cote du pot (ratio)"
        hint="Format X:1"
        value={answer.ratio}
        onChange={(v) => setAnswer({ ...answer, ratio: v })}
        placeholder="ex. 2.25"
      />

      <Field
        label="Equity requise"
        hint="En pourcentage"
        value={answer.requiredEquity}
        onChange={(v) => setAnswer({ ...answer, requiredEquity: v })}
        placeholder="ex. 30.8 %"
      />

      <div className="mb-5">
        <div className="text-xs text-text-muted font-medium mb-2">Décision</div>
        <div className="flex gap-1.5">
          {(["fold", "call", "raise"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setAnswer({ ...answer, decision: d })}
              className={cn(
                "flex-1 px-3 py-3 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 capitalize",
                answer.decision === d
                  ? "[background:var(--purple-glow)] [color:var(--purple-300)] [border-color:var(--purple-400)]"
                  : "[background:var(--surface-strong)] text-text-muted hover:text-text [border-color:var(--border)] hover:[border-color:var(--border-strong)]"
              )}
              style={{
                border: "0.5px solid var(--border)",
                ...(answer.decision === d && {
                  boxShadow: "0 0 0 0.5px var(--purple-400), 0 0 12px var(--purple-glow)",
                }),
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onValidate}
          disabled={!canValidate}
          className={cn(
            "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
            canValidate ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
          )}
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: canValidate
              ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)"
              : "none",
          }}
        >
          Valider la réponse →
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        {hint && <span className="text-[11px] font-mono text-text-faint">{hint}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-3 rounded font-mono text-[15px] outline-none transition-all duration-200"
        style={{
          background: "var(--surface-strong)",
          border: "0.5px solid var(--border)",
          color: "var(--text)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--purple-400)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--purple-glow)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function CorrectionPanel({
  spot,
  answer,
  expectedDecision,
  onNext,
}: {
  spot: PotOddsSpot;
  answer: UserAnswer;
  expectedDecision: "call" | "fold";
  onNext: () => void;
}) {
  const eqUser = parseAnswerNumber(answer.requiredEquity);
  const ratioUser = parseRatio(answer.ratio);
  const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.requiredEquity) <= TOLERANCE_PCT;
  const ratioOk = ratioUser !== null && Math.abs(ratioUser - spot.expected.ratio) <= TOLERANCE_RATIO;
  const decisionOk = answer.decision === expectedDecision;
  const allOk = eqOk && ratioOk && decisionOk;

  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{
        background: "var(--surface)",
        border: `0.5px solid ${allOk ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
      }}
    >
      <div
        className="text-[11px] font-mono uppercase tracking-wider mb-2"
        style={{ color: allOk ? "var(--green)" : "var(--red)" }}
      >
        ◆ {allOk ? "Correct" : "Correction"}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {allOk ? "Bien décomposé." : "Voici la décomposition."}
      </h2>

      {/* Étape 1 — Identification des montants */}
      <CorrectionStep delay={0} num="01" label="Identifier les montants en jeu">
        <Formula>
          Pot avant ton call = <Mono>{fmtBb(spot.potBb)}</Mono>
          <br />
          Mise du vilain = <Mono>{fmtBb(spot.betBb)}</Mono>
          <br />
          <span className="text-text-muted">Pot final si tu calles = pot + bet + bet =</span> <Mono>{fmtBb(spot.expected.finalPotBb)}</Mono>
        </Formula>
      </CorrectionStep>

      {/* Étape 2 — Cote du pot */}
      <CorrectionStep
        delay={120}
        num="02"
        label="Calculer la cote du pot"
        userAnswer={answer.ratio ? fmtRatio(parseRatio(answer.ratio) ?? 0) : "—"}
        isOk={ratioOk}
      >
        <Formula>
          <Label>Formule</Label> Ratio = (pot + bet) / bet
          <br />
          <Label>Application</Label> ({fmtBb(spot.potBb)} + {fmtBb(spot.betBb)}) / {fmtBb(spot.betBb)} ={" "}
          <Mono className="!text-purple-300">{fmtRatio(spot.expected.ratio)}</Mono>
        </Formula>
      </CorrectionStep>

      {/* Étape 3 — Equity requise */}
      <CorrectionStep
        delay={240}
        num="03"
        label="En déduire l'equity requise"
        userAnswer={answer.requiredEquity ? fmtPercent(parseAnswerNumber(answer.requiredEquity) ?? 0) : "—"}
        isOk={eqOk}
      >
        <Formula>
          <Label>Formule</Label> Equity requise = bet / (pot + 2 × bet)
          <br />
          <Label>Application</Label> {fmtBb(spot.betBb)} / {fmtBb(spot.expected.finalPotBb)} ={" "}
          <Mono className="!text-purple-300">{fmtPercent(spot.expected.requiredEquity)}</Mono>
        </Formula>
      </CorrectionStep>

      {/* Étape 4 — Décision */}
      <CorrectionStep
        delay={360}
        num="04"
        label="Décider"
        userAnswer={answer.decision ?? "—"}
        isOk={decisionOk}
      >
        <Formula>
          Si ton equity estimée &gt; <Mono>{fmtPercent(spot.expected.requiredEquity)}</Mono> → <strong className="text-text">call</strong>
          <br />
          Sinon → <strong className="text-text">fold</strong>
          <br />
          <span className="text-text-muted">Bonne réponse :</span> <strong className="text-text capitalize">{expectedDecision}</strong>
        </Formula>
      </CorrectionStep>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

function CorrectionStep({
  delay,
  num,
  label,
  children,
  userAnswer,
  isOk,
}: {
  delay: number;
  num: string;
  label: string;
  children: React.ReactNode;
  userAnswer?: string;
  isOk?: boolean;
}) {
  return (
    <div
      className="mb-5 last:mb-0"
      style={{ animation: `fadeUp 400ms var(--ease-out) ${delay}ms backwards` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-faint">{num}</span>
          <span className="text-[13px] font-medium">{label}</span>
        </div>
        {userAnswer !== undefined && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-text-faint">Toi:</span>
            <span className={isOk ? "text-green" : "text-red"}>{userAnswer}</span>
            <span className={cn("text-base leading-none", isOk ? "text-green" : "text-red")}>
              {isOk ? "✓" : "✗"}
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Formula({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("font-mono text-[13px] rounded p-3.5 leading-[1.9]", className)}
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        borderLeft: "2px solid var(--purple-400)",
        color: "var(--text)",
      }}
    >
      {children}
    </div>
  );
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-text", className)}>{children}</span>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--purple-300)] font-medium">{children} —</span>;
}
