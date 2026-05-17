"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const BOOK_LABELS: Record<string, string> = {
  mecaniques: "Mécaniques",
  strategie: "Stratégie",
  lexique: "Lexique",
};

const BOOK_COLORS: Record<string, string> = {
  mecaniques: "var(--purple-300)",
  strategie: "var(--green)",
  lexique: "var(--amber)",
};

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const results = useQuery(
    api.lessons.searchCards,
    query.length >= 2 ? { query, bookSlug: bookFilter ?? undefined, limit: 30 } : "skip"
  );

  // Reset l'index actif quand les résultats changent
  useEffect(() => {
    setActiveIdx(0);
  }, [query, bookFilter]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, (results?.length ?? 1) - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results && results[activeIdx]) {
        const card = results[activeIdx];
        window.location.href = `/lesson/${card.bookSlug}/cards/${card.slug}`;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [results, activeIdx]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-6"
      style={{ background: "rgba(10, 13, 12, 0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "0.5px solid var(--border-strong)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "fadeUp 200ms var(--ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "0.5px solid var(--border)" }}
        >
          <span className="text-text-faint text-base">⌕</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Rechercher un terme, un concept, une notion…"
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-text placeholder:text-text-faint"
          />
          <button
            onClick={onClose}
            className="text-text-faint hover:text-text transition-colors text-xl leading-none px-1"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1.5 px-5 py-3" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <FilterPill active={bookFilter === null} onClick={() => setBookFilter(null)}>
            Tous
          </FilterPill>
          {Object.entries(BOOK_LABELS).map(([slug, label]) => (
            <FilterPill
              key={slug}
              active={bookFilter === slug}
              onClick={() => setBookFilter(slug)}
              color={BOOK_COLORS[slug]}
            >
              {label}
            </FilterPill>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.length < 2 && (
            <div className="px-5 py-12 text-center text-text-muted text-sm">
              Tape au moins 2 caractères pour rechercher.
            </div>
          )}
          {query.length >= 2 && results === undefined && (
            <div className="px-5 py-12 text-center text-text-muted text-sm">
              Recherche en cours…
            </div>
          )}
          {query.length >= 2 && results && results.length === 0 && (
            <div className="px-5 py-12 text-center text-text-muted text-sm">
              Aucun résultat pour « {query} »
            </div>
          )}
          {results &&
            results.map((card, i) => (
              <Link
                key={card.slug}
                href={`/lesson/${card.bookSlug}/cards/${card.slug}`}
                onClick={onClose}
                className="block px-5 py-3 transition-all duration-150"
                style={{
                  background: i === activeIdx ? "var(--surface-hover)" : "transparent",
                  borderBottom: "0.5px solid var(--border)",
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{
                      background: "var(--surface-strong)",
                      color: BOOK_COLORS[card.bookSlug] ?? "var(--text-muted)",
                      border: `0.5px solid ${BOOK_COLORS[card.bookSlug] ?? "var(--border)"}`,
                    }}
                  >
                    {BOOK_LABELS[card.bookSlug] ?? card.bookSlug}
                  </span>
                  <span className="text-[15px] font-medium">{card.term}</span>
                </div>
                <div className="text-[13px] text-text-muted leading-[1.5] line-clamp-1">
                  {card.shortDef}
                </div>
              </Link>
            ))}
        </div>

        <div
          className="px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-text-faint"
          style={{ borderTop: "0.5px solid var(--border)" }}
        >
          <div className="flex gap-4">
            <span>↑↓ naviguer</span>
            <span>↵ ouvrir</span>
            <span>esc fermer</span>
          </div>
          <span>{results?.length ?? 0} résultats</span>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-all duration-150"
      style={{
        background: active ? "var(--surface-strong)" : "transparent",
        color: active ? color ?? "var(--text)" : "var(--text-muted)",
        border: `0.5px solid ${active ? color ?? "var(--border-strong)" : "transparent"}`,
      }}
    >
      {children}
    </button>
  );
}
