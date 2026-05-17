import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";
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

    // Overrides des éléments HTML standards — merge le className entrant
    h1: ({ children, className, ...rest }) => (
      <h1
        className={cn(
          "text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text",
          className
        )}
        {...rest}
      >
        {children}
      </h1>
    ),
    p: ({ children, className, ...rest }) => (
      <p
        className={cn("text-[15px] leading-[1.7] text-text-muted mb-5", className)}
        {...rest}
      >
        {children}
      </p>
    ),
    strong: ({ children, className, ...rest }) => (
      <strong className={cn("text-text font-medium", className)} {...rest}>
        {children}
      </strong>
    ),
    em: ({ children, className, ...rest }) => (
      <em className={cn("text-text italic", className)} {...rest}>
        {children}
      </em>
    ),

    ...components,
  };
}
