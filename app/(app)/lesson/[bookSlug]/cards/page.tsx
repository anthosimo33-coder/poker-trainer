"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CardsListPage() {
  const params = useParams();
  const bookSlug = params.bookSlug as string;
  const [query, setQuery] = useState("");

  const book = useQuery(api.lessons.getBook, { slug: bookSlug });
  const cards = useQuery(api.lessons.listCardsForBook, { bookSlug });

  const filtered = cards?.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.term.toLowerCase().includes(q) ||
      c.shortDef.toLowerCase().includes(q) ||
      c.searchKeywords.toLowerCase().includes(q)
    );
  });

  if (!book) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12 text-text-muted">
        Chargement…
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-8 pt-12 pb-24">
      <Link
        href="/lesson"
        className="inline-flex items-center gap-2 text-[12px] font-mono text-text-muted hover:text-text mb-10 transition-colors"
      >
        ← Bibliothèque
      </Link>

      <header className="mb-10">
        <div className="text-[12px] font-mono text-text-faint uppercase tracking-wider mb-3">
          Livre · {book.name} · Fiches
        </div>
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] mb-4 bg-gradient-text">
          {cards?.length ?? "—"} fiches.
        </h1>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer dans ce livre…"
          className="w-full max-w-[440px] px-4 py-2.5 rounded text-[14px] outline-none transition-all"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            color: "var(--text)",
          }}
        />
      </header>

      <section className="grid grid-cols-3 gap-2">
        {filtered?.map((card) => (
          <Link
            key={card.slug}
            href={`/lesson/${bookSlug}/cards/${card.slug}`}
            className="rounded p-5 transition-all duration-200 hover:-translate-y-0.5 block"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
            }}
          >
            <div className="text-[15px] font-medium tracking-[-0.015em] mb-1">
              {card.term}
            </div>
            <div className="text-[12px] text-text-muted leading-[1.55] line-clamp-2">
              {card.shortDef}
            </div>
          </Link>
        ))}
      </section>

      {filtered && filtered.length === 0 && (
        <div className="text-text-muted text-sm">
          Aucune fiche ne correspond à « {query} ».
        </div>
      )}
    </main>
  );
}
