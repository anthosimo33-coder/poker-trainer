import type { MDXComponents } from "mdx/types";
import {
  WhyBlock,
  SectionHeader,
  Prose,
  Formula,
  FormulaLabel,
  FormulaMuted,
  Mnemonic,
  LifeLink,
  Example,
  K,
} from "@/components/theory";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Composants custom — utilisables directement en MDX sans import
    WhyBlock,
    SectionHeader,
    Prose,
    Formula,
    FormulaLabel,
    FormulaMuted,
    Mnemonic,
    LifeLink,
    Example,
    K,

    // Overrides des éléments HTML standards
    h1: ({ children }) => (
      <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
        {children}
      </h1>
    ),
    p: ({ children }) => (
      <p className="text-[15px] leading-[1.7] text-text-muted mb-5">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="text-text font-medium">{children}</strong>
    ),
    em: ({ children }) => <em className="text-text italic">{children}</em>,

    ...components,
  };
}
