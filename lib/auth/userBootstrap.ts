import type { Id } from "@/convex/_generated/dataModel";

/**
 * Cœur PUR (sans React) du bootstrap d'identité anonyme — testable unitairement.
 * Garantit qu'une fois `ensure()` appelée, l'écriture n'est jamais perdue :
 * - un seul bootstrap en vol à la fois (dédup via `inflight`) → pas de
 *   double-création même sous appels concurrents ;
 * - retry/backoff si la résolution échoue, rejet visible après `maxAttempts` ;
 * - `current()` expose l'id résolu pour lecture synchrone.
 */
export interface BootstrapDeps {
  /** Crée/récupère l'user (idempotent côté DB) pour un anonymousId. */
  getOrCreate: (anonymousId: string) => Promise<Id<"users">>;
  /** Lit (ou crée) l'anonymousId localStorage. */
  getAnonymousId: () => string;
  /** Notifié au premier id résolu (le hook y branche son setState). */
  onResolve?: (id: Id<"users">) => void;
  /** Injectable pour les tests (timers déterministes). */
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  baseDelayMs?: number;
}

export interface UserBootstrap {
  current: () => Id<"users"> | null;
  ensure: () => Promise<Id<"users">>;
}

export function createUserBootstrap(deps: BootstrapDeps): UserBootstrap {
  const {
    getOrCreate,
    getAnonymousId,
    onResolve,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    maxAttempts = 5,
    baseDelayMs = 150,
  } = deps;

  let userId: Id<"users"> | null = null;
  let inflight: Promise<Id<"users">> | null = null;

  function ensure(): Promise<Id<"users">> {
    if (userId) return Promise.resolve(userId);
    if (inflight) return inflight;

    const anonymousId = getAnonymousId();
    inflight = (async (): Promise<Id<"users">> => {
      let lastError: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const id = await getOrCreate(anonymousId);
          userId = id;
          onResolve?.(id);
          return id;
        } catch (error) {
          lastError = error;
          await sleep(baseDelayMs * 2 ** attempt);
        }
      }
      // Échec après backoff : libère le verrou pour autoriser un nouvel essai.
      inflight = null;
      throw lastError instanceof Error
        ? lastError
        : new Error("Bootstrap de l'utilisateur anonyme impossible.");
    })();
    return inflight;
  }

  return {
    current: () => userId,
    ensure,
  };
}
