import { describe, it, expect, vi } from "vitest";
import { createUserBootstrap } from "@/lib/auth/userBootstrap";
import type { Id } from "@/convex/_generated/dataModel";

const UID = "user_123" as Id<"users">;
const noSleep = () => Promise.resolve();

describe("createUserBootstrap — ensure", () => {
  it("résout l'id après bootstrap, le met en cache et notifie onResolve", async () => {
    const getOrCreate = vi.fn().mockResolvedValue(UID);
    const onResolve = vi.fn();
    const b = createUserBootstrap({
      getOrCreate,
      getAnonymousId: () => "anon",
      onResolve,
      sleep: noSleep,
    });

    expect(b.current()).toBeNull();
    const id = await b.ensure();
    expect(id).toBe(UID);
    expect(b.current()).toBe(UID);
    expect(onResolve).toHaveBeenCalledWith(UID);

    // Second appel : sert le cache, aucun nouvel appel getOrCreate.
    await b.ensure();
    expect(getOrCreate).toHaveBeenCalledTimes(1);
  });

  it("dédoublonne les appels concurrents — une seule création (idempotence)", async () => {
    let resolveFn: (v: Id<"users">) => void = () => {};
    const getOrCreate = vi.fn(
      () => new Promise<Id<"users">>((r) => (resolveFn = r))
    );
    const b = createUserBootstrap({
      getOrCreate,
      getAnonymousId: () => "anon",
      sleep: noSleep,
    });

    const p1 = b.ensure();
    const p2 = b.ensure();
    resolveFn(UID);
    const [id1, id2] = await Promise.all([p1, p2]);

    expect(id1).toBe(UID);
    expect(id2).toBe(UID);
    // Pas de double-écriture : un seul getOrCreate malgré 2 ensure() concurrents.
    expect(getOrCreate).toHaveBeenCalledTimes(1);
  });

  it("retry avec backoff exponentiel puis succès", async () => {
    const getOrCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error("net"))
      .mockRejectedValueOnce(new Error("net"))
      .mockResolvedValue(UID);
    const sleep = vi.fn(noSleep);
    const b = createUserBootstrap({
      getOrCreate,
      getAnonymousId: () => "anon",
      sleep,
      maxAttempts: 5,
      baseDelayMs: 10,
    });

    const id = await b.ensure();
    expect(id).toBe(UID);
    expect(getOrCreate).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it("rejette après maxAttempts et libère le verrou (un nouvel ensure retente)", async () => {
    const getOrCreate = vi.fn().mockRejectedValue(new Error("down"));
    const b = createUserBootstrap({
      getOrCreate,
      getAnonymousId: () => "anon",
      sleep: noSleep,
      maxAttempts: 3,
    });

    await expect(b.ensure()).rejects.toThrow("down");
    expect(getOrCreate).toHaveBeenCalledTimes(3);

    // Verrou libéré → un nouvel essai peut réussir.
    getOrCreate.mockResolvedValue(UID);
    const id = await b.ensure();
    expect(id).toBe(UID);
  });
});
