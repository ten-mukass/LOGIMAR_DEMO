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
