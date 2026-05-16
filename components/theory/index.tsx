import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseProps {
  children: ReactNode;
  className?: string;
}

// ============== WhyBlock ==============
// Le bloc d'introduction qui pose le "pourquoi" du concept.
// Fond purple subtil, eyebrow "POURQUOI CE CONCEPT EXISTE", titre en italique.
export function WhyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg px-9 py-8 mb-10 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--purple-glow), transparent 60%), var(--surface)",
        border: "0.5px solid rgba(167, 139, 250, 0.2)",
      }}
    >
      <div className="text-[11px] font-mono uppercase tracking-[0.06em] mb-4 flex items-center gap-2" style={{ color: "var(--purple-300)" }}>
        <span className="w-6 h-px" style={{ background: "var(--purple-400)" }} />
        Pourquoi ce concept existe
      </div>
      <h2 className="text-2xl font-medium leading-[1.25] tracking-[-0.02em] mb-4">
        {title}
      </h2>
      <div className="text-[15px] leading-[1.7] text-text-muted [&_strong]:text-text [&_strong]:font-medium [&_em]:text-text [&_em]:italic">
        {children}
      </div>
    </div>
  );
}

// ============== SectionHeader ==============
// Numéro + titre pour structurer la lecture (02 · La mécanique).
export function SectionHeader({ num, label, title }: { num: string; label: string; title: ReactNode }) {
  return (
    <>
      <div className="text-[11px] text-text-faint font-mono uppercase tracking-[0.1em] mb-3 mt-12 font-medium">
        {num} · {label}
      </div>
      <h3 className="text-[28px] font-semibold tracking-[-0.025em] leading-[1.15] mb-5">
        {title}
      </h3>
    </>
  );
}

// ============== Prose ==============
// Wrapper pour le corps de texte avec typographie cohérente.
export function Prose({ children, className }: BaseProps) {
  return (
    <div className={cn("text-[15px] leading-[1.7] text-text-muted [&>p]:mb-5 [&_strong]:text-text [&_strong]:font-medium [&_em]:text-text [&_em]:italic", className)}>
      {children}
    </div>
  );
}

// ============== Formula ==============
// Bloc de formule mathématique en monospace avec barre purple à gauche.
export function Formula({ children, className }: BaseProps) {
  return (
    <div
      className={cn("font-mono text-[14px] leading-[2] rounded p-5 my-5", className)}
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

// Sous-composants pour la mise en forme à l'intérieur de Formula
export function FormulaLabel({ children }: BaseProps) {
  return (
    <span className="font-medium" style={{ color: "var(--purple-300)" }}>
      {children} —
    </span>
  );
}

export function FormulaMuted({ children }: BaseProps) {
  return (
    <span className="text-text-muted text-[12px] font-sans italic">{children}</span>
  );
}

// ============== Mnemonic ==============
// Carte avec un "key" monospace gros à gauche et le contenu à droite.
// Pour les mnémoniques mémorables (×4·×2, B/(P+2B)…).
export function Mnemonic({ keyText, label = "Mnémonique", children }: { keyText: string; label?: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg px-8 py-7 my-10 grid items-center transition-all duration-200 hover:[background:var(--surface-hover)]"
      style={{
        gridTemplateColumns: "auto 1fr",
        gap: 28,
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      <div className="font-mono text-4xl font-medium leading-none tracking-[-0.04em]" style={{ color: "var(--purple-300)" }}>
        {keyText}
      </div>
      <div>
        <div className="font-mono text-[11px] text-text-faint uppercase tracking-[0.08em] mb-2">
          {label}
        </div>
        <div className="text-[16px] font-medium leading-[1.5]">{children}</div>
      </div>
    </div>
  );
}

// ============== LifeLink ==============
// Le pont vers la vie pro / la business. Eyebrow avec barre, titre italique.
export function LifeLink({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg px-8 py-7 my-8"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      <div className="text-text-faint text-[11px] font-mono uppercase tracking-[0.08em] mb-3 flex items-center gap-2">
        <span className="w-4 h-px bg-text-dim" />
        Pont avec ta vie pro
      </div>
      <h4 className="text-[17px] font-medium tracking-[-0.015em] mb-2.5">{title}</h4>
      <div className="text-[14px] text-text-muted leading-[1.65] [&_em]:text-text [&_em]:italic [&_strong]:text-text [&_strong]:font-medium">
        {children}
      </div>
    </div>
  );
}

// ============== Example ==============
// Exemple appliqué (avec calculs concrets).
export function Example({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg px-7 py-6 my-6"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      {title && (
        <div className="text-[13px] font-medium mb-3 text-text-muted">
          {title}
        </div>
      )}
      <div className="text-[14px] leading-[1.7] text-text [&_strong]:font-medium [&_em]:text-text-muted [&_em]:italic">
        {children}
      </div>
    </div>
  );
}

// ============== Inline ==============
// Code inline pour les valeurs / formules courtes dans le texte.
export function K({ children }: BaseProps) {
  return (
    <code
      className="font-mono text-[0.92em] px-1.5 py-0.5 rounded"
      style={{
        background: "var(--surface-strong)",
        color: "var(--text)",
      }}
    >
      {children}
    </code>
  );
}
