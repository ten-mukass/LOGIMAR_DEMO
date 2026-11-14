/**
 * Montants en FCFA : entiers, sans décimales (docs/CAHIER_DES_CHARGES_RESERVATION.md §4.3).
 */

const formatEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })

/** 35000 → « 35 000 » (espace insécable fine). */
export function formatMontant(montant: number): string {
  if (!Number.isInteger(montant)) throw new Error(`Montant non entier : ${montant}`)
  return formatEntier.format(montant)
}

/** 35000 → « 35 000 FCFA » ; en version courte « 35 000 F ». */
export function formatFCFA(montant: number, court = false): string {
  return `${formatMontant(montant)} ${court ? "F" : "FCFA"}`
}

const formatDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })

/** 98 412 000 → « 98,4 M FCFA » ; 412 000 → « 412 000 FCFA » (tuiles du back-office). */
export function formatFCFACompact(montant: number): string {
  if (Math.abs(montant) >= 1_000_000) return `${formatDecimal.format(montant / 1_000_000)} M FCFA`
  return formatFCFA(Math.round(montant))
}

/** 0,523 → « 52 % » ; avec une décimale si demandé. */
export function formatPourcentage(ratio: number, decimales = 0): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimales, minimumFractionDigits: decimales }).format(ratio * 100)} %`
}

/** Écart signé : 0,23 → « +23 % », −0,1 → « −10 % ». */
export function formatEcart(ratio: number): string {
  const valeur = Math.round(ratio * 100)
  return `${valeur > 0 ? "+" : valeur < 0 ? "−" : ""}${Math.abs(valeur)} %`
}
