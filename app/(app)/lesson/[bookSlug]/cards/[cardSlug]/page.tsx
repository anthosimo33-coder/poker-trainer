"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function CardDetailPage() {
  const params = useParams();
  const bookSlug = params.bookSlug as string;
  const cardSlug = params.cardSlug as string;

  const card = useQuery(api.lessons.getCard, { slug: cardSlug });
  const related = useQuery(
    api.lessons.listCardsForBook,
    card ? { bookSlug: card.bookSlug } : "skip"
  );

  if (!card) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-12 text-text-muted">
        Chargement…
      </main>
    );
  }

  const relatedCards = related?.filter((c) => card.relatedCardSlugs.includes(c.slug));

  return (
    <main className="max-w-[720px] mx-auto px-8 pt-12 pb-24">
      <Link
        href={`/lesson/${bookSlug}/cards`}
        className="inline-flex items-center gap-2 text-[12px] font-mono text-text-muted hover:text-text mb-10 transition-colors"
      >
        ← Fiches
      </Link>

      <article style={{ animation: "fadeUp 300ms var(--ease-out)" }}>
        <div className="text-[11px] font-mono text-text-faint uppercase tracking-wider mb-3">
          Fiche
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          {card.term}
        </h1>
        <p className="text-[17px] text-text-muted leading-[1.55] mb-10">{card.shortDef}</p>

        <div className="prose-card">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-[18px] font-semibold tracking-[-0.015em] mb-3 mt-8">
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="text-[15px] leading-[1.7] text-text-muted mb-5">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="text-text font-medium">{children}</strong>
              ),
              em: ({ children }) => <em className="text-text italic">{children}</em>,
              ul: ({ children }) => (
                <ul className="text-[15px] leading-[1.7] text-text-muted mb-5 pl-5 list-disc">
                  {children}
                </ul>
              ),
              li: ({ children }) => <li className="mb-1.5">{children}</li>,
            }}
          >
            {card.fullContentMd}
          </ReactMarkdown>
        </div>

        {relatedCards && relatedCards.length > 0 && (
          <div className="mt-16 pt-8" style={{ borderTop: "0.5px solid var(--border)" }}>
            <div className="text-[11px] font-mono text-text-faint uppercase tracking-wider mb-4">
              Fiches connexes
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedCards.map((c) => (
                <Link
                  key={c.slug}
                  href={`/lesson/${bookSlug}/cards/${c.slug}`}
                  className="px-3 py-1.5 rounded text-[13px] transition-all hover:-translate-y-px"
                  style={{
                    background: "var(--surface)",
                    border: "0.5px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {c.term}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
