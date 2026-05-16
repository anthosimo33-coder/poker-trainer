"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
 * Bootstrap d'un user anonyme stocké en localStorage.
 * Crée l'user en DB au premier accès. Renvoie l'_id Convex une fois prêt.
 */
export function useCurrentUser(): { userId: Id<"users"> | null; isReady: boolean } {
  const [anonymousId, setAnonymousId] = useState<string>("");
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreateAnonymousUser);

  useEffect(() => {
    const id = getOrCreateAnonymousId();
    setAnonymousId(id);
  }, []);

  useEffect(() => {
    if (!anonymousId || userId) return;
    let cancelled = false;
    getOrCreate({ anonymousId }).then((id) => {
      if (!cancelled) setUserId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [anonymousId, userId, getOrCreate]);

  return { userId, isReady: userId !== null };
}
