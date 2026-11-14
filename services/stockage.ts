/**
 * Stockage clé-valeur. Démo : le navigateur (localStorage) ; tests et rendu serveur : la mémoire.
 * En production, ces données vont en base.
 */

export interface Stockage {
  lire(cle: string): string | null
  ecrire(cle: string, valeur: string): void
}

export function stockageMemoire(): Stockage {
  const valeurs = new Map<string, string>()
  return {
    lire: (cle) => valeurs.get(cle) ?? null,
    ecrire: (cle, valeur) => {
      valeurs.set(cle, valeur)
    },
  }
}

/** localStorage si disponible (navigation privée, rendu serveur : repli en mémoire). */
export function stockageNavigateur(): Stockage {
  const memoire = stockageMemoire()
  const local = (): globalThis.Storage | null => {
    try {
      return typeof window !== "undefined" ? window.localStorage : null
    } catch {
      return null
    }
  }
  return {
    lire(cle) {
      try {
        return local()?.getItem(cle) ?? memoire.lire(cle)
      } catch {
        return memoire.lire(cle)
      }
    },
    ecrire(cle, valeur) {
      memoire.ecrire(cle, valeur)
      try {
        local()?.setItem(cle, valeur)
      } catch {
        // stockage plein ou refusé : la mémoire suffit pour la session
      }
    },
  }
}

/** Lit un objet JSON ; renvoie `defaut` si absent ou illisible. */
export function lireJson<T>(stockage: Stockage, cle: string, defaut: T): T {
  const brut = stockage.lire(cle)
  if (!brut) return defaut
  try {
    return JSON.parse(brut) as T
  } catch {
    return defaut
  }
}
