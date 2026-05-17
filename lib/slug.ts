/**
 * Convertit un slug URL (avec tiret) en slug DB (avec point).
 * Exemples : "m1-1" → "m1.1", "m1-2" → "m1.2".
 */
export function urlSlugToDbSlug(urlSlug: string): string {
  // Pattern : mN-N où N sont des chiffres
  const match = urlSlug.match(/^(m\d+)-(\d+)$/);
  if (!match) return urlSlug;
  return `${match[1]}.${match[2]}`;
}

/**
 * Convertit un slug DB en slug URL.
 */
export function dbSlugToUrlSlug(dbSlug: string): string {
  return dbSlug.replace(".", "-");
}

/**
 * Extrait le module slug ("m1") depuis n'importe quel format de submodule slug.
 */
export function moduleSlugFromSubmodule(submoduleSlug: string): string {
  const match = submoduleSlug.match(/^(m\d+)/);
  return match ? match[1] : submoduleSlug;
}
