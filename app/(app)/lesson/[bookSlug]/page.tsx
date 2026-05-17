"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const BOOK_NUMS: Record<string, string> = {
  mecaniques: "I",
  strategie: "II",
  lexique: "III",
};

export default function BookReaderPage() {
  const params = useParams();
  const bookSlug = params.bookSlug as string;

  const book = useQuery(api.lessons.getBook, { slug: bookSlug });
  const chapters = useQuery(api.lessons.listChaptersForBook, { bookSlug });

  const [activeChapterSlug, setActiveChapterSlug] = useState<string | null>(null);

  useEffect(() => {
    if (chapters && chapters.length > 0 && !activeChapterSlug) {
      setActiveChapterSlug(chapters[0].slug);
    }
  }, [chapters, activeChapterSlug]);

  if (!book) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12 text-text-muted">
        Chargement du livre…
      </main>
    );
  }

  const activeChapter = chapters?.find((c) => c.slug === activeChapterSlug);

  return (
    <main className="max-w-[1200px] mx-auto px-8 pt-12 pb-24">
      <Link
        href="/lesson"
        className="inline-flex items-center gap-2 text-[12px] font-mono text-text-muted hover:text-text mb-10 transition-colors"
      >
        ← Bibliothèque
      </Link>

      <header className="mb-12">
        <div className="text-[12px] font-mono text-text-faint uppercase tracking-wider mb-3">
          Livre {BOOK_NUMS[book.slug] ?? book.orderIndex}
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          {book.name}
        </h1>
        <p className="text-base text-text-muted max-w-[640px]">{book.description}</p>
      </header>

      <div className="grid grid-cols-[240px_1fr] gap-12">
        <aside className="sticky top-24 self-start">
          <div className="text-[11px] font-mono text-text-faint uppercase tracking-wider mb-3">
            Sommaire
          </div>
          <nav className="flex flex-col gap-1">
            {chapters?.map((chap, i) => (
              <button
                key={chap.slug}
                onClick={() => setActiveChapterSlug(chap.slug)}
                className={cn(
                  "text-left text-[13px] py-2 px-3 rounded transition-all duration-150",
                  activeChapterSlug === chap.slug
                    ? "text-text"
                    : "text-text-muted hover:text-text"
                )}
                style={
                  activeChapterSlug === chap.slug
                    ? { background: "var(--surface-hover)" }
                    : undefined
                }
              >
                <span className="font-mono text-text-faint mr-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {chap.name}
              </button>
            ))}
          </nav>
        </aside>

        <article className="max-w-[720px]">
          {!activeChapter && (
            <div className="text-text-muted">Choisis un chapitre dans le sommaire.</div>
          )}
          {activeChapter && (
            <div
              className="prose-lesson"
              style={{ animation: "fadeUp 300ms var(--ease-out)" }}
            >
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-[36px] font-semibold tracking-[-0.025em] leading-[1.1] mb-6 bg-gradient-text">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-[20px] font-semibold tracking-[-0.015em] mb-3 mt-10">
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className="text-[15px] leading-[1.7] text-text-muted mb-5">
                      {children}
                    </p>
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
                  code: ({ children }) => (
                    <code
                      className="font-mono text-[0.92em] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface-strong)", color: "var(--text)" }}
                    >
                      {children}
                    </code>
                  ),
                }}
              >
                {activeChapter.contentMd}
              </ReactMarkdown>

              <div
                className="mt-16 pt-8 flex justify-between items-center"
                style={{ borderTop: "0.5px solid var(--border)" }}
              >
                <PrevButton chapters={chapters ?? []} activeSlug={activeChapter.slug} setActive={setActiveChapterSlug} />
                <div className="text-[12px] font-mono text-text-faint">
                  Chapitre {(chapters?.findIndex((c) => c.slug === activeChapter.slug) ?? 0) + 1} sur {chapters?.length}
                </div>
                <NextButton chapters={chapters ?? []} activeSlug={activeChapter.slug} setActive={setActiveChapterSlug} />
              </div>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

function PrevButton({
  chapters, activeSlug, setActive,
}: {
  chapters: { slug: string }[];
  activeSlug: string;
  setActive: (s: string) => void;
}) {
  const idx = chapters.findIndex((c) => c.slug === activeSlug);
  if (idx <= 0) return <span />;
  return (
    <button
      onClick={() => setActive(chapters[idx - 1].slug)}
      className="text-[13px] text-text-muted hover:text-text transition-colors"
    >
      ← Chapitre précédent
    </button>
  );
}

function NextButton({
  chapters, activeSlug, setActive,
}: {
  chapters: { slug: string }[];
  activeSlug: string;
  setActive: (s: string) => void;
}) {
  const idx = chapters.findIndex((c) => c.slug === activeSlug);
  if (idx >= chapters.length - 1) return <span />;
  return (
    <button
      onClick={() => setActive(chapters[idx + 1].slug)}
      className="text-[13px] font-medium text-text hover:text-purple-300 transition-colors"
    >
      Chapitre suivant →
    </button>
  );
}
