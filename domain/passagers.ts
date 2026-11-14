/**
 * Règles sur les passagers (docs/CAHIER_DES_CHARGES_RESERVATION.md §4.1).
 */
import { estJour } from "./temps"
import type { Categorie, CompositionPassagers } from "./types"

export interface BornesAge {
  /** Âge à partir duquel on est enfant (en dessous : bébé). */
  enfantDes: number
  /** Âge à partir duquel on est adulte. */
  adulteDes: number
}

export function libelleCategorie(categorie: Categorie, nombre = 1): string {
  const libelles: Record<Categorie, [string, string]> = {
    adulte: ["adulte", "adultes"],
    enfant: ["enfant", "enfants"],
    bebe: ["bébé", "bébés"],
  }
  return libelles[categorie][nombre > 1 ? 1 : 0]
}

/** « 12 ans et plus », « 3 à 11 ans », « 0 à 2 ans ». */
export function trancheAge(categorie: Categorie, bornes: BornesAge): string {
  if (categorie === "adulte") return `${bornes.adulteDes} ans et plus`
  if (categorie === "enfant") return `${bornes.enfantDes} à ${bornes.adulteDes - 1} ans`
  return `0 à ${bornes.enfantDes - 1} ans`
}

/** « 2 adultes, 1 enfant ». */
export function resumeComposition(c: CompositionPassagers): string {
  const morceaux: string[] = []
  if (c.adultes > 0) morceaux.push(`${c.adultes} ${libelleCategorie("adulte", c.adultes)}`)
  if (c.enfants > 0) morceaux.push(`${c.enfants} ${libelleCategorie("enfant", c.enfants)}`)
  if (c.bebes > 0) morceaux.push(`${c.bebes} ${libelleCategorie("bebe", c.bebes)}`)
  return morceaux.join(", ")
}

/** Erreurs de composition : au moins 1 adulte, au plus 1 bébé par adulte, nombre total plafonné. */
export function validerComposition(c: CompositionPassagers, passagersMax: number): string[] {
  const erreurs: string[] = []
  const valeurs = [c.adultes, c.enfants, c.bebes]
  if (valeurs.some((v) => !Number.isInteger(v) || v < 0)) return ["Nombre de passagers invalide."]
  if (c.adultes < 1) erreurs.push("Au moins un adulte par réservation.")
  if (c.bebes > c.adultes) erreurs.push("Un bébé au plus par adulte.")
  if (c.adultes + c.enfants + c.bebes > passagersMax) {
    erreurs.push(`${passagersMax} passagers au plus par réservation.`)
  }
  return erreurs
}

/** Âge révolu à une date donnée. */
export function ageAu(dateNaissance: string, date: string): number {
  if (!estJour(dateNaissance) || !estJour(date)) throw new Error("Date invalide")
  const [an, mn, jn] = dateNaissance.split("-").map(Number)
  const [a, m, j] = date.split("-").map(Number)
  let age = a - an
  if (m < mn || (m === mn && j < jn)) age -= 1
  return age
}

/** Catégorie d'un passager d'après sa date de naissance et le jour du voyage. */
export function categorieSelonAge(dateNaissance: string, jourVoyage: string, bornes: BornesAge): Categorie {
  const age = ageAu(dateNaissance, jourVoyage)
  if (age < 0) throw new Error("Date de naissance après le voyage")
  if (age >= bornes.adulteDes) return "adulte"
  if (age >= bornes.enfantDes) return "enfant"
  return "bebe"
}
