"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SearchTrigger } from "@/components/lesson/SearchTrigger";

export default function LessonPage() {
  const [mode, setMode] = useState<"book" | "cards">("book");
  const books = useQuery(api.lessons.listBooks);

  return (
    <main className="max-w-[1200px] mx-auto px-8 pt-12 pb-24">
      <header className="mb-10" style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <div className="text-[13px] font-mono text-text-muted mb-3.5">
          Bibliothèque · accessible à tout moment
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          Leçon.
        </h1>
        <p className="text-base text-text-muted max-w-[540px] tracking-[-0.01em]">
          Les bases du poker, en trois livres. Mécaniques du jeu, stratégie fondamentale, lexique complet. Utilise le mode livre pour apprendre, le mode fiches pour réviser.
        </p>
      </header>

      <div className="flex items-center justify-between mb-8">
        <div
          className="inline-flex p-0.5 rounded"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
          }}
        >
          <ModeButton active={mode === "book"} onClick={() => setMode("book")}>
            Mode livre
          </ModeButton>
          <ModeButton active={mode === "cards"} onClick={() => setMode("cards")}>
            Mode fiches
          </ModeButton>
        </div>
        <SearchTrigger />
      </div>

      {!books && (
        <div className="text-text-muted text-sm">Chargement des livres…</div>
      )}

      {books && books.length === 0 && (
        <div
          className="rounded-lg p-8 text-center"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
          }}
        >
          <div className="text-text-muted mb-4">Aucun livre seedé.</div>
          <code className="font-mono text-xs text-text-faint">
            pnpm seed:lessons
          </code>
        </div>
      )}

      {books && books.length > 0 && (
        <section className="grid grid-cols-3 gap-4">
          {books.map((book, i) => (
            <BookCard key={book.slug} book={book} index={i} mode={mode} />
          ))}
        </section>
      )}
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded text-[13px] font-medium transition-all duration-200"
      style={{
        background: active ? "var(--surface-strong)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        boxShadow: active ? "0 0 0 0.5px var(--border-strong)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function BookCard({
  book,
  index,
  mode,
}: {
  book: { slug: string; name: string; description: string; orderIndex: number };
  index: number;
  mode: "book" | "cards";
}) {
  const chapters = useQuery(api.lessons.listChaptersForBook, { bookSlug: book.slug });
  const cards = useQuery(api.lessons.listCardsForBook, { bookSlug: book.slug });
  const href = mode === "book"
    ? `/lesson/${book.slug}`
    : `/lesson/${book.slug}/cards`;

  return (
    <Link
      href={href}
      className="rounded-lg p-7 transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden block"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        animation: `fadeUp 400ms var(--ease-out) ${index * 80}ms backwards`,
      }}
    >
      <div className="font-mono text-xs text-text-faint mb-4 tracking-wider">
        LIVRE {["I", "II", "III"][book.orderIndex - 1] ?? book.orderIndex}
      </div>
      <h2 className="text-[22px] font-semibold tracking-[-0.025em] mb-2">{book.name}</h2>
      <p className="text-[13px] text-text-muted leading-[1.55] mb-5">{book.description}</p>
      <div
        className="flex gap-4 pt-4 text-xs text-text-faint font-mono"
        style={{ borderTop: "0.5px solid var(--border)" }}
      >
        <span>
          <strong className="text-text font-medium">{chapters?.length ?? "—"}</strong> chapitres
        </span>
        <span>
          <strong className="text-text font-medium">{cards?.length ?? "—"}</strong> fiches
        </span>
      </div>
    </Link>
  );
}
