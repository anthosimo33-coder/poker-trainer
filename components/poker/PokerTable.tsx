"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/poker/cards";
import { PlayingCard } from "./PlayingCard";

export interface Stack {
  label: string;
  bb: number;
  position?: string;
}

interface PokerTableProps {
  /** Tag contextuel en haut à gauche (e.g. "MTT · mid-stage"). */
  contextTag?: string;
  /** Info à droite (e.g. "40bb effective"). */
  contextInfo?: string;
  /** Stacks à afficher en haut (toi, vilain, pot, etc.). */
  stacks: Stack[];
  /** Hole cards du héros. */
  heroCards?: Card[];
  /** Board (flop/turn/river). */
  board?: Card[];
  /** Description de l'action courante. */
  action?: ReactNode;
  /** Question posée au joueur. */
  question?: ReactNode;
  className?: string;
}

export function PokerTable({
  contextTag,
  contextInfo,
  stacks,
  heroCards,
  board,
  action,
  question,
  className,
}: PokerTableProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden p-7",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="absolute inset-3 rounded-2xl pointer-events-none"
        style={{ border: "0.5px solid rgba(255,255,255,0.04)" }}
      />

      {(contextTag || contextInfo) && (
        <div className="relative z-10 flex justify-between items-center mb-6">
          {contextTag && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-green"
                style={{ boxShadow: "0 0 0 3px var(--green-glow)" }}
              />
              {contextTag}
            </div>
          )}
          {contextInfo && (
            <div className="text-xs font-mono text-text-faint">
              {contextInfo}
            </div>
          )}
        </div>
      )}

      {stacks.length > 0 && (
        <div
          className="grid grid-cols-3 gap-3 mb-7 pb-6"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
        >
          {stacks.map((s, i) => (
            <div
              key={i}
              className="rounded p-3"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "0.5px solid var(--border)",
              }}
            >
              <div className="font-mono uppercase tracking-wider text-text-faint mb-1.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
                {s.label}
              </div>
              <div className="font-semibold leading-none mb-1" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
                {s.bb}
                <span className="text-text-faint font-normal ml-0.5" style={{ fontSize: 11 }}>
                  bb
                </span>
              </div>
              {s.position && (
                <div className="text-xs font-mono text-text-muted">{s.position}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {heroCards && heroCards.length > 0 && (
        <div className="mb-6">
          <div className="font-mono uppercase text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Ta main
          </div>
          <div className="flex gap-2">
            {heroCards.map((c, i) => (
              <PlayingCard key={`${c}-${i}`} card={c} dealDelayMs={i * 80} />
            ))}
          </div>
        </div>
      )}

      {board && board.length > 0 && (
        <div className="mb-6">
          <div className="font-mono uppercase text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Board · {board.length === 3 ? "flop" : board.length === 4 ? "turn" : "river"}
          </div>
          <div className="flex gap-2">
            {board.map((c, i) => (
              <PlayingCard
                key={`${c}-${i}`}
                card={c}
                dealDelayMs={(heroCards?.length ?? 0) * 80 + i * 80}
              />
            ))}
          </div>
        </div>
      )}

      {(action || question) && (
        <div
          className="rounded p-5 mt-2"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "0.5px solid var(--border)",
          }}
        >
          {action && <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>{action}</div>}
          {question && <div className="text-text-muted" style={{ fontSize: 13 }}>{question}</div>}
        </div>
      )}
    </div>
  );
}
