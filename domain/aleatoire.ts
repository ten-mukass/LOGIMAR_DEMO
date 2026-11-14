/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : mêmes données d'exemple à chaque chargement.
 */

export type Aleatoire = () => number

export function generateur(graine: number): Aleatoire {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entier dans [min, max]. */
export function entier(alea: Aleatoire, min: number, max: number): number {
  return min + Math.floor(alea() * (max - min + 1))
}

export function choisir<T>(alea: Aleatoire, valeurs: readonly T[]): T {
  return valeurs[Math.floor(alea() * valeurs.length)]
}

/** Choix pondéré : `[[valeur, poids], …]`. */
export function choisirPondere<T>(alea: Aleatoire, options: readonly (readonly [T, number])[]): T {
  const total = options.reduce((s, [, p]) => s + p, 0)
  let tirage = alea() * total
  for (const [valeur, poids] of options) {
    tirage -= poids
    if (tirage < 0) return valeur
  }
  return options[options.length - 1][0]
}

/** Graine numérique stable à partir d'un texte. */
export function graineDepuis(texte: string): number {
  let h = 2166136261
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
