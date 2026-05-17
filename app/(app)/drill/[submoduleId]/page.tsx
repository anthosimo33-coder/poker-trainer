"use client";

import { useState, useMemo, useEffect, useRef, Suspense, type ReactNode } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { PokerTable } from "@/components/poker/PokerTable";
import { getGenerator } from "@/lib/poker/spot-generators/registry";
import type { GenericSpot } from "@/lib/poker/spot-generators/types";
import type { PotOddsConversionSpot } from "@/lib/poker/spot-generators/m1-2-conversion";
import type { ImpliedOddsSpot } from "@/lib/poker/spot-generators/m1-3-implied";
import type { ReverseImpliedSpot } from "@/lib/poker/spot-generators/m1-4-reverse-implied";
import type { OutsSpot } from "@/lib/poker/spot-generators/m2-1-outs";
import { fmtPercent, fmtRatio, fmtBb, cn } from "@/lib/utils";
import { fmtDurationCompact, fmtDurationCompactUnit } from "@/lib/format";
import { urlSlugToDbSlug, moduleSlugFromSubmodule } from "@/lib/slug";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { Id } from "@/convex/_generated/dataModel";

interface Attempt {
  spotId: string;
  isCorrect: boolean;
  timeMs: number;
}

type Decision = "call" | "fold" | "raise" | null;

interface UserAnswer {
  ratio: string;
  requiredEquity: string;
  neededExtra: string;
  adjustedEquity: string;
  outsInput: string;
  equityInput: string;
  decision: Decision;
}

const EMPTY_ANSWER: UserAnswer = {
  ratio: "",
  requiredEquity: "",
  neededExtra: "",
  adjustedEquity: "",
  outsInput: "",
  equityInput: "",
  decision: null,
};

const SPOTS_PER_SESSION = 20;
const TOL_PCT = 1.5;
const TOL_RATIO = 0.15;
const TOL_BB = 0.8;

function parseAnswerNumber(input: string): number | null {
  const cleaned = input.replace(",", ".").replace(/[%\s]/g, "").trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseRatio(input: string): number | null {
  const cleaned = input.toLowerCase().replace(",", ".").trim();
  const match = cleaned.match(/^([\d.]+)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

// ---- Type guards pour narrower GenericSpot ----
function isConversion(s: GenericSpot): s is PotOddsConversionSpot {
  return "mode" in s;
}
function isImplied(s: GenericSpot): s is ImpliedOddsSpot {
  return "drawDescription" in s;
}
function isReverse(s: GenericSpot): s is ReverseImpliedSpot {
  return "handDescription" in s;
}
// OutsSpot porte aussi `drawDescription` (comme ImpliedOddsSpot) : on le
// distingue par son champ unique `outs` et on le teste TOUJOURS avant isImplied.
function isOuts(s: GenericSpot): s is OutsSpot {
  return "outs" in s;
}

interface CorrStep {
  num: string;
  label: string;
  userText?: string;
  ok?: boolean;
  body: ReactNode;
}

const SUBMODULE_TITLES: Record<string, string> = {
  "m1.1": "Pot odds · Sous-module 1",
  "m1.2": "Conversion · Sous-module 2",
  "m1.3": "Cotes implicites · Sous-module 3",
  "m1.4": "Reverse implied · Sous-module 4",
  "m2.1": "Outs & règle 4&2 · Sous-module 1",
};

const MODULE_ROMAN: Record<string, string> = {
  m1: "I",
  m2: "II",
  m3: "III",
  m4: "IV",
  m5: "V",
};

function canValidate(spot: GenericSpot, a: UserAnswer): boolean {
  if (isOuts(spot)) {
    return (
      parseAnswerNumber(a.outsInput) !== null &&
      parseAnswerNumber(a.equityInput) !== null
    );
  }
  if (isConversion(spot)) {
    return spot.ask === "ratio"
      ? parseRatio(a.ratio) !== null
      : parseAnswerNumber(a.requiredEquity) !== null;
  }
  if (isImplied(spot)) {
    return parseAnswerNumber(a.requiredEquity) !== null && parseAnswerNumber(a.neededExtra) !== null;
  }
  if (isReverse(spot)) {
    return parseAnswerNumber(a.adjustedEquity) !== null && a.decision !== null;
  }
  // m1.1
  return (
    parseAnswerNumber(a.requiredEquity) !== null &&
    parseRatio(a.ratio) !== null &&
    a.decision !== null
  );
}

function grade(spot: GenericSpot, a: UserAnswer): { isCorrect: boolean; steps: CorrStep[] } {
  if (isOuts(spot)) {
    const outsUser = parseAnswerNumber(a.outsInput);
    const eqUser = parseAnswerNumber(a.equityInput);
    // Outs : comptage exact, aucune tolérance.
    const outsOk = outsUser !== null && Math.round(outsUser) === spot.expected.outs;
    // Equity : règle 4&2 approximative → tolérance ±5 points.
    const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.equityApprox) <= 5;
    const signed =
      eqUser === null ? 0 : Math.round((eqUser - spot.expected.equityApprox) * 10) / 10;
    const signedLabel =
      eqUser === null
        ? "—"
        : signed > 0
        ? `+${signed} % (surestimé)`
        : signed < 0
        ? `${signed} % (sous-estimé)`
        : "exact";
    return {
      isCorrect: outsOk && eqOk,
      steps: [
        {
          num: "01",
          label: "Compter les outs",
          userText: a.outsInput ? `${Math.round(outsUser ?? 0)}` : "—",
          ok: outsOk,
          body: (
            <FormulaBox>
              <Lbl>Tirage</Lbl> {spot.drawDescription}
              <br />
              <Lbl>Outs corrects</Lbl>{" "}
              <Mono className="!text-purple-300">{spot.expected.outs}</Mono>
              <br />
              <span className="text-text-muted">
                Le comptage est exact : une carte est un out, ou ne l&apos;est pas.
              </span>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: `Règle des 4 et 2 (${spot.street})`,
          userText: a.equityInput ? fmtPercent(eqUser ?? 0) : "—",
          ok: eqOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> outs × {spot.expected.multiplier} ={" "}
              {spot.street === "flop" ? "equity (2 cartes à venir)" : "equity (1 carte à venir)"}
              <br />
              <Lbl>Application</Lbl> {spot.expected.outs} × {spot.expected.multiplier} ={" "}
              <Mono className="!text-purple-300">
                {fmtPercent(spot.expected.equityApprox)}
              </Mono>
              <br />
              <span className="text-text-muted">Erreur signée : {signedLabel}</span>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  if (isConversion(spot)) {
    const askRatio = spot.ask === "ratio";
    const exp = askRatio ? spot.expected.ratio : spot.expected.requiredEquity;
    const got = askRatio ? parseRatio(a.ratio) : parseAnswerNumber(a.requiredEquity);
    const tol = askRatio ? TOL_RATIO : TOL_PCT;
    const ok = got !== null && Math.abs(got - exp) <= tol;
    return {
      isCorrect: ok,
      steps: [
        {
          num: "01",
          label: "Le format demandé",
          body: (
            <FormulaBox>
              {spot.given ? (
                <>
                  On te donne{" "}
                  <Mono>
                    {spot.given.kind === "ratio" ? fmtRatio(spot.given.value) : fmtPercent(spot.given.value)}
                  </Mono>
                  <br />
                </>
              ) : null}
              Tu dois fournir : <strong className="text-text">{askRatio ? "la cote (ratio)" : "l'equity requise (%)"}</strong>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: askRatio ? "Convertir % → ratio" : "Convertir ratio → %",
          userText: askRatio
            ? a.ratio
              ? fmtRatio(parseRatio(a.ratio) ?? 0)
              : "—"
            : a.requiredEquity
            ? fmtPercent(parseAnswerNumber(a.requiredEquity) ?? 0)
            : "—",
          ok,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> {askRatio ? "R = (100 − %) / %" : "% = 1 / (R + 1)"}
              <br />
              <Lbl>Résultat</Lbl>{" "}
              <Mono className="!text-purple-300">
                {askRatio ? fmtRatio(spot.expected.ratio) : fmtPercent(spot.expected.requiredEquity)}
              </Mono>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  if (isImplied(spot)) {
    const eqUser = parseAnswerNumber(a.requiredEquity);
    const extraUser = parseAnswerNumber(a.neededExtra);
    const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.requiredEquity) <= TOL_PCT;
    const extraOk = extraUser !== null && Math.abs(extraUser - spot.expected.neededExtraBb) <= TOL_BB;
    return {
      isCorrect: eqOk && extraOk,
      steps: [
        {
          num: "01",
          label: "Equity requise (cote brute)",
          userText: a.requiredEquity ? fmtPercent(eqUser ?? 0) : "—",
          ok: eqOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> bet / (pot + 2 × bet)
              <br />
              <Lbl>Application</Lbl> {fmtBb(spot.betBb)} / {fmtBb(spot.expected.finalPotBb)} ={" "}
              <Mono className="!text-purple-300">{fmtPercent(spot.expected.requiredEquity)}</Mono>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: "Gain futur moyen requis",
          userText: a.neededExtra ? `${fmtBb(extraUser ?? 0)}` : "—",
          ok: extraOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> X = (bet / equity) − pot final
              <br />
              <Lbl>Application</Lbl> ({fmtBb(spot.betBb)} / {(spot.realEquity / 100).toFixed(2)}) −{" "}
              {fmtBb(spot.expected.finalPotBb)} ={" "}
              <Mono className="!text-purple-300">{fmtBb(spot.expected.neededExtraBb)}</Mono>
              <br />
              <span className="text-text-muted">
                Tirage : {spot.drawDescription} (~{spot.realEquity} % d&apos;equity)
              </span>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  if (isReverse(spot)) {
    const adjUser = parseAnswerNumber(a.adjustedEquity);
    const adjOk = adjUser !== null && Math.abs(adjUser - spot.expected.adjustedEquity) <= TOL_PCT;
    const expectedDecision: "call" | "fold" =
      spot.expected.adjustedEquity >= spot.expected.requiredEquity ? "call" : "fold";
    const decisionOk = a.decision === expectedDecision;
    return {
      isCorrect: adjOk && decisionOk,
      steps: [
        {
          num: "01",
          label: "Equity ajustée (reverse implied)",
          userText: a.adjustedEquity ? fmtPercent(adjUser ?? 0) : "—",
          ok: adjOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> apparente − pénalité reverse
              <br />
              <Lbl>Application</Lbl> {fmtPercent(spot.apparentEquity)} (apparente) →{" "}
              <Mono className="!text-purple-300">{fmtPercent(spot.expected.adjustedEquity)}</Mono> (effective)
              <br />
              <span className="text-text-muted">Main : {spot.handDescription}</span>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: "Décider sur l'equity réelle",
          userText: a.decision ?? "—",
          ok: decisionOk,
          body: (
            <FormulaBox>
              Equity requise = <Mono>{fmtPercent(spot.expected.requiredEquity)}</Mono>
              <br />
              Equity effective <Mono>{fmtPercent(spot.expected.adjustedEquity)}</Mono>{" "}
              {expectedDecision === "call" ? "≥" : "<"} requise → <strong className="text-text capitalize">{expectedDecision}</strong>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  // m1.1 — pot odds basiques
  const eqUser = parseAnswerNumber(a.requiredEquity);
  const ratioUser = parseRatio(a.ratio);
  const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.requiredEquity) <= TOL_PCT;
  const ratioOk = ratioUser !== null && Math.abs(ratioUser - spot.expected.ratio) <= TOL_RATIO;
  const expectedDecision: "call" | "fold" = spot.expected.requiredEquity < 40 ? "call" : "fold";
  const decisionOk = a.decision === expectedDecision;
  return {
    isCorrect: eqOk && ratioOk && decisionOk,
    steps: [
      {
        num: "01",
        label: "Identifier les montants en jeu",
        body: (
          <FormulaBox>
            Pot avant ton call = <Mono>{fmtBb(spot.potBb)}</Mono>
            <br />
            Mise du vilain = <Mono>{fmtBb(spot.betBb)}</Mono>
            <br />
            <span className="text-text-muted">Pot final si tu calles =</span>{" "}
            <Mono>{fmtBb(spot.expected.finalPotBb)}</Mono>
          </FormulaBox>
        ),
      },
      {
        num: "02",
        label: "Calculer la cote du pot",
        userText: a.ratio ? fmtRatio(parseRatio(a.ratio) ?? 0) : "—",
        ok: ratioOk,
        body: (
          <FormulaBox>
            <Lbl>Formule</Lbl> Ratio = (pot + bet) / bet
            <br />
            <Lbl>Application</Lbl> ({fmtBb(spot.potBb)} + {fmtBb(spot.betBb)}) / {fmtBb(spot.betBb)} ={" "}
            <Mono className="!text-purple-300">{fmtRatio(spot.expected.ratio)}</Mono>
          </FormulaBox>
        ),
      },
      {
        num: "03",
        label: "En déduire l'equity requise",
        userText: a.requiredEquity ? fmtPercent(parseAnswerNumber(a.requiredEquity) ?? 0) : "—",
        ok: eqOk,
        body: (
          <FormulaBox>
            <Lbl>Formule</Lbl> Equity requise = bet / (pot + 2 × bet)
            <br />
            <Lbl>Application</Lbl> {fmtBb(spot.betBb)} / {fmtBb(spot.expected.finalPotBb)} ={" "}
            <Mono className="!text-purple-300">{fmtPercent(spot.expected.requiredEquity)}</Mono>
          </FormulaBox>
        ),
      },
      {
        num: "04",
        label: "Décider",
        userText: a.decision ?? "—",
        ok: decisionOk,
        body: (
          <FormulaBox>
            Si ton equity estimée &gt; <Mono>{fmtPercent(spot.expected.requiredEquity)}</Mono> →{" "}
            <strong className="text-text">call</strong>
            <br />
            <span className="text-text-muted">Bonne réponse :</span>{" "}
            <strong className="text-text capitalize">{expectedDecision}</strong>
          </FormulaBox>
        ),
      },
    ],
  };
}

function actionFor(spot: GenericSpot): ReactNode {
  // OutsSpot a son énoncé rendu inline dans le drill (jamais via actionFor) ;
  // ce garde assure la totalité de type (OutsSpot n'a ni potBb ni positions).
  if (isOuts(spot)) return null;
  if (isImplied(spot)) {
    return (
      <>
        Le {spot.villainPosition} <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de{" "}
        <BetTag>{fmtBb(spot.potBb)}</BetTag>. Tu as un {spot.drawDescription} (~{spot.realEquity} % equity).
      </>
    );
  }
  if (isReverse(spot)) {
    return (
      <>
        Tu as {spot.handDescription} (apparente ~{spot.apparentEquity} %). Le {spot.villainPosition}{" "}
        <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de <BetTag>{fmtBb(spot.potBb)}</BetTag>.
      </>
    );
  }
  return (
    <>
      Le {spot.villainPosition} <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de{" "}
      <BetTag>{fmtBb(spot.potBb)}</BetTag>. Action sur toi.
    </>
  );
}

function questionFor(spot: GenericSpot): string {
  if (isConversion(spot)) {
    const base =
      spot.ask === "ratio"
        ? "Donne la cote du pot au format X:1."
        : "Donne l'equity requise en pourcentage.";
    if (spot.given) {
      const g =
        spot.given.kind === "ratio"
          ? `cote ${spot.given.value.toFixed(2)} : 1`
          : `${spot.given.value.toFixed(1)} %`;
      return `On te donne ${g}. ${base}`;
    }
    return base;
  }
  if (isImplied(spot)) {
    return "Calcule l'equity requise, puis le gain futur moyen à extraire pour rendre le call break-even.";
  }
  if (isReverse(spot)) {
    return "Estime l'equity effective (reverse implied) puis décide.";
  }
  return "Calcule la cote du pot, l'equity requise pour caller, et donne ta décision.";
}

function DrillContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const urlSubmoduleId = params.submoduleId as string;
  const dbSubmoduleSlug = urlSlugToDbSlug(urlSubmoduleId);
  const moduleSlug = moduleSlugFromSubmodule(dbSubmoduleSlug);
  const isRetryMode = searchParams.get("mode") === "retry";

  const { userId, isReady } = useCurrentUser();
  const completion = useQuery(
    api.theoryCompletions.getCompletion,
    userId ? { userId, submoduleSlug: dbSubmoduleSlug } : "skip"
  );

  const [spot, setSpot] = useState<GenericSpot | null>(null);
  const [retrySpots, setRetrySpots] = useState<GenericSpot[] | null>(null);
  const [answer, setAnswer] = useState<UserAnswer>(EMPTY_ANSWER);
  const [showCorrection, setShowCorrection] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [spotIndex, setSpotIndex] = useState(1);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const startSession = useMutation(api.sessions.startSession);
  const recordAttempt = useMutation(api.attempts.recordAttempt);
  const addSpotToSession = useMutation(api.sessions.addSpotToSession);
  const endSession = useMutation(api.sessions.endSession);

  const generator = getGenerator(dbSubmoduleSlug);
  const isTheoryCompleted =
    completion !== undefined && completion !== null && completion.quickCheckScore >= 2;

  // Mode retry : charge les spots ratés
  useEffect(() => {
    if (isRetryMode && retrySpots === null) {
      const raw = sessionStorage.getItem("retrySpots");
      if (raw) {
        try {
          setRetrySpots(JSON.parse(raw) as GenericSpot[]);
          sessionStorage.removeItem("retrySpots");
        } catch {
          setRetrySpots([]);
        }
      } else {
        setRetrySpots([]);
      }
    }
  }, [isRetryMode, retrySpots]);

  // Start session — UNIQUEMENT si théorie validée ou mode rejeu (fix S4a : plus de session zombie)
  useEffect(() => {
    if (!isReady || !userId || sessionId) return;
    if (!isTheoryCompleted && !isRetryMode) return;
    startSession({ userId, moduleSlug, submoduleSlug: dbSubmoduleSlug }).then(setSessionId);
  }, [isReady, userId, sessionId, isTheoryCompleted, isRetryMode, moduleSlug, dbSubmoduleSlug, startSession]);

  // Génère le spot
  useEffect(() => {
    if (!sessionId || spot || !generator) return;
    if (isRetryMode) {
      if (retrySpots && retrySpots.length > 0 && spotIndex <= retrySpots.length) {
        setSpot(retrySpots[spotIndex - 1]);
        startedAtRef.current = Date.now();
      } else if (retrySpots && retrySpots.length === 0) {
        window.location.href = `/drill/${urlSubmoduleId}`;
      }
    } else {
      setSpot(generator());
      startedAtRef.current = Date.now();
    }
  }, [spot, sessionId, isRetryMode, retrySpots, spotIndex, generator, urlSubmoduleId]);

  const stats = useMemo(() => {
    const correct = attempts.filter((a) => a.isCorrect).length;
    const wrong = attempts.length - correct;
    const avgTimeMs = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.timeMs, 0) / attempts.length)
      : 0;
    return { correct, wrong, avgTimeMs };
  }, [attempts]);

  const totalSpots = isRetryMode ? retrySpots?.length ?? SPOTS_PER_SESSION : SPOTS_PER_SESSION;

  if (!generator) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-16">
        <div className="text-text-muted mb-4">Sous-module indisponible : {urlSubmoduleId}.</div>
        <Link href="/" className="text-purple-400 hover:underline">Retour à l&apos;Atelier</Link>
      </main>
    );
  }

  if (completion === undefined) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-16">
        <div className="text-text-muted">Chargement…</div>
      </main>
    );
  }

  if (!isTheoryCompleted && !isRetryMode) {
    return (
      <main className="max-w-[720px] mx-auto px-8 pt-16 pb-24">
        <div style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: "var(--purple-glow)", border: "0.5px solid rgba(167, 139, 250, 0.3)", color: "var(--purple-300)", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
            ◆ Théorie à lire
          </div>
          <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] mb-4 bg-gradient-text">
            Lis la théorie d&apos;abord.
          </h1>
          <p className="text-[15px] text-text-muted mb-8 max-w-[520px] leading-[1.65]">
            Le drill se débloque après lecture de la théorie et validation du quick check (2/3 minimum). C&apos;est la garantie que tu drilles avec les bons outils mentaux, pas dans le vide.
          </p>
          <Link
            href={`/module/${moduleSlug}/theory/${urlSubmoduleId}`}
            className="inline-block px-6 py-3.5 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 hover:-translate-y-px text-white"
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
            }}
          >
            Lire la théorie →
          </Link>
        </div>
      </main>
    );
  }

  if (!isReady || !sessionId || !spot) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="text-text-muted">Préparation de la session…</div>
      </main>
    );
  }

  const validatable = canValidate(spot, answer);

  async function handleValidate() {
    if (!spot || !userId || !sessionId) return;
    const result = grade(spot, answer);
    const timeMs = Date.now() - startedAtRef.current;
    // Erreur signée (calibration tracking) : pour M2.1, écart estimation
    // d'equity − vraie valeur. Optionnel ailleurs (juste/faux pur).
    let signedError: number | undefined;
    if (isOuts(spot)) {
      const ue = parseAnswerNumber(answer.equityInput);
      if (ue !== null) {
        signedError = Math.round((ue - spot.expected.equityApprox) * 10) / 10;
      }
    }
    const attemptId = await recordAttempt({
      userId,
      submoduleSlug: dbSubmoduleSlug,
      spotId: spot.id,
      spotSnapshot: spot,
      expected: spot.expected,
      userAnswer: answer,
      isCorrect: result.isCorrect,
      timeMs,
      hintUsed: false,
      ...(signedError !== undefined ? { signedError } : {}),
    });
    await addSpotToSession({ sessionId, attemptId, orderIndex: spotIndex - 1, isCorrect: result.isCorrect });
    setAttempts((prev) => [...prev, { spotId: spot.id, isCorrect: result.isCorrect, timeMs }]);
    setShowCorrection(true);
  }

  async function handleNext() {
    if (spotIndex >= totalSpots && sessionId) {
      await endSession({ sessionId });
      window.location.href = `/drill/${urlSubmoduleId}/review?session=${sessionId}`;
      return;
    }
    if (isRetryMode && retrySpots) {
      setSpot(retrySpots[spotIndex]);
    } else if (generator) {
      setSpot(generator());
    }
    startedAtRef.current = Date.now();
    setAnswer(EMPTY_ANSWER);
    setShowCorrection(false);
    setSpotIndex((i) => i + 1);
  }

  return (
    <main className="max-w-[1200px] mx-auto px-8 py-12">
      <div className="flex justify-between items-end mb-10 pb-6" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-2 flex items-center gap-2">
            Module {MODULE_ROMAN[moduleSlug] ?? moduleSlug} · {SUBMODULE_TITLES[dbSubmoduleSlug] ?? dbSubmoduleSlug}
            {isRetryMode && (
              <span
                className="px-2 py-0.5 rounded normal-case tracking-normal"
                style={{ background: "var(--amber-glow)", border: "0.5px solid rgba(251, 191, 36, 0.3)", color: "var(--amber)", fontSize: 10 }}
              >
                Mode rejeu · {totalSpots} spot{totalSpots > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="text-4xl font-semibold tracking-[-0.03em] leading-none">
            Spot {spotIndex}
            <span className="text-text-faint font-normal"> / {totalSpots}</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <ScoreStat label="Réussis" value={stats.correct} color="var(--green)" />
          <ScoreStat label="Ratés" value={stats.wrong} color="var(--red)" />
          <ScoreStat
            label="Temps moy."
            value={fmtDurationCompact(stats.avgTimeMs)}
            unit={fmtDurationCompactUnit(stats.avgTimeMs)}
            pad={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-8">
        {isOuts(spot) ? (
          <PokerTable
            contextTag="MTT · lecture d'outs"
            contextInfo={
              spot.street === "flop"
                ? "Flop — 2 cartes à venir"
                : "Turn — 1 carte à venir"
            }
            stacks={[]}
            heroCards={spot.heroCards}
            board={spot.board}
            action={
              <>
                Tu as ta main au {spot.street}. Tirage :{" "}
                <BetTag>{spot.drawDescription}</BetTag>.
              </>
            }
            question={
              spot.street === "flop"
                ? "Compte tes outs, puis applique la règle × 4 (flop)."
                : "Compte tes outs, puis applique la règle × 2 (turn)."
            }
          />
        ) : (
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
            action={actionFor(spot)}
            question={questionFor(spot)}
          />
        )}

        {!showCorrection ? (
          <AnswerPanel
            spot={spot}
            answer={answer}
            setAnswer={setAnswer}
            canSubmit={validatable}
            onValidate={handleValidate}
          />
        ) : (
          <CorrectionPanel spot={spot} answer={answer} onNext={handleNext} />
        )}
      </div>
    </main>
  );
}

export default function DrillPage() {
  return (
    <Suspense fallback={<main className="max-w-[1200px] mx-auto px-8 py-12 text-text-muted">Préparation…</main>}>
      <DrillContent />
    </Suspense>
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
  value: string | number;
  color?: string;
  unit?: string;
  pad?: boolean;
}) {
  const display = pad && typeof value === "number" ? String(value).padStart(2, "0") : value;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-medium">{label}</span>
      <span className="text-2xl font-semibold font-mono leading-none tracking-tight" style={{ color }}>
        {display}
        {unit && <span className="text-xs text-text-faint font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function BetTag({ children }: { children: ReactNode }) {
  return (
    <strong
      className="font-mono font-medium text-[13px] px-1.5 py-0.5 rounded mx-0.5"
      style={{ color: "var(--purple-300)", background: "var(--purple-glow)" }}
    >
      {children}
    </strong>
  );
}

function AnswerPanel({
  spot,
  answer,
  setAnswer,
  canSubmit,
  onValidate,
}: {
  spot: GenericSpot;
  answer: UserAnswer;
  setAnswer: (a: UserAnswer) => void;
  canSubmit: boolean;
  onValidate: () => void;
}) {
  // M2.1 — panneau purement calculatoire (pas de décision). Early-return pour
  // préserver le narrowing aliasé des guards m1.x ci-dessous.
  if (isOuts(spot)) {
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Ta réponse
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-7">
          Compte, puis applique.
        </h2>
        <Field
          label="Outs"
          hint="Nombre entier"
          value={answer.outsInput}
          onChange={(v) => setAnswer({ ...answer, outsInput: v })}
          placeholder="ex. 9"
        />
        <Field
          label="Equity approximative"
          hint={`Règle des 4 et 2 (× ${spot.expected.multiplier})`}
          value={answer.equityInput}
          onChange={(v) => setAnswer({ ...answer, equityInput: v })}
          placeholder="ex. 36 %"
        />
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  const conversion = isConversion(spot);
  const implied = isImplied(spot);
  const reverse = isReverse(spot);
  const basic = !conversion && !implied && !reverse;
  const showDecision = basic || reverse;

  return (
    <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
        ◆ Ta réponse
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-7">
        Décompose avant de décider.
      </h2>

      {(basic || (conversion && spot.ask === "ratio")) && (
        <Field
          label="Cote du pot (ratio)"
          hint="Format X:1"
          value={answer.ratio}
          onChange={(v) => setAnswer({ ...answer, ratio: v })}
          placeholder="ex. 2.25"
        />
      )}
      {(basic || implied || (conversion && spot.ask === "percent")) && (
        <Field
          label="Equity requise"
          hint="En pourcentage"
          value={answer.requiredEquity}
          onChange={(v) => setAnswer({ ...answer, requiredEquity: v })}
          placeholder="ex. 30.8 %"
        />
      )}
      {implied && (
        <Field
          label="Gain futur requis"
          hint="En bb"
          value={answer.neededExtra}
          onChange={(v) => setAnswer({ ...answer, neededExtra: v })}
          placeholder="ex. 16"
        />
      )}
      {reverse && (
        <Field
          label="Equity effective (ajustée)"
          hint="En pourcentage"
          value={answer.adjustedEquity}
          onChange={(v) => setAnswer({ ...answer, adjustedEquity: v })}
          placeholder="ex. 48 %"
        />
      )}

      {showDecision && (
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
                  ...(answer.decision === d && { boxShadow: "0 0 0 0.5px var(--purple-400), 0 0 12px var(--purple-glow)" }),
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onValidate}
          disabled={!canSubmit}
          className={cn(
            "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
            canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
          )}
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
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
        style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)", color: "var(--text)" }}
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
  onNext,
}: {
  spot: GenericSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const { isCorrect, steps } = grade(spot, answer);
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${isCorrect ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: isCorrect ? "var(--green)" : "var(--red)" }}>
        ◆ {isCorrect ? "Correct" : "Correction"}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {isCorrect ? "Bien décomposé." : "Voici la décomposition."}
      </h2>

      {steps.map((step, i) => (
        <div
          key={step.num}
          className="mb-5 last:mb-0"
          style={{ animation: `fadeUp 400ms var(--ease-out) ${i * 120}ms backwards` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-faint">{step.num}</span>
              <span className="text-[13px] font-medium">{step.label}</span>
            </div>
            {step.userText !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-text-faint">Toi:</span>
                <span className={step.ok ? "text-green" : "text-red"}>{step.userText}</span>
                <span className={cn("text-base leading-none", step.ok ? "text-green" : "text-red")}>
                  {step.ok ? "✓" : "✗"}
                </span>
              </div>
            )}
          </div>
          {step.body}
        </div>
      ))}

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

function FormulaBox({ children, className }: { children: ReactNode; className?: string }) {
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

function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-text", className)}>{children}</span>;
}

function Lbl({ children }: { children: ReactNode }) {
  return <span className="text-[var(--purple-300)] font-medium">{children} —</span>;
}
