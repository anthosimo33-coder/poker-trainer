"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createUserBootstrap, type UserBootstrap } from "@/lib/auth/userBootstrap";

const STORAGE_KEY = "poker-trainer.anonymousId";

function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Identité anonyme robuste pour les écritures critiques (S11).
 *
 * Bug corrigé : partout où l'on faisait `if (userId) recordX(...)`, l'écriture
 * était skippée **sans feedback** tant que le bootstrap anonyme n'avait pas
 * résolu. Sous latence backend, le quick check / l'attempt était silencieusement
 * perdu → le drill restait verrouillé.
 *
 * On expose `ensureUserId()` qui **attend** la résolution (cœur pur
 * {@link createUserBootstrap} : retry/backoff + dédup). Une action lancée pendant
 * la fenêtre de latence n'est jamais perdue ; en cas d'échec après backoff, la
 * promesse rejette (le call-site affiche une erreur visible, pas un skip).
 *
 * - `userId`  : valeur courante (null au premier rendu — pour les *lectures*).
 * - `isReady` : true dès que l'id est connu.
 */
export function useEnsuredUserId(): {
  userId: Id<"users"> | null;
  isReady: boolean;
  ensureUserId: () => Promise<Id<"users">>;
} {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreateAnonymousUser);
  const bootstrapRef = useRef<UserBootstrap | null>(null);

  // Créé une seule fois : getOrCreate (useMutation) est une référence stable.
  if (bootstrapRef.current === null) {
    bootstrapRef.current = createUserBootstrap({
      getOrCreate: (anonymousId) => getOrCreate({ anonymousId }),
      getAnonymousId: getOrCreateAnonymousId,
      onResolve: setUserId,
    });
  }

  const ensureUserId = useCallback(() => bootstrapRef.current!.ensure(), []);

  // Bootstrap au montage : expose `userId` rapidement pour les lectures. Erreur
  // silencieuse ici — resurfacée à l'écriture via le ensureUserId() du handler.
  useEffect(() => {
    ensureUserId().catch(() => {});
  }, [ensureUserId]);

  return { userId, isReady: userId !== null, ensureUserId };
}
