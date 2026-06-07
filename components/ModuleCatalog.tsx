import Link from "next/link";
import { MODULES } from "@/lib/modules";

/**
 * Index statique des 20 sous-modules (S12) — partagé par /drill et /theory.
 * `mode` détermine la destination des liens et le libellé d'action :
 *  - drill   → /drill/[urlSlug]                     (le drill gère le lock théorie)
 *  - theory  → /module/[moduleSlug]/theory/[urlSlug]
 * Composant serveur (aucun état) : rendu statiquement, cohérent avec l'Atelier.
 */
export function ModuleCatalog({
  eyebrow,
  title,
  subtitle,
  mode,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  mode: "drill" | "theory";
}) {
  const cta = mode === "drill" ? "Drill" : "Lire";

  return (
    <main className="max-w-[1000px] mx-auto px-8 pt-12 pb-24">
      <header className="mb-10" style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-3">
          {eyebrow}
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          {title}
        </h1>
        <p className="text-[15px] text-text-muted max-w-[560px] leading-[1.65]">{subtitle}</p>
      </header>

      <section className="flex flex-col gap-2">
        {MODULES.map((mod) => (
          <div key={mod.slug} className="flex flex-col gap-2">
            <div
              className="grid items-center gap-5 px-6 py-5 rounded-lg"
              style={{
                gridTemplateColumns: "48px 1fr",
                background: "var(--surface)",
                border: "0.5px solid var(--border)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold font-mono tracking-tight"
                style={{
                  background: "var(--purple-glow)",
                  border: "0.5px solid rgba(167, 139, 250, 0.3)",
                  color: "var(--purple-300)",
                }}
              >
                {mod.badge}
              </div>
              <div>
                <div className="text-[15px] font-medium tracking-[-0.015em] mb-0.5">{mod.title}</div>
                <div className="text-[13px] text-text-muted">{mod.desc}</div>
              </div>
            </div>

            {mod.submodules.map((sub) => {
              const href =
                mode === "drill"
                  ? `/drill/${sub.urlSlug}`
                  : `/module/${mod.slug}/theory/${sub.urlSlug}`;
              return (
                <Link
                  key={sub.slug}
                  href={href}
                  className="grid items-center gap-4 px-5 py-3.5 ml-8 rounded transition-all duration-200 hover:[background:var(--surface-hover)]"
                  style={{
                    gridTemplateColumns: "20px 1fr 64px 16px",
                    background: "var(--surface)",
                    border: "0.5px solid var(--border)",
                  }}
                >
                  <span className="text-text-faint font-mono text-[11px]">
                    {sub.slug.replace(`${mod.slug}.`, "")}
                  </span>
                  <span className="text-[13px] font-medium">{sub.title}</span>
                  <span className="text-[11px] font-mono text-purple-300 text-right">{cta}</span>
                  <span className="text-text-faint text-base">→</span>
                </Link>
              );
            })}
          </div>
        ))}
      </section>
    </main>
  );
}
