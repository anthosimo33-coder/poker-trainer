import { describe, it, expect } from "vitest";
import { urlSlugToDbSlug, dbSlugToUrlSlug, moduleSlugFromSubmodule } from "@/lib/slug";

describe("urlSlugToDbSlug", () => {
  it("convertit tirets en points", () => {
    expect(urlSlugToDbSlug("m1-1")).toBe("m1.1");
    expect(urlSlugToDbSlug("m1-2")).toBe("m1.2");
    expect(urlSlugToDbSlug("m12-3")).toBe("m12.3");
  });
  it("retourne tel quel si pas de pattern", () => {
    expect(urlSlugToDbSlug("invalid")).toBe("invalid");
  });
});

describe("dbSlugToUrlSlug", () => {
  it("convertit points en tirets", () => {
    expect(dbSlugToUrlSlug("m1.1")).toBe("m1-1");
    expect(dbSlugToUrlSlug("m1.4")).toBe("m1-4");
  });
});

describe("moduleSlugFromSubmodule", () => {
  it("extrait le module slug", () => {
    expect(moduleSlugFromSubmodule("m1.1")).toBe("m1");
    expect(moduleSlugFromSubmodule("m1-3")).toBe("m1");
    expect(moduleSlugFromSubmodule("m12.7")).toBe("m12");
  });
});
