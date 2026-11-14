/**
 * Référence de billet : « LGM-XXXXX », sans caractères ambigus (O/0, I/1).
 * docs/CAHIER_DES_CHARGES_RESERVATION.md §4.6.
 */

export const PREFIXE_REFERENCE = "LGM-"
export const ALPHABET_REFERENCE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const LONGUEUR = 5
const RE_REFERENCE = new RegExp(`^${PREFIXE_REFERENCE}[${ALPHABET_REFERENCE}]{${LONGUEUR}}$`)

/** `aleatoire` renvoie un nombre dans [0, 1[ (Math.random, générateur déterministe ou aléa cryptographique). */
export function genererReference(aleatoire: () => number): string {
  let code = ""
  for (let i = 0; i < LONGUEUR; i++) {
    code += ALPHABET_REFERENCE[Math.floor(aleatoire() * ALPHABET_REFERENCE.length)]
  }
  return PREFIXE_REFERENCE + code
}

export function estReferenceValide(reference: string): boolean {
  return RE_REFERENCE.test(reference)
}

/** Tolère la saisie « lgm 7k4q2 », « 7K4Q2 » ou « LGM7K4Q2 ». */
export function normaliserReference(saisie: string): string {
  const brut = saisie.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const code = brut.startsWith("LGM") ? brut.slice(3) : brut
  return PREFIXE_REFERENCE + code
}
