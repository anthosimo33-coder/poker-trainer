"use client";

import { cn } from "@/lib/utils";
import { type Card, rankOf, suitOf, SUIT_SYMBOLS } from "@/lib/poker/cards";

interface PlayingCardProps {
  card: Card;
  dealDelayMs?: number;
  size?: "sm" | "md" | "lg";
  hidden?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { w: 40, h: 56, rank: 18, suit: 14, corner: 9 },
  md: { w: 56, h: 80, rank: 28, suit: 20, corner: 11 },
  lg: { w: 72, h: 104, rank: 36, suit: 26, corner: 13 },
};

export function PlayingCard({
  card,
  dealDelayMs = 0,
  size = "md",
  hidden = false,
  className,
}: PlayingCardProps) {
  const dim = SIZE_MAP[size];
  const rank = rankOf(card);
  const suit = suitOf(card);
  // Convention 2 couleurs : ♠♣ noir, ♥♦ rouge
  const isRed = suit === "h" || suit === "d";
  const suitChar = SUIT_SYMBOLS[suit];

  if (hidden) {
    return (
      <div
        className={cn("rounded-lg shrink-0 relative overflow-hidden", className)}
        style={{
          width: dim.w,
          height: dim.h,
          background: "linear-gradient(135deg, var(--purple-600), var(--purple-700))",
          boxShadow: "0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4)",
          animation: `cardDeal 600ms var(--ease-out) ${dealDelayMs}ms backwards`,
        }}
        aria-label="Carte cachée"
      >
        <div
          className="absolute inset-1 rounded-md opacity-30"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 4px, transparent 4px, transparent 8px)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg shrink-0 relative flex flex-col items-center justify-center font-bold select-none",
        className
      )}
      style={{
        width: dim.w,
        height: dim.h,
        background: "linear-gradient(180deg, #F4F4F5 0%, #E4E4E7 100%)",
        color: isRed ? "#DC2626" : "#0A0D0C",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(0,0,0,0.05)",
        animation: `cardDeal 600ms var(--ease-out) ${dealDelayMs}ms backwards`,
        fontFamily: "var(--font-geist-sans)",
        letterSpacing: "-0.02em",
      }}
      aria-label={`${rank} of ${suit}`}
    >
      <span
        className="absolute font-bold leading-none flex flex-col items-center"
        style={{ top: 5, left: 6, fontSize: dim.corner, lineHeight: 1.1 }}
      >
        <span>{rank}</span>
        <span style={{ fontSize: dim.corner - 1 }}>{suitChar}</span>
      </span>
      <span style={{ fontSize: dim.rank, lineHeight: 1, fontWeight: 700 }}>{rank}</span>
      <span style={{ fontSize: dim.suit, lineHeight: 1, marginTop: 3 }}>{suitChar}</span>
    </div>
  );
}
