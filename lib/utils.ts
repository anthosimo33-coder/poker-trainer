import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format un nombre en pourcentage propre (1 décimale max). */
export function fmtPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals).replace(/\.0$/, "")} %`;
}

/** Format un nombre en bb (big blinds). */
export function fmtBb(n: number, decimals = 1): string {
  return `${n.toFixed(decimals).replace(/\.0$/, "")}bb`;
}

/** Format un ratio "X to 1" arrondi à 2 décimales. */
export function fmtRatio(ratio: number): string {
  return `${ratio.toFixed(2).replace(/\.?0+$/, "")} : 1`;
}
