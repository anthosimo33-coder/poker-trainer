"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useEnsuredUserId } from "@/hooks/useEnsuredUserId";

/**
 * Bootstrap d'un user anonyme stocké en localStorage.
 *
 * S11 : délègue désormais à {@link useEnsuredUserId} (source unique du bootstrap,
 * avec retry/backoff). Les consommateurs en **lecture seule** (Atelier, Mes
 * leaks…) gardent cette signature minimale `{ userId, isReady }` ; les
 * call-sites en **écriture** utilisent directement `useEnsuredUserId` pour
 * obtenir `ensureUserId()`.
 */
export function useCurrentUser(): { userId: Id<"users"> | null; isReady: boolean } {
  const { userId, isReady } = useEnsuredUserId();
  return { userId, isReady };
}
